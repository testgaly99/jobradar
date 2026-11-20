-- Ausschließlich in einer isolierten lokalen Prüfdatenbank, niemals live.
-- Voraussetzung: Migrationen 001–014 eingespielt (014 zur Idempotenz zweimal).
begin;
do $$ begin
  if current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Nur mit lokaler Offline-Testkennung ausführen';
  end if;
  if has_function_privilege('anon', 'public.importiere_ranking_ausgabe(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.importiere_ranking_ausgabe(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.bereinige_ranking_ausgaben()', 'EXECUTE') then
    raise exception 'Unzulässige Schreibrechte';
  end if;
  if not has_function_privilege('service_role', 'public.importiere_ranking_ausgabe(jsonb)', 'EXECUTE') then
    raise exception 'Service-Recht fehlt';
  end if;
end $$;

insert into public.companies(name, wikidata_id, quellen, status)
values ('Offline-4c-A', 'Q999999991', array['dax'], 'offen');

select public.importiere_ranking_ausgabe(jsonb_build_object(
  'ranking_listen', jsonb_build_array(jsonb_build_object(
    'id','offline-4c','name','Offline-Test','herausgeber','Wikidata','aktiv',true)),
  'ranking_ausgaben', jsonb_build_array(jsonb_build_object(
    'id','offline-4c-1','liste_id','offline-4c','jahr',2026,
    'veroeffentlicht_am',current_date,'geprueft_am',current_date,
    'quelle_url','https://www.wikidata.org/','lizenz','CC0',
    'gueltig_bis',(current_date + interval '12 months')::date,'freigegeben',true)),
  'ranking_firmen', jsonb_build_array(jsonb_build_object(
    'ausgabe_id','offline-4c-1','unternehmen','Offline-4c-A','rang',1))
));

do $$ begin
  if (select count(*) from public.ranking_firmen where ausgabe_id='offline-4c-1') <> 1 then
    raise exception 'Import unvollständig';
  end if;
  begin
    insert into public.companies(name, wikidata_id) values ('Offline-4c-B','Q999999991');
    raise exception 'Doppelte Wikidata-ID akzeptiert';
  exception when unique_violation then null;
  end;
  begin
    update public.companies set status='unbekannt' where name='Offline-4c-A';
    raise exception 'Unbekannter Status akzeptiert';
  exception when check_violation then null;
  end;
end $$;
rollback;
