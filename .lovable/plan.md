

# Fix: Cliente sendo sobrescrito ao abrir modal de edição

## Diagnóstico

O `useEffect` na linha 199 observa `watchedProjectId`. Quando o modal abre para editar uma tarefa:

1. `form.reset()` define `project_id` e `client_id` com os valores corretos do banco
2. O `watchedProjectId` muda (de vazio para o valor da tarefa)
3. O effect dispara e sobrescreve `client_id` com `project.external_client_id`

Isso significa que **sempre** que o modal abre, o cliente é substituído pelo cliente padrão do projeto, ignorando o valor real salvo na tarefa.

## Solução

Adicionar um flag `isInitialLoad` (ref) que impede o effect de auto-preencher o cliente durante a carga inicial do formulário. O auto-preenchimento só deve ocorrer quando o usuário **ativamente** muda o projeto.

## Mudanças em `src/components/equipe/fiscal/tasks/TaskModal.tsx`

### 1. Adicionar ref de controle (após linha 96)
```tsx
const isResettingRef = useRef(false);
```

### 2. Envolver o `form.reset` com o flag (linhas 218-262)
Antes de cada `form.reset()`, setar `isResettingRef.current = true`. Usar um `setTimeout` ou `requestAnimationFrame` para resetar o flag após o React processar o reset.

### 3. Proteger o effect de auto-fill (linhas 199-215)
Adicionar guarda no início do effect:
```tsx
if (isResettingRef.current) {
  isResettingRef.current = false;
  return;
}
```

Isso garante que o auto-fill do cliente só acontece quando o usuário muda manualmente o projeto no Select, e não durante a abertura do modal.

## Impacto
- Corrige o bug onde o cliente era sobrescrito silenciosamente
- Mantém o comportamento de auto-fill quando o usuário muda o projeto manualmente
- Sem alteração no banco de dados

