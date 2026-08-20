# Inventário de telas por cluster — o que existe, o que adapta, o que é novo

**Levantamento de 2026-08-20** (branch `develop`, dados do sandbox
`vgzomuwnsdgrxbkyoavq`). Documento de leitura. Responde **uma** metade da
pergunta "o que cada cluster precisa": a metade que está no código.

> **A outra metade não está aqui, e não sai daqui.** "Que telas cada um precisa,
> na visão de quem vai usar" é conversa com quem vai usar. Este documento existe
> para transformar a resposta dessa conversa em **"existe / adapta / é nova"** —
> não para adivinhá-la.

> ⚠️ **Não infira negócio do sandbox.** O `nome_empresa` de cada cluster é dado
> semeado ("Cerrado Logística S.A.", "Rondon Comércio S.A."…). Nomes gerados, não
> reais. Para pergunta de negócio, este banco não é fonte.

---

## O gatilho: a primeira tela, não o cluster cadastrado

Rota sem tela é ambiente que não pinta nada, mais uma entrada em cada taxonomia
(mapa de tema, mapa de rota, permissões, seletor de área). Medido em 20/08:

| Cluster | Ativo | Áreas | Equipes | Pessoas | Projetos | Qualifica? |
|---|---|---:|---:|---:|---:|---|
| **TAX** | ✅ | 6 | 6 | 25 | 129 | já tem ambiente |
| **OSG** | ✅ | 1 | 1 | 10 | 14 | já tem ambiente |
| **Digital** | ✅ | 1 | 1 | 3 | 0 | já tem ambiente |
| **Prado Advogados** | ❌ | 2 | **0** | **0** | **0** | não — sem equipe e sem trabalho |
| **PSA AUDITORES** | ❌ | **0** | 0 | 0 | 0 | não — sem nem área |
| **Adm & Fin** | ❌ | **0** | 0 | 0 | 0 | não — sem nem área |
| Familly Business · PRADOSUZUKI EMPRESAS FAMILIARES · PROFITTO · PSA NORTE · SF PARTICIPACOES | ❌ | 0 | 0 | 0 | 0 | não |

**Nenhum dos três em discussão qualifica hoje.** O Prado é o mais adiantado — tem
duas áreas ativas — mas zero equipe, zero pessoa e zero projeto.

---

## O que JÁ é replicável sem cópia

Estas telas **já rodam montadas em duas ou três áreas**, com o mesmo miolo. Para
um cluster novo, o custo é a rota e o layout — não a tela:

| Tela | Miolo compartilhado | Hoje montada em |
|---|---|---|
| Gestão de Chamados | `pages/gestao/GestaoChamados` | Tax · OSG · Board |
| Clientes | `pages/equipe/fiscal/GestaoClientes` | Tax · OSG |
| Gerencial (dashboards) | `BoardDashboardClientesOs` + `DashboardEmbedView` | Tax · OSG |
| Feed | `components/comentarios/feed/FeedComentarios` | Tax · OSG |
| Auditoria / Logs de uso | `components/equipe/audit/AuditTabs` | Tax · OSG |
| Projetos em lote | `components/equipe/projetos-lote/ProjetosLoteContent` | Tax · OSG |
| Projetos e tarefas | `projetos-cadastro/ProjetosCadastroContent` · `tarefas/PainelTarefas` | Tax · OSG · Digital |

O que sustenta isso: **o módulo de projetos e tarefas é genérico por construção**
— nove tabelas `org_*` (`org_projects`, `org_tasks`, `org_project_members`…) sem
nenhuma tabela `osg_*` equivalente. E **46 arquivos já recebem a área por
parâmetro** (`AreaKey`), em vez de decidir por conta própria.

**Boas-Vindas** é replicável e trivial — só depende do `AuthContext`.

## O que NÃO é replicável

| Bloco | Por quê |
|---|---|
| **OSG Work** — 13 rotas em `/equipe/osg/work/*`: documentos, classificação, qualificação das partes, diagnóstico patrimonial, controle de matrículas, biblioteca e montagem de modelos, gerar documento | Domínio jurídico-societário da OSG. Não é tela genérica com cor diferente; é regra de negócio própria, com vocabulário e templates próprios. |
| **Dashboard** de Tax e de OSG | É o único par Tax/OSG cujo miolo **diverge**. Os outros seis compartilham. |
| **Painel Dev** — 27 rotas em `/equipe/dev/*` | Ferramentas fiscais (SPED, EFD, PER/DCOMP, DIFAL, PIS/COFINS). Domínio, não apresentação. |

