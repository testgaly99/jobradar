-- Nur isolierte lokale Testdatenbank, 017 vorher zweimal ausführen.
begin;
do $$ begin
  if current_setting('jobradar.offline_test',true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
  if has_table_privilege('anon','public.wunschfirmen','SELECT')
     or has_table_privilege('anon','public.abgleich_stichwoerter','SELECT')
     or has_table_privilege('authenticated','public.firmen_gesundheit','SELECT')
     or has_table_privilege('authenticated','public.digest_stand','SELECT')
     or has_table_privilege('authenticated','public.digest_versand','SELECT')
     or has_function_privilege('authenticated','public.speichere_firmen_gesundheit(date,jsonb)','EXECUTE') then
    raise exception 'Unzulässige Wunsch-/Gesundheitsrechte';
  end if;
end $$;
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000004f01'),('00000000-0000-0000-0000-000000004f02');
insert into public.admins(user_id) values
 ('00000000-0000-0000-0000-000000004f01'),('00000000-0000-0000-0000-000000004f02');
insert into public.companies(name,aktiv,fuer_alle,herkunft) values
 ('Offline-4f-Privat',true,false,'nutzer'),('Offline-4f-Alle',true,true,'datei');
insert into public.firmen_sichtbar(unternehmen,owner_id)
 values('Offline-4f-Privat','00000000-0000-0000-0000-000000004f01');
insert into public.jobs(id,unternehmen,titel,erstmals_gesehen,status,sichtbar)
 values('Offline-4f-Alle:1','Offline-4f-Alle','Datenanalyse',current_date,'offen',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004f01',true);
insert into public.wunschfirmen(unternehmen) values('Offline-4f-Privat');
insert into public.abgleich_stichwoerter(begriff) select 'Offline-Wort-'||n from generate_series(1,50) n;
do $$ begin
  begin
    insert into public.abgleich_stichwoerter(begriff) values('Offline-Wort-51');
    raise exception 'Limit 50 nicht erzwungen';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'abgleich_stichwoerter_limit' then raise; end if;
  end;
  if (select count(*) from public.abgleich_stichwoerter)<>50 then
    raise exception 'Eigene Stichwörter unvollständig';
  end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004f02',true);
do $$ begin
  if exists(select 1 from public.wunschfirmen) or exists(select 1 from public.abgleich_stichwoerter) then
    raise exception 'Fremde Wünsche oder Stichwörter sichtbar';
  end if;
  begin
    insert into public.wunschfirmen(unternehmen) values('Offline-4f-Privat');
    raise exception 'Private Fremdfirma als Wunsch akzeptiert';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.abgleich_stichwoerter(owner_id,begriff)
      values('00000000-0000-0000-0000-000000004f01','Fremder Eintrag');
    raise exception 'Fremde Stichwörter veränderbar';
  exception when insufficient_privilege then null;
  end;
end $$;
insert into public.wunschfirmen(unternehmen) values('Offline-4f-Alle');
insert into public.abgleich_stichwoerter(begriff) values('  Daten  ');
do $$ begin
  begin
    insert into public.abgleich_stichwoerter(begriff) values('daten');
    raise exception 'Normalisierte Dublette akzeptiert';
  exception when unique_violation then null;
  end;
end $$;
reset role;

set local role service_role;
do $$ declare f jsonb; begin
  f:=public.digest_fenster('00000000-0000-0000-0000-000000004f01',current_date-1);
  f:=public.digest_fenster('00000000-0000-0000-0000-000000004f01',current_date);
  if (f->>'ab')::date<>current_date-1 then raise exception 'Digest-Cursor bei Wiederholung verloren'; end if;
  perform public.digest_erfolg('00000000-0000-0000-0000-000000004f01',array['Offline-4f-Alle:1'],current_date-1);
  f:=public.digest_fenster('00000000-0000-0000-0000-000000004f01',current_date-1);
  if jsonb_array_length(f->'gesendet_ids')<>1 then raise exception 'Heutige Zustellung nicht gemerkt'; end if;
  f:=public.digest_fenster('00000000-0000-0000-0000-000000004f02',current_date-1);
  if jsonb_array_length(f->'gesendet_ids')<>0 then raise exception 'Digest-Admins vermischt'; end if;
end $$;
select public.speichere_firmen_gesundheit(current_date,jsonb_build_array(
  jsonb_build_object('name','Offline-4f-Privat','gefunden',4,'fehler','')));
do $$ begin
  if (select count(*) from public.firmen_gesundheit where unternehmen='Offline-4f-Privat')<>1 then
    raise exception 'Private Gesundheitszeile fehlt';
  end if;
end $$;
reset role;
rollback;
