

# Checkbox de seleção + botões bulk no header da tabela

## Alterações em `src/pages/equipe/dev/ControleBalancetes.tsx`

1. **Estado de seleção**: Adicionar `selectedIds` como `Set<string>` para rastrear balancetes selecionados.

2. **Coluna de checkbox** (primeira coluna, antes de `#`):
   - Header: checkbox "selecionar todos" (usando `Checkbox` do Radix, mesmo padrão do `ConsultaXMLs.tsx`)
   - Body: checkbox individual por linha, toggle no `selectedIds`
   - `COL_COUNT` atualizado de 6 para 7

3. **Botões bulk no header do card de resultados**: Ao lado do título "Balancetes", adicionar dois botões:
   - **"Baixar arquivo original"** (ícone Download, teal) — desabilitado quando `selectedIds.size === 0`. Ao clicar, itera sobre os IDs selecionados e chama `handleBlobDownload` para cada um com endpoint `download`.
   - **"Exportar movimentos"** (ícone FileDown, blue) — mesmo comportamento, endpoint `export-excel`.
   - Ambos exibem badge com contagem de selecionados (ex: `(3)`).

4. **Helpers**: `allSelected` memo (todos da página selecionados), `handleToggleAll`, `handleToggleItem` — mesmo padrão do ConsultaXMLs.

5. **Import**: Adicionar `Checkbox` de `@/components/ui/checkbox` e `useMemo`.

