


## Plano: Adicionar useAuditLog + substituir confirm() — ✅ CONCLUÍDO

### Alterações realizadas

| Arquivo | Alterações |
|---|---|
| `useAuditLog.ts` | Expandidos union types: `area` (+estrutura, cadastros, dev) e `entity_type` (+13 novos tipos) |
| `EstruturaManager.tsx` | +useAuditLog com logAction em 10 ops CUD, +AlertDialog substituindo 3 confirm(), +estado deleteConfirm |
| `CadastroCategorias.tsx` | +useAuditLog em cada sub-tab (4 tabs), +AlertDialog substituindo 4 confirm(), +estado deleteTarget por tab |
| `NewClientModal.tsx` | +useAuditLog com logAction em executeSave (~8 pontos: cliente, contribuintes, participantes, OS) |

Nenhuma alteração em banco, RLS ou outras tabelas.

## Plano: Fase 2 — Extrair dicionários para useClientFormOptions — ✅ CONCLUÍDO

| Arquivo | Alterações |
|---|---|
| `src/hooks/useClientFormOptions.ts` | Criado: centraliza 7 useQuery + 2 useMemo de dados de dicionário |
| `NewClientModal.tsx` | Removidas ~80 linhas de queries inline, consumo via hook |

## Plano: Fase 3 — Extrair loadData para useClientEditData — ✅ CONCLUÍDO

| Arquivo | Alterações |
|---|---|
| `src/types/clientForm.ts` | Criado: DraftEntity, DraftParticipant, DraftOrdemServico, DraftContract, InscricaoIE |
| `src/hooks/useClientEditData.ts` | Criado: hook com useQuery que busca cliente, contribuintes, inscrições, participantes, OS e distribuição de receita |
| `NewClientModal.tsx` | Removidas ~150 linhas do useEffect loadData + tipos locais, consumo via hook + useEffect curto de sync |

## Plano: Fase 4 — Extrair consultas externas (CNPJ/CEP) — ✅ CONCLUÍDO

| Arquivo | Alterações |
|---|---|
| `src/hooks/useExternalConsults.ts` | Criado: hook com consultarCnpj (BrasilAPI) e consultarCep (ViaCEP), funções puras de fetch sem side effects |
| `NewClientModal.tsx` | Removidos 4 blocos de fetch inline, substituídos por chamadas ao hook; import + desestruturação adicionados |

## Plano: Fase 5 — Extrair executeSave para useSaveClientTransaction — ✅ CONCLUÍDO

| Arquivo | Alterações |
|---|---|
| `src/hooks/useSaveClientTransaction.ts` | Criado: hook com useMutation contendo toda a transação CUD (6 tabelas), rollback, audit logs, sync DW, invalidação de queries. Exporta também `generateNextOsNumber` e `checkDuplicateName` |
| `NewClientModal.tsx` | Removidas ~345 linhas (executeSave + syncCadastrosToDW + generateNextOsNumber + imports não usados). Adicionado consumo do hook via `doSave()` + `AlertDialog` para nome duplicado substituindo `window.confirm` |

## Plano: Fase 6.5 — Extração da Aba "Participantes" (ParticipantesTab) — ✅ CONCLUÍDO

| Arquivo | Alterações |
|---|---|
| `src/components/equipe/fiscal/client-form/ParticipantesTab.tsx` | Criado: componente com formulário de criação, lista expansível com edição inline, AlertDialogs, FieldPair local |
| `NewClientModal.tsx` | Removidas ~370 linhas de JSX, substituídas por `<ParticipantesTab />` com 15 props; adicionado import |

Props: participants, setParticipants, draftParticipant, setDraftParticipant, expandedParticipantId, setExpandedParticipantId, editingParticipantId, editingParticipantData, setEditingParticipantData, onAdd, onStartEdit, onCancelEdit, onSaveEdit, isReadOnly.
Nenhuma alteração em banco, RLS ou outras tabelas.

