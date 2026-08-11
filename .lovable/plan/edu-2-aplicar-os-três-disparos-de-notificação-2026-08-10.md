# EDU-2 — Aplicar os três disparos de notificação

Aplicar `supabase/migrations/20260814130000_notificacao_disparos.sql` exatamente como está na main. Nada de front, nada de RLS, nada nas tabelas da caixa.

## Pré-voo: conferido, tudo bate

- As 3 funções da EDU-1 existem: `criar_notificacao`, `registrar_envio`, `destinatarios_cliente`.
- Colisão de nome: zero. Nenhuma das 3 funções e nenhum dos 3 gatilhos existe ainda.
- As 15 colunas usadas pelo SQL existem (`org_tasks.assigned_to/title/status/project_id/reviewer_id`, `org_projects.leader_id`, `documento_arquivo.fonte/excluido/cliente_id/ambiente`, `solicitacao.created_by/cliente_id/status`, `estrutura_areas.gestor_chamados_id/is_active`) e os 3 valores de enum (`review`, `cliente`, `encerrada`) estão presentes.
- Gatilhos já existentes: `documento_arquivo` tem só `trg_doc_arq_updated_at`; `org_tasks` tem os 4 esperados. Nenhum com os nomes novos.

## O que será aplicado

Uma única migração, o conteúdo do arquivo commitado, sem edição, dentro do `BEGIN/COMMIT` dele:

1. `notificar_tarefa_atribuida()` + `trg_notificar_tarefa_atribuida` — AFTER UPDATE OF `assigned_to` em `org_tasks`, com guarda de valor distinto e de auto-atribuição, agrupando por tarefa.
2. `notificar_documento_recebido()` + `trg_notificar_documento_recebido` — AFTER INSERT em `documento_arquivo` quando `fonte = 'cliente'` e não excluído; destinatário é o dono da solicitação ativa ou, na falta, os gestores de chamados; agrupa por cliente e por dia.
3. `notificar_tarefa_em_revisao()` + `trg_notificar_tarefa_em_revisao` — AFTER UPDATE OF `status` em `org_tasks` quando entra em `review`; sai em silêncio se o projeto não tem líder ou se o líder é o próprio revisor.

As três funções são `security definer` com `search_path = public` e cada corpo é protegido por bloco de exceção, para que uma falha de aviso nunca derrube a escrita principal.

## GATE

Parte 1 (leitura): confirmar as 3 funções com `prosecdef = true` e os 3 gatilhos com evento/momento corretos via `pg_get_triggerdef`.

Parte 2 (comportamento), sobre dados de teste criados e apagados por mim, nunca sobre registro real:

1. reatribuir tarefa gera 1 linha para o novo responsável
2. repetir o update com o mesmo responsável não gera segunda linha
3. dois arquivos do mesmo cliente no mesmo dia geram 1 linha com `quantidade = 2`
4. projeto sem líder: mover para revisão continua funcionando e não gera linha
5. líder igual ao `reviewer_id`: não gera linha
6. mudar só o título não gera nada

Fecho com a leitura das últimas linhas de `notificacao` conferindo `entidade_tipo`, `entidade_id`, `agrupamento_chave`, `quantidade`, `href` nulo e `metadata`. Ao final listo exatamente o que criei e apaguei. Se qualquer item falhar ou `href` vier preenchido, paro e reporto antes de corrigir.

## Fora de escopo

Tabelas `notificacao`/`notificacao_envio`, as 3 funções da EDU-1, os gatilhos pré-existentes, RLS, `src/` e `types.ts` — nada disso é tocado. Nenhum segundo arquivo de migração será criado.
