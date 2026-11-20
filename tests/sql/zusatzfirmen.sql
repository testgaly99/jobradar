-- Nur isolierte lokale Prüfdatenbank mit Migrationen 001–016 (016 zuvor zweimal).
-- Statische Tests ersetzen diese Rollen-/Transaktionsprobe nicht.
begin;
do $$ begin
  if current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
  if has_table_privilege('anon','public.firmen_sichtbar','SELECT')
    or has_table_privilege('authenticated','public.firmen_sichtbar','INSERT')
    or has_function_privilege('authenticated','public.zusatzfirma_hinzufuegen(uuid,text,text,text,text)','EXECUTE')
    or has_function_privilege('authenticated','public.zusatzfirmen_meldung()','EXECUTE')
    or has_function_privilege('authenticated','public.bestand_privatisieren(text[])','EXECUTE') then
    raise exception 'Unzulässige Zusatzfirmenrechte';
  end if;
end $$;

insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000004e01'),('00000000-0000-0000-0000-000000004e02'),
 ('00000000-0000-0000-0000-000000004e03'),('00000000-0000-0000-0000-000000004e04'),
 ('00000000-0000-0000-0000-000000004e05');
insert into public.admins(user_id) values
 ('00000000-0000-0000-0000-000000004e01'),('00000000-0000-0000-0000-000000004e02');
insert into public.companies(name,ats_typ,ats_id,aktiv,fuer_alle)
 values('Offline-4e-Öffentlich','greenhouse','offline4epublic',true,true);

do $$ declare result jsonb; begin
  result := public.zusatzfirma_hinzufuegen('00000000-0000-0000-0000-000000004e03',
    'Offline-4e-Privat','https://boards.greenhouse.io/offline4e','greenhouse','offline4e');
  if result->>'status'<>'angelegt' then raise exception 'Erste Firma nicht angelegt'; end if;
  result := public.zusatzfirma_hinzufuegen('00000000-0000-0000-0000-000000004e03',
    'Öffentliche Firma','https://boards.greenhouse.io/offline4epublic','greenhouse','offline4epublic');
  if result->>'status'<>'vorhanden' or (select count(*) from public.firmen_sichtbar where
     unternehmen='Offline-4e-Öffentlich')<>0 then raise exception 'Öffentliche Firma dupliziert'; end if;
end $$;
insert into public.jobs(id,unternehmen,titel,status,sichtbar)
 values('Offline-4e-Privat:1','Offline-4e-Privat','Privater Engineer','offen',true);
insert into public.ranking_listen(id,name,herausgeber,aktiv,kategorie)
 values('offline-4e-liste','Offene Beispielliste','Beispielherausgeber',true,'Innovation');
insert into public.ranking_ausgaben(id,liste_id,jahr,veroeffentlicht_am,geprueft_am,quelle_url,lizenz,gueltig_bis,freigegeben,sichtbarkeit)
 values('offline-4e-liste-2026','offline-4e-liste',2026,current_date,current_date,
        'https://example.invalid/liste','Test',current_date+interval '12 months',true,'angemeldet');
insert into public.ranking_firmen(ausgabe_id,unternehmen,rang)
 values('offline-4e-liste-2026','Offline-4e-Privat',1);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004e03',true);
do $$ begin
  if not exists(select 1 from public.companies where name='Offline-4e-Privat')
    or not exists(select 1 from public.jobs where id='Offline-4e-Privat:1')
    or not exists(select 1 from public.ranking_kategorien(array['Offline-4e-Privat'])) then
    raise exception 'Eigene private Firma fehlt';
  end if;
  if not coalesce((public.facetten()->'firma') ? 'Offline-4e-Privat',false) then raise exception 'Eigene Facette fehlt'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004e04',true);
do $$ begin
  if exists(select 1 from public.companies where name='Offline-4e-Privat')
    or exists(select 1 from public.jobs where id='Offline-4e-Privat:1')
    or exists(select 1 from public.ranking_zuordnungen(array['Offline-4e-Privat']))
    or exists(select 1 from public.ranking_kategorien(array['Offline-4e-Privat']))
    or exists(select 1 from public.ranking_stellen('{}',array['Innovation']) where id='Offline-4e-Privat:1')
    or public.facetten()->'firma' ? 'Offline-4e-Privat' then
    raise exception 'Private Firma an anderes Konto geleakt';
  end if;
  delete from public.firmen_sichtbar where unternehmen='Offline-4e-Privat';
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if exists(select 1 from public.companies where name='Offline-4e-Privat')
    or exists(select 1 from public.jobs where id='Offline-4e-Privat:1')
    or public.facetten()->'firma' ? 'Offline-4e-Privat' then
    raise exception 'Private Firma an Gast geleakt';
  end if;
