-- Nur in einer isolierten Testdatenbank nach Anwendung der Migrationen 001..010.
-- Niemals mit der Live-Datenbank verbinden. Kein Testkonto und kein Geheimnis erforderlich.
-- Schutz: Testdatenbank muss jobradar_ranking_test heißen, zusätzlich explizit setzen:
--   PGOPTIONS='-c jobradar.offline_test=rankings' psql -X -v ON_ERROR_STOP=1 ... -f tests/sql/rankings.sql
-- Die gesamte Probe wird zurückgerollt. Dieses Skript führt keine Migration aus.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if pg_catalog.current_database() <> 'jobradar_ranking_test'
     or pg_catalog.current_setting('jobradar.testdatenbank', true) is distinct from 'nur-kuenstliche-daten'
     or pg_catalog.current_setting('jobradar.offline_test', true) is distinct from 'rankings' then
    raise exception 'Nur für ausdrücklich eingerichtete isolierte Ranking-Testdatenbank';
  end if;
end $$;

create function pg_temp.pruefe(ok boolean, hinweis text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Fehlgeschlagen: %', hinweis; end if;
end $$;

insert into public.companies(name, aktiv, groesse_klasse, kategorie) values
 ('Ranking-Test Gemeinsam', true, '250–999', array['Technik']),
 ('Ranking-Test Unplatziert', true, '<50', array['Beratung']),
 ('Ranking-Test Alt', true, '<50', array['Technik']),
 ('Ranking-Test Inaktiv', false, '<50', array['Technik']);
insert into public.companies(name, aktiv, groesse_klasse, kategorie)
select 'Ranking-Test Menge ' || s, true, '<50', array['Technik']
from pg_catalog.generate_series(1, 1001) s;

insert into public.jobs(id, unternehmen, titel, text, staedte, remote, land, status, sichtbar) values
 ('Ranking-Test Gemeinsam:1', 'Ranking-Test Gemeinsam', 'Entwicklung', 'Testtext', array['Berlin'], false, 'Deutschland', 'offen', true),
 ('Ranking-Test Gemeinsam:2', 'Ranking-Test Gemeinsam', 'Analyse', 'Testtext', array['Hamburg'], true, 'Deutschland', 'offen', true),
 ('Ranking-Test Gemeinsam:hidden', 'Ranking-Test Gemeinsam', 'Versteckt', 'Testtext', array['Berlin'], false, 'Deutschland', 'offen', false),
 ('Ranking-Test Gemeinsam:closed', 'Ranking-Test Gemeinsam', 'Geschlossen', 'Testtext', array['Berlin'], false, 'Deutschland', 'geschlossen', true),
 ('Ranking-Test Unplatziert:1', 'Ranking-Test Unplatziert', 'Beratung', 'Testtext', array['Berlin'], false, 'Deutschland', 'offen', true),
 ('Ranking-Test Alt:1', 'Ranking-Test Alt', 'Alte Ausgabe', 'Testtext', array['Berlin'], false, 'Deutschland', 'offen', true),
 ('Ranking-Test Inaktiv:1', 'Ranking-Test Inaktiv', 'Inaktive Firma', 'Testtext', array['Berlin'], false, 'Deutschland', 'offen', true);
insert into public.jobs(id, unternehmen, titel, status, sichtbar)
select 'Ranking-Test Menge ' || s || ':1', 'Ranking-Test Menge ' || s, 'Teststelle', 'offen', true
from pg_catalog.generate_series(1, 1001) s;

insert into public.ranking_listen(id, name, herausgeber, aktiv) values
 ('test-a', 'Test-Rangliste A', 'Test-Herausgeber', true),
 ('test-b', 'Test-Rangliste B', 'Test-Herausgeber', true),
 ('test-aus', 'Abgeschaltet', 'Test-Herausgeber', false),
 ('test-abgelaufen', 'Abgelaufen', 'Test-Herausgeber', true),
 ('test-zukunft', 'Zukunft', 'Test-Herausgeber', true),
 ('test-leer', 'Ohne Stellen', 'Test-Herausgeber', true);
insert into public.ranking_ausgaben
 (id, liste_id, jahr, veroeffentlicht_am, geprueft_am, quelle_url, lizenz, gueltig_bis, freigegeben) values
 ('test-a-alt', 'test-a', 2026, current_date - 60, current_date, 'https://example.com/a', 'Nur künstliche Testdaten', current_date + 180, true),
 ('test-a-neu', 'test-a', 2026, current_date - 30, current_date, 'https://example.com/a', 'Nur künstliche Testdaten', current_date + 180, true),
 ('test-a-entwurf', 'test-a', 2026, current_date, current_date, 'https://example.com/a', 'Nur künstliche Testdaten', current_date + 180, false),
 ('test-a-zukunft', 'test-a', 2027, current_date + 1, current_date + 1, 'https://example.com/a', 'Nur künstliche Testdaten', current_date + 180, true),
 ('test-b-neu', 'test-b', 2026, current_date - 30, current_date, 'https://example.com/b', 'Nur künstliche Testdaten', current_date + 180, true),
 ('test-aus-neu', 'test-aus', 2026, current_date - 30, current_date, 'https://example.com/off', 'Nur künstliche Testdaten', current_date + 180, true),
 ('test-abgelaufen-neu', 'test-abgelaufen', 2026, current_date - 60, current_date - 1, 'https://example.com/expired', 'Nur künstliche Testdaten', current_date, true),
 ('test-zukunft-neu', 'test-zukunft', 2027, current_date + 1, current_date + 1, 'https://example.com/future', 'Nur künstliche Testdaten', current_date + 180, true),
 ('test-leer-neu', 'test-leer', 2026, current_date - 30, current_date, 'https://example.com/empty', 'Nur künstliche Testdaten', current_date + 180, true);
insert into public.ranking_firmen(ausgabe_id, unternehmen, rang) values
 ('test-a-alt', 'Ranking-Test Alt', 1),
 ('test-a-neu', 'Ranking-Test Gemeinsam', 12),
 ('test-a-neu', 'Ranking-Test Unplatziert', null),
 ('test-a-neu', 'Ranking-Test Inaktiv', 2),
 ('test-b-neu', 'Ranking-Test Gemeinsam', 2);
insert into public.ranking_firmen(ausgabe_id, unternehmen, rang)
select 'test-b-neu', 'Ranking-Test Menge ' || s, s + 2
from pg_catalog.generate_series(1, 1001) s;

-- Grenzen werden von der Datenbank selbst erzwungen, nicht nur vom Eingabeprogramm.
do $$ begin
  begin
    insert into public.ranking_firmen values ('test-a-neu', 'Unbekannte Testfirma', 1);
    raise exception 'Unbekannte Firma wurde akzeptiert';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.ranking_firmen values ('test-a-neu', 'Ranking-Test Alt', 0);
    raise exception 'Rang 0 wurde akzeptiert';
  exception when check_violation then null; end;
  begin
    update public.ranking_ausgaben set geprueft_am = veroeffentlicht_am - 1 where id = 'test-a-neu';
    raise exception 'Prüfung vor Veröffentlichung wurde akzeptiert';
  exception when check_violation then null; end;
  begin
    update public.ranking_ausgaben set geprueft_am = gueltig_bis where id = 'test-a-neu';
    raise exception 'Prüfung nach Gültigkeit wurde akzeptiert';
  exception when check_violation then null; end;
  begin
    update public.ranking_ausgaben set jahr = 0 where id = 'test-a-neu';
    raise exception 'Ungültige Jahreszahl wurde akzeptiert';
  exception when check_violation then null; end;
  update public.ranking_ausgaben set jahr = 1, quelle_url = 'https://xn--mnchen-3ya.example/ranking' where id = 'test-a-neu';
  update public.ranking_ausgaben set jahr = 2026, quelle_url = 'https://[2001:db8::1]/ranking' where id = 'test-a-neu';
  begin
    update public.ranking_ausgaben set gueltig_bis = veroeffentlicht_am + interval '14 months' where id = 'test-a-neu';
    raise exception 'Mehr als 13 Monate wurde akzeptiert';
  exception when check_violation then null; end;
  begin
    update public.ranking_ausgaben set quelle_url = 'javascript:alert(1)' where id = 'test-a-neu';
    raise exception 'Unsichere Quelle wurde akzeptiert';
  exception when check_violation then null; end;
  begin
    insert into public.ranking_firmen values ('test-a-neu', 'Ranking-Test Gemeinsam', 99);
    raise exception 'Doppelte Zuordnung wurde akzeptiert';
  exception when unique_violation then null; end;
end $$;

select pg_temp.pruefe(not pg_catalog.has_table_privilege('anon', 'public.ranking_listen', 'SELECT'), 'Gast Tabellenrecht');
select pg_temp.pruefe(not pg_catalog.has_function_privilege('anon', 'public.ranking_katalog()', 'EXECUTE'), 'Gast RPC-Recht');
select pg_temp.pruefe(not pg_catalog.has_function_privilege('anon', 'public.ranking_ausgabe_aktuell(text)', 'EXECUTE'), 'Gast Hilfsfunktionsrecht');
select pg_temp.pruefe(not pg_catalog.has_table_privilege('authenticated', 'public.ranking_firmen', 'INSERT'), 'Nutzer Schreibrecht');
select pg_temp.pruefe(pg_catalog.has_table_privilege('service_role', 'public.ranking_firmen', 'INSERT'), 'Server Schreibrecht');

set local role authenticated;
select pg_temp.pruefe((select count(*) from public.ranking_ausgaben where liste_id = 'test-a') = 1, 'Direktzugriff nur aktuelle Ausgabe, kein rekursives RLS');
select pg_temp.pruefe((select id from public.ranking_ausgaben where liste_id = 'test-a') = 'test-a-neu', 'Entwurf/Zukunft verdrängen aktuelle Ausgabe nicht');
select pg_temp.pruefe((select count(*) from public.ranking_listen) = 3, 'Nur aktuelle, aktive Listen sichtbar');
select pg_temp.pruefe((select anzahl from public.ranking_katalog() where id = 'test-a') = 3, 'Katalog zählt nur sichtbare offene Stellen aktiver Firmen');
select pg_temp.pruefe((select anzahl from public.ranking_katalog() where id = 'test-leer') = 0, 'Aktuelle Liste ohne Stellen hat Zahl 0');
select pg_temp.pruefe((select anzahl from public.ranking_katalog() where id = 'test-b') = 1003, 'Katalog nicht auf 1000 begrenzt');
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['test-a'])) = 3, 'Einfacher Listenfilter');
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['test-a', 'test-b'])) = 1004, 'ODER über Listen ohne doppelte Jobs');
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['test-a', 'test-a'])) = 3, 'Doppelte Listen-ID vervielfacht Treffer nicht');
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['test-a', 'test-b']) where rang is not null) = 0, 'Ränge verschiedener Listen werden nicht vermischt');
select pg_temp.pruefe((select id from public.ranking_stellen(array['test-a']) order by rang nulls last, unternehmen, id limit 1) = 'Ranking-Test Gemeinsam:1', 'Globale Rangfolge und stabiler Gleichstand');
select pg_temp.pruefe((select id from public.ranking_stellen(array['test-a']) order by rang nulls last, unternehmen, id offset 2 limit 1) = 'Ranking-Test Unplatziert:1', 'Unplatzierte Stellen zuletzt');
select pg_temp.pruefe((select count(*) from public.ranking_stellen(array['test-a']) where staedte && array['Berlin'] and kategorie && array['Technik']) = 1, 'Zusätzliche Filter werden UND-verknüpft');
select pg_temp.pruefe((select count(*) from public.ranking_zuordnungen(array['Ranking-Test Gemeinsam'])) = 2, 'Firmenzuordnungen über mehrere Listen');
select pg_temp.pruefe((select count(*) from public.ranking_zuordnungen(array['Ranking-Test Alt'])) = 0, 'Alte Zuordnungen verborgen');
select pg_temp.pruefe((select count(*) from public.ranking_firmen where ausgabe_id = 'test-b-neu') = 1002, 'Alle Zuordnungen direkt lesbar ohne 1000-Kappung');
do $$ begin
  begin
    perform * from public.ranking_stellen(array['test-a', 'nicht-vorhanden']);
    raise exception 'Unbekannte Liste wurde ignoriert';
  exception when invalid_parameter_value then null; end;
  begin
    perform * from public.ranking_stellen(array[]::text[]);
    raise exception 'Leere Listenauswahl wurde akzeptiert';
  exception when invalid_parameter_value then null; end;
  begin
    update public.ranking_listen set name = 'Unerlaubt' where id = 'test-a';
    raise exception 'Nutzer durfte schreiben';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Ein Ablauf reaktiviert keine überholte Ausgabe, auch wenn deren Gültigkeitsdatum später liegt.
