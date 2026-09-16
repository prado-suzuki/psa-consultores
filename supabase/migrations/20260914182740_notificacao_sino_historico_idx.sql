-- Índices plenos para o histórico do sino.
--
-- O balão do sino passou a mostrar as 30 notificações mais recentes, lidas ou
-- não (pedido do Bernardo, 14/09/2026: a bolinha vermelha some quando a pessoa
-- vê o aviso, mas a lista continua lá). As duas consultas que o alimentam
-- deixaram de filtrar `lido_em is null`, e com isso deixaram de caber nos
-- índices que existiam:
--
--   notificacao_nao_lidas_idx            (destinatario_id, created_at desc) where lido_em is null
--   org_comment_mentions_unread_idx      (mentioned_user_id, created_at desc) where lido_em is null
--
-- Índice parcial só serve à consulta que repete o predicado dele. Sem o par
-- pleno abaixo, ler a caixa vira varredura mais ordenação — hoje é barato, e
-- fica barato enquanto ninguém precisar reparar nisso.
--
-- Os parciais FICAM. Eles continuam servindo ao que é por natureza "só não
-- lido": a contagem da bolinha e, no caso de `notificacao`, o índice único
-- `notificacao_agrupamento_uq`, que é o que agrupa 63 documentos do mesmo
-- cliente numa linha só enquanto o aviso não foi lido.

create index if not exists notificacao_destinatario_recentes_idx
  on public.notificacao using btree (destinatario_id, created_at desc);

create index if not exists org_comment_mentions_recentes_idx
  on public.org_comment_mentions using btree (mentioned_user_id, created_at desc);
