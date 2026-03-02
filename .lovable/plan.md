

# Plano: Criar tabela `ordem_servico` e migrar dados de OS

## Contexto

Atualmente, os dados de Ordens de Servico (OS) estao sendo salvos na tabela `contrato`, o que mistura duas entidades semanticamente distintas. Vamos criar uma tabela dedicada `ordem_servico` na producao, migrar os dados existentes, e limpar as colunas de OS da tabela `contrato`.

---

## Fase 1: Migracao SQL (apenas producao)

### 1.1 Criar tabela `ordem_servico`

| Coluna | Tipo | Default | Descricao |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | Identificador unico |
| `id_cliente` | uuid NOT NULL | - | FK logica para `cliente` |
| `numero_os` | text | - | Codigo da OS (ex: "001/2025") |
| `data_emissao` | date | - | Data de emissao |
| `data_inicio` | date | - | Inicio da execucao |
| `data_fim` | date | - | Fim previsto |
| `valor_projeto` | numeric | 0 | Valor total da OS |
| `valor_reembolso_km` | numeric | 0 | Reembolso por km |
| `valor_reembolso_refeicao` | numeric | 0 | Reembolso refeicao |
| `situacao` | text | `'em_andamento'` | Status da OS |
| `observacoes` | text | - | Notas livres |
| `servicos_contratados` | jsonb | `'[]'` | Array de codigos de servico |
| `centros_custo` | jsonb | `'[]'` | Array de {empresa, percentual} |
| `created_at` | timestamptz | `now()` | - |
| `updated_at` | timestamptz | `now()` | - |

RLS: mesmas politicas das demais tabelas operacionais (team_member + admin para CRUD, admin para DELETE).

### 1.2 Migrar dados existentes de `contrato` para `ordem_servico`

Copiar linhas de `contrato` que tenham `servicos_contratados IS NOT NULL` ou `situacao_projeto IS NOT NULL` (indicando que sao OS e nao contratos reais) para a nova tabela, mapeando:

- `numero_contrato` -> `numero_os`
- `valor_fixo` -> `valor_projeto`
- `situacao_projeto` -> `situacao`
- `observacoes_projeto` -> `observacoes`

### 1.3 Remover colunas OS-especificas de `contrato`

Remover da tabela `contrato` as 7 colunas que pertencem exclusivamente a OS:
- `data_emissao`
- `valor_reembolso_km`
- `valor_reembolso_refeicao`
- `situacao_projeto`
- `observacoes_projeto`
- `servicos_contratados`
- `centros_custo`

A tabela `contrato` permanece com suas colunas originais: `id_contrato`, `id_cliente`, `numero_contrato`, `tipo_contrato`, `data_inicio`, `data_fim`, `valor_fixo`, `aliquota_contrato`.

### 1.4 Tabelas `_dev`

**Nenhuma tabela `_dev` sera criada ou alterada.** O frontend usara `contrato_dev` como fallback no ambiente de desenvolvimento, enviando apenas os campos compativeis.

---

## Fase 2: Refatoracao do Frontend (`NewClientModal.tsx`)

### 2.1 Constante de tabela

Substituir o uso de `contratoTable` para OS:

```text
const ordemServicoTable = isProductionEnvironment ? "ordem_servico" : "contrato_dev";
```

### 2.2 `handleSave` -- persistencia de OS

Atualizar o bloco de insercao de contratos/OS (linhas ~1246-1264) para apontar para `ordemServicoTable` com payload mapeado para a nova estrutura:

```text
numero_os       <- ordem_servico
valor_projeto   <- valor_projeto
situacao        <- situacao_projeto
observacoes     <- observacoes_projeto
```

Manter espalhamento condicional `...(isProductionEnvironment && { ... })` para campos que so existem em `ordem_servico` e nao em `contrato_dev`.

### 2.3 `loadData` -- carregamento de OS

Alterar a query de carregamento (linhas ~676-698) para ler de `ordemServicoTable` em vez de `contratoTable`, mapeando os nomes de coluna corretamente.

### 2.4 Interface `DraftContract`

Renomear para `DraftOrdemServico` para refletir a semantica correta.

---

## Resumo de arquivos impactados

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | CREATE TABLE `ordem_servico`, INSERT migrados, DROP COLUMN em `contrato` |
| `NewClientModal.tsx` | Constante de tabela, handleSave, loadData, rename da interface |

