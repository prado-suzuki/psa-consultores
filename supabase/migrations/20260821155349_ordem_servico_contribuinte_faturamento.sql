-- 20260821155349_ordem_servico_contribuinte_faturamento.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

alter table public.ordem_servico
  add column if not exists contribuinte_id uuid references public.contribuinte(id);

comment on column public.ordem_servico.contribuinte_id is
  'Contribuinte do cliente que recebe a nota desta OS. Substitui a marca contribuinte.contribuinte_faturamento, que decidia por cliente e nao dava conta de OS faturadas em contribuintes diferentes.';

create index if not exists idx_ordem_servico_contribuinte
  on public.ordem_servico (contribuinte_id) where contribuinte_id is not null;

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

DO $$
DECLARE
  v_fora_do_cliente integer;
  v_vazias_indevidas integer;
BEGIN
  SELECT count(*) INTO v_fora_do_cliente
    FROM public.ordem_servico os
    JOIN public.contribuinte c ON c.id = os.contribuinte_id
   WHERE c.cliente_id IS DISTINCT FROM os.id_cliente;
  IF v_fora_do_cliente > 0 THEN
    RAISE EXCEPTION 'GATE: % OS apontam para contribuinte de outro cliente', v_fora_do_cliente;
  END IF;

  SELECT count(*) INTO v_vazias_indevidas
    FROM public.ordem_servico os
   WHERE os.excluido = false AND os.contribuinte_id IS NULL
     AND EXISTS (SELECT 1 FROM public.contribuinte c
                  WHERE c.cliente_id = os.id_cliente AND c.excluido = false);
  IF v_vazias_indevidas > 0 THEN
    RAISE EXCEPTION 'GATE: % OS ficaram sem contribuinte tendo candidato disponivel', v_vazias_indevidas;
  END IF;

  RAISE NOTICE 'GATE ok';
END $$;
