ALTER TABLE public.documento_gerado
  ADD COLUMN IF NOT EXISTS snapshot_validado_em timestamptz;

UPDATE public.documento_gerado
  SET snapshot_validado_em = updated_at
  WHERE snapshot_validado_em IS NULL;

CREATE TABLE public.documento_notificacao_visto (
  user_id              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  documento_gerado_id  uuid        NOT NULL REFERENCES public.documento_gerado(id) ON DELETE CASCADE,
  visto_em             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, documento_gerado_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_notificacao_visto TO authenticated;
GRANT ALL ON public.documento_notificacao_visto TO service_role;

ALTER TABLE public.documento_notificacao_visto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notificacao_visto" ON public.documento_notificacao_visto
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());