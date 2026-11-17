import { erstelleImporteur } from "./kern.mjs";

const importeur = erstelleImporteur(chrome);
// Pending-Inhalte bleiben ausschließlich im Hintergrund, nicht im Webseiten-Speicher.
chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {});
chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {});
chrome.action.onClicked.addListener((tab) => { void importeur.starten(tab); });
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "complete") void importeur.fortsetzen(tabId).catch(() => {});
});
chrome.tabs.onRemoved.addListener((tabId) => { void importeur.geschlossen(tabId).catch(() => {}); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.appOrigin) void importeur.verwerfen().catch(() => {});
});
