-- Nur isolierte lokale Testdatenbank. Migration 028 vorher zweimal anwenden, niemals live ausführen.
-- Alle Daten sind künstlich und werden zurückgerollt.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
end $$;
create function pg_temp.pruefe(ok boolean, hinweis text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Fehlgeschlagen: %', hinweis; end if;
end $$;
insert into public.companies(name, aktiv, groesse_klasse, kategorie) values
 ('Gsort-0', true, '<50', array['Technik']), ('Gsort-3', true, '1.000+', array['Technik']), ('Gsort-X', true, null, array['Technik']);
insert into public.jobs(id, unternehmen, titel, status, sichtbar, erstmals_gesehen) values
 ('Gsort-0:1', 'Gsort-0', 'Künstlich', 'offen', true, current_date),
 ('Gsort-3:1', 'Gsort-3', 'Künstlich', 'offen', true, current_date),
 ('Gsort-X:1', 'Gsort-X', 'Künstlich', 'offen', true, current_date);
insert into public.ranking_listen(id, name, herausgeber, aktiv) values ('gsort-test', 'Künstliche Liste', 'Test', true);
insert into public.ranking_ausgaben(id, liste_id, jahr, veroeffentlicht_am, geprueft_am, quelle_url, lizenz, gueltig_bis, freigegeben)
values ('gsort-test-1', 'gsort-test', 2026, current_date-1, current_date, 'https://example.invalid/test', 'Künstlich', current_date+30, true);
insert into public.ranking_firmen(ausgabe_id, unternehmen) select 'gsort-test-1', name from public.companies where name like 'Gsort-%';

select pg_temp.pruefe((select groesse_sort from public.companies where name='Gsort-0') = 0
  and (select groesse_sort from public.companies where name='Gsort-3') = 3
  and (select groesse_sort from public.companies where name='Gsort-X') is null
  and (select groesse_rang from public.companies where name='Gsort-X') = 99, 'groesse_sort: 0..3, unbekannt NULL, groesse_rang unverändert 99');

set local role authenticated;
select pg_temp.pruefe((select array_agg(id order by (companies->>'groesse_sort')::int asc nulls last, id) from public.ranking_stellen(array['gsort-test']))
  = array['Gsort-0:1','Gsort-3:1','Gsort-X:1'], 'rpc aufsteigend: unbekannt zuletzt');
select pg_temp.pruefe((select array_agg(id order by (companies->>'groesse_sort')::int desc nulls last, id) from public.ranking_stellen(array['gsort-test']))
  = array['Gsort-3:1','Gsort-0:1','Gsort-X:1'], 'rpc absteigend: unbekannt zuletzt');
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['gsort-test']) where companies ? 'groesse_rang'
  and (companies ? 'groesse_sort')) = 3, 'ranking_stellen behält groesse_rang und liefert groesse_sort');
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['gsort-test']) where deutsch_stufe is null and passung_sortwert is null) = 3,
  'deutsch_stufe und passung_sortwert weiter vorhanden');
reset role;

set local role anon;
select pg_temp.pruefe((select groesse_sort from public.companies where name='Gsort-3') = 3, 'Gast liest groesse_sort');
select pg_temp.pruefe(not has_function_privilege('anon', 'public.ranking_stellen(text[],text[])', 'execute'), 'Gast darf ranking_stellen weiter nicht ausführen');
reset role;
rollback;
