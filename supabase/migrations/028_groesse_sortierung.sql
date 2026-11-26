-- Größensortierung: groesse_sort wie groesse_rang (010), aber NULL statt 99 für unbekannte Größe, damit die Website
-- Firmen ohne Größe in beiden Richtungen ans Ende stellen kann (nullsFirst: false). Mehrfach ausführbar.
-- Keine neue Tabelle, daher bleibt backup.yml unverändert.
-- Eine generierte Spalte darf keine andere generierte Spalte lesen, daher dieselbe Formel auf groesse_klasse.
alter table public.companies add column if not exists groesse_sort integer
  generated always as (
    case groesse_klasse when '<50' then 0 when '50–249' then 1
      when '250–999' then 2 when '1.000+' then 3 else null end
  ) stored;
-- Wie groesse_rang: nur die bereits öffentliche Größeninformation.
grant select (groesse_sort) on public.companies to anon;

-- ranking_stellen aus 027 plus groesse_sort im companies-Objekt (gleicher Rückgabetyp, Rechte unverändert).
drop function if exists public.ranking_stellen(text[],text[]);
create function public.ranking_stellen(p_listen text[] default '{}', p_kategorien text[] default '{}')
returns table(
  id text, unternehmen text, titel text, ort text, staedte text[], remote boolean,
  arbeitsmodell text, vertragsart text, abteilung text, erfahrungslevel text, url text,
  erstmals_gesehen date, text text, land text, groesse_klasse text, kategorie text[],
  companies jsonb, rang integer, deutsch_stufe smallint, passung_sortwert integer
)
language plpgsql stable security invoker set search_path = '' as $$
declare eine_liste boolean;
begin
  if p_listen is null or p_kategorien is null
     or cardinality(p_listen)>100 or cardinality(p_kategorien)>7
     or cardinality(p_listen)+cardinality(p_kategorien)=0
     or (cardinality(p_listen)>0 and array_ndims(p_listen)<>1)
     or (cardinality(p_kategorien)>0 and array_ndims(p_kategorien)<>1)
     or array_position(p_listen,null) is not null or array_position(p_kategorien,null) is not null then
    raise exception using errcode='22023', message='Bitte gültige Listen oder Kategorien auswählen.';
  end if;
  if exists(select 1 from unnest(p_kategorien) k where k not in
      ('Top-Arbeitgeber','Beliebt bei Studierenden','Große Unternehmen','Börsennotiert','Innovation','Wachstum & Startups','Top-Gehalt Tech')) then
    raise exception using errcode='22023', message='Unbekannte Ranglisten-Kategorie.';
  end if;
  if exists(select 1 from unnest(p_listen) gewaehlt(id)
    where not exists(select 1 from public.ranking_listen l join public.ranking_ausgaben a on a.liste_id=l.id
                      where l.id=gewaehlt.id and public.ranking_ausgabe_aktuell(a.id))) then
    raise exception using errcode='22023', message='Eine ausgewählte Liste ist unbekannt oder nicht mehr verfügbar.';
  end if;
  select count(distinct g.id)=1 into eine_liste from unnest(p_listen) g(id);
  return query
    select j.id,j.unternehmen,j.titel,j.ort,j.staedte,j.remote,j.arbeitsmodell,j.vertragsart,j.abteilung,
      j.erfahrungslevel,j.url,j.erstmals_gesehen,j.text,j.land,c.groesse_klasse,c.kategorie,
      jsonb_build_object('groesse_klasse',c.groesse_klasse,'kategorie',c.kategorie,'groesse_rang',c.groesse_rang,'groesse_sort',c.groesse_sort),
      case when eine_liste then zuordnung.rang else null::integer end,j.deutsch_stufe,
      (select e.passung_sortwert from public.cv_ergebnisse e
        where e.owner_id = auth.uid() and e.job_id = j.id)
    from public.jobs j join public.companies c on c.name=j.unternehmen and c.aktiv
    join lateral (
      select count(*) anzahl,min(f.rang) rang from public.ranking_firmen f
      join public.ranking_ausgaben a on a.id=f.ausgabe_id
      where f.unternehmen=j.unternehmen and a.liste_id=any(p_listen) and public.ranking_ausgabe_aktuell(a.id)
    ) zuordnung on cardinality(p_listen)=0 or zuordnung.anzahl>0
    where j.status='offen' and j.sichtbar
      and (cardinality(p_kategorien)=0 or exists(
        select 1 from public.ranking_kategorien(array[j.unternehmen]) k where k.kategorie=any(p_kategorien)
      ));
end $$;
revoke all on function public.ranking_stellen(text[],text[]) from public, anon, authenticated;
grant execute on function public.ranking_stellen(text[],text[]) to authenticated, service_role;
