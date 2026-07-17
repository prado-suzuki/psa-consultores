# Plano revisado — Edge Function `gerar-apresentacao` (OSG Work)

Alvo: gerar as duas apresentações completas (Patrimonial + Societária) do cliente, fiéis ao modelo PSA, na Lovable Cloud (Supabase Edge Function). Ajustes aplicados conforme feedback.

---

## 1. Arquitetura

```text
[OSG Work] → supabase.functions.invoke('gerar-apresentacao', { clienteId, tipo })
   ▼
[Edge Function Deno]
  1. Auth: getClaims(JWT) + has_role_or_higher(auth.uid(),'team_member')
  2. Carrega template do bucket `osg-templates` (service role)
  3. Busca dados (bem+matrículas+titularidade / quadro_societario / pessoa)
  4. Gera deck(s) — helpers em supabase/functions/_shared/ooxml/*
  5. Upload em `osg-apresentacoes/{cliente_id}/{yyyymmdd_hhmm}_{tipo}.pptx` (privado)
  6. INSERT em documento_gerado + documento_arquivo
  7. Retorna { arquivos: [{ tipo, nome, url }] } com URL assinada 10min
```

`tipo='ambas'` → **executa Patrimonial e Societária em sequência** (não em paralelo — templates ~19MB, evita OOM). Se um falhar, retorna o que deu certo + erro parcial.

### Módulos (`supabase/functions/_shared/ooxml/`)

- `zip.ts` — wrappers `fflate` (unzip/zip in-memory, streaming).
- `xml.ts` — parse/serialize com `@xmldom/xmldom`; helpers `qsa`, `clone`.
- `runs.ts` — `normalizeRuns(paragraph)`, `replaceToken(xml, {CLIENTE, DATA, SOCIEDADE})`.
- `ids.ts` — `nextCNvPrId(slideXml)`.
- `timing.ts` — `stripTiming(slideXml)`.
- `slide.ts` — `duplicateSlide(pptx, sourceIdx)` remapeia imagens (`r:embed` reusando media parts, novo rId), registra em `presentation.xml`, `presentation.xml.rels`, `[Content_Types].xml`.
- `table.ts` — `findTable(slideXml)` (única graphic frame com `<a:tbl>`), `cloneRow(tbl, idx)`, `dropRow(tbl, idx)`.
- `shapes.ts` — `groupShapesByTop(slideXml, tolEmu)`, `cloneShape`, `distributeHorizontally(shapes, area, gap)`, `removeShapes`.
- `validate.ts` — pós-geração: content-types coerente, todos `rId` resolvem, `cNvPr/@id` únicos por slide, sem partes duplicadas.

`supabase/functions/gerar-apresentacao/index.ts` fica magro: handler + auth + loaders de dados + orquestração dos dois decks.

---

## 2. Recomendações técnicas

### 2.1 Libs (mantido)

- **`fflate`** (zip) + **`@xmldom/xmldom`** (parse) via `npm:` specifiers do Deno.
- Sem `pptxgenjs`/`docxtemplater` — não dão o controle necessário para clonar linhas de tabela / shapes preservando o template.

### 2.2 Localização de elementos — **posicional** (sem nomes de shape)

- **Tabela do slide**: a única `p:graphicFrame` cujo `a:graphicData` contém `<a:tbl>`. Se um slide tiver >1 tabela no futuro, escolher pela maior área. Linha-modelo = `<a:tr>` de índice 1 (0 é cabeçalho).
- **Caixas do organograma**: coletar todos os `<p:sp>` (AUTO_SHAPE) do slide, ler `<a:xfrm>/<a:off>@y` (EMU). Agrupar por `top` com tolerância **±0,1" (~91.440 EMU)**. Faixas esperadas por `top` do template (Sócios/Controladoras/Controladas/Rural — nesta ordem vertical). Guardar 1 sp da faixa como estilo, remover o restante da faixa antes de clonar N caixas.

### 2.3 Clonagem — tabela e shapes

