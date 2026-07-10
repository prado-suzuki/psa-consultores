## Fix: preservar `actual_hours` no submit do TaskModal

Arquivo único: `src/components/equipe/fiscal/tasks/TaskModal.tsx`, linhas 323-325.

### Mudança
Trocar a atribuição condicional de `actual_hours` (que força `null` sempre que `status !== 'done'`) por uma normalização simples que só converte string vazia/undefined em `null`:

```ts
actual_hours: (values.actual_hours === '' || values.actual_hours == null)
  ? null
  : Number(values.actual_hours),
```

### Efeito
- Mover uma tarefa `done` (com horas) para `review`/outro status: `actual_hours` sai igual ao banco → `normEmpty` no `useUpdateOrgTask` mantém o campo fora do diff → payload vira `{status}` → trigger `org_tasks_team_member_status_only` permite team_member.
- Nenhum líder/admin apaga silenciosamente horas realizadas ao mudar status.
- Alterar de fato as horas continua enviando o novo valor (bloqueado para team_member pelo trigger, como esperado).

### Fora de escopo
SQL, policies, trigger RLS-06, `normEmpty` no hook (já aplicado), Kanban, dropdown inline, outros hooks.

### Verificação prévia (efeito colateral)
Antes de aplicar, buscar usos de `actual_hours` no frontend (relatórios, dashboards de sprint, performance) para confirmar que nenhuma tela assume `actual_hours = null` quando `status !== 'done'`. Horas realizadas são histórico e devem persistir; se algum relatório depender dessa suposição, reportar antes de mexer.

### Verificação pós-fix
1. team_member (Anderson) abre no modal uma tarefa dele `done` com `actual_hours != null`, muda só o status para `review`, Salvar → sucesso; `actual_hours` permanece.
2. Mesmo team_member tenta trocar responsável ou editar `actual_hours` → bloqueado (regra intacta).
3. Kanban (drag) e dropdown inline da tabela → seguem funcionando.
4. `tsgo` limpo.
