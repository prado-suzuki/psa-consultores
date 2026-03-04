

# Redesign do Modal de Upload + Ajustes na Página de Balancetes

## Resumo das mudanças

4 alterações principais em 2 arquivos + 1 novo componente.

---

### 1. Novo componente: `MonthRangePicker` (`src/components/ui/month-range-picker.tsx`)

Picker de intervalo de meses em um único campo. Exibe grid 4x3 de meses com navegação de ano. Ao clicar no primeiro mês, define `start`; ao clicar no segundo, define `end`. Se clicar o mesmo mês duas vezes, start = end. Exibe no botão "Jan/2025 — Mar/2025". Usado tanto no modal quanto no filtro da página principal.

---

### 2. Redesign do Modal (`UploadBalanceteModal.tsx`)

Layout side-by-side em tela maior (`sm:max-w-4xl`):

- **Lado esquerdo (~45%)**: Card grande com zona de drag-and-drop para arquivo. Ícone centralizado de upload, texto "Arraste o arquivo aqui ou clique para selecionar", borda tracejada `border-dashed`. Aceita apenas `.xlsx` e `.xls` — validação no `accept` do input e verificação programática no `onChange` e `onDrop` (rejeita arquivos com extensão diferente com toast de erro).
- **Lado direito (~55%)**: Campos empilhados — Cliente, Contribuinte, Detalhamento (prompt/switch), Período (usando o novo `MonthRangePicker` unificado).
- Footer com botões Cancelar e Enviar.

---

### 3. Ajustes na página principal (`ControleBalancetes.tsx`)

**Botão "Novo Balancete"**: Mover do card de resultados para a barra de ações do filtro, no canto esquerdo (`justify-between` no flex). Fica alinhado horizontalmente com "Limpar filtros" e "Buscar" que ficam à direita.

**Tabela — novas colunas**:
- Coluna `#` (primeira coluna): número sequencial da linha (index + 1), para ordenação visual básica.
- Coluna `Linhas` (antes de Ações): exibe `b.qtd_linhas` ou `b.total_linhas` da API (campo do payload de resposta). Se o campo não existir, exibe "—".

**Período unificado no filtro**: Substituir o `MonthYearPicker` único por `MonthRangePicker`, enviando `dt_ini` e `dt_fim` separados na query.

**colSpan**: Atualizar de 4 para 6 nos estados loading/vazio.

---

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/ui/month-range-picker.tsx` | **Novo** — componente de seleção de intervalo de meses |
| `src/components/equipe/dev/balancete/UploadBalanceteModal.tsx` | Redesign layout side-by-side + drag-and-drop + MonthRangePicker + validação de formato |
| `src/pages/equipe/dev/ControleBalancetes.tsx` | Mover botão, trocar picker, adicionar colunas # e Linhas |

