-- FIXTURE DE SANDBOX -- APLICADO A MAO, NUNCA POR MIGRACAO
--
-- Este arquivo NAO fica em `supabase/migrations/`, e a razao e concreta: ele
-- reaponta o contato de um representante para o e-mail e o telefone PESSOAIS do
-- Alexandre e cria uma solicitacao falsa. Em `migrations/` ele seria aplicado
-- automaticamente em PRODUCAO junto das outras.
--
-- A primeira versao deste arquivo estava em `migrations/`, guardada por
-- `ambiente = 'dev'` mais o nome do cliente. Medido em 25/08/2026, essa protecao era
-- fina: producao tem 112 clientes com `ambiente = 'dev'` (de 327), entao a guarda de
-- ambiente nao segura nada la -- o que segurava era so o nome nao existir. Bastaria
-- alguem criar um cliente de teste chamado "Iglu Tropical" em producao, e cliente de
-- teste em producao e coisa corrente ali, para o arquivo disparar no lugar errado.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- O QUE ELE MONTA
--
-- O CENARIO 4 (VENCER), para testar a GES-04 -- o aviso de solicitacao vencida sem
-- nenhum documento recebido. Os cenarios 1 a 3 (ENVIAR, AVISAR, ENCERRAR) ja existem
-- e cobrem os outros tres avisos.
--
-- POR QUE UM CENARIO NOVO, E NAO REUSAR OS TRES QUE EXISTEM
--    As guardas da rota `solicitacao_vencida` na borda exigem, ao mesmo tempo, prazo
--    VENCIDO (logo `enviada_em` antiga) e ZERO documento do cliente criado DEPOIS de
--    `enviada_em`. Os tres clientes de teste que apontam para o Alexandre tem 273, 3
--    e 92 documentos vivos, todos recentes: com `enviada_em` antiga eles caem dentro
--    da janela e bloqueiam. As duas condicoes se excluem em qualquer cliente com
--    documento recente -- por isso o cenario tem de nascer limpo.
--
--    O `Iglu Tropical` foi escolhido por ser o unico cliente de teste com ZERO
--    documentos que JA TEM representante com `user_id` (o que a
--    `destinatarios_cliente` exige). Criar representante novo pediria vincular um
--    usuario de autenticacao, escrita bem maior.
--
-- COMO RODAR
--    Pelo MCP do Supabase (`execute_sql`) apontando para o sandbox, ou pelo SQL
--    editor do projeto de dev. Idempotente: rodar duas vezes deixa o banco igual.
--
-- CONFERENCIA
--    select * from public.solicitacoes_a_cobrar();
--    -- deve devolver a solicitacao do `[TESTE 4 · VENCER] Iglu Tropical`, ciclo 1

do $$
declare
  v_cliente   uuid;
  v_os        uuid;
  v_solic     uuid;
  v_autor     uuid;
  c_marca     text := 'fixture GES-04 · cenario 4 VENCER';
  c_prod_soc  uuid := 'e74069b3-cbe2-4bdd-b69a-7bef00043dda'; -- Estruturação Societária
  c_prod_suc  uuid := '57316b51-01f8-4d69-a7de-50d625243d68'; -- Planejamento Sucessório
