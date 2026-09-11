-- Remove as 12 colunas legadas de `exploracao_rural` (AGR-01, parte destrutiva)
--
-- Par da `20260901144006_cadastro_exploracao_rural_partes_imoveis_origens.sql`,
-- que criou as tabelas filhas e as colunas novas. Aquela é aditiva e pode ser
-- aplicada a qualquer momento; esta **não**.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ PRÉ-CONDIÇÃO — NÃO aplicar em produção antes disto                      │
-- │                                                                         │
-- │ O código que lê estas colunas precisa estar na `main` ANTES do DROP.     │
-- │ A regra dura do AGENTS.md é escrita para coluna ADITIVA ("produção       │
-- │ recebe a coluna antes de o código que a usa chegar na main"); para       │
-- │ remoção ela se inverte, pelo mesmo motivo: o app publicado é buildado    │
-- │ da `main` e fala com produção.                                          │
-- │                                                                         │
-- │ Dois consumidores, medidos em 01/09/2026:                              │
-- │                                                                         │
-- │ 1. `src/hooks/useExploracaoRural.ts` — o select nomeia as FKs no embed  │
-- │    do PostgREST:                                                       │
-- │      '*, explorador:pessoa!explorador_pessoa_id(denominacao),           │
-- │           outorgante:pessoa!outorgante_pessoa_id(denominacao),          │
-- │           bem:bem!bem_id(denominacao)'                                  │
-- │    Sem `explorador_pessoa_id` e `bem_id`, isso NÃO devolve campo vazio: │
-- │    a query falha ("could not find relationship"). É erro de runtime,    │
-- │    não degradação silenciosa.                                          │
-- │                                                                         │
-- │ 2. `src/components/equipe/osg/relatorios/FiscalReport.tsx` — `exprRow`  │
-- │    lê 7 das 12: `explorador_nome`, `outorgante_nome`,                  │
-- │    `imovel_descricao`, `matricula_texto`, `area_total`,                │
-- │    `area_explorada`, `area_unidade`.                                   │
-- │                                                                         │
-- │ Ajustar os dois é o "ajustar relatório Fiscal e consumidores atuais"    │
-- │ do briefing da AGR-01.                                                 │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- No SANDBOX o risco é outro e menor: `exploracao_rural` tem 0 linhas (conferido
-- em 01/09/2026) e 0 views dependentes, então não há conteúdo a preservar. Mas
-- o AGENTS.md pede que migration destrutiva (`drop`, `rename`, `not null`,
-- mudança de tipo) seja **ensaiada num banco próprio** (`.env.development.local`)
-- antes do compartilhado — um `drop column` errado no compartilhado trava a
-- equipe inteira. Esse ensaio é passo humano; este arquivo não o dispensa.
--
-- Por que derrubar em vez de conviver: manter coluna morta foi exatamente o que
-- produziu, nesta mesma tarefa, a confusão entre "a coluna existe" e "a prática
-- existe" — e uma rodada inteira de selo errado no mockup.
--
-- Idempotente (`if exists`), porque o mesmo SQL roda duas vezes: `db push` no
-- sandbox e, depois, à mão em produção pelo chat do Lovable.

alter table public.exploracao_rural
  -- Imóvel e áreas → `exploracao_rural_imovel`, agora por matrícula, com a área
  -- cedida NESTE instrumento (que não é `matricula.area_explorada`: no Anexo do
  -- [BV-COM] a cedida é sempre menor que a total da mesma linha).
  drop column if exists bem_id,
  drop column if exists imovel_descricao,
  drop column if exists matricula_texto,
  drop column if exists municipio,
  drop column if exists uf,
  drop column if exists area_total,
  drop column if exists area_explorada,
  drop column if exists area_unidade,

  -- Explorador → `exploracao_rural_parte` com `papel = 'explorador'`. Era
  -- singular, mas o [BV-PAR] tem 3 outorgados numa parceria só.
  drop column if exists explorador_pessoa_id,
  drop column if exists explorador_nome,

  -- O outorgante CONTINUA coluna (`outorgante_pessoa_id`, intocada): a OSG
  -- confirmou em 19/08/2026 que ele é sempre único — se duas empresas cedem,
  -- são duas parcerias. Coluna sustenta essa invariante; linha de junção não.
  -- Só o nome solto sai, porque deriva de `pessoa`.
  drop column if exists outorgante_nome,

  -- Texto legado que duplicava `data_assinatura`/`data_encerramento`, e por
  -- isso já estava marcado como removido em `docs/osg/campos-exploracao-rural.md`.
  drop column if exists vigencia;
