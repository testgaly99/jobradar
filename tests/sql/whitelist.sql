-- Nur in einer isolierten Testdatenbank nach Anwendung der Migrationen 001..011.
-- Niemals mit der Live-Datenbank verbinden. Kein Testkonto und kein Geheimnis erforderlich.
-- Schutz: Testdatenbank muss jobradar_ranking_test heißen, zusätzlich explizit setzen:
--   PGOPTIONS='-c jobradar.offline_test=whitelist' psql -X -v ON_ERROR_STOP=1 ... -f tests/sql/whitelist.sql
-- Die gesamte Probe wird zurückgerollt. Dieses Skript führt keine Migration aus.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if pg_catalog.current_database() <> 'jobradar_ranking_test'
     or pg_catalog.current_setting('jobradar.testdatenbank', true) is distinct from 'nur-kuenstliche-daten'
     or pg_catalog.current_setting('jobradar.offline_test', true) is distinct from 'whitelist' then
    raise exception 'Nur für ausdrücklich eingerichtete isolierte Testdatenbank';
  end if;
end $$;

create function pg_temp.pruefe(ok boolean, hinweis text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Fehlgeschlagen: %', hinweis; end if;
end $$;

insert into public.companies(name, aktiv) values ('Testfirma Whitelist', true);
insert into public.jobs(id, unternehmen, titel, studium, status, sichtbar) values
 ('Testfirma Whitelist:nein-sichtbar', 'Testfirma Whitelist', 'A', 'nein', 'offen', true),
 ('Testfirma Whitelist:nein-versteckt', 'Testfirma Whitelist', 'B', 'nein', 'offen', false),
 ('Testfirma Whitelist:nein-geschlossen', 'Testfirma Whitelist', 'C', 'nein', 'geschlossen', false),
 ('Testfirma Whitelist:ja', 'Testfirma Whitelist', 'D', 'ja', 'offen', true);

do $$
declare n integer;
begin
  perform pg_temp.pruefe(not public.whitelist_wirksam('Testfirma Whitelist'), 'null heißt automatisch = nicht auf der Whitelist');
  perform pg_temp.pruefe(not public.whitelist_wirksam('Gibt es nicht'), 'unbekannte Firma = false');

  n := public.whitelist_setzen('Testfirma Whitelist', true);
  perform pg_temp.pruefe(n = 1, 'an: genau die offene versteckte nein-Stelle wird sichtbar');
  perform pg_temp.pruefe((select sichtbar from public.jobs where id = 'Testfirma Whitelist:nein-versteckt'), 'versteckte Stelle sichtbar');
  perform pg_temp.pruefe(not (select sichtbar from public.jobs where id = 'Testfirma Whitelist:nein-geschlossen'), 'geschlossene bleibt unsichtbar');

  perform public.nein_ausblenden();
  perform pg_temp.pruefe((select count(*) from public.jobs where unternehmen = 'Testfirma Whitelist' and sichtbar) = 3, 'Nachtlauf blendet bei Whitelist nichts aus');

  n := public.whitelist_setzen('Testfirma Whitelist', false);
  perform pg_temp.pruefe(n = 2, 'aus: beide offenen nein-Stellen wieder unsichtbar');
  perform pg_temp.pruefe((select sichtbar from public.jobs where id = 'Testfirma Whitelist:ja'), 'ja-Stelle bleibt sichtbar');

  begin
    perform public.whitelist_setzen('Gibt es nicht', true);
    raise exception 'Fehlgeschlagen: unbekannte Firma muss abgelehnt werden';
  exception when others then
    perform pg_temp.pruefe(sqlerrm = 'Firma unbekannt', 'Meldung Firma unbekannt');
  end;
end $$;

rollback;