begin
  -- ── GUARDA DURA: so roda na replica anonimizada ──
  --
  -- Nao depende de nome de cliente nem da coluna `ambiente`, que existem nos dois
  -- bancos. Depende de uma propriedade que SO a copia anonimizada tem: representante
  -- com e-mail `@exemplo.dev`. Medido em 25/08/2026 -- dev: 69 de 76; producao: ZERO.
  --
  -- E `raise exception`, nao `return` silencioso: rodar isto no banco errado tem de
  -- doer na hora, e nao parecer que "nao fez nada".
  if not exists (select 1 from public.representante where email ilike '%@exemplo.dev%') then
    raise exception 'FIXTURE DE SANDBOX rodando no banco errado: nao ha representante anonimizado (@exemplo.dev). Abortado sem escrever nada.';
  end if;

  select c.id into v_cliente
    from public.cliente c
   where c.ambiente = 'dev'
     and c.nome ilike '%Iglu Tropical%'
   limit 1;

  if v_cliente is null then
    raise notice 'cenario 4: cliente de teste ausente -- nada a fazer';
    return;
  end if;

  select os.id into v_os
    from public.ordem_servico os
   where os.id_cliente = v_cliente
     and coalesce(os.excluido, false) = false
   order by os.numero_os
   limit 1;

  if v_os is null then
    raise notice 'cenario 4: cliente sem OS -- nada a fazer';
    return;
  end if;

  -- 1 ─ O objeto do aviso. A OS vinha com "Canal de Chamados", que nao faz sentido
  --     num aviso de coleta de documentos. Passa aos DOIS produtos canonicos dos
  --     documentos de redacao, para a mensagem renderizada ficar comparavel a previa
  --     que a coordenacao aprovou -- inclusive na forma PLURAL do objeto.
  delete from public.os_produtos_contratados where ordem_servico_id = v_os;
  insert into public.os_produtos_contratados (ordem_servico_id, produto_segmento_id)
  values (v_os, c_prod_soc), (v_os, c_prod_suc)
  on conflict do nothing;

  -- 2 ─ O destinatario passa a ser o Alexandre. A regra da casa e que teste que possa
  --     vazar vaze para quem esta testando. E O MOTIVO DE ESTE ARQUIVO NAO SER
  --     MIGRACAO: em producao isto repontaria o contato de um cliente real.
  update public.representante
     set nome     = 'Alexandre Silva',
         email    = 'alexandre.silva@psaconsultores.com.br',
         telefone = '65993264754'
   where id_cliente = v_cliente
     and coalesce(excluido, false) = false;

  -- 3 ─ Nomenclatura dos cenarios que ja existem, para o fixture se explicar sozinho.
  update public.cliente
     set nome = '[TESTE 4 · VENCER] Iglu Tropical Climatização Contraditória Ltda'
   where id = v_cliente
     and nome not like '[TESTE 4%';

  -- 4 ─ A solicitacao vencida: enviada ha 40 dias, logo prazo (envio + 30) vencido ha
  --     10. Segue ABERTA (`encerrada_em` nulo), que e o que a guarda exige.
  select id into v_solic
    from public.solicitacao
   where cliente_id = v_cliente and observacao = c_marca
   limit 1;

  if v_solic is null then
    select p.id into v_autor
      from public.profiles p
     where p.email = 'alexandre.silva@psaconsultores.com.br'
     limit 1;

    insert into public.solicitacao (cliente_id, ordem_servico_id, status, enviada_em,
                                    observacao, created_by, updated_by)
    values (v_cliente, v_os, 'enviada', now() - interval '40 days',
            c_marca, v_autor, v_autor)
    returning id into v_solic;

    -- 5 ─ Tres itens ativos. A guarda "sem pendencia nao se cobra" conta
    --     `solicitacao_item` com `status = 'ativo'`; o conteudo nao entra na mensagem
    --     deste aviso, que nao lista nada.
    insert into public.solicitacao_item
      (solicitacao_id, granularidade, grupo, documento, status, ordem, created_by, updated_by)
    values
      (v_solic, 'pessoa_pf', 'pf',           'Certidão de casamento', 'ativo', 1, v_autor, v_autor),
      (v_solic, 'cliente',   'pj',           'Contrato social',       'ativo', 2, v_autor, v_autor),
      (v_solic, 'cliente',   'bens_imoveis', 'Matrícula atualizada',  'ativo', 3, v_autor, v_autor);

    raise notice 'cenario 4: solicitacao % criada, vencida ha 10 dias', v_solic;
  else
    raise notice 'cenario 4: solicitacao % ja existia -- nada a recriar', v_solic;
  end if;
end $$;
