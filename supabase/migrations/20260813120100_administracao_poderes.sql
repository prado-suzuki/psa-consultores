-- ============================================================
-- Poderes de administração: o booleano não cabia a regra real
-- ============================================================
-- SINTOMA (B18 da sprint 11, parte de administração)
--   A regra do contrato da MMS é "a administração é isolada, mas os atos da
--   cláusula sexta exigem as duas assinaturas". No cadastro só havia o marcador
--   `pode_isoladamente`, que responde sim ou não e perde a exceção inteira. O
--   consultor então marcava "sim" e a limitação sumia do sistema — para voltar
--   a aparecer só na conferência do documento, escrita à mão.
--
-- DESENHO: UMA COLUNA, TRÊS PARTES
--   `poderes` (jsonb) guarda o objeto
--     { "forma": "isolada" | "conjunta",
--       "excecoes": [ { "atos": "texto", "exigencia": "isolada" | "conjunta" } ],
--       "observacao": "texto livre" }
--   - `forma` é a regra geral (o que o booleano dizia);
--   - `excecoes` é a lista de atos que fogem da regra geral, cada um com a
--     exigência que vale para ele — é aqui que a cláusula sexta cabe, e é o que
--     torna o campo estruturado em vez de um parágrafo solto;
--   - `observacao` é a saída de emergência para o que a estrutura não previu.
--
-- POR QUE JSONB E NÃO UMA TABELA FILHA `administracao_poder`
--   A tabela filha seria o modelo mais rígido, mas nada consulta exceção de
--   poder por si só: elas são lidas sempre junto do vínculo de administração e
--   servem para virar texto no documento. Uma tabela nova custaria RLS, hooks e
--   auditoria próprios para um dado que só existe dentro do pai. Se algum dia
--   aparecer busca por tipo de ato ("quais administradores não podem dar aval"),
--   a promoção para tabela filha é uma migration de cópia direta, porque a forma
--   do objeto já é a da linha.
--
-- `pode_isoladamente` CONTINUA
--   A coluna antiga não sai e continua sendo escrita pela tela como
--   `forma = 'isolada'`. Não é porque o gerador a leia: nenhum bloco ou mapeador
--   consulta `pode_isoladamente` hoje (só a tela e o rótulo de auditoria). É
--   porque ela é a única informação de poderes das linhas anteriores a esta
--   coluna, e é dela que a leitura deriva `forma` enquanto `poderes` for nulo —
--   por isso também não há backfill: linha antiga continua correta. Mantê-la
--   escrita em sincronia evita que ela envelheça e vire uma segunda verdade
--   enquanto não for aposentada (o que exige migration destrutiva, types
--   regerados e o formatador de auditoria, que é de outra frente).
--
-- O QUE OS DOCUMENTOS AINDA NÃO FAZEM COM ISSO
--   `poderes.excecoes` é, por ora, dado de cadastro: nenhum bloco imprime as
--   exceções. Fazer a cláusula de administração percorrer a lista é trabalho do
--   motor de templates, e por isso ficou de fora desta entrega.
--
-- Idempotente: pode ser reaplicada.
--
-- Reversão:
--   alter table public.administracao drop constraint if exists administracao_poderes_objeto;
--   alter table public.administracao drop column if exists poderes;
-- ============================================================

ALTER TABLE public.administracao
  ADD COLUMN IF NOT EXISTS poderes jsonb;

COMMENT ON COLUMN public.administracao.poderes IS
  'Poderes do administrador: { forma: isolada|conjunta, excecoes: [{ atos, '
  'exigencia }], observacao }. `forma` é a regra geral (espelhada em '
  'pode_isoladamente), `excecoes` são os atos que fogem dela e `observacao` é '
  'texto livre. Nulo = cadastro anterior à coluna; nesse caso a forma vem de '
  'pode_isoladamente.';

-- Garante que a coluna guarda um objeto, não um número ou uma string solta:
-- é o mínimo que impede um payload torto de virar dado silencioso.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'administracao_poderes_objeto'
      AND conrelid = 'public.administracao'::regclass
  ) THEN
    ALTER TABLE public.administracao
      ADD CONSTRAINT administracao_poderes_objeto
      CHECK (poderes IS NULL OR jsonb_typeof(poderes) = 'object') NOT VALID;
  END IF;
END $$;
