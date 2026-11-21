-- Nur isolierte lokale Testdatenbank. 020 vorher zweimal prüfen, niemals live ausführen.
begin;
do $$ begin
  if current_setting('jobradar.offline_test',true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
  if has_function_privilege('authenticated','public.setze_original(uuid,uuid,timestamptz,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.setze_original(uuid,uuid,timestamptz,jsonb)','EXECUTE') then
    raise exception 'Service-Abschluss für Nutzer offen';
  end if;
end $$;
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000004701'),('00000000-0000-0000-0000-000000004702');
insert into public.applications(id,owner_id,firma,titel,link,original_suche) values
 ('00000000-0000-0000-0000-000000004711','00000000-0000-0000-0000-000000004701','Mein Firmenname','Mein Titel','https://www.indeed.de/viewjob?jk=offline-a','offen'),
 ('00000000-0000-0000-0000-000000004712','00000000-0000-0000-0000-000000004701','Schon vorhanden','Datenanalyse','https://karriere.example.invalid/1',null),
 ('00000000-0000-0000-0000-000000004713','00000000-0000-0000-0000-000000004702','Fremde Firma','Fremder Titel','https://www.indeed.de/viewjob?jk=offline-b','offen'),
 ('00000000-0000-0000-0000-000000004714','00000000-0000-0000-0000-000000004701','Duplikatsuche','Data Analyst','https://www.indeed.de/viewjob?jk=offline-c','offen'),
 ('00000000-0000-0000-0000-000000004715','00000000-0000-0000-0000-000000004701','Manuelle Korrektur','Data Analyst','https://www.indeed.de/viewjob?jk=offline-d','offen'),
 ('00000000-0000-0000-0000-000000004719','00000000-0000-0000-0000-000000004701','Weitere Stelle','Data Analyst','https://www.indeed.de/viewjob?jk=offline-e','offen');

-- Zwei Stellen können sich schon seit 003 eine Karriereseite teilen. Altbestand mit manueller Dublette nachstellen.
insert into public.jobs(id,url) values
 ('offline:020-a','https://karriere.example.invalid/gesamt'),
 ('offline:020-b','https://karriere.example.invalid/gesamt'),
 ('offline:020-c','https://karriere.example.invalid/gesamt');
alter table public.applications disable trigger original_dubletten_schutz;
insert into public.applications(id,owner_id,job_id,link,original_suche) values
 ('00000000-0000-0000-0000-000000004716','00000000-0000-0000-0000-000000004701',null,'https://karriere.example.invalid/alt','offen'),
 ('00000000-0000-0000-0000-000000004717','00000000-0000-0000-0000-000000004701','offline:020-a','https://karriere.example.invalid/alt',null);
alter table public.applications enable trigger original_dubletten_schutz;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004702',true);
do $$ begin
  if exists(select 1 from public.applications where id='00000000-0000-0000-0000-000000004711') then
    raise exception 'Fremde Bewerbung sichtbar';
  end if;
  update public.applications set original_suche='gefunden' where id='00000000-0000-0000-0000-000000004711';
  if found then raise exception 'Fremde Auswahl veränderbar'; end if;
  begin
    update public.applications set original_dublette='00000000-0000-0000-0000-000000004711'
      where id='00000000-0000-0000-0000-000000004713';
    raise exception 'Kontofremder Dublettenverweis akzeptiert';
  exception when foreign_key_violation then null;
  end;
end $$;
reset role;

set local role service_role;
do $$ declare version timestamptz; erg jsonb; begin
  select geaendert_am into version from public.applications where id='00000000-0000-0000-0000-000000004711';
  erg=public.setze_original('00000000-0000-0000-0000-000000004711','00000000-0000-0000-0000-000000004702',version,'{"original_suche":"nicht_gefunden"}');
  if erg->>'status'<>'veraltet' then raise exception 'Falscher Owner akzeptiert'; end if;
  erg=public.setze_original('00000000-0000-0000-0000-000000004711','00000000-0000-0000-0000-000000004701',version-interval '1 second','{"original_suche":"nicht_gefunden"}');
  if erg->>'status'<>'veraltet' then raise exception 'Veralteter Stand akzeptiert'; end if;
  erg=public.setze_original('00000000-0000-0000-0000-000000004711','00000000-0000-0000-0000-000000004701',version,
    '{"original_suche":"gefunden","link":"https://karriere.example.invalid/2","portal_link":"https://www.indeed.de/viewjob?jk=offline-a","firma":"Automatisch","titel":"Automatisch","snapshot_text":"Öffentlicher Anzeigentext"}');
  if erg->>'status'<>'gespeichert' then raise exception 'Abschluss fehlgeschlagen'; end if;
  if not exists(select 1 from public.applications where id='00000000-0000-0000-0000-000000004711'
    and firma='Mein Firmenname' and titel='Mein Titel' and snapshot_text='Öffentlicher Anzeigentext'
    and link='https://karriere.example.invalid/2' and portal_link='https://www.indeed.de/viewjob?jk=offline-a') then
    raise exception 'Nutzerfelder überschrieben oder Original nicht gespeichert';
  end if;
  select geaendert_am into version from public.applications where id='00000000-0000-0000-0000-000000004714';
  erg=public.setze_original('00000000-0000-0000-0000-000000004714','00000000-0000-0000-0000-000000004701',version,
    '{"original_suche":"gefunden","link":"https://karriere.example.invalid/1","snapshot_text":"Nicht übernehmen"}');
  if erg->>'status'<>'doppelt' or erg->>'bewerbung_id'<>'00000000-0000-0000-0000-000000004712' then
    raise exception 'Service-Dublette nicht richtig erkannt';
  end if;
  if not exists(select 1 from public.applications where id='00000000-0000-0000-0000-000000004714'
     and original_suche='nicht_gefunden' and original_dublette='00000000-0000-0000-0000-000000004712'
     and original_vorschlaege is null and original_wahl is null
     and link='https://www.indeed.de/viewjob?jk=offline-c' and snapshot_text is null) then
    raise exception 'Suchende Bewerbung bei Dublette falsch verändert';
  end if;
  if not exists(select 1 from public.applications where id='00000000-0000-0000-0000-000000004712'
     and firma='Schon vorhanden' and snapshot_text is null and link='https://karriere.example.invalid/1') then
    raise exception 'Bestehende Originalbewerbung bei Dublette verändert';
  end if;
  select geaendert_am into version from public.applications where id='00000000-0000-0000-0000-000000004716';
  erg=public.setze_original('00000000-0000-0000-0000-000000004716','00000000-0000-0000-0000-000000004701',version,
    '{"original_suche":"nicht_gefunden"}');
  if erg->>'status'<>'gespeichert' then raise exception 'Unveränderte Alt-URL blockiert Suchzustand'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000004701',true);
do $$ begin
  update public.applications set titel='Korrigierter Titel',link='https://karriere.example.invalid/alt'
    where id='00000000-0000-0000-0000-000000004716';
  if not exists(select 1 from public.applications where id='00000000-0000-0000-0000-000000004716'
      and titel='Korrigierter Titel' and link='https://karriere.example.invalid/alt') then
    raise exception 'Gleichbleibender Alt-Link verhindert normale Bearbeitung';
  end if;
  update public.applications set link='https://karriere.example.invalid/gesamt'
    where id='00000000-0000-0000-0000-000000004717';
  insert into public.applications(id,job_id,link) values
    ('00000000-0000-0000-0000-000000004718','offline:020-b','https://karriere.example.invalid/gesamt');
  if (select count(*) from public.applications where link='https://karriere.example.invalid/gesamt')<>2 then
    raise exception 'Verschiedene Stellen derselben Karriereseite werden zusammengefasst';
  end if;
  begin
    insert into public.applications(link) values('https://karriere.example.invalid/gesamt');
    raise exception 'Zusätzliche manuelle Dublette zur Karriereseite akzeptiert';
  exception when unique_violation then null;
  end;
  begin
    update public.applications set portal_link='https://karriere.example.invalid/gesamt'
      where id='00000000-0000-0000-0000-000000004716';
    raise exception 'Neu kollidierende Portal-URL akzeptiert';
  exception when unique_violation then null;
  end;
  update public.applications set link='https://eigene.example.invalid/hand'
    where id='00000000-0000-0000-0000-000000004715';
  if not exists(select 1 from public.applications where id='00000000-0000-0000-0000-000000004715'
      and original_suche='nicht_gefunden' and link='https://eigene.example.invalid/hand') then
    raise exception 'Manuelle Linkkorrektur lässt alte Suche offen';
  end if;
  begin
    insert into public.applications(link) values('https://www.indeed.de/viewjob?jk=offline-a');
    raise exception 'Dublettenportal-Link akzeptiert';
  exception when unique_violation then null;
  end;
  begin
    update public.applications set link='https://karriere.example.invalid/2' where id='00000000-0000-0000-0000-000000004712';
    raise exception 'Doppeltes Original akzeptiert';
  exception when unique_violation then null;
  end;
end $$;
reset role;

-- Gleiche öffentliche URL bei anderem Nutzer ist erlaubt und keine Dubletteninformation.
set local role service_role;
do $$ declare version timestamptz; erg jsonb; begin
  select geaendert_am into version from public.applications where id='00000000-0000-0000-0000-000000004713';
  erg=public.setze_original('00000000-0000-0000-0000-000000004713','00000000-0000-0000-0000-000000004702',version,
    '{"original_suche":"gefunden","link":"https://karriere.example.invalid/2"}');
  if erg->>'status'<>'gespeichert' then raise exception 'Fremde Dublette beeinflusst eigenes Konto'; end if;
  select geaendert_am into version from public.applications where id='00000000-0000-0000-0000-000000004719';
  erg=public.setze_original('00000000-0000-0000-0000-000000004719','00000000-0000-0000-0000-000000004701',version,
    '{"original_suche":"gefunden","job_id":"offline:020-c","link":"https://karriere.example.invalid/gesamt"}');
  if erg->>'status'<>'gespeichert' then raise exception 'Andere Job-ID derselben URL blockiert Original-Abschluss'; end if;
end $$;
reset role;
delete from public.applications where id='00000000-0000-0000-0000-000000004712';
do $$ begin
  if not exists(select 1 from public.applications where id='00000000-0000-0000-0000-000000004714' and original_dublette is null) then
    raise exception 'Löschen des Dublettenziels löscht die suchende Bewerbung';
  end if;
end $$;
rollback;
