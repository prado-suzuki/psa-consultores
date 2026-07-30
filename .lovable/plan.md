## Objetivo

Parar de engolir a mensagem do banco no save de tarefa e traduzir o bloqueio do trigger RLS-06 em texto compreensível. Só frontend.

## 1. `src/lib/rlsMessages.ts` — duas funções puras novas

Adicionar (sem mexer no que já existe):

```ts
export function extractErrorMessage(error: unknown): string | null
export function taskSaveErrorMessage(error: unknown, options?: { prefix?: string }): string
```

`extractErrorMessage`:
- `Error` → `error.message`; objeto simples com `message: string` (formato do supabase-js: `{message, code, details, hint}`) → esse `message`; string não vazia → ela mesma; qualquer outra coisa ou mensagem vazia/só espaços → `null`.
- Exportado para reuso futuro nos ~46 arquivos que hoje usam `error instanceof Error ? ... : 'genérica'`. **Nenhum desses arquivos é alterado agora** — frente separada.

`taskSaveErrorMessage`:
- Usa `extractErrorMessage`. Sem mensagem → `"Não foi possível salvar a tarefa. Tente novamente."` (sem prefixo).
- Normaliza para comparar: `toLowerCase()` + remoção de acentos (`normalize('NFD').replace(/\p{Diacritic}/gu, '')`), cobrindo com e sem acento.
- Contém `so pode alterar status` (cobre as duas variantes do trigger) → retorna, **sem prefixo**:
  `"Esta tarefa foi criada por outra pessoa. Você pode alterar status, horas e revisor. Título, descrição e os demais campos só quem criou a tarefa pode mudar."`
- Qualquer outra mensagem → retorna a mensagem original, prefixada com `options.prefix` quando informado.

## 2. Teste

Novo `src/lib/rlsMessages.test.ts` (vitest):
- `extractErrorMessage`: `Error`, objeto supabase-js, string, `null`/`{}`/`{message: ''}` → `null`.
- `taskSaveErrorMessage`: duas variantes do trigger (com e sem acento) → mensagem mapeada e sem prefixo mesmo passando `prefix`; mensagem qualquer → original, e com `prefix` → prefixada; sem mensagem → fallback sem prefixo.

## 3. `TaskModal.tsx` (~linha 628)

```ts
} catch (error) {
  toast.error(taskSaveErrorMessage(error));
  console.error('Error saving task:', error);
}
```
Sem prefixo. `console.error` com o objeto cru permanece.

## 4. `src/hooks/useOrgTasks.ts` — `useUpdateOrgTask`

`onError` (linha ~326):

```ts
if (showToasts) toast.error(taskSaveErrorMessage(error, { prefix: 'Erro ao atualizar tarefa: ' }));
```

Os demais `onError` do arquivo (criar, mover, excluir, reatribuir) ficam como estão.

## Fora de escopo

Policies, triggers, banco, campos do formulário, demais toasts e os ~46 arquivos com o padrão antigo.

## GATE

1. team_member alterando título de tarefa de outra pessoa → mensagem clara, sem "RLS-06" e sem prefixo.
2. Mesma tarefa, só status → salva normal.
3. Outro erro do banco → mensagem original preservada (com prefixo no hook, sem prefixo no modal).
