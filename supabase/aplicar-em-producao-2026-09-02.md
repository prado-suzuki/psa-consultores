# Aplicar em produção: as 29 migrations de 02/09/2026

Este documento é a instrução completa da operação. Ele vive no repositório de
propósito: o pedido no chat do Lovable aponta para cá em vez de carregar 214 KB de
SQL, e assim o que foi pedido fica auditável depois.

Aplique no banco de produção o conjunto de migrations que está neste repositório,
em `supabase/migrations/`.

## Contexto

As 29 migrations listadas abaixo já foram aplicadas e validadas no nosso ambiente
de desenvolvimento. Produção ainda não tem esse schema: faltam 7 tabelas, 19
colunas e 20 funções, conferidas uma por uma antes de eu te mandar isso.

Todas são idempotentes de propósito: `if not exists`, `create or replace`,
`drop ... if exists` antes de `create`, `on conflict` nos inserts. Se alguma já
tiver sido aplicada aí por outro caminho, rodar de novo é no-op, não erro. Então
não precisa auditar o que já existe: aplique todas, na ordem.

## O que fazer

1. Aplicar o SQL dos 29 arquivos abaixo, **na ordem em que estão listados**, que é
   a ordem do timestamp no nome.
2. Regenerar o `types.ts` a partir do banco depois de aplicar, e commitar na `main`.
3. Me responder com três coisas: quais foram aplicadas, quais deram erro com a
   mensagem **literal** do Postgres, e o resultado da consulta de verificação que
   está no fim desta mensagem.

## O que NÃO fazer

- Não reescreva, não reformate, não reordene e não "melhore" o SQL. O texto dos
  arquivos é o que tem de rodar.
- Não crie tabela, coluna, índice, policy, trigger, função ou enum que não esteja
  escrito nesses arquivos.
- Não mexa em nenhum arquivo de `src/`, com a única exceção do `types.ts`
  regenerado a partir do banco.
- Não crie migration nova para "consertar" nada.
- Não apague e não edite migration que já existe no repositório.
- Se algo te parecer errado ou faltando, **pare e me diga qual arquivo e qual
  linha**, em vez de decidir por conta. Um erro na metade é mais fácil de
  resolver do que uma correção que eu não pedi.

## Os 29 arquivos, na ordem

 1. 20260826154524_itcd_calculadora_schema.sql
 2. 20260827135312_projeto_restrito_fundacao.sql
 3. 20260827135718_projeto_restrito_regras.sql
 4. 20260827150038_projeto_restrito_auditoria.sql
 5. 20260827154935_projeto_restrito_vinculado_ve_tudo.sql
 6. 20260827180632_reverte_projeto_restrito_tarefa_pausada.sql
 7. 20260827180800_reverte_projeto_restrito_texto_identico_a_producao.sql
 8. 20260828140000_itcd_simulacao_quadro_congelado.sql
 9. 20260828160240_itcd_simulacao_quadro_congelado.sql
10. 20260828170000_itcd_simulacao_usufruto.sql
11. 20260828180000_itcd_aporte_em_moeda.sql
12. 20260828191819_itcd_simulacao_usufruto.sql
13. 20260828200305_itcd_aporte_em_moeda.sql
14. 20260828202502_documento_gerado_head_unica_e_forks_atomicos.sql
15. 20260831093000_memorial_georref_por_imovel_do_documento.sql
16. 20260831100000_itcd_simulacao_gia.sql
17. 20260831174631_feed_org_comments_eventos.sql
18. 20260831182743_papeis_de_documento.sql
19. 20260831202229_ges01a_tipos_de_aviso_de_prazo.sql
20. 20260831202316_ges01a_varredura_de_prazo_de_tarefa.sql
21. 20260831204310_ges01a_cron_varredura_de_prazo.sql
22. 20260831210000_itcd_gravacao_transacional.sql
23. 20260831210500_itcd_rls_ciclo_de_aprovacao.sql
24. 20260901120000_itcd_retrato_imutavel.sql
25. 20260901120951_ges01a_chave_por_destinatario.sql
26. 20260901133044_ges01a_gestor_ve_de_quem_e_a_tarefa.sql
27. 20260901135620_ges01a_varredura_respeita_ambiente.sql
28. 20260901144842_ges01a_ativar_cron_por_banco.sql
29. 20260902190824_ledger_de_sync_do_sandbox.sql

