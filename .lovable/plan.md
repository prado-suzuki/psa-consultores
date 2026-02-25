

## Persistencia de rascunho e correcao de perda de dados - TaskModal

### Problema
Quando o usuario alterna de aba no navegador enquanto edita/cria uma tarefa, o `react-query` faz refetch ao retornar (comportamento padrao `refetchOnWindowFocus`). Isso muda as referencias de `parentTasks` e `task`, disparando o `useEffect` (linha 194) que executa `form.reset()`, apagando todo o conteudo digitado.

### Solucao em duas camadas

#### 1. Corrigir dependencias do useEffect (causa raiz)

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskModal.tsx` (linha 231)

Alterar as dependencias do useEffect principal de:
```
[task, form, defaultParentId, parentTasks]
```
Para:
```
[task?.id, form, defaultParentId]
```

O `parentTasks` continua sendo acessado dentro do corpo do useEffect para buscar dados do parent, mas nao sera dependencia do array -- evitando re-execucoes quando o react-query atualiza as referencias em background.

#### 2. Criar hook de persistencia de rascunho (camada extra de seguranca)

**Novo arquivo:** `src/hooks/useDraftPersistence.ts`

Hook generico que:
- Recebe uma chave de sessionStorage, os valores atuais do form e um flag `enabled`
- Salva automaticamente em `sessionStorage` com debounce de 500ms
- Serializa/deserializa objetos Date corretamente (usando marcador `__date__`)
- Expoe metodos `restore()` e `clear()`

#### 3. Integrar o hook no TaskModal

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskModal.tsx`

- Importar `useDraftPersistence`
- Instanciar com chave `fiscal-task-draft`, passando `form.watch()` e habilitando apenas quando o modal esta aberto e NAO e edicao (`open && !isEditing`)
- No useEffect de reset (quando `!task`): antes de fazer `form.reset` com valores vazios, tentar `restore()` e, se houver rascunho salvo, aplicar via `form.reset(rascunho)`
- Ao salvar com sucesso (`onSubmit`): chamar `clear()`
- Ao fechar o modal (botao Cancelar e `onOpenChange(false)` no submit): chamar `clear()`

### Fluxo do usuario

1. Usuario abre modal de nova tarefa e comeca a preencher
2. A cada 500ms, os dados sao salvos em sessionStorage
3. Se alternar de aba e voltar, o useEffect NAO dispara reset (dependencias estaveis)
4. Se por qualquer motivo o modal fechar inesperadamente e reabrir, o rascunho e restaurado automaticamente
5. Ao salvar ou cancelar intencionalmente, o rascunho e limpo

### Arquivos alterados

| Arquivo | Tipo | Alteracao |
|---|---|---|
| `src/hooks/useDraftPersistence.ts` | Novo | Hook generico de persistencia em sessionStorage |
| `src/components/equipe/fiscal/tasks/TaskModal.tsx` | Edicao | Corrigir dependencias do useEffect + integrar hook de rascunho |

### O que NAO muda
- Nenhuma alteracao no banco de dados
- Nenhuma alteracao em outros componentes ou hooks
- Comportamento de edicao de tarefas existentes permanece igual (rascunho so ativo para criacao)

