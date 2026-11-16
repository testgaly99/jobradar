// Nur in isolierten Prüf-Kindprozessen laden. Keine ausgehenden Verbindungen.
const gesperrt = () => { throw new Error('Netzwerkzugriff in Offline-Prüfung gesperrt'); };
globalThis.fetch = gesperrt;
for (const modul of ['node:http', 'node:https']) {
  require(modul).request = gesperrt;
  require(modul).get = gesperrt;
}
require('node:net').connect = gesperrt;
require('node:net').createConnection = gesperrt;
require('node:net').Socket.prototype.connect = gesperrt;
require('node:tls').connect = gesperrt;
const dns = require('node:dns');
const lookup = dns.lookup;
// listen(127.0.0.1) verwendet ebenfalls lookup; numerische Loopback-Adressen benötigen kein DNS.
dns.lookup = (host, ...args) => ['127.0.0.1', '::1'].includes(host) ? lookup(host, ...args) : gesperrt();
const lookupPromise = dns.promises.lookup.bind(dns.promises);
dns.promises.lookup = (host, ...args) => ['127.0.0.1', '::1'].includes(host) ? lookupPromise(host, ...args) : gesperrt();
for (const name of ['resolve', 'resolve4', 'resolve6']) { dns[name] = gesperrt; dns.promises[name] = gesperrt; }
