
## Ajuste Fino no Cron Job: Regras de Vencimento e Activity Status

### Contexto

A edge function `check-ticket-deadlines` já foi reescrita para usar o campo `deadline`. Agora precisamos refinar as duas regras de filtragem antes de considerar a implementação completa.

---

### Regras de Negócio Consolidadas

As três condições que um ticket precisa satisfazer simultaneamente para gerar um alerta:

```text
1. deadline < hoje          (vencido de verdade — não inclui o dia do prazo)
2. status IN ('aberto', 'em_andamento')   (chamado ainda ativo)
3. activity_status != 'respondido'        (a "bola" está com a equipe, não com o cliente)
```

---

### O Que Muda na Edge Function

#### Ajuste 1 — Vencimento estrito (`<` em vez de `<=`)

Hoje a query usa `.lte("deadline", today)` (menor ou igual), o que inclui o dia do prazo no alerta. O alerta deve ser de "SLA Vencido", portanto só deve disparar quando o prazo **já passou**.

A correção é calcular `yesterday` (ontem) e usar `.lte("deadline", yesterday)`, que é equivalente a `deadline < today` na granularidade de datas:

```typescript
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split("T")[0]; // "YYYY-MM-DD"

// .lte("deadline", yesterdayStr)  →  equivale a  deadline < today
```

> Por que usar `yesterday` com `.lte` em vez de `deadline < today`? O cliente Supabase JS não tem operador `.lt` para datas — os filtros disponíveis são `.lte` (menor ou igual) e `.lt` (menor que). Na verdade o SDK possui `.lt()`, então podemos usar diretamente `.lt("deadline", todayStr)`. Usaremos `.lt` para clareza.

#### Ajuste 2 — Ignorar tickets onde a equipe já respondeu

Adicionar o filtro `.neq("activity_status", "respondido")` para excluir da seleção todos os tickets onde a equipe já deu retorno e a "bola" está com o cliente aguardando resposta dele.

#### Ajuste 3 — Filtrar apenas status ativos explicitamente

Substituir o filtro negativo `.not("status", "in", '("resolvido","fechado")')` por um filtro positivo explícito nos dois status ativos, tornando a lógica mais clara e à prova de novos status que possam ser criados no futuro:

```typescript
.in("status", ["aberto", "em_andamento"])
```

---

### Query Resultante

```typescript
const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

const { data: tickets } = await supabase
  .from("tickets")
  .select("id, title, deadline, user_id, assigned_to")
  .in("status", ["aberto", "em_andamento"])          // apenas chamados ativos
  .neq("activity_status", "respondido")               // equipe ainda precisa agir
  .not("deadline", "is", null)                        // tem prazo definido
  .lt("deadline", todayStr)                           // prazo JÁ PASSOU (< hoje)
  .order("deadline", { ascending: true });
```

---

### Comportamento Resultante

| Cenário | Notificado? | Motivo |
|---|---|---|
| Deadline = ontem, status aberto, aguardando resposta | Sim | Todas as condições satisfeitas |
| Deadline = hoje, status aberto, aguardando resposta | Não | Prazo é hoje, não venceu ainda (`< hoje` falha) |
| Deadline = ontem, status resolvido | Não | Status não é ativo |
| Deadline = ontem, status aberto, activity_status respondido | Não | Equipe já retornou, bola com o cliente |
| Ticket sem deadline | Nunca | Campo nulo é ignorado |

---

### Arquivo a Editar

| Arquivo | Ação |
|---|---|
| `supabase/functions/check-ticket-deadlines/index.ts` | Substituir `.lte("deadline", today)` por `.lt("deadline", todayStr)`, trocar `.not("status", "in", ...)` por `.in("status", [...])`, e adicionar `.neq("activity_status", "respondido")` |

---

### O Que Não Muda

- Cron job schedule (11:00 UTC diário) — sem alteração
- Edge function `notify-ticket` — sem alteração
- Campo `deadline` no banco e na UI — sem alteração
- Cálculo de `dias_atraso` baseado em `deadline` — permanece igual
