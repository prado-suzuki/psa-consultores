-- Notificações de mudança de variável na tela Gerar Documento.
-- As notificações são DERIVADAS de audit_logs (não há tabela materializada): a
-- janela é audit_log.performed_at > GREATEST(snapshot_validado_em, visto_em),
-- restrita às entidades que hidratam o documento. Esta migration só adiciona o
-- carimbo de validação e a marca d'água de leitura por usuário.

-- 1) Carimbo explícito de "validado em" no documento gerado.
--    Por que não reusar updated_at: hoje updated_at ≈ última validação (a linha
--    só é atualizada pelo re-congelamento), mas isso é frágil. Uma coluna
--    dedicada deixa a janela de notificação inequívoca.
ALTER TABLE public.documento_gerado
  ADD COLUMN IF NOT EXISTS snapshot_validado_em timestamptz;

-- Backfill: documentos já validados usam updated_at como aproximação.
UPDATE public.documento_gerado
  SET snapshot_validado_em = updated_at
  WHERE snapshot_validado_em IS NULL;

-- 2) Marca d'água de leitura, por usuário e por documento.
CREATE TABLE public.documento_notificacao_visto (
  user_id              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  documento_gerado_id  uuid        NOT NULL REFERENCES public.documento_gerado(id) ON DELETE CASCADE,
  visto_em             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, documento_gerado_id)
);

ALTER TABLE public.documento_notificacao_visto ENABLE ROW LEVEL SECURITY;

-- Cada usuário só enxerga/edita a própria marca d'água.
CREATE POLICY "own notificacao_visto" ON public.documento_notificacao_visto
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