update public.ranking_ausgaben set gueltig_bis = current_date, geprueft_am = current_date - 1 where id = 'test-a-neu';
set local role authenticated;
select pg_temp.pruefe((select count(*) from public.ranking_ausgaben where liste_id = 'test-a') = 0, 'Abgelaufene neuere Ausgabe lässt alte nicht wieder aufleben');
reset role;

-- Gleiche Rangplätze sind zulässig; Firmenumbenennung trägt die Zuordnung mit.
insert into public.ranking_firmen values ('test-b-neu', 'Ranking-Test Unplatziert', 2);
update public.companies set name = 'Ranking-Test Umbenannt' where name = 'Ranking-Test Unplatziert';
select pg_temp.pruefe((select count(*) from public.ranking_firmen where unternehmen = 'Ranking-Test Umbenannt') = 2, 'Firmenumbenennung kaskadiert');

set local role anon;
do $$ begin
  begin
    perform * from public.ranking_listen;
    raise exception 'Gast durfte Ranglisten lesen';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.ranking_katalog();
    raise exception 'Gast durfte Ranglisten-RPC ausführen';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.ranking_stellen(array['test-b']);
    raise exception 'Gast durfte geschützte Stellenfunktion ausführen';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.pruefe((select count(*) from public.jobs where id = 'Ranking-Test Gemeinsam:1') = 1, 'Öffentliche Stellenansicht weiter lesbar');
select pg_temp.pruefe(public.facetten() is not null, 'Öffentliche Facetten weiter nutzbar');
reset role;
rollback;
