-- Merk-Kategorien: Unterstufe einer gemerkten Bewerbung (neu / gemerkt / später).
-- Zuerst Default 'gemerkt' (füllt den Bestand), danach Default 'neu' für alle künftigen Zeilen.
-- Keine neue Policy: applications_own (001) deckt die Spalte ab. Mehrfach ausführbar.
alter table public.applications
  add column if not exists merk_stufe text not null default 'gemerkt'
  check (merk_stufe in ('neu','gemerkt','spaeter'));
alter table public.applications alter column merk_stufe set default 'neu';
