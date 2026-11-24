-- 6a (Q275): Nachweis, welcher Fassung des Einwilligungstexts zugestimmt wurde (web/lib/cv-einwilligung.json).
-- Ohne passende Fassung gilt keine Einwilligung: Website fragt neu, Nachtlauf überspringt das Konto.
-- Wiederholbar ausfuehrbar. Im Supabase SQL Editor ausfuehren (nach 018).

alter table public.cv_einwilligung add column if not exists fassung text;
