-- Nur vorbereitete isolierte Abnahme nach Migration 011. Keine Migration ausführen.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() <> 'jobradar_ranking_test'
     or current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Nur für isolierte Ranking-Testdatenbank';
  end if;
end $$;
create function pg_temp.pruefe(ok boolean, hinweis text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Fehlgeschlagen: %', hinweis; end if;
end $$;
insert into public.companies(name, aktiv, groesse_klasse, kategorie) values
 ('Groesse-Test 0', true, '<50', array['Technik']),
 ('Groesse-Test 1', true, '50–249', array['Technik']),
 ('Groesse-Test 2', true, '250–999', array['Technik']),
 ('Groesse-Test 3', true, '1.000+', array['Technik']),
 ('Groesse-Test 99', true, null, array['Technik']);
insert into public.jobs(id, unternehmen, titel, status, sichtbar, erstmals_gesehen)
select 'Groesse-Test ' || r || ':' || lpad(i::text, 3, '0'), 'Groesse-Test ' || r, 'Künstliche Stelle', 'offen', true, current_date
from unnest(array[0,1,2,3,99]) r cross join generate_series(1, 55) i;
insert into public.ranking_listen(id, name, herausgeber, aktiv) values ('groesse-test', 'Künstliche Größenliste', 'Test', true);
insert into public.ranking_ausgaben(id, liste_id, jahr, veroeffentlicht_am, geprueft_am, quelle_url, lizenz, gueltig_bis, freigegeben)
values ('groesse-test-1', 'groesse-test', 2026, current_date-1, current_date, 'https://example.invalid/test', 'Künstlich', current_date+30, true);
insert into public.ranking_firmen(ausgabe_id, unternehmen)
select 'groesse-test-1', name from public.companies where name like 'Groesse-Test %';

set local role authenticated;
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['groesse-test'])) = 275, 'Alle fünf Klassen enthalten');
select pg_temp.pruefe((select id from public.ranking_stellen(array['groesse-test']) order by companies->'groesse_rang', erstmals_gesehen desc, id offset 50 limit 1)
 = 'Groesse-Test 0:051', 'Seite zwei beginnt weiterhin bei kleinster Klasse');
select pg_temp.pruefe((select id from public.ranking_stellen(array['groesse-test']) order by companies->'groesse_rang', erstmals_gesehen desc, id offset 55 limit 1)
 = 'Groesse-Test 1:001', 'Nächste Klasse erst nach allen kleinen Stellen');
select pg_temp.pruefe((select id from public.ranking_stellen(array['groesse-test']) order by companies->'groesse_rang', erstmals_gesehen desc, id offset 220 limit 1)
 = 'Groesse-Test 99:001', 'Unbekannte Größe zuletzt');
reset role;
set local role anon;
select pg_temp.pruefe((select groesse_rang from public.companies where name = 'Groesse-Test 3') = 3, 'Öffentlicher technischer Schlüssel lesbar');
select pg_temp.pruefe((select j.id from public.jobs j join public.companies c on c.name=j.unternehmen where c.name like 'Groesse-Test %'
 order by c.groesse_rang, j.erstmals_gesehen desc, j.id offset 55 limit 1) = 'Groesse-Test 1:001', 'Gast: globale Reihenfolge');
select pg_temp.pruefe(not has_column_privilege('anon', 'public.jobs', 'text', 'SELECT'), 'Gast erhält weiterhin keinen Textzugriff');
reset role;
rollback;
