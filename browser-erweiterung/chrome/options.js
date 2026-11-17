import { appOrigin } from "./kern.mjs";

const adresse = document.querySelector("#adresse");
const status = document.querySelector("#status");
chrome.storage.local.get("appOrigin").then((r) => { adresse.value = r.appOrigin || ""; }).catch(() => { status.textContent = "Einstellungen konnten nicht geladen werden."; });

document.querySelector("#einstellungen").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const origin = appOrigin(adresse.value);
    // Direkt im Klick-Ereignis fragen; kein vorgelagerter asynchroner Arbeitsschritt.
    const erlaubt = await chrome.permissions.request({ origins: [`${origin}/*`] });
    if (!erlaubt) { status.textContent = "Verbindung nicht freigegeben. Es wurde nichts geändert."; return; }
    const vorher = (await chrome.storage.local.get("appOrigin")).appOrigin;
    await chrome.storage.local.set({ appOrigin: origin });
    if (vorher && vorher !== origin) await chrome.permissions.remove({ origins: [`${vorher}/*`] });
    adresse.value = origin;
    status.textContent = "Verbunden. Melde dich bei Jobradar an und hefte den Erweiterungsknopf in Chrome an.";
  } catch (error) { status.textContent = error instanceof Error ? error.message : "Die Verbindung konnte nicht gespeichert werden."; }
});
