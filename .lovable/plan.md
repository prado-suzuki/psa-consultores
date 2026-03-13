

# Plano: Unificar DLP em um único AlertDialog inteligente

## Problema atual
O `NewClientModal.tsx` possui **3 estados** e **2 AlertDialogs** para DLP:
- `showExitConfirm` — fechar modal com dados não salvos
- `showDraftWarning` + `draftWarningContext` — rascunhos não adicionados (navegar/salvar)
- Total: ~80 linhas de lógica dispersa + JSX duplicado

## Solução

### Arquitetura: `useDraftGuard` hook

Extrair toda a lógica de interceptação para `src/hooks/useDraftGuard.ts`. Isso mantém o modal limpo e o hook testável isoladamente.

**Estado único no hook:**
```ts
type InterceptedAction =
  | { type: "close" }
  | { type: "navigate"; targetTab: TabKey }
  | { type: "save" }
  | null;
```

**API do hook:**
```ts
useDraftGuard({
  activeTab,
  hasDraftEntityData,
  hasDraftParticipantData,
  hasDraftContractData,
  hasUnsavedChanges,
}) => {
  interceptedAction,   // estado atual (null = sem alerta)
  pendingTabs,         // string[] calculado dinamicamente
  guard,               // (action) => boolean — retorna true se interceptou
  dismiss,             // fecha o alerta sem agir
  proceed,             // descarta drafts e executa a ação interceptada
}
```

### Fluxo unificado

| Gatilho | Chamada |
|---|---|
| Fechar modal (X / overlay) | `if (guard({ type: "close" })) return` |
| Trocar aba | `if (guard({ type: "navigate", targetTab })) return` |
| Salvar | `if (guard({ type: "save" })) return` |

`guard()` verifica se há rascunhos pendentes (ou `hasUnsavedChanges` para close). Se sim, armazena a ação em `interceptedAction` e retorna `true`. Senão, retorna `false` e o caller prossegue normalmente.

### AlertDialog único (minimalista)

Um único `<AlertDialog open={!!interceptedAction}>` no final do arquivo:
- **Titulo**: "Dados não adicionados à lista"
- **Corpo**: "Existem dados preenchidos que não foram adicionados à lista." + Badges com abas pendentes (ex: `<Badge variant="secondary">Contribuintes</Badge>`)
- **Para close**: titulo muda para "Dados não salvos", sem badges
- **Botões**: "Voltar e Revisar" (cancel) / "Descartar e Prosseguir" (action, destructive)

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/hooks/useDraftGuard.ts` | **Novo** — hook com estado `interceptedAction`, funções `guard`, `dismiss`, `proceed` |
| `src/components/equipe/fiscal/NewClientModal.tsx` | Remover `showExitConfirm`, `showDraftWarning`, `draftWarningContext`, handlers associados (~60 linhas), `checkDraftAndNavigate`, `handleDraftWarningContinue`, `handleDraftWarningGoBack`. Substituir por consumo do hook + 1 AlertDialog. Os 2 AlertDialogs antigos (~40 linhas JSX) viram 1 (~15 linhas) |

**Nota:** O AlertDialog de "Nome duplicado" (`showDuplicateNameAlert`) permanece inalterado pois tem propósito diferente (validação de negócio, não DLP).

### Redução estimada
~80 linhas removidas do modal, ~40 linhas no novo hook. Saldo: **-40 linhas** e lógica centralizada.

