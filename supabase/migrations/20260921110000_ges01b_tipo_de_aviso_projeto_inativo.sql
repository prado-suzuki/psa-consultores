-- 20260921110000_ges01b_tipo_de_aviso_projeto_inativo.sql
-- GES-01B, o aviso de PROJETO sem movimentacao: parte 1 de 2, o valor do enum.
--
-- EM ARQUIVO SEPARADO, pela mesma razao da parte 1 do aviso de tarefa
-- (20260918212051) e da GES-01A: migration roda em transacao unica, e o Postgres
-- recusa USAR valor de enum nascido na mesma transacao ("unsafe use of new
-- value"). As funcoes da parte 2 literam 'projeto_inativo', entao o valor tem de
-- nascer e commitar antes.
--
-- POR QUE O PROJETO GANHA AVISO PROPRIO. O card da GES-01B diz "projeto ou
-- tarefa"; a entrega de 18/09 cobriu so tarefa, e nao registrou isso como
-- decisao -- foi omissao. Projeto sem movimentacao e o agregado: nenhuma tarefa
-- aberta dele se moveu. E leitura gerencial que a soma dos avisos de tarefa nao
-- da, porque ali o gestor ve arvore e nao floresta.
--
-- Rotulo no sino e icone: src/lib/notificacoesInternas.ts, quando o types.ts
-- regenerado chegar com o valor.
--
-- Reversao: nao aplicavel. Postgres nao remove valor de enum; o valor fica inerte
-- sem as funcoes da parte 2.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typname = 'notificacao_tipo'
       AND n.nspname = 'public'
       AND e.enumlabel = 'projeto_inativo'
  ) THEN
    ALTER TYPE public.notificacao_tipo ADD VALUE 'projeto_inativo';
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
       AND e.enumlabel = 'projeto_inativo'
  ) THEN
    RAISE EXCEPTION 'GATE: o valor projeto_inativo nao ficou no enum notificacao_tipo';
  END IF;
END $$;
