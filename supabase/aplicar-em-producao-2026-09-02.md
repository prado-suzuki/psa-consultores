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

## Duas destas 29 são REVERSÕES, e é de propósito

`20260827180632_reverte_projeto_restrito_tarefa_pausada.sql` e
`20260827180800_reverte_projeto_restrito_texto_identico_a_producao.sql` desfazem o
que os arquivos 2 a 5 criam. A frente de "projeto restrito" foi **pausada** em
27/08/2026 e o trabalho saiu para uma branch local.

**Aplique as duas, na ordem em que estão.** O efeito líquido do bloco 2 a 7 é
nenhum: as colunas `org_projects.restricted` e `org_tasks.project_restricted` e as
funções `audit_log_projeto`, `org_projects_espelha_restricted`,
`org_projects_guarda_restricted`, `org_projects_sincroniza_membros`,
`org_tasks_guarda_restrito` e `org_tasks_herda_restricted` nascem no meio do
pacote e são removidas no fim. Isso é o estado correto, e é o estado do nosso banco
de desenvolvimento, que já aplicou as 29.

Se você aplicar da 2 à 5 e parar, produção fica com schema de uma frente pausada.
Não pare no meio deste bloco.

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

Nenhuma linha deve voltar com `FALTA` (objeto que devia existir e não existe) nem
com `SOBRA` (objeto que devia ter sido removido e ficou). Os valores esperados foram
lidos do nosso banco de desenvolvimento depois de aplicar as 29, e não deduzidos do
texto das migrations:

```sql
-- Verificação pelo efeito LÍQUIDO das 29 migrations, não pelo que cada uma cria.
--
-- Os valores esperados foram LIDOS do banco de desenvolvimento, que já aplicou as
-- 29 na ordem, e não deduzidos do texto das migrations. É por isso que a lista tem
-- dois lados: 38 objetos devem existir no fim e 15 NÃO devem.
--
-- Esperado: nenhuma linha com 'FALTA' e nenhuma com 'SOBRA'.

select 'deve existir' as regra, 'COLUNA' as tipo, 'documento_gerado.acompanha_documento_id' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='documento_gerado' and column_name='acompanha_documento_id') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'documento_gerado.papel' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='documento_gerado' and column_name='papel') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao.com_reserva' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao' and column_name='com_reserva') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao.nome' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao' and column_name='nome') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao.pct_base_instituicao' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao' and column_name='pct_base_instituicao') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao.pct_base_reserva' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao' and column_name='pct_base_reserva') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_doador.conjuge_pessoa_id' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_doador' and column_name='conjuge_pessoa_id') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_doador.emissao_conjunta' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_doador' and column_name='emissao_conjunta') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_doador.quotas_do_aporte' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_doador' and column_name='quotas_do_aporte') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_doador.quotas_final' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_doador' and column_name='quotas_final') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_doador.quotas_transmitidas' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_doador' and column_name='quotas_transmitidas') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_doador.vlr_aporte_moeda' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_doador' and column_name='vlr_aporte_moeda') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_donatario.quotas_atuais' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='quotas_atuais') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_donatario.quotas_do_aporte' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='quotas_do_aporte') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_donatario.quotas_final' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='quotas_final') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'itcd_simulacao_donatario.vlr_aporte_moeda' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='vlr_aporte_moeda') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'COLUNA' as tipo, 'tmpl_documento.escopo' as objeto, case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='tmpl_documento' and column_name='escopo') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'alertar_tarefas_por_prazo' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='alertar_tarefas_por_prazo') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'can_view_org_project' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='can_view_org_project') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'cliente_id_de_itcd_simulacao' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='cliente_id_de_itcd_simulacao') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'documento_gerado_raiz_default' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='documento_gerado_raiz_default') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'feed_org_comments' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='feed_org_comments') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'itcd_gravar_simulacao' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='itcd_gravar_simulacao') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'itcd_simulacao_retrato_imutavel' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='itcd_simulacao_retrato_imutavel') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'nova_versao_bloco' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='nova_versao_bloco') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'org_task_visivel' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='org_task_visivel') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'own_org_task_ids' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='own_org_task_ids') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'selar_e_forkar_documento' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='selar_e_forkar_documento') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'status_de_itcd_simulacao' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='status_de_itcd_simulacao') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'tarefas_a_alertar' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='tarefas_a_alertar') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'FUNCAO' as tipo, 'visible_org_project_ids' as objeto, case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='visible_org_project_ids') then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'TABELA' as tipo, 'itcd_simulacao' as objeto, case when to_regclass('public.itcd_simulacao') is not null then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'TABELA' as tipo, 'itcd_simulacao_concessao' as objeto, case when to_regclass('public.itcd_simulacao_concessao') is not null then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'TABELA' as tipo, 'itcd_simulacao_doador' as objeto, case when to_regclass('public.itcd_simulacao_doador') is not null then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'TABELA' as tipo, 'itcd_simulacao_donatario' as objeto, case when to_regclass('public.itcd_simulacao_donatario') is not null then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'TABELA' as tipo, 'itcd_simulacao_gia' as objeto, case when to_regclass('public.itcd_simulacao_gia') is not null then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'TABELA' as tipo, 'itcd_simulacao_usufruto' as objeto, case when to_regclass('public.itcd_simulacao_usufruto') is not null then 'ok' else 'FALTA' end as estado union all
select 'deve existir' as regra, 'TABELA' as tipo, 'psa_migrations_aplicadas' as objeto, case when to_regclass('public.psa_migrations_aplicadas') is not null then 'ok' else 'FALTA' end as estado union all
select 'NAO deve existir', 'COLUNA', 'itcd_simulacao_donatario.pct_doacao_anterior', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='pct_doacao_anterior') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'itcd_simulacao_donatario.vlr_base_contabil', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='vlr_base_contabil') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'itcd_simulacao_donatario.vlr_base_itr', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='vlr_base_itr') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'itcd_simulacao_donatario.vlr_base_mercado', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='vlr_base_mercado') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'itcd_simulacao_donatario.vlr_imposto_contabil', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='vlr_imposto_contabil') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'itcd_simulacao_donatario.vlr_imposto_itr', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='vlr_imposto_itr') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'itcd_simulacao_donatario.vlr_imposto_mercado', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='itcd_simulacao_donatario' and column_name='vlr_imposto_mercado') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'org_projects.restricted', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='org_projects' and column_name='restricted') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'COLUNA', 'org_tasks.project_restricted', case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='org_tasks' and column_name='project_restricted') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'FUNCAO', 'audit_log_projeto', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='audit_log_projeto') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'FUNCAO', 'org_projects_espelha_restricted', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='org_projects_espelha_restricted') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'FUNCAO', 'org_projects_guarda_restricted', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='org_projects_guarda_restricted') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'FUNCAO', 'org_projects_sincroniza_membros', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='org_projects_sincroniza_membros') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'FUNCAO', 'org_tasks_guarda_restrito', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='org_tasks_guarda_restrito') then 'SOBRA' else 'ok' end union all
select 'NAO deve existir', 'FUNCAO', 'org_tasks_herda_restricted', case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='org_tasks_herda_restricted') then 'SOBRA' else 'ok' end
order by 4 desc, 1, 2, 3;
```
