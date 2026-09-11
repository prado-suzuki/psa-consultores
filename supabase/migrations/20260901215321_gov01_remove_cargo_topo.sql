-- 20260901215321_gov01_remove_cargo_topo.sql
-- GOV-01: tirar `cargo_topo` de `orgao_governanca`.
--
-- A coluna entrou porque a prosa da tarefa a listava ("nome, tipo na cascata...,
-- cargo do topo, ordem de exibicao e vigencia"), e nao porque alguem soubesse
-- para que serve. Na validacao de 01/09/2026 o campo foi o unico que a pessoa
-- que usa a tela nao entendeu, e a revisao confirmou que ele nao tem consumidor:
--
--   - NAO aparece no levantamento de campos (`docs/osg/campos-governanca.md`),
--     que enumerou campo por campo a partir dos documentos reais de cliente;
--   - NAO vira clausula no contrato social;
--   - NAO e coluna da Matriz de Alcadas;
--   - NAO aparece no mockup.
--
-- E ja existe cargo em outro lugar: `administracao.cargo`, texto livre, guardando
-- o cargo da PESSOA. Se quem encabeca o orgao esta cadastrado ali, um cargo no
-- orgao duplica a informacao, e duas copias divergem.
--
-- Ha ainda a fronteira borrada do dominio: um dos tres orgaos padrao chama-se
-- "Diretor Executivo", que ja e um cargo. Um campo de cargo dentro de um orgao
-- que e um cargo convida a preencher de um jeito num cliente e de outro em
-- outro.
--
-- MIGRATION NOVA e nao edicao da anterior: a 20260901202413 ja esta registrada no
-- ledger do sandbox, e editar o arquivo faria repositorio e registro contarem
-- historias diferentes.
--
-- SEM PERDA DE DADO: a tabela nasceu em 01/09 e a coluna nunca foi preenchida em
-- nenhuma linha. Conferido antes de escrever.
--
-- Se a analista de governanca disser que faz falta, a coluna volta com um
-- proposito escrito, e nao por constar de uma lista.

ALTER TABLE public.orgao_governanca DROP COLUMN IF EXISTS cargo_topo;

-- GATE: a coluna saiu e o resto da tabela ficou de pe.
DO $$
DECLARE
  v_faltando text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='orgao_governanca'
                AND column_name='cargo_topo') THEN
    RAISE EXCEPTION 'GATE: cargo_topo continua na tabela';
  END IF;

  SELECT string_agg(c.nome, ', ') INTO v_faltando
    FROM (VALUES ('cliente_id'),('nome'),('entra_no_contrato'),('ordem'),
                 ('vigencia_inicio'),('vigencia_fim'),('excluido')) AS c(nome)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='orgao_governanca' AND column_name=c.nome);
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'GATE: o DROP levou coluna junto: %', v_faltando;
  END IF;
END $$;
