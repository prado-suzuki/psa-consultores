
# Plano: Padronizar Gestão de Clientes conforme outras ferramentas

## Objetivo

Padronizar a página de Gestão de Clientes seguindo o mesmo layout e design das outras ferramentas Dev (como ConsultaEFD), além de aplicar as alterações solicitadas.

## Alterações a Realizar

### 1. Renomear Labels de Filtros

| Antes | Depois |
|-------|--------|
| Nome Cliente | Cliente |
| Nome/Razão Social | Contribuinte |

### 2. Remover Filtros

| Filtro a Remover | Motivo |
|------------------|--------|
| Setor | Solicitado pelo usuário |
| Simples Nacional | Solicitado pelo usuário |

### 3. Reorganizar Layout de Filtros

O filtro "Contribuinte" será posicionado ao lado de "Cliente" na mesma linha:

```text
LINHA ÚNICA:
[Cliente (3col)] [Contribuinte (5col)] [Status (2col)] [Tipo (2col)]
```

### 4. Padronizar Estilo Visual (conforme ConsultaEFD)

| Elemento | Antes | Depois |
|----------|-------|--------|
| Título do Card | `text-lg` simples | `text-lg flex items-center gap-2 text-primary` |
| Texto do título | "Filtros de Busca" | `uppercase text-sm tracking-wider font-bold text-slate-800` |
| Labels dos filtros | `text-sm font-medium` | `text-xs font-bold uppercase tracking-wider` |
| Inputs | `bg-white` | `h-11 bg-white dark:bg-slate-800` |
| Gap do grid | `gap-4` | `gap-6` |

### 5. Reorganizar Botões

| Antes | Depois |
|-------|--------|
| Limpar à esquerda, Buscar à direita | Ambos à direita, lado a lado |
| Limpar com variant="outline" | Limpar com fundo vermelho e texto branco |
| Botão Limpar só aparece com filtros | Mantém comportamento |

### 6. Remover Estados e Queries Não Utilizados

- Remover estado `setor`
- Remover estado `simplesNacional`
- Remover query `setores`
- Atualizar `hasActiveFilters` e `hasContribuinteFilters`

## Layout Final dos Filtros

```text
+------------------------------------------------------------------+
| 🔍 FILTROS DE BUSCA                                              |
+------------------------------------------------------------------+
| CLIENTE          | CONTRIBUINTE              | STATUS   | TIPO   |
| [Select 3col]    | [Select 5col]             | [2col]   | [2col] |
+------------------------------------------------------------------+
|                                      | [Limpar🔴] [Buscar🟢] |
+------------------------------------------------------------------+
```

## Estilo dos Botões

```text
Botão Limpar (quando há filtros):
- Fundo: bg-red-600 hover:bg-red-700
- Texto: text-white
- Ícone: Eraser (da ConsultaEFD) ao invés de X

Botão Buscar:
- Mantém: bg-teal-600 hover:bg-teal-700
- Texto: text-white
```

## Detalhes Técnicos

### Imports a Adicionar
- `Eraser` do lucide-react (para o botão limpar, conforme padrão)

### Estados Finais
```text
// Cliente
nome: string
status: string
tipo: string
searched: boolean

// Contribuinte (apenas para filtrar)
tipoPessoa: string
cpfCnpj: string
nomeRazaoSocial: string
```

### Condições Atualizadas
```text
hasActiveFilters = nome || status || tipo || nomeRazaoSocial || tipoPessoa || cpfCnpj
hasContribuinteFilters = nomeRazaoSocial || tipoPessoa || cpfCnpj
```

## Arquivo a Modificar

`src/pages/equipe/dev/GestaoClientes.tsx`

## Resumo das Alterações

1. Renomear "Nome Cliente" para "Cliente"
2. Renomear "Nome/Razão Social" para "Contribuinte" e mover ao lado de Cliente
3. Remover filtros de Setor e Simples Nacional
4. Aplicar estilos padronizados (uppercase, tracking-wider, h-11)
5. Mover botão "Limpar Filtros" para o lado direito, ao lado de "Buscar"
6. Alterar estilo do botão Limpar para fundo vermelho com texto branco
7. Usar ícone Eraser no botão Limpar (padrão das outras ferramentas)
8. Remover estados e queries não utilizados
