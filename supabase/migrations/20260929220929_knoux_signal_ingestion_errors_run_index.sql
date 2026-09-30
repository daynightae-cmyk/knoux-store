-- Index the optional ingestion run foreign key for error lookup performance.
create index if not exists signal_ingestion_errors_run_idx
  on public.signal_ingestion_errors(run_id)
  where run_id is not null;