**Tabela (Patrimonial + Quadro Societário):**
- `template = deepClone(<a:tr>[1])` → para cada registro `clone + replaceTokens + append`. Ao final remover o `<a:tr>` template.
- Sem recomputar largura de coluna (respeita template — §4.3 aprovado).

**Shapes (organograma):**
- Para cada faixa: `styleSp = shapes[0]`; remover todos os originais. Para cada entidade, `clone(styleSp)`, `cNvPr/@id = nextId()`, atualizar `<a:off x=...>` distribuindo na largura útil do slide (13,33" menos margens), `gap 0,1"`, `<a:ext cx>` preservado. Trocar o texto interno.
- Faixa vazia (ex.: Atividade Rural hoje) → **remover todos os shapes** (§4.4 aprovado).

**Quadro Societário — múltiplas empresas no MESMO slide:**
- 1 empresa → tabela centralizada (posição do template).
- 2..N empresas → layout 2 colunas, empilhando de cima para baixo. Cada tabela é um clone posicionado por deslocamento calculado (largura útil/2, gap 0,2"; altura estimada = header + linhas × altura padrão do template + total).
- **Paginação**: só quando a próxima tabela ultrapassar a área útil vertical (7,5" − margens). Então `duplicateSlide()` do slide-modelo e continuar no próximo. Não duplicar preventivamente.
- Idem Patrimonial: várias sociedades ⇒ 1 slide por sociedade (é a semântica do template).

### 2.4 OOXML — regras críticas (mantidas)

| Risco | Mitigação |
|---|---|
| `p:timing` refs quebrando | Remover `<p:timing>...</p:timing>` de todo slide modificado. Deck estático (§4.7 ok). |
| `cNvPr/@id` duplicado | `nextCNvPrId()` = max atual + 1, por slide. |
| Imagens em slide duplicado | Copiar `slideN.xml.rels`, gerar novo `rId`, **reusar** a media part (`/ppt/media/imageX.png` não é duplicada). |
| `{{TOKEN}}` fragmentado em runs | `normalizeRuns(<a:p>)`: se `join(runs.text).includes('{{')`, concatenar `<a:t>` no 1º run, preservar `<a:rPr>` dele, dropar demais. Só então replace. |
| Partes duplicadas em `[Content_Types].xml` | Checar `Override@PartName` antes de append. |
| Zip válido mas PPT recusa | `validate()` pós-geração: rejeita upload se algo estiver incoerente. |

### 2.5 Auth, limites, performance

- **JWT do usuário** valida entrada; **service role** para Storage e queries (`bem`, `quadro_societario`, `pessoa`, `documento_gerado`).
- Autorização mínima: `has_role_or_higher(auth.uid(),'team_member')`. Não existe helper de visibilidade por cliente disponível para este caso — se você quiser barrar por cluster do cliente, me confirme antes (posso adicionar checagem via `resolve_user_cluster_ids` + `cliente_clusters`). Por padrão do plano: só role.
- `tipo='ambas'` → **sequencial** (Patrimonial → Societária). Evita pico de memória.
- Limites Edge: CPU wall ~150s (ok, cada deck 5–15s), RAM ~256MB (template ~19MB cabe com 1 por vez), response = URL assinada (sem base64).

### 2.6 Persistência — `documento_gerado` (Opção A + seed)

Confirmado no schema: `documento_template_id` é **NULLABLE**, `cliente_id` NOT NULL, `caminho_arquivo` NULLABLE, `status` NOT NULL.

- **Seed**: criar (via migration) 2 linhas em `tmpl_documento`:
  - `Apresentação Patrimonial PSA`
  - `Apresentação Societária PSA`
  IDs fixos (uuid literal) para referenciar do código sem lookup.
- Cada geração insere em `documento_gerado`:
  - `cliente_id`
  - `documento_template_id` = uuid da linha seed correspondente
  - `caminho_arquivo` = `osg-apresentacoes/{cliente_id}/{yyyymmdd_hhmm}_{tipo}.pptx`
  - `snapshot_dados` = `{ tipo, contagens: { sociedades, empresas, socios, matriculas }, versao_gerador, template_hash }`
  - `snapshot_flags` = `{}` (não aplicável)
  - `snapshot_versoes_blocos` = `{}`
  - `status = 'gerado'`
  - `gerado_por_id = auth.uid()`, `gerado_em = now()`
  - Versionamento: se já existir geração anterior desse tipo/cliente, setar `documento_anterior_id` e propagar `documento_raiz_id` (raiz = 1ª geração).
- `documento_arquivo` recebe row com `documento_gerado_id = <novo>`, `area = 'osg'`, `caminho_arquivo` idem, `nome_arquivo = PSA_{Tipo}_{ClienteSlug}_{yyyymmdd}.pptx`.

### 2.7 Storage — bucket `osg-apresentacoes`

- **Privado, sem policies personalizadas**. Somente `service_role` acessa via SDK dentro da função.
- Autorização vive na função: valida JWT + role antes de gerar URL assinada (`createSignedUrl`, expiração 600s).
- Criar via `supabase--storage_create_bucket` (não via migration SQL).

---

## 3. Sequenciamento

1. **F0 — Infra**: bucket `osg-apresentacoes` (privado) + migration com seed em `tmpl_documento` + esqueleto da edge function (auth + carrega template + devolve intocado). Smoke.
2. **F1 — Helpers OOXML** (`_shared/ooxml/*`): zip, xml, runs, ids, timing, validate. Trocar só `{{CLIENTE}}/{{DATA}}` em ambos os templates. **Ponto de validação com você antes de F2.**
3. **F2 — Patrimonial completo**: 1 sociedade → N matrículas (clone `<a:tr>`); N sociedades → duplicação de slide + remap de imagens.
4. **F3 — Societária capa + organograma**: 4 faixas por posição, clone e distribuição horizontal, Rural removida.
5. **F4 — Societária quadro (multi-tabela por slide)**: 1 empresa centralizada; N empresas em layout 2-col; paginação por overflow real.
6. **F5 — Persistência + URL assinada + hook**: `documento_gerado`/`documento_arquivo`, signed URL, `useGerarApresentacao` já compatível.
7. **F6 — Validador + retries idempotentes** (`documento_anterior_id`), tratamento de "sem dados" (slide placeholder no lugar de dinâmicos).

Após aprovação, sigo direto F0→F1, paro em F1 para você validar o pptx com só CLIENTE/DATA trocados, e continuo até F6 sem re-aprovação.

---

## 4. Decisões — todas resolvidas conforme feedback

1. Persistência: **Opção A + seed em `tmpl_documento`** (2 linhas fixas).
2. Bucket: **`osg-apresentacoes` privado, sem policy** (autorização na função + signed URL).
3. Slides duplicados: **preservar template, só variar conteúdo**.
4. Faixa Atividade Rural: **ocultar** (remover shapes).
5. Nome: **`PSA_{Tipo}_{ClienteSlug}_{yyyymmdd}.pptx`**.
6. Localização: **posicional** (nada de nomes de shape).
7. Animações: **remover `p:timing`** (deck estático).

**Aberto (pergunta menor):** autorização por cluster do cliente (§2.5)? Padrão do plano é só `team_member+`. Confirmar sim/não antes de F0.

---

## 5. Riscos residuais

- Template evolui e muda o `top` das faixas do organograma → detecção posicional continua funcionando desde que a ordem vertical se mantenha; documentar tolerância.
- Muitos titulares numa matrícula → truncar em 5 com "e outros N" (configurável).
- Cliente sem `bem`/sem `quadro_societario` → gerar slide "Sem dados disponíveis" no lugar dos dinâmicos, sem falhar.
- Estritura do PowerPoint: qualquer XML inválido → validador pós-geração barra upload.

---

## 6. Fora de escopo

Editor visual, regeneração incremental, deck de Atividade Rural populado, assinatura digital/marca d'água.