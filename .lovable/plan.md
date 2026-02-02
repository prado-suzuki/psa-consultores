

# Plano: Ferramenta Controle PERDCOMP (Filtro Dinamico)

## Objetivo

Criar uma unica pagina "Controle PERDCOMP" com um filtro de **Tipo de Registro** (similar ao filtro de Tipo de Documento na Consulta de XMLs) que alterna dinamicamente entre as tabelas PER, DCOMP e Situacoes.

## Conceito

Assim como na Consulta de XMLs existe o filtro "Tipo de Documento" que alterna entre NFe e CTe (mudando colunas e dados), aqui teremos um filtro "Tipo de Registro" que alterna entre:
- **PER** - Pedidos de Restituicao
- **DCOMP** - Declaracoes de Compensacao
- **Situacoes** - Historico de Situacoes

## Arquivos a Criar

### 1. Pagina Principal
**Arquivo:** `src/pages/equipe/dev/ControlePerdcomp.tsx`

Estrutura de filtros (seguindo padrao ConsultaXMLs):
| Filtro | Tipo | Descricao |
|--------|------|-----------|
| Cliente | Select | Lista de clientes ativos |
| Contribuinte | Select | Filtrado pelo cliente selecionado |
| Tipo de Registro | Select | PER / DCOMP / Situacoes |
| Botao Buscar | Button | Dispara a busca |
| Botao Limpar | Button | Reseta filtros |

### 2. Modais de Formulario
| Arquivo | Descricao |
|---------|-----------|
| `src/components/equipe/dev/perdcomp/PerFormModal.tsx` | Criar/Editar PER |
| `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` | Criar/Editar DCOMP |
| `src/components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | Criar/Editar Situacao |

## Arquivos a Modificar

### 1. DevLayout.tsx
Adicionar item no menu:
```
{ icon: FileSpreadsheet, label: 'Controle PERDCOMP', path: '/equipe/dev/controle-perdcomp' }
```

### 2. App.tsx
Adicionar rota:
```
/equipe/dev/controle-perdcomp
```

### 3. protectedPages.ts
Registrar pagina protegida

## Colunas Dinamicas por Tipo

### Tipo: PER
| Coluna | Campo |
|--------|-------|
| Numero Processo | numero_processo_per |
| Contribuinte | id_contribuinte (join) |
| Exercicio | exercicio |
| Trimestre | tri_exercicio |
| Data Solicitada | dt_solicitada |
| Tipo Credito | tp_credito |
| Valor Credito | vlr_credito (R$) |
| Acoes | Editar / Excluir |

### Tipo: DCOMP
| Coluna | Campo |
|--------|-------|
| Nr Documento | nr_documento |
| PER Origem | nr_per_orig |
| Mes/Ano | mes_ano_exercicio |
| Data Envio | dt_envio |
| Imposto | imposto |
| Tipo Credito | tp_credito |
| Valor Compensado | vlr_compensado (R$) |
| Acoes | Editar / Excluir |

### Tipo: Situacoes
| Coluna | Campo |
|--------|-------|
| PER | nr_proc_per |
| Situacao | situacao |
| Data Pagamento | dt_pagamento |
| Data Registro | criado_em |
| Acoes | Editar / Excluir |

## Interface Visual

```text
+------------------------------------------+
| DevLayout                                |
| +--------------------------------------+ |
| | Card: Filtros                        | |
| | [Cliente v] [Contribuinte v]         | |
| | [Tipo Registro v]                    | |
| |  PER / DCOMP / Situacoes             | |
| | [Limpar Filtros] [Buscar]            | |
| +--------------------------------------+ |
|                                          |
| +--------------------------------------+ |
| | Header: Resultados          [+ Novo] | |
| +--------------------------------------+ |
| | Tabela com colunas dinamicas         | |
| | (muda conforme Tipo de Registro)     | |
| | ...                                  | |
| | [Paginacao]                          | |
| +--------------------------------------+ |
+------------------------------------------+
```

## Logica de Alternancia

O componente tera um state `tipoRegistro` que controla:
1. Qual query do React Query e executada (per, dcomp ou per_situacao)
2. Quais colunas sao renderizadas na tabela
3. Qual modal de formulario e aberto ao clicar em "Novo" ou "Editar"

```text
tipoRegistro: "per" | "dcomp" | "situacao"

switch (tipoRegistro) {
  case "per":
    - Query: supabase.from("per")
    - Colunas: PerColumns
    - Modal: PerFormModal
  case "dcomp":
    - Query: supabase.from("dcomp")
    - Colunas: DcompColumns
    - Modal: DcompFormModal
  case "situacao":
    - Query: supabase.from("per_situacao")
    - Colunas: SituacaoColumns
    - Modal: SituacaoFormModal
}
```

## Detalhes Tecnicos

| Item | Tecnologia |
|------|------------|
| Framework | React + TypeScript |
| Estilizacao | Tailwind CSS + shadcn/ui |
| Estado | React Query (TanStack Query) |
| Formularios | React Hook Form + Zod |
| Banco de Dados | Supabase |

## Ordem de Implementacao

1. Atualizar `DevLayout.tsx` - adicionar item no menu
2. Atualizar `protectedPages.ts` - registrar pagina
3. Criar pasta `src/components/equipe/dev/perdcomp/`
4. Criar `PerFormModal.tsx`
5. Criar `DcompFormModal.tsx`
6. Criar `SituacaoFormModal.tsx`
7. Criar `ControlePerdcomp.tsx` - pagina principal com filtro dinamico
8. Atualizar `App.tsx` - adicionar rota

