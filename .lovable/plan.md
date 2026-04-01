

## Plan: Restringir notificações ao líder da Área Fiscal

### Contexto

Ricardo Migueis está confirmado como líder da **Área Fiscal** (`201bb999-85c8-437b-bd44-201720833cda`).

A função `getGestorRecipients` atual busca líderes de **todas** as áreas com `page_categories @> ['tax']`, o que inclui 5 áreas e 3 pessoas distintas (Ricardo, Washington, Felipe). O objetivo é que apenas o líder da **Área Fiscal** receba notificações de chamados.

### Alteração

**Arquivo:** `supabase/functions/notify-ticket/index.ts`

Filtrar a query de áreas para buscar especificamente a área com nome `Área Fiscal`, em vez de todas as áreas com categoria `tax`:

```typescript
// ANTES
const { data: areas } = await supabase
  .from("estrutura_areas")
  .select("id")
  .contains("page_categories", ["tax"])
  .eq("is_active", true);

// DEPOIS
const { data: areas } = await supabase
  .from("estrutura_areas")
  .select("id")
  .eq("name", "Área Fiscal")
  .eq("is_active", true);
```

### Resultado

| Antes | Depois |
|---|---|
| Ricardo, Washington e Felipe recebem | Apenas Ricardo (líder da Área Fiscal) recebe |
| Qualquer mudança em áreas TAX afeta notificações | Apenas mudanças no líder da Área Fiscal afetam |

### Arquivo modificado
- `supabase/functions/notify-ticket/index.ts` (1 linha alterada na função `getGestorRecipients`)

