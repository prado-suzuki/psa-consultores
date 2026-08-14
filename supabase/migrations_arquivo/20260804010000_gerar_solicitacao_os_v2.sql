-- EDU-25 · gerar_solicitacao_os passa a gravar em solicitacao_item.
--
-- Mesmo nome, mesmos parâmetros, mesmo retorno (quantidade criada), para não
-- quebrar a assinatura já publicada em types.ts.
--
-- O QUE SAI do corpo antigo:
--
-- 1) A multiplicação por entidade cadastrada. A versão anterior explodia cada
--    documento por cada pessoa, bem e matrícula do cliente (o bloco `alvos`, com
--    seis UNION ALL). Era o que fazia uma OS de 1 produto gerar 83 linhas. Isso
--    é a frente de checklist, que o Bernardo decidiu repensar e reescrever
--    depois. Aqui é UMA linha por documento do produto.
--
-- 2) A cópia de texto do catálogo. A versão anterior gravava modulo, entidade,
--    documento, nota, categoria e categoria_docbox por valor, e a cópia
--    envelheceu: 7 de 475 linhas em produção diziam entidade = 'Bem' enquanto o
--    catálogo, corrigido depois, dizia 'Cliente'.
--
-- O QUE PASSA A SER GRAVADO, e a razão da escolha:
--    granularidade e grupo SÃO copiados do catálogo porque são dados
--    ESTRUTURAIS, que o analista tem o direito de sobrescrever item a item (o
--    grão daquele pedido, a gaveta daquele pedido).
--    documento, entidade e nota ficam NULOS porque são TEXTO DE EXIBIÇÃO, cuja
--    fonte da verdade é o catálogo. A leitura resolve com coalesce (EDU-24).
--
-- O QUE FOI PRESERVADO do corpo antigo, verbatim:
--    - LANGUAGE plpgsql, VOLATILE, SECURITY DEFINER, SET search_path = public
--    - a guarda de escopo (cliente_visivel_para → 42501). Sem ela, SECURITY
--      DEFINER deixaria qualquer autenticado gerar pedido para qualquer cliente
--    - a guarda da OS: tem de existir, ser daquele cliente e não estar excluída
--    - a forma de descobrir os documentos do produto, agora com o nome novo da
--      tabela (produto_documento_tipo, EDU-20)
--    - os REVOKE/GRANT
--
-- DUAS PROPRIEDADES que precisam continuar valendo:
--
--    Idempotência. A função só INSERE o que falta (WHERE NOT EXISTS por
--    solicitacao_id + item_padrao_id). Nunca faz update, nunca faz delete. É
--    assim que item criado à mão (item_padrao_id nulo) e item que o analista
--    dispensou sobrevivem a uma segunda execução.
--
--    Produto acrescentado à OS DEPOIS do envio entra na solicitação que já está
--    enviada e NÃO abre rascunho novo: o `status <> 'encerrada'` do passo do
--    cabeçalho produz isso. Não mexe em status nem em enviada_em; quem muda
--    status é o botão (ALE-30).
--
-- Reversão: CREATE OR REPLACE com o corpo anterior (migration
-- 20260803150000_renomear_checklist_para_documento_tipo.sql).

BEGIN;

CREATE OR REPLACE FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_solicitacao uuid;
  v_criados     integer;
BEGIN
  IF NOT public.cliente_visivel_para(_cliente_id) THEN
    RAISE EXCEPTION 'cliente fora do seu escopo' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ordem_servico os
    WHERE os.id = _ordem_servico_id
      AND os.id_cliente = _cliente_id
      AND os.excluido = false
  ) THEN
    RAISE EXCEPTION 'ordem de servico nao encontrada para este cliente' USING ERRCODE = '42501';
  END IF;

  -- Acha o cabeçalho ativo ou cria um rascunho. Quem garante que não vão
  -- existir dois é o índice único parcial uq_solicitacao_ativa_por_cliente
  -- (EDU-21), não este IF: duas chamadas simultâneas passariam pelas duas
  -- verificações.
  SELECT s.id INTO v_solicitacao
  FROM public.solicitacao s
  WHERE s.cliente_id = _cliente_id
    AND s.status <> 'encerrada'::public.osg_solicitacao_status
  LIMIT 1;

  IF v_solicitacao IS NULL THEN
    INSERT INTO public.solicitacao (cliente_id, ordem_servico_id, status)
    VALUES (_cliente_id, _ordem_servico_id, 'rascunho'::public.osg_solicitacao_status)
    RETURNING id INTO v_solicitacao;
  END IF;

  WITH itens AS (
    SELECT pdt.item_padrao_id
    FROM public.os_produtos_contratados opc
    JOIN public.produto_documento_tipo pdt
      ON pdt.produto_segmento_id = opc.produto_segmento_id
    WHERE opc.ordem_servico_id = _ordem_servico_id
    GROUP BY pdt.item_padrao_id
  ),
  novos AS (
    INSERT INTO public.solicitacao_item (
      solicitacao_id, item_padrao_id, granularidade, grupo, ordem, status
    )
    SELECT v_solicitacao, i.item_padrao_id, t.granularidade, t.grupo, t.ordem,
           'ativo'::public.osg_solicitacao_item_status
    FROM itens i
    JOIN public.documento_tipo t ON t.id = i.item_padrao_id AND t.ativo
    WHERE NOT EXISTS (
      SELECT 1 FROM public.solicitacao_item si
      WHERE si.solicitacao_id = v_solicitacao
        AND si.item_padrao_id = i.item_padrao_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_criados FROM novos;

  RETURN v_criados;
END;
$function$;

COMMENT ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) IS
  'Monta a lista de documentos de uma OS na solicitação ativa do cliente, criando o cabeçalho em rascunho se ainda não houver. Uma linha por documento do produto, sem multiplicar por entidade e sem copiar texto do catálogo (documento, entidade e nota ficam nulos e a leitura herda). Idempotente: só insere o que falta, nunca atualiza nem apaga, então item manual e item dispensado sobrevivem a uma segunda execução. Não altera status nem enviada_em.';

REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM service_role;
REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.gerar_solicitacao_os(uuid, uuid) TO authenticated;

COMMIT;
