-- 20260814170100_notificacao_tipo_chamado.sql
-- ALE-1 · o enum notificacao_tipo ganha o dominio de chamado.
--
-- registrar_envio() (20260812120000_notificacao_base.sql) exige _tipo
-- public.notificacao_tipo, NOT NULL, sem default. A ALE-1 chama
-- registrar_envio() dentro de supabase/functions/notify-ticket/index.ts para
-- gravar, por evento de chamado, quem recebeu o aviso -- e o enum hoje so cobre
-- tarefa/documento/solicitacao (7 valores, nenhum de chamado). Sem os 5 valores
-- abaixo a borda nao tem o que passar em _tipo. Lacuna reportada e decisao
-- aprovada pelo Bernardo em docs/ALE-1-bloqueio-notificacao-tipo-chamado.md.
--
-- Mapa event_type (notify-ticket) -> valor do enum, 1:1 na mesma ordem
-- sugerida naquele documento:
--   ticket_created  -> chamado_criado
--   ticket_assigned -> chamado_atribuido
--   ticket_replied  -> chamado_respondido
--   ticket_overdue  -> chamado_vencido
--   ticket_resolved -> chamado_resolvido
--
-- ALTER TYPE ... ADD VALUE nao roda dentro de bloco de transacao; fica solto,
-- sem BEGIN/COMMIT. Molde: 20260812120100_org_comment_kind_documentos_solicitados.sql.
--
-- Conferido no banco em 13/08/2026, nao presumido: public.notificacao_tipo
-- existe com exatamente os 7 valores de 20260812120000 (tarefa_atribuida,
-- tarefa_em_revisao, documento_recebido, solicitacao_enviada,
-- documento_aprovado, documento_recusado, cobranca_pendencia), nenhum deles de
-- chamado; nenhum dos 5 nomes abaixo (chamado_criado, chamado_atribuido,
-- chamado_respondido, chamado_vencido, chamado_resolvido) existe hoje como
-- enumlabel em NENHUM enum do banco, em nenhum schema.
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'chamado_criado';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'chamado_atribuido';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'chamado_respondido';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'chamado_vencido';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'chamado_resolvido';
