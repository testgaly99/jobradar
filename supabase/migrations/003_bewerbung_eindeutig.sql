-- Pro Nutzer und Stelle nur eine Bewerbung (verhindert Dubletten bei Doppelklick). Wiederholbar.
create unique index if not exists applications_owner_job_uniq
  on public.applications (owner_id, job_id) where job_id is not null;
