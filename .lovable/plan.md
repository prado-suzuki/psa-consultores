## Objetivo

No modal Novo/Editar DCOMP, alinhar os títulos do bloco de rateio, adicionar uma coluna **Competência** (MM/AAAA) por linha de tributo, e persistir esse campo na tabela `distribuicao_dcomp`.

## Mudanças

### 1. Banco — `distribuicao_dcomp`
Adicionar coluna `competencia` (`date`, nullable) para armazenar a competência por linha de tributo (1º dia do mês, igual ao padrão usado em `mes_ano_exercicio`). Sem mudança de RLS — políticas atuais já cobrem.

### 2. Modal `src/components/equipe/dev/perdcomp/DcompFormModal.tsx`

**Tipo `DistribuicaoLinha`**: incluir `competencia?: string` (formato `yyyy-MM-dd` ou `yyyy-MM`).

**Header de colunas (linhas 617-621)**: reescrever como grid de 4 colunas alinhadas (Tributo · Valor · Competência · ação remover), usando `grid grid-cols-[130px_1fr_120px_36px] items-center gap-2` para garantir mesma altura de baseline entre os títulos. Adicionar label "Competência" com `RequiredMark`.

**Linhas de tributo (628-666)**: trocar `flex` por o mesmo `grid grid-cols-[130px_1fr_120px_36px]` e adicionar terceira célula com `<Input>` MM/AAAA reutilizando exatamente a máscara/parse do campo `mes_ano_exercicio` (linhas 536-554). Mantém validação visual (border-destructive se vazia).

**Query de leitura (165-177)**: adicionar `competencia` ao `select`.

**Validação `distribuicoesValidas`**: incluir `temCompetenciaVazia` (alguma linha sem competência válida no formato `yyyy-MM`); mensagem amigável no bloco de erros (linhas 701-711).

**`persistirDistribuicoes` (303-318)**: incluir `competencia: normalizeMesAno(l.competencia)` no insert.

**Fallback edição antiga (262-274)**: ao gerar a linha única default, usar `editData.mes_ano_exercicio` como competência inicial.

**Helpers**: pequenas funções `formatCompetenciaDisplay` / `parseCompetenciaInput` para evitar duplicação inline.

### 3. Hook de leitura/exibição
A tabela "Lançamentos DCOMP" no detalhe do PER não exibe competência por linha, então não há ajuste obrigatório fora do modal. Sem mudança no `useAuditLog` (mutações já são logadas no fluxo do DCOMP).

## Sequência de execução
1. Migration: `ALTER TABLE public.distribuicao_dcomp ADD COLUMN competencia date;`
2. Aguardar aprovação da migration.
3. Atualizar `DcompFormModal.tsx` (UI + validação + persistência + leitura para edição).
4. Verificar build.