## Uma nota sobre a última

`20260902190824_ledger_de_sync_do_sandbox.sql` cria a tabela
`psa_migrations_aplicadas`. Ela é ferramenta de desenvolvimento e fica inerte em
produção: RLS ligada, nenhuma policy, e nada no app a lê. Ela vem de propósito,
para não existir schema que só um dos bancos tem.

## Verificação, para rodar depois e me mostrar o resultado

Nenhuma linha deve voltar com `FALTA`:

```sql
-- Verificação do pacote: rode isto DEPOIS de aplicar, e nenhuma linha deve
-- voltar com "FALTA". São 7 tabelas, 19 colunas e 20 funções.
with tab(nome) as (values
  ('itcd_simulacao'),
  ('itcd_simulacao_concessao'),
  ('itcd_simulacao_doador'),
  ('itcd_simulacao_donatario'),
  ('itcd_simulacao_gia'),
  ('itcd_simulacao_usufruto'),
  ('psa_migrations_aplicadas')
), col(t, c) as (values
  ('documento_gerado', 'acompanha_documento_id'),
  ('documento_gerado', 'papel'),
  ('itcd_simulacao', 'com_reserva'),
  ('itcd_simulacao', 'nome'),
  ('itcd_simulacao', 'pct_base_instituicao'),
  ('itcd_simulacao', 'pct_base_reserva'),
  ('itcd_simulacao_doador', 'conjuge_pessoa_id'),
  ('itcd_simulacao_doador', 'emissao_conjunta'),
  ('itcd_simulacao_doador', 'quotas_do_aporte'),
  ('itcd_simulacao_doador', 'quotas_final'),
  ('itcd_simulacao_doador', 'quotas_transmitidas'),
  ('itcd_simulacao_doador', 'vlr_aporte_moeda'),
  ('itcd_simulacao_donatario', 'quotas_atuais'),
  ('itcd_simulacao_donatario', 'quotas_do_aporte'),
  ('itcd_simulacao_donatario', 'quotas_final'),
  ('itcd_simulacao_donatario', 'vlr_aporte_moeda'),
  ('org_projects', 'restricted'),
  ('org_tasks', 'project_restricted'),
  ('tmpl_documento', 'escopo')
), fn(nome) as (values
  ('alertar_tarefas_por_prazo'),
  ('audit_log_projeto'),
  ('can_view_org_project'),
  ('cliente_id_de_itcd_simulacao'),
  ('documento_gerado_raiz_default'),
  ('feed_org_comments'),
  ('itcd_gravar_simulacao'),
  ('itcd_simulacao_retrato_imutavel'),
  ('nova_versao_bloco'),
  ('org_projects_espelha_restricted'),
  ('org_projects_guarda_restricted'),
  ('org_projects_sincroniza_membros'),
  ('org_task_visivel'),
  ('org_tasks_guarda_restrito'),
  ('org_tasks_herda_restricted'),
  ('own_org_task_ids'),
  ('selar_e_forkar_documento'),
  ('status_de_itcd_simulacao'),
  ('tarefas_a_alertar'),
  ('visible_org_project_ids')
)
select 'TABELA' as tipo, nome as objeto,
       case when to_regclass('public.' || nome) is not null then 'ok' else 'FALTA' end as estado
  from tab
union all
select 'COLUNA', t || '.' || c,
       case when exists (select 1 from information_schema.columns
                          where table_schema='public' and table_name=t and column_name=c)
            then 'ok' else 'FALTA' end
  from col
union all
select 'FUNCAO', nome,
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                          where n.nspname='public' and p.proname=nome)
            then 'ok' else 'FALTA' end
  from fn
order by 3 desc, 1, 2;
```
