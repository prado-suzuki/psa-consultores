-- 20260821160000_ordem_servico_contribuinte_faturamento.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- 20260821160000_ordem_servico_contribuinte_faturamento.sql
-- Tarefa [5] (Sprint 11) - o contribuinte que recebe a nota passa a ser escolhido
-- por OS, e nao por cliente.
--
-- HOJE: a escolha mora numa marca do contribuinte
-- (`contribuinte.contribuinte_faturamento`, o switch da aba Contribuintes), e a
-- aba de Faturamento usa `entities.find(e => e.contribuinte_faturamento) ||
-- entities[0]`. Quando ninguem marcou, a tela mostra o PRIMEIRO da lista, e essa
-- lista vem sem `order by`. Ou seja, a tela escolhe sozinha e nem sempre o
-- mesmo: a ordem fisica muda quando alguem edita um contribuinte.
--
-- MEDIDO EM PRODUCAO em 21/08/2026, antes de escrever:
--   115 OS ativas; 58 sao de cliente com mais de um contribuinte;
--   dessas 58, apenas 18 tem alguem marcado no switch, e 40 sao escolha da tela;
--   74 clientes tem mais de um contribuinte; nenhum tem dois marcados (ainda).
--
-- O QUE ESTA MIGRATION FAZ
--   1) cria `ordem_servico.contribuinte_id`, nula, com FK para contribuinte;
--   2) preenche as OS existentes sem perder nem inventar decisao.
--
-- A CARGA, e a regra dela em uma frase: cada OS recebe o contribuinte que a tela
-- mostraria hoje para aquele cliente. Um unico `order by` cobre os tres casos:
--   - cliente com um so contribuinte: e ele, nao ha duvida;
--   - cliente com varios e um marcado: o marcado vem primeiro pelo `desc`;
--   - cliente com varios e nenhum marcado: cai no `ctid`, que e a ordem fisica,
--     a mesma que a leitura sem `order by` devolve para a tela. Congelar isso e
--     decisao do usuario (21/08), e melhora o que existe: hoje esse valor
--     escorrega sozinho a cada edicao de contribuinte, e a partir daqui para.
--
-- NAO DESTRUTIVA: nada e apagado nem sobrescrito. A coluna
-- `contribuinte.contribuinte_faturamento` continua existindo e intacta; ela so
-- sai depois, em tarefa propria, e depois de o ETL do BigQuery
-- (`psa-sync-lovable-bq`, `src/schema/psa_cadastro.py`) deixar de declara-la.
-- Reversao: `update ordem_servico set contribuinte_id = null` e
-- `alter table ... drop column contribuinte_id`.
--
-- FORA DE ESCOPO: nenhuma policy muda (a coluna herda a RLS da tabela), nenhuma
-- outra tabela e tocada, e a tela nao entra aqui.

BEGIN;

alter table public.ordem_servico
  add column if not exists contribuinte_id uuid references public.contribuinte(id);

comment on column public.ordem_servico.contribuinte_id is
  'Contribuinte do cliente que recebe a nota desta OS. Substitui a marca contribuinte.contribuinte_faturamento, que decidia por cliente e nao dava conta de OS faturadas em contribuintes diferentes.';

create index if not exists idx_ordem_servico_contribuinte
  on public.ordem_servico (contribuinte_id) where contribuinte_id is not null;

-- Carga: o que a tela mostraria hoje, congelado.
update public.ordem_servico os
   set contribuinte_id = (
         select c.id
           from public.contribuinte c
          where c.cliente_id = os.id_cliente
            and c.excluido = false
          order by c.contribuinte_faturamento desc nulls last, c.ctid
          limit 1)
 where os.contribuinte_id is null
   and os.excluido = false;

-- GATE: a coluna existe, ninguem ficou apontando para contribuinte de outro
-- cliente, e so sobrou vazia a OS de cliente que nao tem contribuinte nenhum.
DO $$
DECLARE
  v_fora_do_cliente integer;
  v_vazias_indevidas integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ordem_servico'
       AND column_name = 'contribuinte_id'
  ) THEN
    RAISE EXCEPTION 'GATE: ordem_servico.contribuinte_id nao foi criada';
  END IF;

  SELECT count(*) INTO v_fora_do_cliente
    FROM public.ordem_servico os
    JOIN public.contribuinte c ON c.id = os.contribuinte_id
   WHERE c.cliente_id IS DISTINCT FROM os.id_cliente;

  IF v_fora_do_cliente > 0 THEN
    RAISE EXCEPTION 'GATE: % OS apontam para contribuinte de outro cliente', v_fora_do_cliente;
  END IF;

  SELECT count(*) INTO v_vazias_indevidas
    FROM public.ordem_servico os
   WHERE os.excluido = false
     AND os.contribuinte_id IS NULL
     AND EXISTS (SELECT 1 FROM public.contribuinte c
                  WHERE c.cliente_id = os.id_cliente AND c.excluido = false);

  IF v_vazias_indevidas > 0 THEN
    RAISE EXCEPTION 'GATE: % OS ficaram sem contribuinte tendo candidato disponivel', v_vazias_indevidas;
  END IF;

  RAISE NOTICE 'GATE ok: coluna criada e carga coerente';
END $$;

COMMIT;
