

# Plano: Ajustar Gestão de Clientes para Exibir Clientes

## Objetivo

Corrigir a página para que os resultados exibam **clientes** (não contribuintes), onde os filtros de contribuinte servem apenas para filtrar quais clientes aparecem.

## O Que Será Feito

### 1. Remover Elementos Duplicados e Não Utilizados

| Item a Remover | Motivo |
|----------------|--------|
| Estados `municipio` e `uf` | Não são mais usados |
| Linha 3 de filtros (duplicada) | Setor e Simples Nacional já aparecem na Linha 2 |

### 2. Reorganizar Filtros em 2 Linhas

```text
LINHA 1 - Filtros do Cliente:
[Nome Cliente (3col)] [Status (2col)] [Tipo Cliente (2col)] [vazio (5col)]

LINHA 2 - Filtros do Contribuinte:
[Nome/Razão Social (3col)] [Tipo Pessoa (2col)] [CPF/CNPJ (2col)] [Setor (3col)] [Simples (2col)]
```

### 3. Adicionar Opção "Todos os Clientes"

No dropdown de Nome Cliente, adicionar uma opção para selecionar todos:
- Valor especial: `"__todos__"`
- Texto: "Todos os Clientes"

### 4. Botão "Limpar Filtros" Condicional

O botão só aparece quando há pelo menos um filtro selecionado:

```text
hasActiveFilters = nome || status || tipo || nomeRazaoSocial || 
                   tipoPessoa || cpfCnpj || setor || simplesNacional
```

### 5. Inverter Lógica de Consulta

A query será em duas etapas:

**Etapa 1 - Buscar cliente_ids filtrados (se houver filtros de contribuinte):**
```text
Se algum filtro de contribuinte estiver ativo:
  → Buscar cliente_ids da tabela contribuinte que atendem aos filtros
  → Usar esses IDs para filtrar a query de clientes
```

**Etapa 2 - Buscar clientes:**
```text
Query em cliente com:
  - Filtros diretos (nome, status, tipo)
  - Filtro de IDs (se etapa 1 retornou IDs)
  - Ordenação por nome
```

### 6. Colunas da Tabela de Resultados (Clientes)

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| Nome Cliente | nome | Nome do cliente |
| Status | ativo | Badge Ativo/Inativo |
| Tipo Cliente | fixo | Fixo/Pontual |
| Telefone | telefone | Contato |
| Setor | setor_cliente | Setor do cliente |

## Detalhes Técnicos

### Lógica da Query Principal

```text
1. Verificar se há filtros de contribuinte ativos
2. Se sim:
   a. Buscar contribuintes que atendem aos filtros
   b. Extrair lista de cliente_ids únicos
   c. Usar .in('id', clienteIds) na query de clientes
3. Aplicar filtros diretos de cliente (nome, status, tipo)
4. Se nome === '__todos__', não filtrar por nome
5. Retornar lista de clientes ordenada por nome
```

### Estados Finais

```text
// Cliente
nome: string ('' ou '__todos__' ou valor selecionado)
status: string ('true' | 'false' | '')
tipo: string ('Sim' | 'Não' | '')
searched: boolean

// Contribuinte (apenas para filtrar)
nomeRazaoSocial: string
tipoPessoa: string
cpfCnpj: string
setor: string
simplesNacional: string
```

## Arquivo a Modificar

`src/pages/equipe/dev/GestaoClientes.tsx`

## Resumo das Alterações

1. Remover estados `municipio` e `uf`
2. Remover Linha 3 duplicada de filtros
3. Adicionar opção "Todos os Clientes" no dropdown de nome
4. Tornar botão "Limpar Filtros" condicional
5. Inverter query para buscar clientes (não contribuintes)
6. Usar filtros de contribuinte apenas para filtrar cliente_ids
7. Atualizar tabela para exibir colunas de cliente

