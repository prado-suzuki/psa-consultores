

## Plano: Melhorias UX no Cadastro de Clientes

### 1. Reduzir mínimo de observações (ParticipantesTab.tsx)

**Linha 83:** Trocar `< 20` por `< 3` e atualizar mensagem de erro.

### 2. Remover AlertDialog do "Aplicar" (3 arquivos)

Substituir o bloco `<AlertDialog>...<AlertDialogTrigger><Button>Aplicar</Button></AlertDialogTrigger>...</AlertDialog>` por um `<Button onClick={saveHandler}>Aplicar</Button>` direto.

| Arquivo | Linhas | Handler |
|---------|--------|---------|
| `ContribuintesTab.tsx` | 389-403 | `saveEditEntity` |
| `ParticipantesTab.tsx` | 206-220 | `saveEditParticipant` |
| `ContratosTab.tsx` | 383-389 | `saveEditContract` |

Os `AlertDialog` dos botões "Remover" permanecem intactos.

Após a remoção, os imports de `AlertDialog*` podem ser limpos nos arquivos onde só eram usados pelo "Aplicar" — **ParticipantesTab** ainda usa para "Remover", **ContribuintesTab** e **ContratosTab** também usam para "Remover**, então os imports ficam em todos.

### 3. Cores semânticas + texto de ajuda (FaturamentoTab.tsx)

Substituições de cores hardcoded:

| De | Para |
|----|------|
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-900` | `text-foreground` |
| `text-gray-300` | `text-muted-foreground/50` |
| `bg-gray-50` | `bg-muted` |

Adicionar no topo da seção (após o header), um parágrafo de ajuda:

```tsx
<p className="px-4 pt-3 text-xs text-muted-foreground italic">
  Para alterar o contribuinte de faturamento, vá até a aba Contribuintes e ative o switch "Contribuinte de Faturamento" no contribuinte desejado.
</p>
```

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/equipe/client-form/ParticipantesTab.tsx` | Mínimo observações 20→3 |
| `src/components/equipe/client-form/ParticipantesTab.tsx` | Remover AlertDialog do Aplicar |
| `src/components/equipe/client-form/ContribuintesTab.tsx` | Remover AlertDialog do Aplicar |
| `src/components/equipe/client-form/ContratosTab.tsx` | Remover AlertDialog do Aplicar |
| `src/components/equipe/client-form/FaturamentoTab.tsx` | Cores semânticas + texto de ajuda |

