-- Keine Migration. Nur gegen zuvor ausdrücklich eingerichtetes künstliches Ziel.
\set ON_ERROR_STOP on
do $$ begin
  if current_database() <> 'jobradar_ranking_test'
     or current_setting('jobradar.testdatenbank', true) is distinct from 'nur-kuenstliche-daten'
     or current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Isolierte persistente Testkennung fehlt';
  end if;
  if exists(select 1 from public.applications) or exists(select 1 from public.documents)
     or exists(select 1 from public.contacts) or exists(select 1 from public.interviews)
     or exists(select 1 from auth.users)
     or exists(select 1 from public.jobs) or exists(select 1 from public.companies)
     or exists(select 1 from public.ranking_listen) then
    raise exception 'SQL-Probe und erstmalige HTTP-Einrichtung benötigen leeres Testschema';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public'
                and table_name='companies' and column_name='groesse_rang' and is_generated='ALWAYS') then
    raise exception 'Vorbereitete Migration 011 fehlt';
  end if;
end $$;
