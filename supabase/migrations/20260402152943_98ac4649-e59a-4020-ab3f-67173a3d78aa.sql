ALTER TABLE public.efd_correcoes
  ADD COLUMN sync_status text,
  ADD COLUMN sync_sent_at timestamptz,
  ADD COLUMN sync_error text;