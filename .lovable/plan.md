

## Ajustes no Modal de Cadastro de Cliente

### 1. Remover campo "Setor" da aba Contribuintes
- Remover o Select de "Setor" (linhas 762-772) do formulário de novo contribuinte
- Manter o campo `setor` no DraftEntity para compatibilidade, mas remover da UI e da validacao (linhas 316-317)
- Ajustar o grid: CNAE passa de `col-span-4` para `col-span-6`, Simples Nacional de `col-span-4` para `col-span-6`
- Remover o badge de setor do card de contribuinte listado (linha 702)

### 2. Trocar ordem: Regiao antes de Equipe Responsavel
- Mover o bloco "Regiao" (linhas 665-680) para antes do bloco "Equipe responsavel" (linhas 642-664)

### 3. Reducao de extensao vertical e design compacto

**Problema atual:** cada campo ocupa `col-span-12` (largura total), padding excessivo (`p-6 md:p-10`), gaps grandes (`gap-5`), headers pesados.

**Solucoes:**

- **Aba Cliente/Grupo:**
  - Categoria + Status na mesma linha (ja estao `col-span-6` cada, ok)
  - Area do negocio + Tipo produto/segmento: lado a lado `col-span-6` cada (hoje sao `col-span-12`)
  - Regiao + Equipe responsavel: lado a lado `col-span-6` cada
  - Tipo de relacionamento: reduzir de `col-span-12` para `col-span-6`, alinhado com outro campo
  - Reduzir padding do conteudo: `p-6 md:p-10` → `p-4 md:p-6`
  - Reduzir gap do grid: `gap-5` → `gap-4`

- **Aba Contribuintes:**
  - Padding interno: `p-6` → `p-4`, `p-5` → `p-4`
  - Gap: `gap-4` → `gap-3`
  - Margin do titulo "Novo Contribuinte": `mb-4` → `mb-3`

- **Aba Participantes:**
  - Padding: `p-6` → `p-4`, `p-5` → `p-4`
  - Gap: `gap-4` → `gap-3`

- **Aba OS:**
  - Mesma reducao de padding e gap
  - Campos de valor lado a lado (3 colunas) em vez de empilhados

- **Header do modal:**
  - Reduzir padding: `px-8 py-5` → `px-6 py-3`
  - Titulo: `text-2xl` → `text-xl`, icone de 28 → 22
  - Remover descricao (paragrafo) para economizar espaco vertical

- **Tabs:**
  - Reduzir padding: `px-6 pt-4` → `px-6 pt-2`

- **Section headers internos:**
  - Reduzir padding: `px-6 py-4` → `px-4 py-2.5`
  - Titulo: `text-lg` → `text-base`

### Resumo tecnico

- **Arquivo unico:** `src/components/equipe/dev/NewClientModal.tsx`
- **Sem alteracao de banco de dados**
- Campos passam a aproveitar melhor a largura horizontal, reduzindo scroll vertical em ~40%
