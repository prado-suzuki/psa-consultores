

## Plano: Ajustar visual do Board para match com o HTML v2

O HTML de referencia define uma paleta e um sistema de design bem especifico. As mudancas sao puramente visuais — nenhuma logica de dados ou rota sera alterada.

### Principais diferencas visuais identificadas

1. **Paleta de cores** — O HTML usa tons mais frios e profundos: sidebar `#0C1222` (vs `#0F172A` atual), textos `#3D4D6A` / `#7A8BA8` / `#A8B8CC`, borders `#E4EAF2` / `#F0F4F8`, fundo `#F0F4F8` (vs `#F8FAFC`), indigo `#5B6EF0` (vs `#6366F1`)
2. **Tipografia** — Titulos usam fonte `Syne` (bold, letter-spacing negativo), corpo usa `DM Sans`, dados mono usam `DM Mono`
3. **KPI cards** — Barra colorida no topo (3px), icone em caixa com fundo suave, valor grande em Syne, label uppercase 11px, sub-indicadores com dots coloridos, trend badges
4. **Sidebar** — Radial gradient decorativo no canto inferior, marca com icone quadrado indigo, sub-itens com borda-esquerda e indicador vertical na ativo, badges de contagem, font-sizes menores
5. **Topbar** — Altura 52px (vs 64px), estilo de breadcrumb mais compacto
6. **Cards** — Shadow `0 1px 4px rgba(12,18,34,.07), 0 0 0 1px rgba(12,18,34,.04)`, hover com shadow-md e translateY(-1px)
7. **AI Insight Box** — Gradiente indigo/purple sutil, icone de sol, bullets com dot indigo
8. **Alerts** — Border-left 3px colorido, fundo suave por severidade
9. **Progress bars** — Fundo `#E8EFF7`, cores: green `#16A97C`, amber `#E8930A`, red `#E5424A`
10. **Tabelas** — Thead com fundo `#FAFCFF`, th uppercase 10px, hover `#F7FAFF`

---

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `index.html` | Adicionar fontes Syne, DM Sans, DM Mono via Google Fonts |
| `src/index.css` | Adicionar CSS variables do board v2 (cores, shadows, radii) e classes utilitarias `.board-*` |
| `src/components/equipe/board/BoardLayout.tsx` | Aplicar paleta v2 na sidebar (cores, radial gradient, font sizes, topbar 52px, breadcrumb compacto) |
| `src/pages/equipe/board/BoardDashboard.tsx` | Reescrever KPIs para match v2 (barra topo, dots, trends), adicionar AI Insight box, ajustar cards de projetos/atividade, feed items com avatares |
| `src/pages/gerencial/performance/PerformanceDashboard.tsx` | Ajustar barra de controles para estilo `.pctrl` do v2, segmented buttons |
| `src/components/performance/PerformanceKPICards.tsx` | Aplicar estilo KPI v2 com barra topo, sparks, font Syne nos valores |
| `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` | Aplicar KPI v2, AI box, alertas com border-left, member cards com stats (Metas/Feedbacks/1:1s), progress bars v2 |
| `src/pages/gerencial/desempenho/DesempenhoCiclos.tsx` | Cycle bar escura (gradient `#0C1222` → `#172038`), 3 cards de contagem centralizados com Syne, tabela com estilo v2 |
| `src/pages/gerencial/desempenho/DesempenhoMetas.tsx` | Tree rows com niveis (l0/l1/l2, indentation), filtros com estilo `.fi`, chips de dimensao, progress inline |
| `src/pages/gerencial/desempenho/DesempenhoFeedbacks.tsx` | AI box de feedbacks, chart SVG de distribuicao, tabela com avatares em row |
| `src/pages/gerencial/desempenho/DesempenhoReunioes1a1.tsx` | Alert bar de itens abertos, member cards `.oc` com botao primario para urgente, historico com barras de sentimento (5 segmentos indigo), item de acao com chips coloridos |
| `src/pages/gerencial/desempenho/DesempenhoEvolucao.tsx` | PPR hero card com gradient por classificacao, dims com barras brancas, charts com gradients SVG, heatmap de 1:1s, ajuste qualitativo em caixa bg |

### Detalhes de implementacao

**Fontes** — Adicionar no `<head>` do `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300..600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**CSS Variables** — Adicionar bloco `:root` no `index.css` com todas as variaveis do HTML v2 (prefixadas com `--board-*` para nao conflitar):
```css
--board-sb: #0C1222;
--board-indigo: #5B6EF0;
--board-green: #16A97C;
--board-amber: #E8930A;
--board-red: #E5424A;
--board-bg: #F0F4F8;
--board-border: #E4EAF2;
--board-t1: #0C1222;
--board-t2: #3D4D6A;
--board-t3: #7A8BA8;
--board-t4: #A8B8CC;
--board-shadow: 0 1px 4px rgba(12,18,34,.07), 0 0 0 1px rgba(12,18,34,.04);
--board-shadow-md: 0 4px 16px rgba(12,18,34,.1), 0 0 0 1px rgba(12,18,34,.04);
```

**BoardLayout** — Sidebar usa `#0C1222`, pseudo-element radial gradient no fundo, marca com caixa indigo `#5B6EF0`, user card com gradiente, nav items 13px com `#6B7FA3`, ativo com `#1A2540` + barra 3px indigo, sub-items com `border-left: 1px solid rgba(255,255,255,.08)`, topbar 52px, breadcrumb 12px.

**KPI Cards** — Componente reutilizavel com: barra topo 3px colorida, icone em caixa 32px com fundo suave, valor em font-family Syne 26px bold, label 11px uppercase, sub-items com dot 5px, trend badge pill.

**AI Insight Box** — Componente reutilizavel: `background: linear-gradient(135deg, rgba(91,110,240,.06), rgba(128,84,240,.06))`, border `rgba(91,110,240,.18)`, label com icone SVG, bullets com `::before` dot indigo.

**Cards** — Border `1px solid #F0F4F8`, shadow v2, hover com shadow-md + `translateY(-1px)`, border-radius 12px.

### O que NAO muda
- Nenhuma rota, hook, query ou logica de dados
- Nenhuma funcionalidade existente
- Nenhum arquivo fora do modulo Board
- Estrutura de navegacao e controle de acesso

