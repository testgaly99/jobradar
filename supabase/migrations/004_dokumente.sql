-- Dokumente: ein von einer Bewerbung genutztes Dokument laesst sich nicht loeschen; Upload-Limit 50 MB.
-- Wiederholbar ausfuehrbar. Im Supabase SQL Editor ausfuehren.
alter table public.applications drop constraint if exists applications_cv_dokument_id_fkey;
alter table public.applications add constraint applications_cv_dokument_id_fkey
  foreign key (cv_dokument_id) references public.documents(id) on delete restrict;
alter table public.applications drop constraint if exists applications_anschreiben_dokument_id_fkey;
alter table public.applications add constraint applications_anschreiben_dokument_id_fkey
  foreign key (anschreiben_dokument_id) references public.documents(id) on delete restrict;

update storage.buckets set file_size_limit = 52428800 where id = 'dokumente';
