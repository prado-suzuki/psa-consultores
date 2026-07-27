# Plano — Ajustes na edge `gerar-apresentacao` (revisado)

Ordem: **P0 → P1 → P2**. Sem redesign. Onde o prompt prescreveu algo, aplico literalmente.

---

## P0 — Bugs visíveis

### 1) Escaping duplo `&` → `&amp;amp;`
**Arquivo:** `supabase/functions/_shared/ooxml/runs.ts`
- Remover `escapeXmlText` de dentro de `replaceTokens` — não escapar no valor cru injetado no `textContent`.
- Motivo: `applyTokensToNode` seta `t.textContent = replaceTokens(...)` **já escapado**; ao serializar, o xmldom escapa `&` de novo → `&amp;amp;`.
- Correção: `replaceTokens` devolve string crua; `textContent` cuida do escape XML (uma vez).
- **Teste manual:** "R & L", "A<B", `"x"`.

### 2) Linha TOTAL do quadro vazia
**Arquivo:** `index.ts` → `renderQuadroTable`
- Confirmado: células do TOTAL já têm `<a:r>` formatado (branco/negrito). Localizar a row TOTAL como a única remanescente após remover template `{{SOCIO}}` (ou por texto "TOTAL" na 1ª célula).
- Para cada `<a:tc>` a partir da coluna 1: pegar o primeiro `<a:r>/<a:t>` e **sobrescrever `textContent`** — não criar run novo.
- Valores: `fmtInt(totalQuotas)`, `fmtBRL(totalValor)`, `"100,00%"` fixo.
- Pular quando `empresa.linhas.length === 0` (item 8 remove).

### 3) Coluna Matrícula despeja "Mat. X (ant. Y)"
**Arquivo:** `data.ts` → `carregarPatrimonial`
- Linha 88 → `const matLabel = m.numero ? \`Mat. ${m.numero}\` : "Não se aplica";`
- Remover uso de `matricula_anterior_texto` no label.

---

## P1 — Escala/dados

### 4) Quadro multi-empresa
**Arquivo:** `index.ts` → `renderQuadroSlide` / `renderQuadroTable`
- Constantes (EMU, 1"=914400):
  - `COL_W = 5.7" ≈ 5212080`; `GAP_H = 0.3" ≈ 274320`
  - `LEFT_0 = 0.6" ≈ 548640`; `LEFT_1 = LEFT_0 + COL_W + GAP_H`
  - `TOP_0 = 1.55" ≈ 1417320`; `TOP_MAX = 7.1" ≈ 6492240`
  - Altura por empresa: `(3 + n_socios) * 0.26" + 0.35"`
- **1 empresa** → centralizar: `left = 3.25" ≈ 2971800`, `top = TOP_0`.
- **N empresas**: `c = i % 2`; empilhar `top[c] += h`.
- Estourou `TOP_MAX` → `restantes[]` (loop de duplicação atual reaproveitado; cache do `freshXml` fora do while).

### 5) Paginação da tabela patrimonial
**Arquivos:** `index.ts` → `renderPatrimonialSlide`, `gerarPatrimonial`
- `LINHAS_POR_SLIDE = 8` (**assumido**). Se `soc.linhas.length > 8`, chunks de 8; 1º chunk usa o slide já alocado, demais via `duplicateSlide`, mesmo `{{SOCIEDADE}}`, cabeçalho repetido.

### 6) Multi-sociedade patrimonial
- ⚠ **Já implementado** no padrão pedido (slide3 = 1ª, `duplicateSlide` para demais). Manter e integrar com paginação do item 5.

### 7) Organograma — muitas caixas / nomes longos
**Arquivos:** `index.ts` → `distribuirShapes`, `renderOrganograma`
- **Sem truncar sócios.** Faixa 1: `LMIN = 1.40" ≈ 1280160`, `RMAX = 12.90" ≈ 11795760` → largura útil `11.5"`.
- Fórmulas: `gap = 0.1" ≈ 91440`; `cx = (RMAX - LMIN - (n-1)*gap) / n`; `x_i = LMIN + i*(cx + gap)`.
- **Shrink-to-fit** por caixa: no `<a:txBody>/<a:bodyPr>` do clone inserir `<a:normAutofit/>` + `wrap="square"`.
- **1 fileira apenas** (assumido confirmado: gap vertical 0.75" < altura caixa 0.66" → não dá 2 fileiras).
- **N extremo** (quando `cx < 0.55"` ≈ 500000): manter as primeiras `N-1` caixas e substituir a última por marcador `"+K"` com `K = itens.length - (N-1)`. Nunca omitir sem sinalizar.

### 8) Guards de dados vazios
- **pct**: `carregarQuadro` retorna sentinel (`NaN`) quando `tq === 0`; `fmtPct` devolve `"—"` para valores não finitos.
- **Empresa sem sócios**: `renderQuadroSlide` pula (não cria tabela).
- **Quadro vazio total**: já remove o slide (linha 394). Manter.
- **quotas/valor/percentual null**: `fmtInt/fmtBRL/fmtPct` devolvem `"—"` quando `n == null` (hoje devolvem 0 formatado).
- **Cliente sem bens/pessoas**: já tratado em `gerarPatrimonial`.

---

## P2 — Polimento

### 9) Organograma cobre rótulos "Sócios/Controladoras/…"
**Arquivo:** `index.ts` → `renderOrganograma` / `distribuirShapes`
- Todas as faixas hoje começam em `left ≈ 1.10"` — usar o left da Controladoras **não corrige**.
- Aplicar em **todas as 4 faixas**: `LMIN = 1.40"` (borda direita dos rótulos + margem), `RMAX = 12.90"`.
- Constantes passam a ser fixas no módulo, não mais derivadas do template.

### 10) Tabela única centralizada
- Coberto pelo item 4 (`left = 3.25"` quando `empresas.length === 1`).

### 11) `documento_gerado` acumula linha
**Arquivo:** `index.ts` → `upsertDocumentoGerado`
- ⚠ **Já implementado** (select→update-else-insert). Trocar `order("gerado_em", …)` por `order("created_at", { ascending: false })` — confirmado que `created_at` existe.

---

## Riscos OOXML
- **Escape 1×:** cargas com `& < > "` — validar via re-download e leitura de `slide.xml`.
- **normAutofit:** alguns viewers exigem `fontScale` explícito; se falhar, calcular empiricamente e reemitir.
- **Clone de slide na paginação:** `duplicateSlide` copia `slideN.xml.rels`; mídia compartilhada não é duplicada; `validatePptx` barra override sem parte.
- **cNvPr únicos:** contador monotônico com seed `+100` já existe; reforçar em cada slide novo (chunks patrimoniais reinicializam seu `idCounter` a partir do XML novo).

## Assumidos
- **`LINHAS_POR_SLIDE = 8`** para paginação patrimonial (ajustar por observação).
- **Organograma em 1 fileira** — 2 fileiras não cabem verticalmente no template.
- **Marcador "+K"** só aparece quando `cx < 0.55"`; até lá, todas as caixas cabem em fileira única.
