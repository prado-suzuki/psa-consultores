

## Plano: Reestruturar Board Layout + Completar Desempenho + Dashboard Funcional

Este plano cobre a unificação do layout, eliminação do DesempenhoLayout, ativação do Dashboard com dados reais, e completude das ~15 funcionalidades faltantes do Desempenho. Dado o volume, será implementado em lotes sequenciais.

---

### Migration necessária

Adicionar coluna `dashboard_layout` na tabela `performance_preferencias`:

```sql
ALTER TABLE performance_preferencias
  ADD COLUMN IF NOT EXISTS dashboard_layout jsonb DEFAULT '{}';
```

---

### Lote 1 — Novo BoardLayout unificado + Remoção do DesempenhoLayout

**Arquivos:** `BoardLayout.tsx` (reescrever), deletar `DesempenhoLayout.tsx`, atualizar 6 páginas Desempenho + PerformanceDashboard

Novo `BoardLayout.tsx`:
- Sidebar escura (#0F172A) com 240px desktop, 64px (ícones) em tablet, drawer em mobile
- Topo: nome do sistema + card do usuário (avatar iniciais, nome, papel)
- Nav com labels de grupo uppercase 11px (#475569): "VISAO GERAL" (Dashboard) e "GERENCIAL" (Performance, Desempenho com sub-itens)
- Sub-itens do Desempenho (Visão Geral, Ciclos, Metas, Feedbacks, 1:1s, Evolução) auto-expandem quando rota contém `/desempenho/`, indentados 16px, indicador indigo 2px na esquerda para ativo
- Itens Performance/Desempenho condicionais a `isAdmin || isLider`
- Rodapé: "Voltar ao Portal" → `/equipe/`
- Header interno branco com breadcrumb + título + headerActions
- Conteúdo com padding 32/24/16px por breakpoint
- Responsividade: ≥1280px sidebar fixa, 768-1279 colapsada com hover, <768 drawer

**Atualizar 8 páginas** para trocar `<DesempenhoLayout>` por `<BoardLayout>`:
- `DesempenhoVisaoGeral.tsx`, `DesempenhoCiclos.tsx`, `DesempenhoMetas.tsx`, `DesempenhoFeedbacks.tsx`, `DesempenhoReunioes1a1.tsx`, `DesempenhoEvolucao.tsx`
- `PerformanceDashboard.tsx` (já usa BoardLayout, manter)

---

### Lote 2 — Dashboard funcional (`BoardDashboard.tsx`)

Reescrever o placeholder com dados reais via hooks existentes (`usePerformanceData`, `useDesempenhoOverview`, `useCicloAtivo`):

- Header: saudação + data + "atualizado agora"
- 4 KPI cards: Projetos ativos (sub: em dia/risco/atrasados), Tarefas abertas vs concluídas (30d), Chamados abertos vs resolvidos, Membros ativos 7d
- Bloco "Projetos em risco": top 5 projetos com status em_risco/atrasado, link para Performance
- Bloco "Próximas entregas críticas": 5 tarefas mais urgentes não concluídas
- Bloco "Metas do ciclo ativo": nome do ciclo + progresso temporal + 3 métricas inline; empty state se sem ciclo
- Bloco "Atividade recente": últimas 10 ações do audit_log
- Botão "Personalizar" (Settings2) → modo edição com drag handles, toggle visibilidade, salvar em `performance_preferencias.dashboard_layout`

---

### Lote 3 — Completar funcionalidades do Desempenho

**3.1 Visão Geral — Alertas + contagens**
- Novo bloco "Alertas" em `DesempenhoVisaoGeral.tsx`: metas com prazo <15d e progresso <50%, itens ação abertos >30d, membros sem 1:1 >30d, análise semestral pendente <15d
- Expandir `useDesempenhoOverview.ts` para retornar dados de alertas
- Adicionar contagem de feedbacks e 1:1s nos cards individuais (queries adicionais para feedbacks e reunioes filtrados por ciclo)

**3.2 Ciclos — Drill-down + Análise Semestral**
- Em `DesempenhoCiclos.tsx`: ao clicar linha, abrir Sheet (drawer 480px) com resumo de metas por nível/dimensão, gauge RadialBarChart, barra temporal, botão "Encerrar ciclo" (valida classificação_final), botão "Abrir análise semestral"
- Modal de análise semestral: dropdown de membro, 5 textareas, "Salvar e próximo", indicador "Membro 1 de N"
- Hook `useAnalisesSemestrais` já existe — usar para criar/atualizar

**3.3 Metas — Filtros + KPIs + Classificação + Editar/Arquivar**
- Adicionar filtros: responsável (dropdown profiles), status (Ativa/Pausada/Concluída/Cancelada)
- Modal Nova Meta: seção expansível "KPIs vinculados" com "+ Adicionar KPI" (nome, valor alvo, unidade, valor atual)
- Modal de classificação final: radio 4 opções, ajuste qualitativo obrigatório se diferir da calculada
- Menu MoreHorizontal por linha: "Editar" (pré-preenche modal), "Arquivar" (confirm → status cancelada)
- Hook `useKpisMeta` já existe — usar para CRUD de KPIs

**3.4 Feedbacks — Expansão na aba Por Membro**
- Em `DesempenhoFeedbacks.tsx` aba "Por membro": tornar cada item expansível com contexto/comportamento/impacto completos

**3.5 1:1s — Contagem itens abertos + itens por reunião + agrupamento**
- Cards de membros: adicionar badge com itens abertos (âmbar se >0)
- Histórico por membro: cada reunião mostra itens de ação com descrição, responsável, prazo, status (chip colorido), prazo vencido em vermelho
- Painel de itens abertos no topo: agrupar por membro com header de nome

**3.6 Evolução — Ajuste qualitativo + taxa conclusão**
- Bloco PPR: campo textarea editável "Ajuste qualitativo do líder" → salva em `metas.ajuste_qualitativo`
- Bloco Cadência 1:1s: métrica "Taxa de conclusão de itens de ação" (concluídos/total) com barra de progresso

---

### Lote 4 — Padronização visual

- Remover emojis do sentimento em 1:1s (`sentimentEmojis` → labels textuais com cores)
- Padronizar em todos os componentes Board:
  - Fundos: páginas #F8FAFC, cards #FFFFFF com border-radius 12px, sombra 0 1px 3px rgba(0,0,0,0.08)
  - Hover: sombra 0 4px 12px rgba(0,0,0,0.12), transition 0.2s
  - Labels grupo: 11px uppercase, letter-spacing 0.08em, #64748B
  - Títulos bloco: 15px semibold, #0F172A
  - Chips dimensão: Entrega #3B82F6, Impacto #10B981, Gestão #8B5CF6 — fundo 12% opacidade
  - Barras progresso: verde ≥85%, âmbar 70-84%, vermelho <70%, 6px altura
  - Estados vazios: ícone 32px #CBD5E1, texto 14px #64748B, sem emojis

---

### Arquivos afetados (resumo)

| Arquivo | Ação |
|---------|------|
| `src/components/equipe/board/BoardLayout.tsx` | Reescrever completo |
| `src/components/desempenho/DesempenhoLayout.tsx` | Deletar |
| `src/pages/equipe/board/BoardDashboard.tsx` | Reescrever com dados reais |
| `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` | Alertas + contagens + trocar layout |
| `src/pages/gerencial/desempenho/DesempenhoCiclos.tsx` | Drill-down + análise semestral + trocar layout |
| `src/pages/gerencial/desempenho/DesempenhoMetas.tsx` | Filtros + KPIs + classificação + editar/arquivar + trocar layout |
| `src/pages/gerencial/desempenho/DesempenhoFeedbacks.tsx` | Expansão por membro + trocar layout |
| `src/pages/gerencial/desempenho/DesempenhoReunioes1a1.tsx` | Itens por membro/reunião + remover emojis + trocar layout |
| `src/pages/gerencial/desempenho/DesempenhoEvolucao.tsx` | Ajuste qualitativo + taxa conclusão + trocar layout |
| `src/hooks/useDesempenhoOverview.ts` | Expandir com dados de alertas |
| `src/App.tsx` | Sem alteração (rotas já corretas) |

### O que NAO muda
- Nenhuma rota existente
- Nenhum hook de dados base (useCiclosAvaliacao, useMetas, useFeedbacks, useReunioes1a1, useKpisMeta, useAnalisesSemestrais)
- Nenhuma tabela (apenas 1 coluna adicionada via migration)
- Performance module (PerformanceDashboard + blocos) permanece intacto
- Todo o restante do sistema fora do Board

