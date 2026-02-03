

# Plano: Adicionar Filtros de Contribuinte na Gestão de Clientes

## Objetivo

Expandir a página Gestão de Clientes com novos filtros baseados na tabela `contribuinte_dev`, conectando as duas tabelas via `cliente_id` para exibir dados combinados.

## Estrutura das Tabelas

```text
+----------------+       +-------------------+
|  cliente_dev   |       | contribuinte_dev  |
+----------------+       +-------------------+
| id (PK)        |<------| cliente_id (FK)   |
| nome           |       | tipo_pessoa       |
| ativo          |       | cpf_cnpj          |
| fixo           |       | nome_razao_social |
| municipio      |       | inscricao_estadual|
| uf             |       | cod_cnae          |
| ...            |       | setor             |
+----------------+       | simples_nacional  |
                         +-------------------+
```

## Novos Filtros a Adicionar

| Filtro | Tipo UI | Campo DB | Opções |
|--------|---------|----------|--------|
| Tipo Pessoa | Select fixo | `tipo_pessoa` | "PJ", "PF" |
| CPF/CNPJ | Input texto | `cpf_cnpj` | Busca parcial (ilike) |
| Nome/Razão Social | Input texto | `nome_razao_social` | Busca parcial (ilike) |
| Inscrição Estadual | Input texto | `inscricao_estadual` | Busca parcial (ilike) |
| Cód. CNAE | Input texto | `cod_cnae` | Busca parcial (ilike) |
| Setor | Select dinâmico | `setor` | Populado via DISTINCT |
| Simples Nacional | Select fixo | `simples_nacional` | "Sim" (true), "Não" (false) |

## Layout dos Filtros (Reorganizado)

```text
+------------------------------------------------------------------+
| LINHA 1 - Filtros do Cliente (existentes)                        |
| [Nome (3col)] [Status (2col)] [Tipo (2col)] [Município (2col)] [UF (2col)] |
+------------------------------------------------------------------+
| LINHA 2 - Filtros do Contribuinte (novos)                        |
| [Tipo Pessoa (2col)] [CPF/CNPJ (3col)] [Nome/Razão (3col)] [IE (2col)] |
+------------------------------------------------------------------+
| LINHA 3 - Filtros adicionais                                     |
| [Cód.CNAE (2col)] [Setor (3col)] [Simples Nacional (2col)]       |
+------------------------------------------------------------------+
```

## Colunas Atualizadas da Tabela de Resultados

| Ordem | Coluna | Fonte | Campo |
|-------|--------|-------|-------|
| 1 | Nome | cliente | nome |
| 2 | Status | cliente | ativo |
| 3 | Tipo Cliente | cliente | fixo |
| 4 | Tipo Pessoa | contribuinte | tipo_pessoa |
| 5 | CPF/CNPJ | contribuinte | cpf_cnpj |
| 6 | Nome/Razão Social | contribuinte | nome_razao_social |
| 7 | Inscrição Estadual | contribuinte | inscricao_estadual |
| 8 | CNAE | contribuinte | cod_cnae |
| 9 | Setor | contribuinte | setor |
| 10 | Simples | contribuinte | simples_nacional |
| 11 | Município | cliente | municipio |
| 12 | UF | cliente | uf |

## Lógica de Consulta

A consulta principal será baseada em `contribuinte_dev` com JOIN para `cliente_dev`:

```text
Query base:
SELECT 
  contribuinte.*,
  cliente.nome,
  cliente.ativo,
  cliente.fixo,
  cliente.municipio,
  cliente.uf
FROM contribuinte_dev contribuinte
INNER JOIN cliente_dev cliente ON cliente.id = contribuinte.cliente_id
WHERE [filtros aplicados]
ORDER BY cliente.nome
```

### Mapeamento de Filtros

| Filtro | Campo | Operação | Tabela |
|--------|-------|----------|--------|
| Nome | nome | eq | cliente (via join) |
| Status | ativo | eq (boolean) | cliente |
| Tipo Cliente | fixo | eq | cliente |
| Município | municipio | eq | cliente |
| UF | uf | eq | cliente |
| Tipo Pessoa | tipo_pessoa | eq | contribuinte |
| CPF/CNPJ | cpf_cnpj | ilike | contribuinte |
| Nome/Razão Social | nome_razao_social | ilike | contribuinte |
| Inscrição Estadual | inscricao_estadual | ilike | contribuinte |
| Cód. CNAE | cod_cnae | ilike | contribuinte |
| Setor | setor | eq | contribuinte |
| Simples Nacional | simples_nacional | eq (boolean) | contribuinte |

## Formatação do Simples Nacional

```text
simples_nacional === true  → "Sim" (texto simples, sem badge colorido)
simples_nacional === false → "Não" (texto simples)
simples_nacional === null  → "-"
```

## Detalhes Técnicos

### Novos Estados

```text
// Estados existentes mantidos
nome, status, tipo, municipio, uf, searched

// Novos estados para contribuinte
tipoPessoa: string ('PJ' | 'PF' | '')
cpfCnpj: string (busca parcial)
nomeRazaoSocial: string (busca parcial)
inscricaoEstadual: string (busca parcial)
codCnae: string (busca parcial)
setor: string (dropdown dinâmico)
simplesNacional: string ('true' | 'false' | '')
```

### Query com JOIN via Supabase

```text
// Supabase permite fazer join usando referência de FK:
const { data } = await supabase
  .from(contribuinteTable)
  .select(`
    *,
    cliente:cliente_id (
      id,
      nome,
      ativo,
      fixo,
      municipio,
      uf,
      telefone,
      setor_cliente
    )
  `)
  .eq('tipo_pessoa', tipoPessoa) // se filtro ativo
  .ilike('cpf_cnpj', `%${cpfCnpj}%`) // se filtro ativo
  // ... outros filtros
  .order('nome_razao_social')
```

### Seleção de Tabelas por Ambiente

```text
const clienteTable = isProductionEnvironment ? "cliente" : "cliente_dev";
const contribuinteTable = isProductionEnvironment ? "contribuinte" : "contribuinte_dev";
```

## Componentes de UI

- Filtros de texto (CPF/CNPJ, Nome/Razão, IE, CNAE): usar componente `Input`
- Filtros de seleção (Tipo Pessoa, Setor, Simples Nacional): usar componente `Select`

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/equipe/dev/GestaoClientes.tsx` | Adicionar novos filtros e reorganizar layout |

## Ordem de Implementação

1. Adicionar novos estados para os filtros de contribuinte
2. Criar query para popular dropdown de setores
3. Reorganizar grid de filtros em 3 linhas
4. Adicionar inputs e selects dos novos filtros
5. Modificar query principal para usar JOIN com contribuinte
6. Atualizar função handleClear para limpar todos os filtros
7. Atualizar tabela de resultados com novas colunas
8. Adicionar formatação do Simples Nacional (sem cores)

