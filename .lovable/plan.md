

## Correção de UX e Restauração de Dados — NewClientModal

### Fase 1: Correção de UX/UI (Prevenção)

**Arquivos alterados: 4**

---

#### 1.1 Botão Salvar com bloqueio + Tooltip — `src/components/equipe/NewClientModal.tsx`

- Importar `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` de `@/components/ui/tooltip`
- Computar `pendingDraftTabs = getDraftPendingTabs()` via `useMemo`
- Derivar `hasPendingDrafts = pendingDraftTabs.length > 0`
- No footer, adicionar `disabled={saving || hasPendingDrafts}` ao botão "Salvar"
- Envolver o botão em `<TooltipProvider><Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent>` com mensagem dinâmica: `"Dados não adicionados em: {pendingDraftTabs.join(', ')}. Adicione-os à lista antes de salvar."`
- O tooltip só aparece quando `hasPendingDrafts` (usar `open={hasPendingDrafts ? undefined : false}` para desabilitar quando não há pendência)

#### 1.2 Simplificar fluxo de alerta de rascunho

- Remover a lógica de `draftWarningContext.action === "save"` do `handleSave` e do `handleDraftWarningContinue` — com o botão bloqueado, o cenário "salvar com rascunho" não acontece mais
- O `handleSave` passa a chamar `executeSave()` diretamente (sem checar `getDraftPendingTabs`)
- Manter o `showDraftWarning` apenas para navegação entre abas (action `"navigate"`)
- Remover o type `"save"` do `draftWarningContext`

#### 1.3 Peso visual nos botões "Adicionar à Lista" — 3 arquivos

**`src/components/equipe/client-form/ContribuintesTab.tsx`** (linha ~568):
- Alterar de `variant="outline" className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50"` para `className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-md"` (botão sólido primário)

**`src/components/equipe/client-form/RepresentantesTab.tsx`** (linha ~259):
- Mesma alteração: botão sólido teal

**`src/components/equipe/client-form/ContratosTab.tsx`** (linha ~535):
- Mesma alteração no botão "Adicionar OS à Lista": botão sólido teal

---

### Fase 2: Restauração de Dados

**Arquivo: 1 migration SQL**

```sql
UPDATE ordem_servico
SET excluido = false
WHERE excluido = true
  AND id_cliente IN (
    SELECT id FROM cliente WHERE nome = 'Grupo Zugair'
  );
```

Usa subquery real baseada no nome do cliente, sem UUIDs hardcoded.

---

### Resumo

| Arquivo | Alteração |
|---------|-----------|
| `NewClientModal.tsx` | Botão disabled + Tooltip + simplificar alerta |
| `ContribuintesTab.tsx` | Botão "Adicionar" sólido teal |
| `RepresentantesTab.tsx` | Botão "Adicionar" sólido teal |
| `ContratosTab.tsx` | Botão "Adicionar OS" sólido teal |
| Migration SQL | Restaurar OS do Grupo Zugair |

**Total: 4 arquivos de código + 1 migration, ~30 linhas alteradas.**

