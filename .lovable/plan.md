

## Plan: Resolver gestores dinamicamente via `estrutura_area_lideres`

### Problema
A constante `GESTOR_EMAIL` (linha 9) é hardcoded para um único e-mail. Todos os eventos que notificam "gestor" enviam apenas para essa pessoa, ignorando o Ricardo (líder da área TAX).

### Solução
Substituir a constante por uma função que consulta dinamicamente os líderes da área TAX no banco.

---

### Alteração única — `supabase/functions/notify-ticket/index.ts`

**1. Remover** a constante `GESTOR_EMAIL` (linha 9).

**2. Adicionar** função `getGestorRecipients`:

```typescript
async function getGestorRecipients(
  supabase: ReturnType<typeof createClient>,
  ticketId: string
): Promise<Recipient[]> {
  // Buscar área TAX (page_categories contém 'tax')
  const { data: areas } = await supabase
    .from('estrutura_areas')
    .select('id')
    .contains('page_categories', ['tax'])
    .eq('is_active', true);

  if (!areas?.length) return [];

  const areaIds = areas.map(a => a.id);

  // Buscar líderes dessas áreas
  const { data: lideres } = await supabase
    .from('estrutura_area_lideres')
    .select('user_id')
    .in('area_id', areaIds);

  if (!lideres?.length) return [];

  const userIds = [...new Set(lideres.map(l => l.user_id))];

  // Buscar e-mails dos líderes
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds);

  if (!profiles?.length) return [];

  const gestorUrl = `${PUBLISHED_URL}/gestao/chamados/${ticketId}`;

  return profiles
    .filter(p => p.email)
    .map(p => ({
      email: p.email!,
      ticket_url: gestorUrl,
      role: 'gestor' as RecipientRole,
    }));
}
```

**3. Substituir** todas as ocorrências de:
```typescript
recipients.push({ email: GESTOR_EMAIL, ticket_url: gestorUrl, role: "gestor" });
```
por:
```typescript
const gestores = await getGestorRecipients(supabase, ticket.id);
recipients.push(...gestores);
```

Isso afeta os eventos: `ticket_created`, `ticket_replied`, `ticket_overdue`, `ticket_resolved`.

---

### Resultado

| Antes | Depois |
|---|---|
| Apenas `patricia.melo@...` recebia notificações de gestor | Todos os líderes da área TAX (Ricardo, Patricia, etc.) recebem |
| Hardcoded | Dinâmico — adicionar/remover líderes no EstruturaManager reflete automaticamente |

### Arquivo modificado
- `supabase/functions/notify-ticket/index.ts`

