-- 20260918212051_ges01b_tipo_de_aviso_inatividade.sql
-- GES-01B, parte 1 de 2: o valor novo do enum notificacao_tipo.
--
-- EM ARQUIVO SEPARADO, de proposito, como a GES-01A (20260831202229). Migration
-- roda em transacao unica, e o Postgres recusa USAR valor de enum nascido na
-- mesma transacao ("unsafe use of new value"): as funcoes da parte 2 literam
-- 'tarefa_inativa' no corpo, entao o valor tem de nascer e commitar antes.
--
-- Rótulo no sino ("Tarefa inativa") e front: src/lib/notificacoesInternas.ts,
-- quando o types.ts regenerado chegar com o valor.
--
-- Reversao: nao aplicavel. Postgres nao remove valor de enum; o valor fica
-- inerte sem as funcoes da parte 2.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typname = 'notificacao_tipo'
       AND n.nspname = 'public'
       AND e.enumlabel = 'tarefa_inativa'
  ) THEN
    ALTER TYPE public.notificacao_tipo ADD VALUE 'tarefa_inativa';
  END IF;
END $$;

-- GATE: o valor tem de existir ao fim da migracao.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typname = 'notificacao_tipo'
       AND n.nspname = 'public'
       AND e.enumlabel = 'tarefa_inativa'
  ) THEN
    RAISE EXCEPTION 'GATE: o valor tarefa_inativa nao ficou no enum notificacao_tipo';
  END IF;
END $$;
