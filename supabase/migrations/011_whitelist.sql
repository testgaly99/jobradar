-- Whitelist (Q45–Q47): Bei Firmen auf der Whitelist blendet "Studium: nein" keine Stelle aus.
-- Nur als Datei vorbereitet. Später vom Nutzer im Supabase SQL Editor ausführen.
-- Migration 009 (jobs.studium) wird vorausgesetzt. Mehrfach ausführbar.

-- null = automatisch (heute: nicht auf der Whitelist), true/false = vom Admin gesetzt.
alter table public.companies add column if not exists whitelist boolean;

create or replace function public.whitelist_wirksam(p_firma text) returns boolean
  language sql stable set search_path = '' as $$
  select coalesce((select c.whitelist from public.companies c where c.name = p_firma), false);
$$;

-- Nachtlauf: offene, sichtbare "nein"-Stellen ausblenden, außer bei Whitelist-Firmen.
create or replace function public.nein_ausblenden() returns integer
  language plpgsql set search_path = '' as $$
declare n integer;
begin
  update public.jobs j set sichtbar = false
    where j.studium = 'nein' and j.status = 'offen' and j.sichtbar and not public.whitelist_wirksam(j.unternehmen);
  get diagnostics n = row_count;
  return n;
end $$;

-- Häkchen des Admins: wirkt sofort auf die offenen "nein"-Stellen der Firma; geschlossene bleiben unsichtbar.
create or replace function public.whitelist_setzen(p_firma text, p_wert boolean) returns integer
  language plpgsql set search_path = '' as $$
declare n integer;
begin
  update public.companies set whitelist = p_wert where name = p_firma;
  if not found then raise exception 'Firma unbekannt'; end if;
  if public.whitelist_wirksam(p_firma) then
    update public.jobs set sichtbar = true
      where unternehmen = p_firma and studium = 'nein' and status = 'offen' and not sichtbar;
  else
    update public.jobs set sichtbar = false
      where unternehmen = p_firma and studium = 'nein' and status = 'offen' and sichtbar;
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.whitelist_wirksam(text) from public, anon, authenticated;
revoke execute on function public.nein_ausblenden() from public, anon, authenticated;
revoke execute on function public.whitelist_setzen(text, boolean) from public, anon, authenticated;
grant execute on function public.whitelist_wirksam(text) to service_role;
grant execute on function public.nein_ausblenden() to service_role;
grant execute on function public.whitelist_setzen(text, boolean) to service_role;
