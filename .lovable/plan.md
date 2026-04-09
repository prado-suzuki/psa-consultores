

## Correção — URL do responsável no notify-ticket

### Problema
A URL do responsável está hardcoded como `"https://psaconsultores.com.br/equipe"` em duas ocorrências (linhas 208 e 222), sem incluir o ID do chamado.

### Correção
Alterar ambas as ocorrências para usar template literal com `ticket.id`:

**Arquivo:** `supabase/functions/notify-ticket/index.ts`

- **Linha 208** (evento `ticket_assigned`): trocar por `` `https://psaconsultores.com.br/equipe/chamados/${ticket.id}` ``
- **Linha 222** (evento `ticket_replied`): trocar por `` `https://psaconsultores.com.br/equipe/chamados/${ticket.id}` ``

Nenhuma outra alteração necessária. A variável `ticket.id` já está disponível no escopo.

