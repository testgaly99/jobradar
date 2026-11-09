// Übernahme von Stellen per Lesezeichen-Knopf (Bookmarklet). Rein, ohne Next-Importe, damit testbar.
export const MAX_TEXT = 50_000;
const GRENZEN = { url: 2000, titel: 300, firma: 300, ort: 300, text: MAX_TEXT } as const;
export type Uebernahme = Record<keyof typeof GRENZEN, string>;

// Jede fremde Seite kann /bewerbungen/uebernehmen öffnen und Nachrichten schicken: nur diese Form wird angenommen.
export function pruefeUebernahme(x: unknown): Uebernahme | null {
  if (!x || typeof x !== "object") return null;
  const r: Record<string, string> = {};
  for (const [k, max] of Object.entries(GRENZEN)) {
    const v = (x as Record<string, unknown>)[k] ?? "";
    if (typeof v !== "string" || v.length > max) return null;
    r[k] = v;
  }
  try {
    const u = new URL(r.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  } catch { return null; }
  return r as Uebernahme;
}

// Liest die Daten aus dem #-Anker der Übernahme-Seite. Kaputter Anker ergibt null.
export function leseAnker(hash: string): Uebernahme | null {
  try { return pruefeUebernahme(JSON.parse(decodeURIComponent(hash.replace(/^#/, "")))); } catch { return null; }
}

// Für die Längenprüfung zählt ein Zeilenumbruch einmal, egal ob \r\n (Formular) oder \n.
export const textZuLang = (s: string) => s.replace(/\r\n/g, "\n").trim().length > MAX_TEXT;

// Adresse der Website aus der Anfrage (lokal http://localhost:3000, bei Vercel https://…). Nur http(s), sonst null.
export function seitenUrsprung(host: string | null, proto: string | null): string | null {
  if (!host) return null;
  let p = proto?.split(",")[0].trim();
  if (p !== "http" && p !== "https") p = /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  try {
    const o = new URL(`${p}://${host}`).origin;
    return o.startsWith("http") ? o : null;
  } catch { return null; }
}

// Läuft im Browser auf der Stellenseite. Öffnet zuerst einen leeren Tab (sonst blockt der Pop-up-Blocker), liest dann
// JSON-LD JobPosting → LinkedIn-Elemente → og:title → document.title „Titel | Firma | LinkedIn“; Markierung = Anzeigentext.
// Übergabe im #-Anker der Adresse: Der Anker geht an keinen Server, und eine Cross-Origin-Opener-Policy der Seite stört nicht.
const MAX_ANKER = 100_000; // Adresslänge, die alle gängigen Browser sicher verarbeiten; sonst wird der Text gekürzt.
const CODE = `(function(){var O=__O__,w=window.open("about:blank");if(!w){alert("Jobradar: Bitte Pop-ups für diese Seite erlauben.");return}
var d=document,D={url:location.href,titel:"",firma:"",ort:"",text:""},j={},
t=function(){for(var i=0;i<arguments.length;i++){var e=d.querySelector(arguments[i]),v=e&&e.innerText.trim();if(v)return v}return""},
z=function(h){return h?new DOMParser().parseFromString(h,"text/html").body.textContent.trim():""};
d.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{[].concat(JSON.parse(s.textContent)).forEach(function x(y){if(!y)return;if(y["@graph"])[].concat(y["@graph"]).forEach(x);if([].concat(y["@type"]).indexOf("JobPosting")>=0)j=y})}catch(e){}});
var h=j.hiringOrganization,a=[].concat(j.jobLocation)[0];D.titel=j.title||"";D.firma=typeof h=="string"?h:h&&h.name||"";D.ort=a&&a.address&&a.address.addressLocality||"";D.text=z(j.description);
if(/linkedin\\./.test(location.hostname)){var P=".job-details-jobs-unified-top-card__";D.titel=D.titel||t(P+"job-title",".top-card-layout__title","h1");D.firma=D.firma||t(P+"company-name a",".topcard__org-name-link");D.ort=D.ort||t(P+"primary-description-container",P+"tertiary-description-container",".topcard__flavor--bullet").split("·")[0].trim();D.text=D.text||t("#job-details",".jobs-description__content",".show-more-less-html__markup")}
var g=d.querySelector('meta[property="og:title"]'),p=d.title.replace(/^\\(\\d+\\)\\s*/,"").split(" | ");D.titel=D.titel||g&&g.content||"";if(p.length>2){D.titel=D.titel||p[0];D.firma=D.firma||p[1]}
var s=String(getSelection()).trim();if(s)D.text=s;for(var k in D)D[k]=String(D[k]||"").trim().slice(0,k=="text"?${MAX_TEXT}:k=="url"?2000:300);
for(var J;(J=encodeURIComponent(JSON.stringify(D))).length>${MAX_ANKER};)D.text=D.text.slice(0,D.text.length*.9|0);
w.opener=null;w.location=O+"/bewerbungen/uebernehmen#"+J})()`;

export const lesezeichenCode = (ursprung: string) => CODE.replace("__O__", () => JSON.stringify(ursprung)).replace(/\n/g, "");
export const lesezeichen = (ursprung: string) => "javascript:" + encodeURIComponent(lesezeichenCode(ursprung));
