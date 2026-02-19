

## Bug Fix: `notify-ticket` edge function - missing client in `ticket_assigned` recipients

### Root Cause

The deduplication at line ~165 of the edge function uses only `email` as the Map key:

```javascript
const uniqueRecipients = Array.from(
  new Map(recipients.map((r) => [r.email, r])).values()
);
```

When the same person is both the ticket creator (`user_id`) and the assigned agent (`assigned_to`), or when they share the same email, the Map overwrites the "cliente" entry with the "responsavel" entry. Result: only 1 recipient with role "responsavel".

This was confirmed by testing: ticket `21450a98` has `user_id == assigned_to`, and the function returned `recipients: 1`.

### Fix

**File**: `supabase/functions/notify-ticket/index.ts`

1. **Change the dedup key** from `email` to `email|role` so that the same person can appear as both "cliente" and "responsavel" when needed:

```javascript
const uniqueRecipients = Array.from(
  new Map(recipients.map((r) => [`${r.email}|${r.role}`, r])).values()
);
```

This ensures the n8n workflow can always find both `recipients.find(r => r.role === 'cliente')` and `recipients.find(r => r.role === 'responsavel')`.

### Other Events Review

- **ticket_created**: Only gestor -- correct.
- **ticket_replied**: Client + gestor or agent + gestor depending on who replies -- correct.
- **ticket_overdue**: Only gestor -- correct.
- **ticket_resolved**: Client + gestor -- correct.

No issues found in other events. The fix is a single-line change.