end $$;
reset role;
do $$ declare result jsonb; begin
  if (select count(*) from public.firmen_sichtbar where unternehmen='Offline-4e-Privat')<>1 then
    raise exception 'Fremdes Löschen war möglich';
  end if;
  result := public.zusatzfirma_hinzufuegen('00000000-0000-0000-0000-000000004e04',
    'Anderer Name','https://boards.greenhouse.io/offline4e','greenhouse','offline4e');
  if result->>'status'<>'verbunden' or (select count(*) from public.companies where ats_id='offline4e')<>1 then
    raise exception 'Portalidentität dupliziert';
  end if;
  if (select count(*) from public.firmen_sichtbar where unternehmen='Offline-4e-Privat')<>2 then
    raise exception 'Zweites Konto fehlt';
  end if;
  if exists(select 1 from public.zusatzfirmen_meldung() m
            where (to_jsonb(m) ? 'owner_id') or (to_jsonb(m) ? 'email')) then
    raise exception 'Meldeliste enthält Identitäten';
  end if;
  perform public.zusatzfirma_freigeben('00000000-0000-0000-0000-000000004e01','Offline-4e-Privat',false);
  if (select count(*) from public.firmen_sichtbar where unternehmen='Offline-4e-Privat')<>3 then
    raise exception 'Admin-Freigabe für mich fehlt';
  end if;
  begin
    perform public.zusatzfirma_freigeben('00000000-0000-0000-0000-000000004e04','Offline-4e-Privat',true);
    raise exception 'Nicht-Admin durfte freigeben' using errcode='P0002';
  exception when sqlstate 'P0001' then null;
  end;
end $$;

-- Nicht-Admin an der Grenze 50, eigene Wiederholung idempotent; Admin ohne Limit.
insert into public.companies(name,herkunft,fuer_alle,status,aktiv,ats_typ,ats_id)
 select 'Offline-4e-Limit-'||i,'nutzer',false,'aktiv',true,'ashby','offline4elimit'||i from generate_series(1,50) i;
insert into public.firmen_sichtbar(unternehmen,owner_id)
 select name,'00000000-0000-0000-0000-000000004e05'::uuid from public.companies where name like 'Offline-4e-Limit-%';
insert into public.firmen_sichtbar(unternehmen,owner_id)
 select name,'00000000-0000-0000-0000-000000004e02'::uuid from public.companies where name like 'Offline-4e-Limit-%';
do $$ declare result jsonb; begin
  result:=public.zusatzfirma_hinzufuegen('00000000-0000-0000-0000-000000004e05','Limit-Test',
    'https://jobs.ashbyhq.com/offline4e51','ashby','offline4e51');
  if result->>'status'<>'limit' then raise exception 'Limit 50 umgangen'; end if;
  result:=public.zusatzfirma_hinzufuegen('00000000-0000-0000-0000-000000004e05','Wiederholung',
    'https://jobs.ashbyhq.com/offline4elimit1','ashby','offline4elimit1');
  if result->>'status'<>'verbunden' then raise exception 'Idempotente Wiederholung am Limit blockiert'; end if;
  result:=public.zusatzfirma_hinzufuegen('00000000-0000-0000-0000-000000004e02','Admin-Limit-Test',
    'https://jobs.ashbyhq.com/offline4e51','ashby','offline4e51');
  if result->>'status'<>'angelegt' then raise exception 'Admin fälschlich begrenzt'; end if;
end $$;

insert into public.companies(name,ats_typ,ats_id,quellen,herkunft,fuer_alle,status,aktiv)
 values('Offline-4e-Bestand','greenhouse','offline4estock',array['bestand'],'datei',true,'aktiv',true);
do $$ begin
  if not public.bestand_privatisieren(array['Offline-4e-Bestand']) then raise exception 'Bestandsumzug fehlgeschlagen'; end if;
  if not public.bestand_privatisieren(array['Offline-4e-Bestand']) then raise exception 'Bestandsumzug nicht wiederholbar'; end if;
  if (select count(*) from public.firmen_sichtbar where unternehmen='Offline-4e-Bestand')<>2 then
    raise exception 'Nicht beide Admins zugeordnet';
  end if;
  begin
    perform public.sync_dateifirmen(jsonb_build_array(jsonb_build_object(
      'name','Offline-4e-Bestand','herkunft','datei','fuer_alle',true,'ats_typ','greenhouse','ats_id','offline4estock',
      'quellen',jsonb_build_array('bestand'),'status','aktiv','aktiv',true)));
    raise exception 'Veralteter Bestand wurde öffentlich' using errcode='P0002';
  exception when sqlstate 'P0001' then null;
  end;
  if (select fuer_alle from public.companies where name='Offline-4e-Bestand') then
    raise exception 'Veralteter Dateisync hat Datenschutz aufgehoben';
  end if;
  perform public.sync_dateifirmen(jsonb_build_array(jsonb_build_object(
    'name','Offline-4e-Bestand','herkunft','datei','fuer_alle',true,'ats_typ','greenhouse','ats_id','offline4estock',
    'quellen',jsonb_build_array('dax'),'status','aktiv','aktiv',true)));
  if not exists(select 1 from public.companies where name='Offline-4e-Bestand' and fuer_alle and herkunft='datei') then
    raise exception 'Echte Quellenübernahme nicht Dateifirma';
  end if;
  if (select count(*) from public.firmen_sichtbar where unternehmen='Offline-4e-Bestand')<>2 then
    raise exception 'Quellenübernahme hat private Zuordnungen beschädigt';
  end if;
end $$;

-- Kontolöschung räumt Zuordnungen auf; verwaiste Firmen werden im Backend übersprungen.
delete from auth.users where id='00000000-0000-0000-0000-000000004e05';
do $$ begin
  if exists(select 1 from public.firmen_sichtbar where owner_id='00000000-0000-0000-0000-000000004e05') then
    raise exception 'Kontolöschung ließ private Zuordnungen zurück';
  end if;
  if not exists(select 1 from jsonb_array_elements(public.firmen_fuer_nachtlauf()) f
     where f->>'name'='Offline-4e-Limit-1' and (f->>'nutzer')::integer=1) then
    raise exception 'Nutzerzählung nach Kontolöschung falsch';
  end if;
end $$;
rollback;
