-- Globale Größensortierung, nur als Datei vorbereitet. Vor Anwendung isoliert prüfen.
-- Voraussetzung: Migrationen 001..010. Kein neuer fachlicher Filter und keine neue Quelle.
-- Nach Abnahme vom Nutzer ausführen, danach erst passenden Webcode hochladen.
alter table public.companies add column if not exists groesse_rang integer
  generated always as (
    case groesse_klasse when '<50' then 0 when '50–249' then 1
      when '250–999' then 2 when '1.000+' then 3 else 99 end
  ) stored;
-- Ausschließlich die bereits öffentliche Größeninformation, keine Text-/Nutzerrechte ergänzen.
grant select (groesse_rang) on public.companies to anon;

-- Bestehende Signatur, Listenprüfung, security invoker und Rechte unverändert.
-- Nur der bestehende companies-JSON-Wert erhält den technischen Größenschlüssel.
create or replace function public.ranking_stellen(p_listen text[])
returns table(
  id text, unternehmen text, titel text, ort text, staedte text[], remote boolean,
  arbeitsmodell text, vertragsart text, abteilung text, erfahrungslevel text, url text,
  erstmals_gesehen date, text text, land text, groesse_klasse text, kategorie text[],
  companies jsonb, rang integer
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  eine_liste boolean;
begin
  if p_listen is null or coalesce(pg_catalog.cardinality(p_listen), 0) not between 1 and 100
     or pg_catalog.array_ndims(p_listen) is distinct from 1 then
    raise exception using errcode = '22023', message = 'Bitte zwischen 1 und 100 gültige Listen auswählen.';
  end if;
  if exists (
    select 1 from pg_catalog.unnest(p_listen) gewaehlt(id)
    where not exists (
      select 1 from public.ranking_listen l
      join public.ranking_ausgaben a on a.liste_id = l.id
      where l.id = gewaehlt.id and public.ranking_ausgabe_aktuell(a.id)
    )
  ) then
    raise exception using errcode = '22023', message = 'Eine ausgewählte Liste ist unbekannt oder nicht mehr verfügbar.';
  end if;
  select count(distinct gewaehlt.id) = 1 into eine_liste from pg_catalog.unnest(p_listen) gewaehlt(id);
  return query
    select j.id, j.unternehmen, j.titel, j.ort, j.staedte, j.remote,
      j.arbeitsmodell, j.vertragsart, j.abteilung, j.erfahrungslevel, j.url,
      j.erstmals_gesehen, j.text, j.land, c.groesse_klasse, c.kategorie,
      pg_catalog.jsonb_build_object('groesse_klasse', c.groesse_klasse, 'kategorie', c.kategorie, 'groesse_rang', c.groesse_rang),
      case when eine_liste then zuordnung.rang else null::integer end
    from public.jobs j
    join public.companies c on c.name = j.unternehmen and c.aktiv
    join lateral (
      select count(*) as anzahl, min(f.rang) as rang
      from public.ranking_firmen f
      join public.ranking_ausgaben a on a.id = f.ausgabe_id
      where f.unternehmen = j.unternehmen and a.liste_id = any(p_listen)
        and public.ranking_ausgabe_aktuell(a.id)
    ) zuordnung on zuordnung.anzahl > 0
    where j.status = 'offen' and j.sichtbar;
end;
$$;
revoke all on function public.ranking_stellen(text[]) from public, anon, authenticated;
grant execute on function public.ranking_stellen(text[]) to authenticated, service_role;
