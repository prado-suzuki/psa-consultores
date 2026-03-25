

## Plano: Expansao do Board — Novas paginas, migrations, Edge Functions e Dashboard Estrategico

Este plano expande o modulo Board com 3 migrations, 3 Edge Functions, 1 refatoracao do Dashboard e 3 novas paginas. Nenhuma rota, aba ou logica existente sera removida.

---

### Fase 1 — Migrations (4 execucoes)

**Migration 1:** Criar `ppr_regras_ciclo`, `comentarios_avaliacao`, `relatorios_gerados` com RLS conforme especificado no prompt.

**Migration 2:** Alterar tabela `metas` — adicionar colunas `ajuste_qualitativo_publico`, `recomendacao_decisao`, `ultima_atualizacao_membro`, `comentario_membro`.

**Migration 3:** Alterar `comentarios_avaliacao` — adicionar `lido boolean default false`, `lido_em timestamptz`.

**Migration 4:** Seed de regras PPR padrao para ciclo ativo (INSERT condicional).

---

### Fase 2 — Hooks de dados (5 novos hooks)

| Hook | Tabela | Descricao |
|------|--------|-----------|
| `usePprRegras` | `ppr_regras_ciclo` | CRUD regras PPR por ciclo |
| `useComentariosAvaliacao` | `comentarios_avaliacao` | Listar, criar, editar, marcar como lido |
| `useRelatoriosGerados` | `relatorios_gerados` | Listar historico, criar, atualizar status |
| `useMinhaEvolucao` | metas + feedbacks + reunioes + comentarios | Dados consolidados do usuario logado |
| `useDecisoesData` | metas + profiles + feedbacks + reunioes | Dados para pagina de decisoes |

Todos seguem o padrao existente: encapsulados em `src/hooks/`, com `useAuditLog.logAction` nas mutacoes, usando `as any` para tabelas nao tipadas.

---

### Fase 3 — Edge Functions (3 funcoes)

**`gerar-sintese-executiva`**: Busca projetos, tarefas, metas do ciclo, ROI. Monta prompt e chama Lovable AI (`google/gemini-3-flash-preview`). Retorna `{ sintese, bullets }`. Cacheia em `relatorios_gerados` por 6h.

**`gerar-recomendacoes-pessoas`**: Recebe `{ ciclo_id }`. Busca metas ponderadas, feedbacks, 1:1s por membro. Chama Lovable AI com tool calling para retornar JSON estruturado (array de recomendacoes). Salva em `relatorios_gerados`.

**`gerar-relatorio-individual`**: Recebe `{ member_id, ciclo_id, tipo }`. Busca todos os dados do membro e chama Lovable AI. Salva resultado em `relatorios_gerados`.

Todas validam JWT em codigo, usam `LOVABLE_API_KEY` + Lovable AI Gateway, e retornam erros 429/402 com mensagens claras.

---

### Fase 4 — Refatorar Dashboard (`BoardDashboard.tsx`)

Transformar de operacional para visao executiva estrategica:

- **Header**: "Visao Executiva — PSA Consultores", data + ciclo ativo, chips de status (projetos em risco, dias ate analise, ROI)
- **5 Strategic KPI cards** em grid: Projetos Ativos (com sparkline), Economia/Ano (ROI acumulado), Taxa Pontualidade, Metas do Ciclo, Membros Ativos — usando Syne 42px para valores, sparklines de 5 barras
- **AI Insight Box**: Chama `gerar-sintese-executiva` via `supabase.functions.invoke`, exibe sintese + 3 bullets
- **Grid 2 colunas**: Recharts BarChart (tarefas Tax/OSG/Dev 3 meses) + Recharts AreaChart (ROI acumulado vs meta)
- **Grid 2 colunas inferior**: Projetos Criticos (lista compacta com chips de decisao) + Ranking Performance (posicao, avatar, barra, % , chip PPR)

Dados vem dos hooks existentes: `usePerformanceData`, `useDesempenhoOverview`, `useCicloAtivo`, `useMetas`.

---

### Fase 5 — Expandir Metas e PPR (`DesempenhoMetas.tsx`)

Adicionar acima da arvore de metas existente:

- **Bloco Regras PPR**: Card com header escuro (gradiente), 4 linhas (Supera/Atende/Parcial/Abaixo) com faixas coloridas, barras, multiplicadores. Usa `usePprRegras`. Empty state com botao "Configurar regras" para admin/lider.
- **Coluna "Decisao"** nas linhas individuais: dropdown inline Promover/Reajustar/Monitorar/Manter → salva em `metas.recomendacao_decisao`
- **Botao "Classificar"** condicional quando ciclo em `em_avaliacao`

Toda logica existente de filtros, modais e arvore permanece intacta.

---

### Fase 6 — Nova pagina Decisoes (`DesempenhoDecisoes.tsx`)

Rota: `/equipe/board/desempenho/decisoes`