## Plano: Fase 6.6 — Extração da Aba "Contribuintes" (ContribuintesTab) — ✅ CONCLUÍDO

| Arquivo | Alterações |
|---|---|
| `src/components/equipe/fiscal/client-form/ContribuintesTab.tsx` | Criado: componente com lista expansível, edição inline, formulário de novo contribuinte, gestão de IE (draft + edição), AlertDialogs, FieldPair local |
| `NewClientModal.tsx` | Removidas ~995 linhas de JSX, substituídas por `<ContribuintesTab />` com 25 props; removidos imports `Copy`, `Search`; adicionado import |

Props: entities, setEntities, draftEntity, setDraftEntity, inscricoesMap, setInscricoesMap, draftInscricoes, setDraftInscricoes, expandedEntityId, setExpandedEntityId, editingEntityId, editingEntityData, setEditingEntityData, cnpjLoading, cepLoading, onAdd, onCnpjBlur, onCepBlur, onInlineCnpjBlur, onInlineCepBlur, onStartEdit, onCancelEdit, onSaveEdit, onCopyFirstAddress, isReadOnly.
Nenhuma alteração em banco, RLS ou outras tabelas.

## Plano: Fase 6.7 — Extração da Aba "Contratos / OS" (ContratosTab) — ✅ CONCLUÍDO

| Arquivo | Alterações |
|---|---|
| `src/components/equipe/fiscal/client-form/ContratosTab.tsx` | Criado: componente com lista expansível de OS, edição inline, formulário Nova OS, seleção de serviço agrupada por cluster, distribuição de receita (DistribuicaoReceita sub-componente), AlertDialogs, FieldPair local, formatCurrencyDisplay local, ServiceSelectItems helper |
| `NewClientModal.tsx` | Removidas ~880 linhas de JSX, substituídas por `<ContratosTab />` com 27 props. Removidos imports não usados: `Input`, `Label`, `Select*`, `Switch`, `Checkbox`, `Badge`, `Textarea`, `RequiredMark`, `Tag`, `Save`, `Trash2`, `ChevronDown`, `formatCpfCnpj`, `formatCep`, `formatPhone`, `FieldPair`, `formatCurrencyDisplay`, `DateFieldWithInput`, `CurrencyField`, constantes de `constants.ts`. Modal reduzido de ~2040 para ~1153 linhas |

Nenhuma alteração em banco, RLS ou outras tabelas.
O NewClientModal agora é um orquestrador limpo: todas as 5 abas são componentes isolados em `client-form/`.

## Plano: Fase 4 — Simplificar RLS policies (eliminar JOIN com tax_areas) — ✅ CONCLUÍDO

| Policy | Tabela | Alteração |
|---|---|---|
| Members can view their tax_projects | `tax_projects` | Removido `EXISTS + JOIN tax_areas`, usa `tax_projects.estrutura_area_id` direto |
| Members can view their project fiscal_tasks | `fiscal_tasks` | Removido `JOIN tax_areas ta ON ta.id = tp.area_id`, usa `tp.estrutura_area_id` direto |

Nenhum arquivo frontend alterado. Nenhuma tabela/coluna dropada. Função `is_area_member()` intacta.

## Plano: Unificar DLP em único AlertDialog inteligente — ✅ CONCLUÍDO

| Arquivo | Alteração |
|---|---|
| `src/hooks/useDraftGuard.ts` | **Novo** — hook com estado `interceptedAction`, funções `guard`, `dismiss`, `proceed`, `pendingTabs` computado |
| `src/components/equipe/fiscal/NewClientModal.tsx` | Removidos `showExitConfirm`, `showDraftWarning`, `draftWarningContext`, `checkDraftAndNavigate`, `handleDraftWarningContinue`, `handleDraftWarningGoBack`, `clearCurrentDraft`. Adicionado consumo do hook `useDraftGuard` + `guardedNavigate` + `handleGuardProceed`. 2 AlertDialogs substituídos por 1 único com Badges dinâmicas |

Nenhuma alteração em banco, RLS ou outras tabelas.
