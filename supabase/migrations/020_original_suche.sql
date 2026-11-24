-- Phase 4g-1. Nur als Datei vorbereitet; setzt 012 und 016 voraus.
begin;
alter table public.applications
  add column if not exists portal_link text,
  add column if not exists original_suche text,
  add column if not exists original_vorschlaege jsonb,
  add column if not exists original_wahl integer,
  add column if not exists original_portal jsonb,
  add column if not exists original_dublette uuid references public.applications(id) on delete set null;
alter table public.applications drop constraint if exists original_suche_status;
alter table public.applications add constraint original_suche_status
  check(original_suche is null or original_suche in ('offen','auswahl','gefunden','nicht_gefunden'));
alter table public.applications drop constraint if exists original_suche_vorschlaege;
alter table public.applications add constraint original_suche_vorschlaege
  check(original_vorschlaege is null or (jsonb_typeof(original_vorschlaege)='array' and jsonb_array_length(original_vorschlaege)<=5));
alter table public.applications drop constraint if exists original_suche_wahl;
alter table public.applications add constraint original_suche_wahl
  check(original_wahl is null or (original_wahl between 0 and 4 and original_vorschlaege is not null
    and original_wahl<jsonb_array_length(original_vorschlaege)));
alter table public.applications drop constraint if exists original_suche_portal;
alter table public.applications add constraint original_suche_portal
  check(original_portal is null or (jsonb_typeof(original_portal)='object' and original_portal?'typ' and original_portal?'id'
    and jsonb_typeof(original_portal->'typ')='string' and jsonb_typeof(original_portal->'id')='string'));
create index if not exists applications_original_offen on public.applications(erstellt_am,id) where original_suche='offen';

-- Bestehende RLS bleibt unverändert. Sperre nur neue/umgehängte Dubletten,
-- auch wenn zwei Webprozesse gleichzeitig eine Originalstelle zuordnen.
create or replace function public.original_dubletten_schutz() returns trigger
language plpgsql security invoker set search_path='' as $$
declare neuer_job text:=new.job_id; neuer_link text:=new.link; neuer_portal_link text:=new.portal_link;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('original:'||new.owner_id::text,0));
  if new.original_dublette is not null and not exists(select 1 from public.applications a
      where a.id=new.original_dublette and a.owner_id=new.owner_id) then
    raise exception 'Ungültiger Dublettenverweis' using errcode='23503';
  end if;
  if tg_op='UPDATE' and old.original_suche in ('offen','auswahl') and new.link is distinct from old.link
     and new.original_suche is not distinct from old.original_suche then
    new.original_suche='nicht_gefunden';
    new.original_vorschlaege=null;
    new.original_wahl=null;
    new.original_portal=null;
    new.original_dublette=null;
  end if;
  if tg_op='UPDATE' and new.owner_id is not distinct from old.owner_id then
    -- Beide Linkfelder bezeichnen dieselbe Bewerbung. Eine bereits vorhandene URL bleibt auch beim Feldwechsel erhalten.
    neuer_job=case when new.job_id is distinct from old.job_id then new.job_id end;
    neuer_link=case when new.link is distinct from old.link and new.link is distinct from old.portal_link then new.link end;
    neuer_portal_link=case when new.portal_link is distinct from old.link and new.portal_link is distinct from old.portal_link
      then new.portal_link end;
  end if;
  if exists(select 1 from public.applications a where a.owner_id=new.owner_id and a.id<>new.id and (
      (neuer_job is not null and a.job_id=neuer_job)
      or ((new.job_id is null or a.job_id is null) and (
        (nullif(neuer_link,'') is not null and (a.link=neuer_link or a.portal_link=neuer_link))
        or (nullif(neuer_portal_link,'') is not null and (a.link=neuer_portal_link or a.portal_link=neuer_portal_link)))))) then
    raise exception 'Diese Stelle hast du schon' using errcode='23505';
  end if;
  return new;
end $$;
revoke all on function public.original_dubletten_schutz() from public, anon, authenticated;
drop trigger if exists original_dubletten_schutz on public.applications;
create trigger original_dubletten_schutz before insert or update of link,portal_link,job_id,owner_id,original_dublette
  on public.applications for each row execute function public.original_dubletten_schutz();

