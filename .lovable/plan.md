
## Problema Raiz

A edge function `notify-ticket` tem dois bugs interligados para o evento `ticket_replied`:

**Bug 1 — `replier_role` ausente no payload:**
O objeto `ticket_data` enviado ao n8n não inclui a propriedade `replier_role`. O n8n usa esse campo para saber quem respondeu e decidir para quem enviar o e-mail. Sem ele, o n8n assume fallback "cliente respondeu" e procura o destinatário com `role: "responsavel"`.

**Bug 2 — `recipients` incompleto:**
A lógica atual monta a lista de destinatários de forma condicional: se o responsável respondeu → manda só para cliente+gestor; se o cliente respondeu → manda só para responsável+gestor. O problema é que o n8n espera receber **todos os possíveis destinatários** no array e filtra por conta própria usando `replier_role`. Com a lógica atual, sempre falta um dos lados.

---

## Mapeamento atual de `actor_name` por origem

| Quem responde | Página | `actor_name` enviado |
|---|---|---|
| Cliente envia mensagem | `DetalhesChamado.tsx` | `"Cliente"` |
| Cliente envia anexo | `DetalhesChamado.tsx` | `"Cliente"` |
| Responsável envia mensagem | `EquipeDetalhesChamado.tsx` | `"Responsável"` |
| Responsável envia anexo | `EquipeDetalhesChamado.tsx` | `"Responsável"` |
| Gestora envia mensagem | `GestaoDetalhesChamado.tsx` | `"Equipe PSA"` |

---

## Correções planejadas — apenas `supabase/functions/notify-ticket/index.ts`

### Correção 1: Adicionar `replier_role` ao `ticket_data`

Derivar o `replier_role` a partir do `actor_name` recebido:

```
actor_name === "Cliente"  →  replier_role = "cliente"
actor_name === "Responsável" ou "Equipe PSA"  →  replier_role = "responsavel"
```

Incluir esse campo no objeto `ticketData` antes de enviar ao webhook.

### Correção 2: Reconstruir `recipients` para `ticket_replied` — estratégia "manda todos, n8n filtra"

No bloco `ticket_replied`, sempre montar o array com **todos os envolvidos**: cliente + responsável (se houver) + gestor. O n8n usa `replier_role` + `recipients[].role` para decidir quem receberá o e-mail de fato.

```
Novo recipients para ticket_replied:
  - { email: clientEmail, role: "cliente", ticket_url: /cliente/... }
  - { email: agentEmail,  role: "responsavel", ticket_url: /equipe/... }  (se assigned_to existir)
  - { email: GESTOR_EMAIL, role: "gestor", ticket_url: /gestao/... }
```

---

## Arquivo alterado

- `supabase/functions/notify-ticket/index.ts` — único arquivo modificado

## Nenhuma alteração no frontend

Os arquivos `DetalhesChamado.tsx`, `EquipeDetalhesChamado.tsx` e `GestaoDetalhesChamado.tsx` **não precisam de mudança** — eles já enviam o `actor_name` correto. A correção é inteiramente na edge function.

---

## Exemplo do payload pós-correção para `ticket_replied` (cliente respondeu)

```json
{
  "event_type": "ticket_replied",
  "ticket_data": {
    "actor_name": "Cliente",
    "replier_role": "cliente",
    ...
  },
  "recipients": [
    { "email": "cliente@empresa.com", "role": "cliente", "ticket_url": "..." },
    { "email": "ana@psa.com",         "role": "responsavel", "ticket_url": "..." },
    { "email": "patricia@psa.com",    "role": "gestor",      "ticket_url": "..." }
  ]
}
```

O n8n vê `replier_role = "cliente"`, procura `role = "responsavel"` na lista — que agora **sempre está lá** — e envia o e-mail corretamente.
