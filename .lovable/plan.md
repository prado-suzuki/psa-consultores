

## Módulo Desempenho — /gerencial/desempenho/

### Escopo
Novo módulo completo de gestão de performance com 8 tabelas, 6 páginas, múltiplos modais e gráficos Recharts. Acesso exclusivo Admin + Líder.

### Nota sobre rotas
O sistema existente usa `/gestao/` para o módulo gerencial. As rotas `/gerencial/desempenho/` serão criadas como rotas independentes, protegidas por um novo `DesempenhoAccessGate` que valida `isAdmin || isLider`.

---

### 1. Migration SQL (1 arquivo)

Criar as 8 tabelas com RLS usando `has_role()` (não `auth.role()` genérico):

- `ciclos_avaliacao` — ciclos de avaliação
- `metas` — metas hierárquicas (empresa/equipe/individual)
- `kpis_meta` — KPIs vinculados a metas
- `atualizacoes_meta` — histórico de progresso
- `analises_semestrais` — análises semestrais por membro
- `feedbacks` — feedbacks contínuos
- `reunioes_1a1` — registros de reuniões 1:1
- `itens_acao_1a1` — itens de ação das 1:1s

Políticas RLS para todas: SELECT/INSERT/UPDATE/DELETE restrito a `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lider')`.

Triggers `update_updated_at_column` em todas as tabelas com `updated_at`.

---

### 2. Controle de acesso

**`DesempenhoAccessGate`** (`src/components/desempenho/DesempenhoAccessGate.tsx`):
- Verifica `isAdmin || isLider` do AuthContext
- Se não autorizado, redireciona para `/equipe/digital` silenciosamente
- Se não logado, mostra tela de login (reutiliza padrão GestaoAccessGate)

---

### 3. Layout e navegação

**`DesempenhoLayout`** (`src/components/desempenho/DesempenhoLayout.tsx`):
- Sidebar com 6 itens: Visão Geral, Ciclos, Metas, Feedbacks, 1:1s, Evolução
- Ícone `Target` no header
- Mesmo padrão visual do GestaoLayout (sidebar colapsável, header com ações)

**`GestaoLayout.tsx`** — adicionar item "Desempenho" (ícone `Target`) no `navItems`, visível apenas para admin/lider (verificação via useAuth).

---

### 4. Hooks (novos arquivos em `src/hooks/`)

| Hook | Responsabilidade |
|------|-----------------|
| `useCiclosAvaliacao.ts` | CRUD ciclos + encerramento |
| `useMetasDesempenho.ts` | CRUD metas + atualização progresso + classificação |
| `useKpisMeta.ts` | CRUD KPIs vinculados a metas |
| `useFeedbacksDesempenho.ts` | CRUD feedbacks |
| `useReunioes1a1.ts` | CRUD reuniões + itens de ação |
| `useAnalisesSemestrais.ts` | CRUD análises semestrais |
| `useDesempenhoOverview.ts` | Dados agregados para Visão Geral |

Todos com `useAuditLog.logAction` nas mutações.

---

### 5. Páginas (em `src/pages/gerencial/desempenho/`)

| Página | Rota | Conteúdo |
|--------|------|----------|
| `DesempenhoVisaoGeral.tsx` | `/gerencial/desempenho/` | KPIs, metas equipe, progresso individual, alertas |
| `DesempenhoCiclos.tsx` | `/gerencial/desempenho/ciclos/` | Tabela ciclos, modal novo ciclo, detalhe com gauge |
| `DesempenhoMetas.tsx` | `/gerencial/desempenho/metas/` | Árvore hierárquica, filtros, modais CRUD/progresso/classificação |
| `DesempenhoFeedbacks.tsx` | `/gerencial/desempenho/feedbacks/` | Duas abas, tabela, modal registro |
| `DesempenhoReuniones1a1.tsx` | `/gerencial/desempenho/1a1/` | Grid membros, histórico, modal registro, painel ações |
| `DesempenhoEvolucao.tsx` | `/gerencial/desempenho/evolucao/` | Gráficos Recharts, heatmap, projeção PPR |

---

### 6. Componentes (em `src/components/desempenho/`)

