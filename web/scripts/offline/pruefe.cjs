// Vorhandener isolierter Build-/Browserweg, ohne lokale Diensteinstellungen.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const web = path.resolve(__dirname, '../..');
const root = path.dirname(web);
const konfiguration = ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'proxy.ts', 'instrumentation.ts'];

function kopiereQuellen(quelle, ziel) {
  function kopiere(von, nach) {
    const info = fs.lstatSync(von);
    if (info.isSymbolicLink()) throw new Error('Verknüpfung in Webquelle nicht erlaubt');
    if (info.isDirectory()) {
      fs.mkdirSync(nach, { recursive: true });
      for (const e of fs.readdirSync(von)) {
        if (e.toLowerCase().includes('.env') || ['node_modules', '.next', '.git'].includes(e)) continue;
        kopiere(path.join(von, e), path.join(nach, e));
      }
    } else if (info.isFile()) {
      fs.mkdirSync(path.dirname(nach), { recursive: true });
      fs.copyFileSync(von, nach);
    } else throw new Error('Ungeeignete Webquelle');
  }
  for (const p of ['app', 'lib', 'public', ...konfiguration]) {
    if (fs.existsSync(path.join(quelle, p))) kopiere(path.join(quelle, p), path.join(ziel, p));
  }
}

function umgebung(guard, geerbt = process.env) {
  const env = {};
  for (const k of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'PATHEXT', 'TEMP', 'TMP', 'ComSpec', 'NUMBER_OF_PROCESSORS', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA']) {
    if (geerbt[k]) env[k] = geerbt[k];
  }
  return Object.assign(env, { NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_URL: 'https://offline.example.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'synthetischer-offline-schluessel',
    ADMIN_EMAIL: 'offline-admin@example.invalid', SUPABASE_SERVICE_KEY: 'synthetischer-offline-service-schluessel',
    NODE_OPTIONS: `--require "${guard.replaceAll('\\', '/')}"` });
}

function befehl(exe, args, optionen) {
  return new Promise((resolve, reject) => {
    const kind = spawn(exe, args, { ...optionen, stdio: 'inherit', windowsHide: true });
    kind.once('error', reject);
    kind.once('exit', code => code === 0 ? resolve() : reject(new Error(`Prüfschritt endete mit Exit ${code}`)));
  });
}
function portBelegt() {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port: 3002 });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}
async function browser(ziel, python) {
  if (await portBelegt()) throw new Error('Port 3002 ist belegt; vorhandenen Server nicht verändert');
  const env = umgebung(path.join(__dirname, 'antworten.cjs'));
  const server = spawn(process.execPath, [path.join(web, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3002'],
    { cwd: ziel, env, stdio: 'inherit', windowsHide: true });
  let gestartetFehler;
  server.once('error', e => { gestartetFehler = e; });
  const beendet = new Promise(resolve => { server.once('exit', resolve); server.once('error', resolve); });
  const stoppen = () => server.kill();
  process.once('SIGINT', stoppen);
  process.once('SIGTERM', stoppen);
  try {
    let bereit = false;
    for (let i = 0; i < 100; i++) {
      if (gestartetFehler) throw gestartetFehler;
      if (server.exitCode !== null) throw new Error('Prüfserver vorzeitig beendet');
      try { if ((await fetch('http://127.0.0.1:3002/stellen')).ok) { bereit = true; break; } } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
    if (!bereit) throw new Error('Prüfserver nicht bereit');
    // Python erhält ebenfalls keine geerbten Dienste-Schlüssel oder Node-Optionen.
    const pyEnv = { ...env, PYTHONIOENCODING: 'utf-8' }; delete pyEnv.NODE_OPTIONS;
    await befehl(python, ['-B', path.join(__dirname, 'browser.py'), path.join(ziel, 'anfragen.jsonl')], { cwd: ziel, env: pyEnv });
  } finally {
    stoppen();
    await beendet;
    process.removeListener('SIGINT', stoppen); process.removeListener('SIGTERM', stoppen);
  }
}

async function main(args = process.argv.slice(2)) {
  let mitBrowser = false, python = process.platform === 'win32' ? 'py' : 'python3';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--browser') mitBrowser = true;
    else if (args[i] === '--python' && args[i + 1] && !args[i + 1].startsWith('--')) python = args[++i];
    else throw new Error('Erlaubt: --browser [--python PFAD]');
  }
  const pruefRoot = path.join(root, '.pruefung');
  fs.mkdirSync(pruefRoot, { recursive: true });
  const ziel = fs.mkdtempSync(path.join(pruefRoot, 'web-'));
  kopiereQuellen(web, ziel);
  fs.symlinkSync(path.join(web, 'node_modules'), path.join(ziel, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  console.log('Isolierter Webpack-Build ohne Umgebungsdateien und mit Netzsperre.');
  await befehl(process.execPath, [path.join(web, 'node_modules/next/dist/bin/next'), 'build', '--webpack'],
    { cwd: ziel, env: umgebung(path.join(__dirname, 'netz-sperre.cjs')) });
  if (mitBrowser) await browser(ziel, python);
  console.log('Offline-Webprüfung bestanden. Artefakte liegen ausschließlich unter .pruefung/.');
}
module.exports = { kopiereQuellen, umgebung, browser, main };
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
