-- ============================================================
-- BACKUP — mensagens duplicadas de chamados
-- ============================================================
-- Extraído de produção via MCP (SELECT) em 07/08/2026, antes da migração
-- 20260807120000_precheck_client_e_duplicatas_chamados.sql.
--
-- Conteúdo: as 6 cópias excedentes de 5 grupos duplicados (5 chamados).
-- A PRIMEIRA cópia de cada grupo NÃO está aqui — ela permanece na base.
-- Todas de role `client` (is_admin = false), geradas entre 3s e 44s após a
-- original pelo reenvio manual do cliente após ver erro falso na tela.
--
-- Este arquivo é a via de restauração fora do banco. Dentro do banco, a
-- migração também grava tudo em public.bkp_20260807_ticket_messages_dup.
--
-- COMO RESTAURAR (se necessário):
--   ALTER TABLE public.ticket_messages DISABLE TRIGGER trg_ticket_messages_bloqueia_reenvio;
--   <rodar os INSERTs abaixo>
--   ALTER TABLE public.ticket_messages ENABLE TRIGGER trg_ticket_messages_bloqueia_reenvio;
-- ============================================================

-- 1/6 · chamado dba2a80c (Contabilização de cotas de investimentos FIDC) · cópia 2 · +44s
INSERT INTO public.ticket_messages (id, ticket_id, user_id, is_admin, message, created_at)
VALUES ('88d9c494-d446-406d-8e6e-b5c009237e79'::uuid,
        'dba2a80c-cc4b-40a3-8c35-9757040f9c19'::uuid,
        'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid,
        false,
        $msg$Bom dia, espero que estejam bem!

Gostaria de uma previsão de retorno.$msg$,
        '2026-07-09 12:48:03.453966+00');

-- 2/6 · chamado 24acd76e (Operação de venda de milho em grãos com suspensão) · cópia 2 · +9s
INSERT INTO public.ticket_messages (id, ticket_id, user_id, is_admin, message, created_at)
VALUES ('b960e18d-ead4-4e46-8401-640f086ae537'::uuid,
        '24acd76e-68c7-404d-a718-608380663bda'::uuid,
        '8ee84d00-7160-4744-805d-d44cef003d4a'::uuid,
        false,
        $msg$Boa tarde,

Aproveitando o embalo, a empresa O Agro Agropecuária (Lucro Real) ao vender milho em grãos NCM 1005.90.10 para cooperativa (lucro Real), ela tem suspensão de PIS e COFINS com base no Art. 9 da Lei 10.925 de 2004?$msg$,
        '2026-07-16 20:18:18.619368+00');

-- 3/6 · chamado a71f54f0 (FRETE DIRETO - REMESSA DE ATIVO IMOBILIZADO) · cópia 2 · +3s
INSERT INTO public.ticket_messages (id, ticket_id, user_id, is_admin, message, created_at)
VALUES ('224c05f7-3cb2-4e77-9bcc-0af83f2d1a78'::uuid,
        'a71f54f0-cf19-48ea-9628-72047922a6c6'::uuid,
        'e66d03a1-8600-42cc-99ed-e408b48096ba'::uuid,
        false,
        $msg$[[ticket-rich-text:v1]]{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Origem: Rio de Janeiro"}]},{"type":"paragraph","content":[{"type":"text","text":"Destino: Brasilia - DF"}]},{"type":"paragraph","content":[{"type":"text","text":"Estado emissor: Transoeste Matriz - MT - 82.714.783/0001-30"}]},{"type":"paragraph","content":[{"type":"text","text":"a nota do transporte está anexa ao chamado, a duvida é para emitirmos o CTE corretamente."}]}]}$msg$,
        '2026-07-24 17:14:24.464611+00');

-- 4/6 · chamado ee016c9a (Venda em garantia e entrada para recebimento) · cópia 2 · +40s
INSERT INTO public.ticket_messages (id, ticket_id, user_id, is_admin, message, created_at)
VALUES ('be75144e-f869-401b-b9f7-24d06859b710'::uuid,
        'ee016c9a-2747-4f6b-b94e-ed6e3ba93fb1'::uuid,
        'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid,
        false,
        $msg$[[ticket-rich-text:v1]]{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"É necessário realizar algum registro fiscal específico em relação a essas notas fiscais ou se elas devem apenas ser arquivadas para fins de comprovação da operação."}]}]}$msg$,
        '2026-07-30 20:20:17.663004+00');

-- 5/6 · chamado 137ae326 (Mapeamento tributário-FINTECH) · cópia 2 · +4s
INSERT INTO public.ticket_messages (id, ticket_id, user_id, is_admin, message, created_at)
VALUES ('380ef1eb-cd5a-4df1-a0e4-f1373380e6da'::uuid,
        '137ae326-82df-4064-b6c5-47d4f85d52d5'::uuid,
        'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid,
        false,
        $msg$[[ticket-rich-text:v1]]{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Leonardo, boa tarde, "}]},{"type":"paragraph","content":[{"type":"text","text":"Gostaríamos de aproveitar o mapeamento enviado e submeter o contrato onde prevê o Floating e seus cálculos para mapeamento da necessidade ou nao de emissão de NFS, e tributação aplicada."}]}]}$msg$,
        '2026-08-06 18:33:27.578018+00');

-- 6/6 · chamado 137ae326 (Mapeamento tributário-FINTECH) · cópia 3 · +11s
INSERT INTO public.ticket_messages (id, ticket_id, user_id, is_admin, message, created_at)
VALUES ('044a69dc-03a4-4338-b4eb-2fef9afc9f37'::uuid,
        '137ae326-82df-4064-b6c5-47d4f85d52d5'::uuid,
        'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid,
        false,
        $msg$[[ticket-rich-text:v1]]{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Leonardo, boa tarde, "}]},{"type":"paragraph","content":[{"type":"text","text":"Gostaríamos de aproveitar o mapeamento enviado e submeter o contrato onde prevê o Floating e seus cálculos para mapeamento da necessidade ou nao de emissão de NFS, e tributação aplicada."}]}]}$msg$,
        '2026-08-06 18:33:34.957495+00');
