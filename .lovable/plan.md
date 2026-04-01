

## Plan: Adicionar coluna "Diferença" na aba XML da Auditoria Cruzada

### Arquivo: `src/components/equipe/dev/auditoria/EfdcXmlTab.tsx`

**Header** (após "Soma CT-es", linha 222):
- Adicionar `<TableHead className="text-xs text-right">Diferença</TableHead>`

**Linha de dados** (após a célula `SUM_LOTE`, linha 251):
- Calcular `const diff = lote.VLR_LOTE - lote.SUM_LOTE`
- Renderizar célula com `formatBRL(diff)`
- Aplicar cor condicional: `text-destructive` se `Math.abs(diff) > 0.05`, caso contrário cor padrão
- Isso sinaliza visualmente lotes com divergência entre valor e soma dos CT-es

**ColSpan** (linha 255):
- Atualizar `colSpan={7}` → `colSpan={8}` na linha de detalhe expandida

### Nenhum outro arquivo afetado

O tipo `EfdcXmlLote` já possui `VLR_LOTE` e `SUM_LOTE`. Não é necessário alterar tipos nem hooks.

