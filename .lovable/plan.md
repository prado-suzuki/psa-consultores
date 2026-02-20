

## Adicionar campo "Prazo" na listagem de chamados

### 1. Migracao no banco de dados

Adicionar coluna `deadline` (tipo `date`, nullable) na tabela `tickets`:

```sql
ALTER TABLE public.tickets ADD COLUMN deadline date;
```

Nenhuma alteracao em RLS -- as policies existentes ja cobrem UPDATE e SELECT.

### 2. Alteracoes em `src/pages/gestao/GestaoChamados.tsx`

**Interface Ticket** (linha 46): adicionar `deadline: string | null`.

**fetchTickets** (linha 149): adicionar `deadline` ao select. Na montagem do `enrichedTickets`, incluir `deadline: ticket.deadline || null`.

**Nova funcao `setDeadline`**: recebe `ticketId`, `createdAt` e `days`. Calcula `deadline = addDays(new Date(createdAt), days)` e salva via `supabase.from('tickets').update({ deadline }).eq('id', ticketId)`. Se `days` for `'none'`, salva `null`.

**Importar** `addDays` de `date-fns` (ja importado parcialmente).

**Coluna na tabela**: Adicionar `<TableHead>Prazo</TableHead>` entre "Responsavel" (linha 645) e "Atualizacao" (linha 646).

**Celula na tabela**: Renderizar um `Select` inline com as opcoes:

```text
Sem prazo  (valor: "none")
1 dia      (valor: "1")
3 dias     (valor: "3")
5 dias     (valor: "5")
7 dias     (valor: "7")
10 dias    (valor: "10")
15 dias    (valor: "15")
```

- Valor controlado: derivado do deadline atual comparado com created_at (para mostrar a opcao correta se ja definido).
- Ao selecionar, chama `setDeadline(ticket.id, ticket.created_at, days)`.
- Abaixo do Select, exibir a data formatada (ex: "25/02") se houver deadline.

**Indicador visual de vencimento**:
- Se `deadline < hoje` -- texto vermelho + icone AlertTriangle
- Se `deadline === hoje` ou `deadline === amanha` -- texto amarelo/amber
- Se `deadline` futuro -- texto verde
- Sem deadline -- nada exibido

Usa funcoes `isPastBrazil`, `isTodayBrazil`, `isTomorrowBrazil` de `@/lib/dateUtils` (ja existem).

**Exportacao Excel**: Adicionar coluna "Prazo" ao export com a data formatada.

### 3. O que NAO muda

- `GestaoDetalhesChamado.tsx` -- sem alteracao
- RLS -- policies existentes ja cobrem
- Frontend de cliente/equipe -- sem impacto

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| Migracao SQL | `ALTER TABLE tickets ADD COLUMN deadline date` |
| `src/pages/gestao/GestaoChamados.tsx` | Interface, fetch, coluna, Select inline, indicadores visuais, export |

