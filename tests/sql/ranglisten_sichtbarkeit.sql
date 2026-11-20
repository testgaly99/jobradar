-- Nur isolierte lokale Datenbank mit Migrationen 001–015. 015 davor zweimal ausführen.
begin;
do $$ begin
  if current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
  if has_function_privilege('anon','public.ranking_stellen(text[],text[])','EXECUTE')
    or has_function_privilege('anon','public.ranking_kategorien(text[])','EXECUTE')
    or has_function_privilege('authenticated','public.speichere_handliste(jsonb)','EXECUTE')
    or has_table_privilege('authenticated','public.admins','SELECT') then
    raise exception 'Unzulässige Rechte';
  end if;
end $$;

insert into auth.users(id) values ('00000000-0000-0000-0000-000000004d01'),('00000000-0000-0000-0000-000000004d02'),('00000000-0000-0000-0000-000000004d03');
insert into public.admins(user_id) values ('00000000-0000-0000-0000-000000004d01'),('00000000-0000-0000-0000-000000004d02');
insert into public.companies(name,aktiv) values('Offline-4d-A',true),('Offline-4d-B',true);
insert into public.ranking_listen(id,name,herausgeber,aktiv,kategorie)
 values ('hand-offline','Beispielliste','Beispielherausgeber',true,'Innovation');
insert into public.ranking_ausgaben(id,liste_id,jahr,veroeffentlicht_am,geprueft_am,quelle_url,lizenz,gueltig_bis,freigegeben,sichtbarkeit)
 values ('hand-offline-2026','hand-offline',2026,current_date,current_date,'https://example.invalid/liste','Prüfbeispiel',current_date+interval '12 months',true,'admin');
insert into public.ranking_firmen(ausgabe_id,unternehmen,rang) values ('hand-offline-2026','Offline-4d-A',1);
insert into public.jobs(id,unternehmen,titel,status,sichtbar)
 values('Offline-4d-A:1','Offline-4d-A','Engineer','offen',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004d03',true);
do $$ begin
  if public.ist_admin() or exists(select 1 from public.ranking_zuordnungen(array['Offline-4d-A'])) then
    raise exception 'Admin-Liste an normalen Nutzer geleakt';
  end if;
  if not exists(select 1 from public.ranking_kategorien(array['Offline-4d-A']) where kategorie='Innovation') then
    raise exception 'Freigegebene Kategorie fehlt';
  end if;
  if (select count(*) from public.ranking_stellen('{}',array['Innovation']) where id='Offline-4d-A:1')<>1 then
    raise exception 'Kategorie-Filter ohne Listenrechte fehlt';
  end if;
  if exists(select 1 from public.ranking_stellen('{}',array['Innovation']) where rang is not null) then
    raise exception 'Kategorie-Filter leakt Rang';
  end if;
  begin
    perform * from public.ranking_stellen(array['hand-offline']);
    raise exception using errcode='ZX001',message='Admin-Liste erratbar';
  exception when invalid_parameter_value then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004d01',true);
do $$ begin
  if not public.ist_admin() or not exists(select 1 from public.ranking_zuordnungen(array['Offline-4d-A'])) then
    raise exception 'Erster Admin sieht Liste nicht';
  end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004d02',true);
do $$ begin if not public.ist_admin() then raise exception 'Zweiter Admin fehlt'; end if; end $$;
reset role;

-- Zweiter Teil ergänzt, ursprüngliche Frist bleibt erhalten. Rangkonflikt muss atomar scheitern.
do $$
declare daten jsonb; vorher date;
begin
  select gueltig_bis into vorher from public.ranking_ausgaben where id='hand-offline-2026';
  daten=jsonb_build_object(
    'liste',jsonb_build_object('id','hand-offline','name','Beispielliste','herausgeber','Beispielherausgeber','aktiv',true,'kategorie','Innovation'),
    'ausgabe',jsonb_build_object('id','hand-offline-2026','liste_id','hand-offline','jahr',2026,'veroeffentlicht_am',current_date,
      'geprueft_am',current_date,'quelle_url','https://example.invalid/liste','lizenz','Prüfbeispiel','gueltig_bis',current_date+interval '13 months','freigegeben',true,'sichtbarkeit','admin'),
    'firmen',jsonb_build_array(jsonb_build_object('unternehmen','Offline-4d-B','rang',2)), 'neueFirmen','[]'::jsonb);
  perform public.speichere_handliste(daten);
  if (select count(*) from public.ranking_firmen where ausgabe_id='hand-offline-2026')<>2
     or (select gueltig_bis from public.ranking_ausgaben where id='hand-offline-2026')<>vorher then
    raise exception 'Teilimport ersetzt Bestand oder verlängert Frist';
  end if;
  begin
    perform public.speichere_handliste(jsonb_set(daten,'{firmen}',jsonb_build_array(jsonb_build_object('unternehmen','Offline-4d-A','rang',9))));
    raise exception using errcode='ZX001',message='Rangkonflikt akzeptiert';
  exception when raise_exception then null;
  end;
end $$;
rollback;
