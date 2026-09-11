-- 20260908134550_go08_apaga_as_cinco_solicitacoes_de_teste_sem_os.sql
-- Sprint 13 / GO-08: as cinco solicitações sem OS eram teste, e saem.
--
-- O card GO-08 nasceu com a premissa de que solicitação sem OS vinha de OS apagada, pelo
-- ON DELETE SET NULL da chave. Apurado em 08/09/2026, não é isso: o audit_logs mostra as
-- cinco criadas já sem OS numa sessão de 70 minutos em 04/08, e a única OS daquele cliente
-- (092/2026) está viva. O SET NULL nunca disparou, porque a aplicação faz exclusão lógica
-- de OS e ON DELETE SET NULL só reage a DELETE de verdade.
--
-- O QUE ELAS SÃO, medido por SELECT em produção em 08/09/2026: cinco linhas do cliente
-- `[TESTE] Alessio Sansão` (cliente.ambiente = 'dev', zero representante, logo nenhum
-- usuário de portal do outro lado), todas com status `encerrada`, zero documento_arquivo e
-- zero item dispensado. O CASCADE de solicitacao_item leva 92 itens: 46 em duas delas e
-- nenhum nas outras três.
--
-- POR QUE POR SQL, E NÃO PELA TELA: não existe caminho de aplicação. As três policies de
-- escrita de `solicitacao` usam `sublider_na_os(ordem_servico_id)`, e essa função começa
-- com `_ordem_servico_id is not null` — sem policy de escape para admin. Logo uma linha com
-- a coluna nula é somente-leitura para todo mundo, admin incluído: não dá para religar,
-- encerrar nem apagar pela tela. Isso é dívida registrada para a CAD-T5 tratar, junto com a
-- falha silenciosa de `useDomainSolicitacao.ts:254-262`, que tenta religar, leva 0 linhas da
-- RLS, não recebe erro e mostra "sucesso".
--
-- Idempotente: apagar por id que já não existe é no-op.

delete from public.solicitacao
 where id in ('84780ed8-bafb-4ece-b241-2c290435280d',   -- rascunho encerrado 17 min depois, 0 itens
              'ebd489ec-13e6-4850-bb8e-619695b54ed5',   -- rascunho encerrado 5 s depois, 0 itens
              'a6547d9e-93d6-4c7f-98fa-0dbfa9c27752',   -- enviada e encerrada em 6 s, 46 itens
              '0924ace7-f9e5-45df-bd9a-ddb805e19098',   -- rascunho encerrado 27 s depois, 0 itens
              '3ecfe2e6-f485-4581-a434-4d3840aa667a');  -- enviada e encerrada em 5 s, 46 itens
