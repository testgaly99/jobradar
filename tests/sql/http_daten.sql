-- Ausschließlich Fixture für getrennte HTTP-Verbindungen; absichtlich COMMIT statt Rollback.
-- Nur nach gesonderter Freigabe im leeren isolierten Testschema ausführen, nie produktiv.
\set ON_ERROR_STOP on
begin;
\ir vorpruefung.sql
insert into public.companies(name, aktiv, groesse_klasse, kategorie)
select 'HTTP-Test ' || lpad(i::text,4,'0'), true,
  case when i<=57 then '<50' when i<=109 then '50–249' when i=110 then '250–999' when i=111 then '1.000+' else null end,
  array['Technik'] from generate_series(1,1005) i;
insert into public.jobs(id, unternehmen, titel, text, status, sichtbar, erstmals_gesehen, erfahrungslevel, staedte)
select 'HTTP-Test ' || lpad(i::text,4,'0') || ':1', 'HTTP-Test ' || lpad(i::text,4,'0'),
  'Künstliche Entwicklung', 'Ausschließlich künstlicher Anzeigentext', 'offen', true, current_date,
  case when i%2=0 then 'Senior' else 'Junior' end,
  case when i%2=0 then array['Berlin'] else array['Hamburg'] end from generate_series(1,1005) i;
insert into public.ranking_listen(id,name,herausgeber,aktiv)
values ('http-a','Künstliche HTTP-Liste A','Test',true), ('http-b','Künstliche HTTP-Liste B','Test',true);
insert into public.ranking_ausgaben(id,liste_id,jahr,veroeffentlicht_am,geprueft_am,quelle_url,lizenz,gueltig_bis,freigegeben)
select id || '-1', id, extract(year from current_date)::integer, current_date-1, current_date,
 'https://example.invalid/http-test','Nur künstliche Daten',current_date+30,true
from public.ranking_listen;
insert into public.ranking_firmen(ausgabe_id,unternehmen,rang)
select 'http-a-1','HTTP-Test ' || lpad(i::text,4,'0'),1006-i from generate_series(1,600) i
union all
select 'http-b-1','HTTP-Test ' || lpad(i::text,4,'0'),1006-i from generate_series(406,1005) i;

-- Nur im Testschema, niemals in produktive Migrationen übernehmen.
create function public.offline_testkennung() returns text
language sql stable security invoker set search_path='' as $$
  select case when current_database()='jobradar_ranking_test'
    and current_setting('jobradar.testdatenbank',true)='nur-kuenstliche-daten'
    then 'jobradar_ranking_test:nur-kuenstliche-daten' else null end;
$$;
revoke all on function public.offline_testkennung() from public;
grant execute on function public.offline_testkennung() to anon,authenticated;
notify pgrst, 'reload schema';
commit;
