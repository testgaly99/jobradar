-- Öffentlicher Zugang: Besucher ohne Anmeldung (Rolle anon) lesen nur, was Stellenliste und Steckbrief brauchen.
-- Anzeigentext, Abschnitte, Kurzbeschreibung, Logos, Laufberichte und alle Nutzertabellen bleiben gesperrt –
-- die Datenbank selbst verweigert sie, auch bei direktem Zugriff mit dem öffentlichen Schlüssel.
-- Im Supabase SQL Editor ausführen (mehrfach ausführbar). Prüfen: in web/ `node --env-file=.env.local scripts/pruefe-anon.mjs`.

revoke all on public.jobs, public.companies, public.laeufe from anon;

grant select (id, unternehmen, titel, ort, staedte, remote, arbeitsmodell, vertragsart, abteilung, erfahrungslevel,
              url, erstmals_gesehen, status, sichtbar, land, steckbrief)
  on public.jobs to anon;
grant select (name, groesse_klasse, kategorie, aktiv) on public.companies to anon;
grant select (datum) on public.laeufe to anon;

alter table public.jobs enable row level security;
alter table public.companies enable row level security;
alter table public.laeufe enable row level security;

drop policy if exists jobs_select_anon on public.jobs;
create policy jobs_select_anon on public.jobs for select to anon using (sichtbar and status = 'offen');

drop policy if exists companies_select_anon on public.companies;
create policy companies_select_anon on public.companies for select to anon using (aktiv);

drop policy if exists laeufe_select_anon on public.laeufe;
create policy laeufe_select_anon on public.laeufe for select to anon using (true);

grant execute on function public.facetten() to anon;
