-- Nur isolierte lokale Prüfdatenbank mit Migrationen bis 018 (018 vorher zweimal). Rollt alles zurück.
begin;
do $$ begin
  if current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
  if has_table_privilege('anon','public.cv_texte','SELECT') or has_table_privilege('anon','public.cv_ergebnisse','SELECT')
     or has_table_privilege('anon','public.cv_einwilligung','SELECT') or has_table_privilege('anon','public.cv_profile','SELECT') then
    raise exception 'Gast hat Rechte auf CV-Tabellen';
  end if;
end $$;

insert into auth.users(id) values ('00000000-0000-0000-0000-0000000006a1'),('00000000-0000-0000-0000-0000000006a2');
insert into public.documents(id,owner_id,art,name) values
 ('00000000-0000-0000-0000-00000000c0a1','00000000-0000-0000-0000-0000000006a1','cv','CV A'),
 ('00000000-0000-0000-0000-00000000c0a2','00000000-0000-0000-0000-0000000006a1','anlage','Zeugnis A'),
 ('00000000-0000-0000-0000-00000000c0b1','00000000-0000-0000-0000-0000000006a2','cv','CV B');
insert into public.companies(name,aktiv) values('Offline-6a',true);
insert into public.jobs(id,unternehmen,titel,status,sichtbar,anforderungs_hash) values('Offline-6a:1','Offline-6a','Analyst','offen',true,'h1');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006a1',true);
insert into public.cv_einwilligung default values;
insert into public.cv_texte(dokument_id,text,herkunft,hash) values('00000000-0000-0000-0000-00000000c0a1','SQL','ausgelesen','t1');
do $$ begin
  begin
    insert into public.cv_texte(dokument_id,text,herkunft,hash) values('00000000-0000-0000-0000-00000000c0a2','x','ausgelesen','t');
    raise exception 'CV-Text zu einer Anlage angenommen' using errcode='P0002';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.cv_texte(dokument_id,text,herkunft,hash) values('00000000-0000-0000-0000-00000000c0b1','x','ausgelesen','t');
    raise exception 'CV-Text zu fremdem Dokument angenommen' using errcode='P0002';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.documents set standard = true where owner_id = auth.uid();
    raise exception 'Zwei Standard-CVs angenommen' using errcode='P0002';
  exception when unique_violation then null;
  end;
end $$;
reset role;

-- Nachtlauf schreibt Ergebnis und Profil mit den echten Server-Rechten.
set local role service_role;
insert into public.cv_profile(dokument_id,owner_id,text_hash,aussagen)
  values('00000000-0000-0000-0000-00000000c0a1','00000000-0000-0000-0000-0000000006a1','t1','[]');
insert into public.cv_ergebnisse(owner_id,job_id,weg,empfohlen,geprueft,anforderungen,anforderungs_hash,cv_hashes)
  values('00000000-0000-0000-0000-0000000006a1','Offline-6a:1','claude','{00000000-0000-0000-0000-00000000c0a1}',
         '{00000000-0000-0000-0000-00000000c0a1}','[]','h1','{}');
do $$ begin
  begin
    insert into public.cv_ergebnisse(owner_id,weg,empfohlen,geprueft,anforderungen,anforderungs_hash,cv_hashes)
      values('00000000-0000-0000-0000-0000000006a1','claude','{}','{}','[]','h','{}');
    raise exception 'Ergebnis ohne Ziel angenommen' using errcode='P0002';
  exception when check_violation then null;
  end;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006a2',true);
do $$ begin
  if exists(select 1 from public.cv_texte) or exists(select 1 from public.cv_profile)
     or exists(select 1 from public.cv_ergebnisse) or exists(select 1 from public.cv_einwilligung) then
    raise exception 'Fremde CV-Daten sichtbar';
  end if;
  delete from public.cv_ergebnisse;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000006a1',true);
do $$ begin
  if (select count(*) from public.cv_ergebnisse)<>1 or (select count(*) from public.cv_einwilligung)<>1 then
    raise exception 'Eigene Daten fehlen oder wurden fremd gelöscht';
  end if;
  update public.cv_texte set hash='t2', text='SQL, Python', herkunft='korrigiert';
  if exists(select 1 from public.cv_ergebnisse) then raise exception 'Ergebnis nach CV-Änderung nicht gelöscht'; end if;
end $$;
reset role;

-- Geänderte Anforderungen einer Stelle löschen deren Ergebnisse (Nachtlauf, service_role).
set local role service_role;
insert into public.cv_ergebnisse(owner_id,job_id,weg,empfohlen,geprueft,anforderungen,anforderungs_hash,cv_hashes)
  values('00000000-0000-0000-0000-0000000006a1','Offline-6a:1','claude','{}','{}','[]','h1','{}');
update public.jobs set anforderungs_hash='h1' where id='Offline-6a:1';
do $$ begin if (select count(*) from public.cv_ergebnisse)<>1 then raise exception 'Unveränderter Hash löschte Ergebnis'; end if; end $$;
update public.jobs set anforderungs_hash='h2' where id='Offline-6a:1';
do $$ begin if exists(select 1 from public.cv_ergebnisse) then raise exception 'Ergebnis nach Anforderungsänderung nicht gelöscht'; end if; end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin
    perform 1 from public.cv_texte;
    raise exception 'Gast liest CV-Texte' using errcode='P0002';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
