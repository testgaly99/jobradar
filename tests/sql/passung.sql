-- Nur isolierte lokale Testdatenbank. Migration 027 vorher zweimal anwenden, niemals live ausführen.
-- Voraussetzung (als Admin vor dem Lauf): Konten ...27a1/...27a2, Firma 'Passung-27' (aktiv, Kategorie
-- 'Innovation' über eine freigegebene Ausgabe der Liste 'passung-27') und Stelle 'Passung-27:1'.
begin;
do $$ begin
  if current_setting('jobradar.offline_test',true) is distinct from 'rankings' then
    raise exception 'Lokale Offline-Testkennung fehlt';
  end if;
end $$;
insert into public.cv_ergebnisse(owner_id,job_id,weg,empfohlen,geprueft,anforderungen,anforderungs_hash,cv_hashes,passung_sortwert)
  values('00000000-0000-0000-0000-0000000027a1','Passung-27:1','schaetzung','{}','{}','[]','h','{}',7);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000027a1',true);
do $$ begin
  if (select passung_sortwert from public.stellen_passung where id='Passung-27:1') is distinct from 7 then
    raise exception 'Konto A sieht eigenen Sortwert nicht';
  end if;
  if (select passung_sortwert from public.ranking_stellen('{}',array['Innovation']) where id='Passung-27:1') is distinct from 7 then
    raise exception 'ranking_stellen: Konto A sieht eigenen Sortwert nicht';
  end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000027a2',true);
do $$ begin
  if not exists(select 1 from public.stellen_passung where id='Passung-27:1') then
    raise exception 'Stelle für Konto B nicht sichtbar';
  end if;
  if (select passung_sortwert from public.stellen_passung where id='Passung-27:1') is not null then
    raise exception 'Konto B sieht fremden Sortwert' using errcode='P0002';
  end if;
  if not exists(select 1 from public.ranking_stellen('{}',array['Innovation']) where id='Passung-27:1')
     or (select passung_sortwert from public.ranking_stellen('{}',array['Innovation']) where id='Passung-27:1') is not null then
    raise exception 'ranking_stellen: Konto B sieht fremden Sortwert' using errcode='P0002';
  end if;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  -- Gäste bekommen die View nicht (anon darf jobs nur spaltenweise lesen) und nie Ergebnisse.
  begin
    perform passung_sortwert from public.stellen_passung;
    raise exception 'Gast liest stellen_passung' using errcode='P0002';
  exception when insufficient_privilege then null;
  end;
  begin
    perform passung_sortwert from public.cv_ergebnisse;
    raise exception 'Gast liest cv_ergebnisse' using errcode='P0002';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.ranking_stellen('{}',array['Innovation']);
    raise exception 'Gast ruft ranking_stellen auf' using errcode='P0002';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
