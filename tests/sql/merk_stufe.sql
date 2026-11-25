-- Nur isolierte lokale Testdatenbank. 026 vorher zweimal prüfen, niemals live ausführen.
-- Voraussetzung: Vor Migration 026 wurde (als Postgres-Admin) eine Altzeile angelegt:
--   insert into auth.users(id) values ('00000000-0000-0000-0000-0000000026a1');
--   insert into public.applications(id,owner_id,firma) values ('00000000-0000-0000-0000-000000002611','00000000-0000-0000-0000-0000000026a1','Altbestand');
begin;
do $$ begin
  if current_setting('jobradar.offline_test',true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
  if (select merk_stufe from public.applications where id='00000000-0000-0000-0000-000000002611') is distinct from 'gemerkt' then
    raise exception 'Altbestand ist nicht gemerkt';
  end if;
end $$;
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000026a2') on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000026a1',true);
insert into public.applications(id,owner_id,firma) values ('00000000-0000-0000-0000-000000002612','00000000-0000-0000-0000-0000000026a1','Neu');
do $$ begin
  if (select merk_stufe from public.applications where id='00000000-0000-0000-0000-000000002612') is distinct from 'neu' then
    raise exception 'Neue Zeile startet nicht als neu';
  end if;
  update public.applications set merk_stufe='spaeter' where id='00000000-0000-0000-0000-000000002612';
  if (select merk_stufe from public.applications where id='00000000-0000-0000-0000-000000002612') <> 'spaeter' then
    raise exception 'Eigener Wechsel auf spaeter nicht möglich';
  end if;
  begin
    update public.applications set merk_stufe='xyz' where id='00000000-0000-0000-0000-000000002612';
    raise exception 'Wert xyz angenommen' using errcode='P0002';
  exception when check_violation then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000026a2',true);
do $$ declare n int; begin
  update public.applications set merk_stufe='neu' where id='00000000-0000-0000-0000-000000002611';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Fremdes Konto änderte merk_stufe' using errcode='P0002'; end if;
end $$;
reset role;
rollback;