Ou seja: das 27 rotas da OSG, **14 são genéricas e 13 são domínio**. A proporção é
o melhor palpite disponível para um cluster novo — metade do ambiente sai de
graça, metade é trabalho de verdade.

---

## Pendências nomeadas

### 1. Nome é exibição; caminho é decisão

O cluster oficialmente se chama **"Adm & Fin"** (confirmado em 20/08; o sandbox
dizia "Administração" e foi alinhado por `update`).

**Se esse cluster ganhar rota um dia, o nome NÃO vira caminho.** "Adm & Fin" tem
espaço e `&` — caractere reservado em URL. O caminho tem de ser definido
explicitamente no mapa (`src/lib/areaTheme.ts` e o roteador), algo como
`/equipe/adm-fin`, e **nunca** derivado do nome.

Conferido hoje: **não existe geração de slug a partir de nome de cluster ou área**
em nenhum lugar do repositório (o único `slug` é de período de auditoria). Se
alguém introduzir uma, "Adm & Fin" é o primeiro que quebra.

> **Divergência de nome já produziu um bug nesta base**, e é o motivo desta seção
> existir: `classificarArea` casava `includes('tax')` no nome da área, e por isso
> "TAX LEGAL" — que é do cluster Prado Advogados — resolvia para o bucket `tax` do
> Board. Nome como chave é o defeito; nome como exibição é o certo.
>
> **Corrigido em 20/08/2026 (commit `308a0149`):** o palpite por nome saiu da
> construção do mapa. Área sem `page_categories` não classifica mais nada, nem a
> si nem o cluster dela. A lição fica — o defeito voltaria pelo mesmo caminho se
> alguém reintroduzir nome como chave.

### 2. `trabalhoDigital` classifica só por nome

`src/lib/trabalhoDigital.ts:264,267` chama `classificarArea` no nome da área da
equipe e no texto livre `projects.area`. **Não tem caminho por
`page_categories`** — diferente de `boardExecutivo` e `performanceOperacional`,
onde o nome é só fallback.

Consequência: remover o fallback por substring é remoção limpa nos outros dois, e
naquele **desliga a classificação**. Medido em 20/08/2026: **7 dos 17** projetos de
`projects` têm `equipe_id` nulo e `area = 'OSG'` em texto livre. Sem área
cadastrada não existe `page_categories` para ler — não há substituto, há vazio.
Alimenta `useBoardRollupAreas` e `useDomainTrabalhoDigital`.

Para remedir: `select count(*) from projects where equipe_id is null and
nullif(trim(area),'') is not null`.

### 3. Área inativa entra na conta do Board

**Esta seção mudou de forma em 20/08/2026 (commit `308a0149`).** Ela dizia que
`usePerformanceData` buscava `estrutura_areas` **e `estrutura_clusters`** sem
filtro de `is_active`. A query de `estrutura_clusters` **não existe mais**: ela
só alimentava o loop de classificação por nome do cluster, que saiu junto com o
substring. `construirMapaDeClusters` não recebe mais clusters.

O que sobra do defeito: a busca de `estrutura_areas` continua **sem filtro de
`is_active`**, então área desativada ainda entra no mapa. Hoje não move número —
nenhum projeto resolve por área inativa —, mas é defeito independente.

### 4. A exposição real do substring não é o Prado

Medido: `Trabalhos compartilhados OSG` é área do cluster **TAX**, com
`page_categories = ['tax']`, **2 equipes e 6 pessoas**. Conta certo **porque a
coluna está preenchida**. O risco do substring é este — uma área real protegida
por um campo.

> **Correção de 20/08/2026.** A versão anterior desta seção afirmava que limpar a
> coluna "move 6 pessoas de Tax para OSG". Isso está **errado**, por duas razões
> medidas: `trabalhoDigital` classifica linhas de `projects`, **não pessoas** — não
> há coluna de pessoa em passo nenhum do pipeline; e as duas equipes dessa área
> têm **0 projetos** em `projects` e **0** em `org_projects`. O nome com "OSG"
> existe e nada passa por ele. Mesma forma do Prado.
>
> Para remedir: `select count(*) from projects p join estrutura_equipes e on
> e.id = p.equipe_id join estrutura_areas a on a.id = e.area_id where a.name =
> 'Trabalhos compartilhados OSG'`.
