# Empresa de faturamento continua vivendo nas colunas do cluster

**Status:** Aceita
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

Não criar tabela por enquanto. Resolver por código, sobre as colunas que já existem:

- `lib/empresasFaturamento.ts` deriva a lista de empresas distintas a partir dos
  clusters, agrupando por razão social normalizada (sem acento/caixa/espaço duplo) e
  herdando o primeiro CNPJ não vazio do grupo;
- `components/equipe/empresas/EmpresaPicker.tsx` substitui os campos livres por
  seleção dessa lista (razão social + CNPJ vêm juntos), com "+ Cadastrar nova empresa"
  como único caminho de digitação. Usado na aba Empresas e no diálogo de cluster;
- `useEstruturaMutations().aplicarEmpresaEmClusters` grava a mesma empresa em vários
  clusters de uma vez (um `UPDATE ... IN`, um log de auditoria por cluster com diff
  campo-a-campo). A aba Empresas oferece isso ao editar, marcado por padrão quando a
  empresa é usada por mais de um cluster.

## Consequência

- Corrigir a razão social ou o CNPJ de uma empresa passa a atualizar todos os clusters
  que a usam, sem migração.
- "Compartilhar empresa" continua sendo ter a mesma razão social: se alguém gravar uma
  variante do nome por fora do seletor, volta a existir uma empresa duplicada. O seletor
  torna isso difícil, não impossível.
- A exclusão de empresa não é oferecida na aba Empresas de propósito: apagar o registro
  é apagar o cluster, o que derruba áreas e equipes vinculadas. Isso segue apenas em
  Cadastros Estrutura, onde a árvore está visível.
- Se um dia a empresa precisar ser entidade (uma empresa faturando vários clusters com
  cadastro único, ou dados fiscais próprios), o caminho é `empresas` + `empresa_id`
  no cluster, migrando os valores distintos que `listarEmpresasCadastradas` já sabe
  extrair.
