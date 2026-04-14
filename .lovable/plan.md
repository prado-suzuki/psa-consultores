

## Diagnóstico: Prazo não salva em /gestao/chamados

### Causa raiz

A query de leitura dos tickets (linha 187) lista as colunas explicitamente mas **não inclui `deadline`**:

```ts
.select('id, title, ..., activity_status, estrutura_area_id')
//                                          ↑ deadline está ausente
```

O `update` na função `setDeadline` (linha 399-402) **funciona** — grava no banco. Porém, como o `fetchTickets` nunca traz o campo de volta, ao recarregar a página o valor aparece como "Sem prazo".

O state local é atualizado (linha 406), então parece funcionar até o próximo refresh.

### Correção

**1 arquivo, 1 linha:**

Em `src/pages/gestao/GestaoChamados.tsx`, linha 187, adicionar `deadline` à lista de colunas do select:

```ts
.select('id, title, description, status, priority, department, user_id, created_at, updated_at, assigned_to, activity_status, deadline, estrutura_area_id')
```

Isso faz o valor persistido ser lido corretamente do banco, e o cast `(ticket as any).deadline` na linha 236 passará a receber o valor real.

### Impacto
- 1 arquivo editado, 1 linha alterada
- Zero mudança de banco de dados