- `DesempenhoAccessGate.tsx` — controle de acesso
- `DesempenhoLayout.tsx` — layout com sidebar
- `CicloFormModal.tsx` — criar/editar ciclo
- `CicloDetailModal.tsx` — detalhe com gauge e análise semestral
- `MetaFormModal.tsx` — criar/editar meta com KPIs
- `MetaProgressModal.tsx` — atualizar progresso
- `MetaClassificacaoModal.tsx` — classificação final
- `AnaliseSemestralModal.tsx` — análise semestral por membro
- `FeedbackFormModal.tsx` — registrar feedback
- `Reuniao1a1FormModal.tsx` — registrar 1:1 com itens de ação
- `PPRProjectionCard.tsx` — card de projeção PPR
- `ContributionHeatmap.tsx` — heatmap estilo GitHub

---

### 7. Rotas em `App.tsx`

6 novas rotas, todas protegidas por `DesempenhoAccessGate`:

```
/gerencial/desempenho/ → DesempenhoVisaoGeral
/gerencial/desempenho/ciclos/ → DesempenhoCiclos
/gerencial/desempenho/metas/ → DesempenhoMetas
/gerencial/desempenho/feedbacks/ → DesempenhoFeedbacks
/gerencial/desempenho/1a1/ → DesempenhoReuniones1a1
/gerencial/desempenho/evolucao/ → DesempenhoEvolucao
```

---

### 8. Registro em `protectedPages.ts`

6 entradas com category `'gestao'`, `requires_admin: false`, `requires_team_member: true`.

---

### 9. `useAuditLog.ts`

Adicionar entity types: `'ciclo_avaliacao'`, `'meta'`, `'kpi_meta'`, `'feedback'`, `'reuniao_1a1'`, `'analise_semestral'`.

---

### Arquivos afetados (resumo)

| Ação | Arquivo |
|------|---------|
| Novo | Migration SQL (8 tabelas) |
| Novo | `src/components/desempenho/DesempenhoAccessGate.tsx` |
| Novo | `src/components/desempenho/DesempenhoLayout.tsx` |
| Novo | `src/components/desempenho/CicloFormModal.tsx` |
| Novo | `src/components/desempenho/CicloDetailModal.tsx` |
| Novo | `src/components/desempenho/MetaFormModal.tsx` |
| Novo | `src/components/desempenho/MetaProgressModal.tsx` |
| Novo | `src/components/desempenho/MetaClassificacaoModal.tsx` |
| Novo | `src/components/desempenho/AnaliseSemestralModal.tsx` |
| Novo | `src/components/desempenho/FeedbackFormModal.tsx` |
| Novo | `src/components/desempenho/Reuniao1a1FormModal.tsx` |
| Novo | `src/components/desempenho/PPRProjectionCard.tsx` |
| Novo | `src/components/desempenho/ContributionHeatmap.tsx` |
| Novo | `src/hooks/useCiclosAvaliacao.ts` |
| Novo | `src/hooks/useMetasDesempenho.ts` |
| Novo | `src/hooks/useKpisMeta.ts` |
| Novo | `src/hooks/useFeedbacksDesempenho.ts` |
| Novo | `src/hooks/useReunioes1a1.ts` |
| Novo | `src/hooks/useAnalisesSemestrais.ts` |
| Novo | `src/hooks/useDesempenhoOverview.ts` |
| Novo | `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` |
| Novo | `src/pages/gerencial/desempenho/DesempenhoCiclos.tsx` |
| Novo | `src/pages/gerencial/desempenho/DesempenhoMetas.tsx` |
| Novo | `src/pages/gerencial/desempenho/DesempenhoFeedbacks.tsx` |
| Novo | `src/pages/gerencial/desempenho/DesempenhoReuniones1a1.tsx` |
| Novo | `src/pages/gerencial/desempenho/DesempenhoEvolucao.tsx` |
| Editar | `src/App.tsx` (6 rotas) |
| Editar | `src/components/gestao/GestaoLayout.tsx` (1 item sidebar condicional) |
| Editar | `src/config/protectedPages.ts` (6 entradas) |
| Editar | `src/hooks/useAuditLog.ts` (entity types) |

### O que NÃO muda
- Nenhuma aba, rota ou componente existente é alterado funcionalmente
- Nenhuma tabela existente é modificada
- GestaoAccessGate permanece inalterado
- Todas as rotas `/gestao/*` continuam funcionando normalmente

### Estratégia de implementação
Devido ao volume (~30 arquivos novos), a implementação será dividida em 3 blocos sequenciais:
1. **Bloco 1**: Migration + Access Gate + Layout + Hooks + Rotas
2. **Bloco 2**: Páginas Visão Geral + Ciclos + Metas (com todos os modais)
3. **Bloco 3**: Páginas Feedbacks + 1:1s + Evolução (com gráficos Recharts)

