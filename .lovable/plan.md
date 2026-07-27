# Plano — Completar `gerar-apresentacao` (v2, ajustes aprovados)

Portar para Deno a lógica já validada localmente reusando `applyTokensToSlideXml` em loop de clones. Sem serviço externo, sem gerar do zero, sem quebrar o contrato do front.

## 1. Novos helpers em `supabase/functions/_shared/ooxml/`

### `slide.ts` — duplicar/remover slide inteiro
- `duplicateSlide(parts, srcPath) → { newPath, newRelsPath }`: aloca próximo `slideN.xml` livre; copia slide + `_rels/slideN.xml.rels`; registra Override em `[Content_Types].xml`; adiciona `<Relationship>` em `ppt/_rels/presentation.xml.rels`; adiciona `<p:sldId>` (id ≥ 256, único) em `presentation.xml` na posição do slide original + 1.
- Mídia é compartilhada — não duplicar `ppt/media/*`. Targets do rels apontam para os mesmos `../media/…`.
- Reset de `cNvPr/@id` no clone via `nextCNvPrId`; `stripTiming` no clone.
- `removeSlide(parts, path)`: apagar parte + rels; remover Override; remover Relationship em `presentation.xml.rels`; remover `<p:sldId>` correspondente.

### `shapes.ts` — clonar/distribuir `<p:sp>`
- `cloneShape(spEl) → Element` (deep clone, novo `cNvPr/@id`).
- `distributeAlongX(shapes, xLeft, xRight)`: recalcula `<a:off x>` mantendo `y`/`cy`; `cx` = largura da coluna; gap fixo (**assumido:** 0,1").
- `findShapesByToken(slideDoc, token)`.
- `removeShape(spEl)` para faixas sem dados.

### `table.ts` — clonar `<a:tr>` e tabela inteira
- `findRowTemplateWithToken(tblEl, token)`.
- `cloneRow(trEl)`, `cloneTable(graphicFrameEl)` (deep clone do `<p:graphicFrame>` inteiro — usado no quadro societário).
- `applyRowTokens(trEl, valores)`: serializa → `applyTokensToSlideXml` → reparse (reusa merge de runs).
- `removeRow(trEl)`.
- `moveGraphicFrame(gfEl, x, y)`: reposiciona via `<p:xfrm>/<a:off>` do próprio `graphicFrame`.

## 2. Loaders (novo `data.ts` local à função)

**Sem filtro `ambiente`** — `bem`, `pessoa`, `quadro_societario`, `matricula`, `titularidade`, `exploracao_rural` não têm essa coluna. Isolamento é por cluster e já está garantido no gate de auth pré-existente (interseção `resolve_user_cluster_ids × cliente_clusters`).

- `carregarPatrimonial(clienteId)` → PostgREST em `bem` com joins de `matricula`, `titularidade` e `empresa_destino:empresa_destino_pessoa_id(denominacao)`. Ignora `participa_estruturacao=false`. Agrupa por `empresa_destino.denominacao` (fallback `"Sociedade a definir"`); 1 linha por matrícula; bem sem matrícula → `matriculaLabel = "Não se aplica"`.
- `carregarOrganograma(clienteId)` → `pessoa` (`tipo_pessoa`/`tipo_empresa`) + `exploracao_rural`; classifica em 4 faixas: Sócios (PF + PJ `SC`), Controladoras (PJ `CN`), Controladas (PJ `PR`), Rural.
- `carregarQuadro(clienteId)` → `quadro_societario` com joins `empresa:empresa_pessoa_id!inner(id,denominacao,cliente_id)` e `socio:socio_pessoa_id(id,denominacao,tipo_pessoa)`, filtrando `empresa.cliente_id=eq.{id}`. Agrupa por empresa; `tq = Σquotas`, `tv = Σvlr_total`; `pct = quotas/tq*100`.
- `resolverTitular(clienteId)` → 1º `exploracao_rural` com `tipo_exploracao='composse'`; 2º `pessoa.is_fundador`; 3º `null` (token vira `""`).

## 3. Refactor de `gerarDeck` em `index.ts`

Ordem por deck:

1. Baixar template + `unpackPptx`.
2. Aplicar tokens de capa (`CLIENTE`, `DATA`, `SOCIEDADE`) — como hoje.
3. **Patrimonial**: localizar slide-modelo (contém `{{PROP}}`); para cada sociedade → `duplicateSlide`, trocar `{{SOCIEDADE}}`, clonar `<a:tr>`-modelo por matrícula, `removeRow` do modelo. `removeSlide` do slide-modelo original ao final (assumido).
4. **Societária — Organograma**: agrupar shapes `{{ORG_ITEM}}` por faixa via bucket em `y` (tolerância **assumida:** ±0,15"); em cada faixa: guardar 1 shape como estilo, clonar `N-1`, `distributeAlongX`, aplicar `{{ORG_ITEM}}`. Faixa sem dados → remover todos os placeholders da faixa (sem token cru sobrando).
5. **Societária — Quadro (revisado)**: o template tem **1 tabela só**. Se `carregarQuadro` vazio → `removeSlide`. Senão:
   - Guardar a `<p:graphicFrame>`-modelo como *estilo* e capturar seu `<p:xfrm>` (x, y, cx, cy).
   - Para cada empresa: `cloneTable` do modelo, aplicar `{{EMPRESA}}`, clonar `<a:tr>`-modelo por sócio, recomputar TOTAL, reposicionar via `moveGraphicFrame`.
   - **Layout: até 2 colunas empilhadas na vertical**. Empresas distribuídas em coluna esquerda/direita alternando; dentro da mesma coluna, empilhar verticalmente com gap fixo (**assumido:** 0,15"). Quando a próxima tabela transbordar a altura útil do slide → `duplicateSlide` do slide de quadro e continuar no próximo, preservando o mesmo cabeçalho/rodapé. Suporta N empresas.
   - `removeShape` da tabela-modelo original ao final.
6. **Societária — {{TITULAR}}**: aplicar valor resolvido ou `""`. **Varredura final** em todos os slides tocados: qualquer `{{...}}` remanescente → `""` (defesa dupla).
7. `stripTiming` nos slides tocados; `validatePptx`.

Utils locais: `fmtBRL` (`R$ 1.234,56`), `fmtInt` (`1.234`), `fmtPct` (`50,00%`).

## 4. Persistência

### Storage — overwrite
- Caminho estável `${clienteId}/${tipo}.pptx` com `upsert: true`. Elimina acúmulo de ~18 MB por geração.

### `documento_gerado` / `documento_arquivo` — select→update senão insert
Não há unique em `(cliente_id, documento_template_id)` nem em `documento_gerado_id`; há linhas duplicadas legadas. Portanto **não usar upsert** (evita ambiguidade):

- `documento_gerado`: `SELECT id FROM documento_gerado WHERE cliente_id=$1 AND documento_template_id=$2 ORDER BY gerado_em DESC LIMIT 1`.
  - Se achou → `UPDATE` do registro (renova `snapshot_dados`, `caminho_arquivo`, `gerado_por_id`, `gerado_em`, `status='rascunho'`).
  - Se não achou → `INSERT` normal.
  - Remover o encadeamento `documento_anterior_id` / `documento_raiz_id` desta fase (assumido: histórico não é requisito; pode voltar depois).
- `documento_arquivo`: mesmo padrão, chave lógica `documento_gerado_id`. Se achar → `UPDATE nome_original, gcs_uri, mime, tamanho, status='ativo', updated_at`. Se não → `INSERT`.

### Bug do insert em `documento_arquivo` — colunas certas e enums verificados
Colunas reais do schema (verificadas): `cliente_id`, `fonte` (enum `osg_doc_fonte`), `categoria` (enum `osg_doc_categoria`), `documento_gerado_id`, `nome_original`, `gcs_uri`, `mime`, `tamanho`, `status` (enum `osg_doc_status`), `area` (enum `osg_doc_area`), `checklist_item_id?`, `bem_id?`, etc.

**Enums confirmados:**
- `osg_doc_fonte`: `cliente | psa | arquivar` → `'psa'` ✅
- `osg_doc_area`: `osg | fiscal` → `'osg'` ✅
- `osg_doc_categoria`: `bens_direitos | cadastros_fiscais | declaracao_ir | agrarios | pessoais | societarios | sucessorios | outros | georreferenciamento` → `'societarios'` para o deck societário e `'bens_direitos'` para o patrimonial (assumido: mais aderente que `'outros'`).
- `osg_doc_status`: `pendente | ativo` → `'ativo'` ✅

Payload final:
```
cliente_id, documento_gerado_id, fonte:'psa', area:'osg',
categoria: tipo==='patrimonial' ? 'bens_direitos' : 'societarios',
nome_original:<nome>, gcs_uri:'${BUCKET_OUTPUT}/${caminho}',
mime:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
tamanho: bytes.length, status:'ativo'
```

**Propagação de erro**: em cada `.insert()`/`.update()`, checar `error` e lançar `throw new Error(...)` com contexto. Se o insert de `documento_arquivo` falhar, o deck inteiro daquele tipo entra em `erros[]` — não sobe URL "órfã" para o front.

## 5. Riscos OOXML e mitigações

- **Clone `<a:tr>`**: manter `<a:tc>` filhas; não mexer em `<a:tblGrid>`.
- **Clone de tabela (`<p:graphicFrame>`)**: preservar `<a:tbl>` inteiro; renumerar `cNvPr/@id`; reposicionar via `<p:xfrm>` do próprio `graphicFrame`.
- **Clone `<p:sp>`**: `cNvPr/@id` único por slide (chamar `nextCNvPrId` após cada insert).
- **Slide duplicado**: mídia compartilhada — só o `slideN.xml.rels` é copiado.
- **`presentation.xml`**: `<p:sldId>` com id único ≥ 256; ordem controla ordem final.
- **`p:timing`**: `stripTiming` também nos slides clonados/novos.
- **Overflow do quadro**: quando altura acumulada > altura útil (assumido: `slide_h - y_inicial - 0,3"`) → duplicar slide.
- **Seção sem dados**: nunca deixar token cru — varredura final substitui remanescentes por `""`; slides/linhas/shapes sem dado são removidos.
- **Validação**: `validatePptx` no fim; falha aborta upload e propaga erro.

## 6. Escopo mantido / fora

- Contrato inalterado (`{clienteId, tipo}` → `{arquivos:[{tipo,nome,url}]}`). Front não muda.
- `tipo='ambas'` sequencial.
- Auth/cluster/roles: intocado.
- Sem novas dependências além de `fflate` + `@xmldom/xmldom`.

## 7. Ordem de entrega

1. Helpers `table.ts`, `shapes.ts`, `slide.ts` (com `cloneTable` + `moveGraphicFrame`).
2. `data.ts` (4 loaders, sem filtro `ambiente`) validado por SELECT.
3. Refactor de `gerarDeck` por seção.
4. Persistência: Storage overwrite; select→update-else-insert em `documento_gerado` e `documento_arquivo`; propagação de erros.
5. Teste E2E via `supabase--curl_edge_functions` com cliente real (Alessio Sansão) `tipo='ambas'`; abrir os dois `.pptx`.

## Assumidos

- Slide-modelo patrimonial é removido ao final (mantendo capa/fechamento + clonados por sociedade).
- Quadro societário: 2 colunas empilhadas verticalmente, gap 0,15"; overflow duplica o slide de quadro.
- Distribuição do organograma: gap 0,1"; `y`/`cy` preservados; tolerância de bucket ±0,15" no eixo Y.
- Categoria de `documento_arquivo`: `bens_direitos` (patrimonial) e `societarios` (societária).
- Histórico `documento_anterior_id`/`raiz_id` não é requisito nesta fase.
- Varredura final `{{…}}` → `""` como defesa em todos os slides tocados.
