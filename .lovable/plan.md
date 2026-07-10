## Fix: team_member não muda status pelo modal (normalizar '' → null no diff)

Arquivo único: `src/hooks/useOrgTasks.ts`, dentro de `useUpdateOrgTask` (bloco `changedOnly`, ~linhas 213-224).

### Mudança
Adicionar helper `normEmpty` e usá-lo tanto na comparação quanto no valor enviado ao `.update()`, para que strings vazias vindas do TaskModal (`project_id: ''`, `department: ''`, `estimated_hours: ''`) igualem `NULL` do banco e não entrem no payload.

```ts
const normEmpty = (v: unknown) => (v === '' || v === undefined ? null : v);

const changedOnly: Record<string, unknown> = {};
if (current) {
  for (const key of Object.keys(updates)) {
    if (key === 'id') continue;
    const oldVal = normEmpty((current as any)[key]);
    const newVal = normEmpty((updates as any)[key]);
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedOnly[key] = newVal; // envia null, nunca ''
    }
  }
} else {
  Object.assign(changedOnly, updates);
}

if (Object.keys(changedOnly).length === 0) {
  return current;
}
```

O bloco `changedFields` (audit log) abaixo permanece; opcionalmente aplico o mesmo `normEmpty` ali para o diff do log ficar coerente (old/new com `null` em vez de `''`), sem mudar o contrato do log.

### Efeito
- Modal envia só `{status}` quando só o status mudou → trigger `org_tasks_team_member_status_only` permite.
- Ao esvaziar de fato um campo, vai `null` (tipo correto para uuid/numeric), evitando erro de cast.
- Kanban/inline continuam iguais (já mandavam poucos campos).

### Fora de escopo
Nada de SQL, policies, triggers, outros hooks ou o TaskModal.

### Verificação
- `tsgo` para tipagem.
- Manual: team_member dono → abre modal, muda só status para "Revisão", Salvar → OK. Muda responsável → bloqueado como esperado.