-- Nachtlauf: Benutzeridentität und gelesene Version werden zwingend mitgegeben.
-- Kein beliebiges Update über den Service-Schlüssel; ausschließlich Such-/Snapshotfelder.
create or replace function public.setze_original(p_id uuid,p_owner uuid,p_stand timestamptz,p_patch jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare alt public.applications%rowtype; doppelt uuid; ziel_link text; ziel_portal_link text; ziel_job text;
begin
  if p_owner is null or p_stand is null or jsonb_typeof(p_patch) is distinct from 'object'
     or exists(select 1 from jsonb_object_keys(p_patch) k where k not in (
       'job_id','link','portal_link','original_suche','original_vorschlaege','original_wahl','original_portal',
       'firma','titel','standort','praesenzmodell','snapshot_text','snapshot_abschnitte',
       'snapshot_steckbrief','snapshot_ki','nachruesten')) then
    raise exception 'Ungültiger Original-Abschluss';
  end if;
  select a.* into alt from public.applications a where a.id=p_id and a.owner_id=p_owner
    and a.geaendert_am=p_stand and a.job_id is null and a.original_suche='offen' for update;
  if not found then return jsonb_build_object('status','veraltet'); end if;
  -- Wie ein normales UPDATE: zuerst Zeile, dann Owner-Sperre des Triggers.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('original:'||p_owner::text,0));
  ziel_link=coalesce(p_patch->>'link',alt.link);
  ziel_portal_link=case when p_patch?'portal_link' then p_patch->>'portal_link' else alt.portal_link end;
  ziel_job=p_patch->>'job_id';
  select a.id into doppelt from public.applications a where a.owner_id=p_owner and a.id<>p_id
    and ((ziel_job is not null and a.job_id=ziel_job)
      or ((ziel_job is null or a.job_id is null) and (
        (nullif(ziel_link,'') is not null and ziel_link is distinct from alt.link and ziel_link is distinct from alt.portal_link
          and (a.link=ziel_link or a.portal_link=ziel_link))
        or (nullif(ziel_portal_link,'') is not null and ziel_portal_link is distinct from alt.link and ziel_portal_link is distinct from alt.portal_link
          and (a.link=ziel_portal_link or a.portal_link=ziel_portal_link))))) order by a.id limit 1;
  if doppelt is not null then
    update public.applications set original_suche='nicht_gefunden',original_vorschlaege=null,
      original_wahl=null,original_dublette=doppelt where id=p_id and owner_id=p_owner;
    return jsonb_build_object('status','doppelt','bewerbung_id',doppelt);
  end if;
  update public.applications set
    job_id=case when p_patch?'job_id' then p_patch->>'job_id' else job_id end,
    link=ziel_link,
    portal_link=ziel_portal_link,
    original_suche=case when p_patch?'original_suche' then p_patch->>'original_suche' else original_suche end,
    original_vorschlaege=case when p_patch?'original_vorschlaege' then nullif(p_patch->'original_vorschlaege','null'::jsonb) else original_vorschlaege end,
    original_wahl=case when p_patch?'original_wahl' then (p_patch->>'original_wahl')::integer else original_wahl end,
    original_portal=case when p_patch?'original_portal' then nullif(p_patch->'original_portal','null'::jsonb) else original_portal end,
    original_dublette=null,
    firma=coalesce(nullif(firma,''),p_patch->>'firma'),
    titel=coalesce(nullif(titel,''),p_patch->>'titel'),
    standort=coalesce(nullif(standort,''),p_patch->>'standort'),
    praesenzmodell=coalesce(nullif(praesenzmodell,''),p_patch->>'praesenzmodell'),
    snapshot_text=coalesce(nullif(snapshot_text,''),p_patch->>'snapshot_text'),
    snapshot_abschnitte=coalesce(snapshot_abschnitte,nullif(p_patch->'snapshot_abschnitte','null'::jsonb)),
    snapshot_steckbrief=coalesce(snapshot_steckbrief,nullif(p_patch->'snapshot_steckbrief','null'::jsonb)),
    snapshot_ki=coalesce(snapshot_ki,nullif(p_patch->'snapshot_ki','null'::jsonb)),
    nachruesten=case when p_patch?'nachruesten' then (p_patch->>'nachruesten')::boolean else nachruesten end
    where id=p_id and owner_id=p_owner;
  return jsonb_build_object('status','gespeichert');
end $$;
revoke all on function public.setze_original(uuid,uuid,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.setze_original(uuid,uuid,timestamptz,jsonb) to service_role;
commit;
