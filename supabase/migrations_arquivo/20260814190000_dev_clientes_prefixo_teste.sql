-- 20260814190000_dev_clientes_prefixo_teste.sql
-- Todo cadastro de cliente do ambiente `dev` passa a carregar o prefixo `[TESTE] `
-- no nome, para que um registro que vaze para producao se identifique sozinho.
--
-- O PROBLEMA. `dev` e `prod` dividem o MESMO banco; o que separa os dois e a
-- coluna `ambiente` em `cliente` e `contribuinte` (ver `src/config/api.ts`, que
-- deriva `currentAmbiente` do hostname). Toda query precisa lembrar de filtrar
-- `.eq('ambiente', currentAmbiente)`, e tabela que NAO tem a coluna (`ordem_servico`,
-- `representante`, `org_projects`, `tickets`) herda o ambiente pelo cliente a que
-- se liga. Basta um filtro esquecido para registro de dev aparecer em producao:
-- ja aconteceu duas vezes, documentado em `20260813150000_os_por_nome_respeita_ambiente.sql`
-- (OS de dev oferecidas a projeto de prod) e no proprio `src/lib/ambienteScope.ts`
-- (projetos e tarefas do preview aparecendo na producao).
--
-- POR QUE PREFIXO, E NAO EXCLUSAO. O pedido original era apagar do dev tudo que
-- tivesse nome de cliente real. Apagar e irreversivel e derruba junto os dados que
-- a equipe usa para testar (OS, pessoas, bens, documentos gerados). O prefixo
-- resolve o sintoma que importa agora, que e nao conseguir distinguir a olho um
-- registro de teste de um registro real, sem perder nada. Excluir fica para uma
-- segunda etapa, ja com o conjunto padrao de clientes de teste definido em
-- `docs/geral/clientes-de-teste-dev.md`.
--
-- Medido no banco em 14/08/2026, nao presumido:
--   - `cliente`:      112 linhas em dev (110 vivas + 2 soft-deleted), 187 em prod.
--                     111 sem prefixo; 1 ja tinha (`[Teste E2e] Grupo Mms`, do e2e).
--                     95 dos 112 sao copia de um cadastro homonimo de prod.
--   - `contribuinte`: 114 linhas em dev, nenhuma prefixada.
--   - Pendurados nos clientes de dev: 114 contribuintes, 205 documento_arquivo,
--     83 pessoas, 19 bens, 18 representantes, 11 OS, 7 documentos gerados,
--     3 projetos, 3 chamados. Nada disso e tocado aqui: o vinculo e por id.
--
-- O prefixo escolhido, `[TESTE] `, segue a familia que o harness e2e ja usa
-- (`[TESTE E2E] Grupo MMS`, ver `e2e/dados/dossie.json`). A guarda de
-- idempotencia e `btrim(nome) not ilike '[teste%'`, com ILIKE de proposito: o
-- gatilho de initcap, derrubado em `20260813103000`, achatou o nome do cliente do
-- e2e para `[Teste E2e] Grupo Mms`, e um LIKE sensivel a caixa prefixaria de novo.
--
-- Conferido antes de aplicar, para o UPDATE nao esbarrar em gatilho:
--   - `trg_cliente_tem_cluster` e CONSTRAINT TRIGGER AFTER INSERT OR UPDATE e
--     recusaria cliente vivo sem cluster. O unico cliente de dev sem cluster e
--     `Aaaaa`, que esta com `excluido = true`, caso que a propria funcao isenta.
--   - `update_cliente_updated_at` / `update_contribuinte_updated_at` carimbam
--     `now()` em `updated_at`. Renomear em massa marcaria 226 cadastros como
--     "editados hoje" e apagaria a data da ultima edicao de verdade, entao os dois
--     saem do caminho durante a transacao. O `SET CONSTRAINTS ALL IMMEDIATE` antes
--     do ENABLE existe porque o gatilho de cluster e DEFERRABLE INITIALLY DEFERRED:
--     sem ele, o ALTER TABLE falha com "pending trigger events".
--
-- Nao gera `audit_logs`: e migracao de banco, sem sessao de usuario. A trilha e
-- este arquivo.
--
-- O QUE ISTO NAO RESOLVE (registrado de proposito):
--   - `contribuinte.cpf_cnpj` continua sendo o CNPJ real. As consultas fiscais
--     (ECD, ECF, EFD, XMLs) casam por documento no BigQuery, entao o dev segue
--     puxando dado fiscal real desses contribuintes. O prefixo rotula, nao anonimiza.
--   - `representante` em dev tem 18 linhas com e-mail corporativo real, e 2 delas
--     estao amarradas a um `user_id` de verdade (`alessandro.tavares@paiolmt.com.br`
--     e `contabilidade@tecnomyl.com`). Sai em tarefa propria: mexer ali derruba
--     login de gente real.
--
-- Reversao (tira o prefixo que esta migracao pos, e so ele):
--   BEGIN;
--   ALTER TABLE public.cliente      DISABLE TRIGGER update_cliente_updated_at;
--   ALTER TABLE public.contribuinte DISABLE TRIGGER update_contribuinte_updated_at;
--   UPDATE public.cliente      SET nome = substring(nome from 9)
--    WHERE ambiente = 'dev' AND nome LIKE '[TESTE] %';
--   UPDATE public.contribuinte SET nome_razao_social = substring(nome_razao_social from 9)
--    WHERE ambiente = 'dev' AND nome_razao_social LIKE '[TESTE] %';
--   SET CONSTRAINTS ALL IMMEDIATE;
--   ALTER TABLE public.cliente      ENABLE TRIGGER update_cliente_updated_at;
--   ALTER TABLE public.contribuinte ENABLE TRIGGER update_contribuinte_updated_at;
--   COMMIT;

BEGIN;

ALTER TABLE public.cliente      DISABLE TRIGGER update_cliente_updated_at;
ALTER TABLE public.contribuinte DISABLE TRIGGER update_contribuinte_updated_at;

-- ── 1) O cadastro do cliente ────────────────────────────────────────────────
-- E o nome que aparece em praticamente toda tela (lista de clientes, seletor de
-- OS, projeto, chamado, cabecalho de documento gerado), entao e onde o rotulo
-- rende mais. Soft-deleted entra tambem: se ressuscitar, ressuscita marcado.
UPDATE public.cliente
   SET nome = '[TESTE] ' || nome
 WHERE ambiente = 'dev'
   AND btrim(nome) NOT ILIKE '[teste%';

-- ── 2) A razao social do contribuinte ───────────────────────────────────────
-- `contribuinte` tem coluna `ambiente` propria e aparece sozinho nas telas
-- fiscais (Consulta ECD/ECF/EFD/XMLs, apuracoes), sem passar pelo nome do
-- cliente. Marcar so o `cliente` deixaria a razao social real sem rotulo
-- justamente nas telas onde ela e o identificador.
UPDATE public.contribuinte
   SET nome_razao_social = '[TESTE] ' || nome_razao_social
 WHERE ambiente = 'dev'
   AND btrim(nome_razao_social) NOT ILIKE '[teste%';

SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE public.cliente      ENABLE TRIGGER update_cliente_updated_at;
ALTER TABLE public.contribuinte ENABLE TRIGGER update_contribuinte_updated_at;

COMMIT;
