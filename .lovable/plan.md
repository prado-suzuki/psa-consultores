

# Plano: Ferramenta Gestão de Clientes

## Objetivo

Criar nova ferramenta "Gestão de Clientes" na área Dev com 5 filtros em dropdown, sendo 2 com opções fixas (Status e Tipo) e 3 com dados dinâmicos do banco (Nome, Município, UF).

## Filtros

| Filtro | Tipo UI | Campo DB | Opções |
|--------|---------|----------|--------|
| Nome | Select dinâmico | `nome` | Populado via DISTINCT do banco |
| Status | Select fixo | `ativo` | "Ativo" (true), "Inativo" (false) |
| Tipo | Select fixo | `fixo` | "Fixos" (Sim), "Pontuais" (Não) |
| Município | Select dinâmico | `municipio` | Populado via DISTINCT do banco |
| UF | Select dinâmico | `uf` | Populado via DISTINCT do banco |

## Mapeamento de Valores

### Filtro Status → Campo `ativo`
| Opção no Select | Valor enviado na query |
|-----------------|------------------------|
| Ativo | `true` |
| Inativo | `false` |

### Filtro Tipo → Campo `fixo`
| Opção no Select | Valor enviado na query |
|-----------------|------------------------|
| Fixos | "Sim" |
| Pontuais | "Não" |

## Colunas da Tabela de Resultados

| Ordem | Coluna | Campo | Formatação |
|-------|--------|-------|------------|
| 1 | Nome | nome | Texto |
| 2 | Status | ativo | Badge: true = "Ativo" (verde), false = "Inativo" (vermelho) |
| 3 | Tipo | fixo | "Sim" → "Fixo", "Não" → "Pontual" |
| 4 | Telefone | telefone | Texto |
| 5 | Setor | setor_cliente | Texto |
| 6 | Município | municipio | Texto |
| 7 | UF | uf | Texto |

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/equipe/dev/GestaoClientes.tsx` | Página principal da ferramenta |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/equipe/dev/DevLayout.tsx` | Adicionar item no menu lateral |
| `src/config/protectedPages.ts` | Registrar página protegida |
| `src/App.tsx` | Adicionar rota |

## Interface Visual

```text
+------------------------------------------------+
| DevLayout                                      |
| +--------------------------------------------+ |
| | Card: Filtros de Busca                     | |
| | [icone Filter] FILTROS DE BUSCA            | |
| |                                            | |
| | Grid 12 colunas:                           | |
| | [Nome (4col)] [Status (2col)] [Tipo (2col)]| |
| | [Município (2col)] [UF (2col)]             | |
| |                                            | |
| | ------------------------------------------ | |
| | [Limpar Filtros]              [Buscar]     | |
| +--------------------------------------------+ |
|                                                |
| +--------------------------------------------+ |
| | Card: Resultados                           | |
| | X clientes encontrados                     | |
| |                                            | |
| | Nome | Status | Tipo | Tel | Setor | ...   | |
| | ABC  | Ativo  | Fixo | 11... | ...         | |
| | XYZ  |Inativo |Pontual| ... | ...          | |
| +--------------------------------------------+ |
+------------------------------------------------+
```

## Detalhes Técnicos

### Queries para Popular Dropdowns Dinâmicos

```text
Query 1 - Nomes:
SELECT DISTINCT nome FROM cliente_dev 
WHERE nome IS NOT NULL 
ORDER BY nome

Query 2 - Municípios:
SELECT DISTINCT municipio FROM cliente_dev 
WHERE municipio IS NOT NULL 
ORDER BY municipio

Query 3 - UFs:
SELECT DISTINCT uf FROM cliente_dev 
WHERE uf IS NOT NULL 
ORDER BY uf
```

### Opções Fixas dos Selects

```text
Status:
- { label: "Ativo", value: "true" }
- { label: "Inativo", value: "false" }

Tipo:
- { label: "Fixos", value: "Sim" }
- { label: "Pontuais", value: "Não" }
```

### Query Principal com Filtros

```text
let query = supabase.from(clienteTable).select('*')

if (nome) query = query.eq('nome', nome)
if (status) query = query.eq('ativo', status === 'true')
if (tipo) query = query.eq('fixo', tipo)
if (municipio) query = query.eq('municipio', municipio)
if (uf) query = query.eq('uf', uf)

query = query.order('nome')
```

### Formatação da Coluna Status

```text
ativo === true  → Badge verde "Ativo" (bg-green-100 text-green-800)
ativo === false → Badge vermelho "Inativo" (bg-red-100 text-red-800)
ativo === null  → "-"
```

### Formatação da Coluna Tipo

```text
fixo === "Sim" → "Fixo"
fixo === "Não" → "Pontual"
fixo === null  → "-"
```

### Estados do Componente

```text
Estados de filtro:
- nome: string
- status: string ('true' | 'false' | '')
- tipo: string ('Sim' | 'Não' | '')
- municipio: string
- uf: string
- searched: boolean

Queries (useQuery):
- nomesQuery: lista de nomes para dropdown
- municipiosQuery: lista de municípios para dropdown
- ufsQuery: lista de UFs para dropdown
- clientesQuery: dados filtrados (enabled quando searched=true)
```

### Seleção de Tabela por Ambiente

```text
const clienteTable = isProductionEnvironment ? "cliente" : "cliente_dev";
```

## Ordem de Implementação

1. Atualizar `DevLayout.tsx`
   - Adicionar item no menu com ícone `Users`
   - Path: `/equipe/dev/gestao-clientes`
   - Label: "Gestão de Clientes"

2. Atualizar `protectedPages.ts`
   - Registrar página protegida
   - Categoria: 'dev'
   - requires_team_member: true

3. Criar `GestaoClientes.tsx`
   - 3 queries para popular dropdowns dinâmicos
   - 5 Selects (3 dinâmicos + 2 fixos)
   - Query principal de clientes com filtros
   - Tabela com formatação de Status e Tipo

4. Atualizar `App.tsx`
   - Adicionar rota com TeamRoute e PageAccessGate

