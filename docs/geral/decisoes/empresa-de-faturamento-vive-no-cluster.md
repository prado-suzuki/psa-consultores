# Empresa de faturamento continua vivendo nas colunas do cluster

**Status:** Aceita — reavaliada e mantida em 2026-08-17 (ver "Reavaliação" no fim)
**Data:** 2026-08-17

## Contexto

A tabela `empresas_faturamento` foi mesclada em `estrutura_clusters`: hoje a empresa
é o par de colunas `nome_empresa` / `cnpj` de cada cluster, não uma entidade própria.
Como há uma linha por cluster, a mesma empresa usada por dois clusters é o mesmo
texto gravado duas vezes — e os formulários pediam a razão social e o CNPJ digitados
à mão em cada cluster (`EstruturaManager`, diálogo "Editar Cluster").

Modelar a empresa como entidade exigiria tabela nova (`empresas`) + FK
`estrutura_clusters.empresa_id` + migração dos valores distintos — mudança de schema,
dependente do Lovable.

## Decisão

Não criar tabela. A **empresa de faturamento é o próprio cluster**: razão social e CNPJ são
colunas dele, e cada cluster corresponde a uma pessoa jurídica.

- Razão social e CNPJ são campos diretos do diálogo de cluster, em Cadastros Estrutura
  (`EstruturaManager`), com máscara de CNPJ (`lib/cnpj.ts`) na digitação e na exibição.
- **Não existe tela separada de "empresas".** Uma aba assim chegou a ser construída em
  2026-08-17 e foi removida no mesmo dia: ela recadastrava a mesma linha de
  `estrutura_clusters`, e "Nova Empresa" acabava pedindo um cluster — a incoerência que
  denunciou o modelo.
- O **centro de custo não é atributo da empresa**: cada área tem o seu
  (`estrutura_areas.cost_center_id`), e o CC do cluster é apenas o padrão herdado por área
  sem CC próprio. O campo no diálogo de cluster é rotulado como tal.

## Reavaliação (2026-08-17)

Chegou-se a montar a tarefa de criar `empresas` + `estrutura_clusters.empresa_id`. Ela foi
cancelada quando a Patrícia apontou o que o modelo já resolve: **uma empresa tem várias áreas,
e são as áreas que carregam centros de custo diferentes.** Os dados confirmam — Prado Advogados
tem `PRADO ADV CIVIL` (CC-0002) e `TAX LEGAL` (CC-0003) na mesma empresa; TAX tem 6 áreas, todas
em CC-0007. A multiplicidade que motivaria a tabela já está modelada um nível abaixo.

Em 2026-08-17 havia 9 clusters e **9 razões sociais distintas** — nenhuma empresa repetida.

**O gatilho que reabriria a discussão:** duas linhas de `estrutura_clusters` faturando pela
**mesma** pessoa jurídica. Aí passam a existir texto duplicado, duas opções idênticas no select
da OS e correção em dois lugares — e a tabela própria volta a valer a migração.

## Consequência

- Cadastro em um lugar só: cluster/empresa, áreas, equipes e centros de custo em Cadastros
  Estrutura; produto, serviço e o vínculo entre eles em Produtos & Serviços.
- **"Empresa / Faturamento" na OS grava `ordem_servico.cluster_id`** e é esse campo que o
  `useOnboarding` usa para saber o que é "da OSG". Ou seja, o campo carrega dois significados:
  quem fatura e a qual cluster a OS pertence. Enquanto empresa e cluster forem a mesma linha
  isso é inofensivo — mas qualquer mudança futura nesse campo precisa considerar o roteamento.
- A exclusão de cluster/empresa segue só em Cadastros Estrutura, onde a árvore de áreas e
  equipes que ela derruba está visível.