- **AI Synthesis box**: Chama `gerar-recomendacoes-pessoas`, exibe texto de sintese
- **Cards de recomendacao**: Um por membro, fundo/borda por tipo (Promocao verde, Reajuste ambar, Acompanhamento vermelho). Header com avatar, nome, chip. Metricas: PPR, historico, feedbacks. Botoes "Confirmar decisao" e "Ignorar"
- **Modal de confirmacao**: Radio tipo, campo cargo/percentual condicional, data vigencia, observacoes. Salva em `metas.recomendacao_decisao` + cria `comentarios_avaliacao`

---

### Fase 7 — Nova pagina Relatorios (`DesempenhoRelatorios.tsx`)

Rota: `/equipe/board/desempenho/relatorios`

- **Controles**: Dropdowns membro, ciclo, tipo + "Gerar com IA" + "Exportar PDF"
- **Historico**: Lista compacta de relatorios ja gerados com botao "Carregar"
- **Painel gerado**: Header escuro com avatar, metricas. Corpo em 2 colunas: esquerda (dimensoes + historico ciclos), direita (pontos fortes + desenvolvimento + recomendacao RH). Rodape com confidencialidade.
- **Skeleton** durante geracao

---

### Fase 8 — Nova pagina Minha Evolucao (`MinhaEvolucao.tsx`)

Rota: `/equipe/board/desempenho/minha-evolucao` — acessivel a todos os papeis (nao apenas admin/lider).

- **Header escuro**: Avatar, nome, cargo, classificacao PPR, 6 metricas inline
- **Seletor de ciclo**: Dropdown padrao ciclo ativo
- **Minhas Metas**: Lista com botao "Atualizar progresso" por meta (modal slider + comentario). Bloco PPR calculado com tabela Meta/Peso/Contribuicao
- **Consideracoes do Lider**: Comentarios `lider_para_membro`, indicador nao lido, area de resposta `membro_resposta`
- **Meus Pontos de Vista**: Textarea para `membro_ponto_vista`, lista dos existentes, edicao ate encerramento
- **Historico PPR**: Recharts LineChart por ciclo encerrado
- **Feedbacks Recebidos**: Lista expansivel dos ultimos 5

---

### Fase 9 — Sidebar e Rotas

**BoardLayout.tsx** — Atualizar sidebar:

- Renomear grupo "Visao Geral" → "Diretoria" com label "Dashboard Estrategico"
- Grupo "Gerencial": Performance + Desempenho com sub-itens expandidos (Visao Geral, Metas e PPR, Decisoes com badge, Relatorios, Evolucao, Feedbacks, 1:1s)
- Novo grupo "Minha Area": item "Minha Evolucao" com badge ambar (comentarios nao lidos ou metas vencidas)
- Breadcrumb: adicionar mapeamentos para novas rotas

**App.tsx** — Adicionar 3 rotas:
```
/equipe/board/desempenho/decisoes → DesempenhoAccessGate
/equipe/board/desempenho/relatorios → DesempenhoAccessGate
/equipe/board/desempenho/minha-evolucao → TeamRoute (sem DesempenhoAccessGate)
```

**protectedPages.ts** — Registrar 3 novas paginas na categoria `board`.

---

### Fase 10 — CSS e Visual

Atualizar `src/index.css` com classes v3 do HTML de referencia:
- Variaveis atualizadas: `--board-sb: #0A1020`, novas cores `--board-cyan`, `--board-gold`
- Classes: `.board-strategic-num`, `.board-sparkline`, `.board-ppr-hero`, `.board-cycle-bar`, `.board-rec-box`, `.board-self-header`, `.board-comment-box`, `.board-rule-row`, `.board-report`
- Estilos de decisao cards, report preview, sentiment dots

---

### Arquivos criados/modificados

| Acao | Arquivo |
|------|---------|
| Migration | 4 migrations SQL |
| Criar | `src/hooks/usePprRegras.ts` |
| Criar | `src/hooks/useComentariosAvaliacao.ts` |
| Criar | `src/hooks/useRelatoriosGerados.ts` |
| Criar | `src/hooks/useMinhaEvolucao.ts` |
| Criar | `src/hooks/useDecisoesData.ts` |
| Criar | `supabase/functions/gerar-sintese-executiva/index.ts` |
| Criar | `supabase/functions/gerar-recomendacoes-pessoas/index.ts` |
| Criar | `supabase/functions/gerar-relatorio-individual/index.ts` |
| Criar | `src/pages/gerencial/desempenho/DesempenhoDecisoes.tsx` |
| Criar | `src/pages/gerencial/desempenho/DesempenhoRelatorios.tsx` |
| Criar | `src/pages/gerencial/desempenho/MinhaEvolucao.tsx` |
| Editar | `src/pages/equipe/board/BoardDashboard.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoMetas.tsx` |
| Editar | `src/components/equipe/board/BoardLayout.tsx` |
| Editar | `src/App.tsx` |
| Editar | `src/config/protectedPages.ts` |
| Editar | `src/index.css` |
| Config | `supabase/config.toml` (3 novas funcoes) |

### O que NAO muda
- Nenhuma rota existente
- Nenhum hook existente (useMetas, useFeedbacks, useReunioes, etc.)
- Nenhuma tabela existente (apenas colunas adicionadas via migration)
- Paginas de Performance, Ciclos, Visao Geral, Feedbacks, 1:1s, Evolucao existentes
- Todo o sistema fora do modulo Board

