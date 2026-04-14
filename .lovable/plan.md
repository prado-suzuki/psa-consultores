

# Renomear "Cliente" → "Representante" + nova coluna "Cliente" (empresa)

## Contexto
Atualmente a coluna "Cliente" nas 3 telas mostra o nome de quem abriu o chamado (profiles.first_name/last_name). Isso é o representante, não a empresa. Precisamos:
1. Renomear essa coluna para "Representante"
2. Adicionar coluna "Cliente" com o nome da empresa (tabela `cliente`)

## Alterações

### 1. `src/hooks/useTickets.ts`
- Adicionar `cliente_id` ao select string do `useTicketsList`
- Adicionar `cliente_nome?: string | null` ao tipo `TicketListItem`
- Enriquecer tickets com nome do cliente: buscar `cliente.nome` para os `cliente_id` únicos (mesmo padrão usado para profiles/agents)
- Criar `clienteMap` e mapear no return

### 2. `src/pages/gestao/GestaoChamados.tsx`
- Header: renomear "Cliente" → "Representante"
- Adicionar nova coluna "Cliente" (empresa) logo após "Representante"
- Body: renderizar `ticket.cliente_nome || '—'` na nova célula
- Exportação Excel: ajustar labels ("Representante" e "Cliente")

### 3. `src/pages/equipe/EquipeChamados.tsx`
- Header: renomear "Cliente" → "Representante"
- Adicionar nova coluna "Cliente" logo após "Representante"
- Body: renderizar `ticket.cliente_nome || '—'`

### 4. `src/pages/admin/AdminChamados.tsx`
- Header: renomear "Criado por" → "Representante"
- Adicionar nova coluna "Cliente" logo após "Representante"
- Body: renderizar `ticket.cliente_nome || '—'`

## Dados — enriquecimento no hook
No `useTicketsList`, após buscar tickets:
```
const clienteIds = [...new Set(ticketsData.filter(t => t.cliente_id).map(t => t.cliente_id))];
const { data: clientesData } = clienteIds.length > 0
  ? await supabase.from('cliente').select('id, nome').in('id', clienteIds)
  : { data: [] };
const clienteMap = new Map(clientesData?.map(c => [c.id, c.nome]));
```
E no return: `cliente_nome: ticket.cliente_id ? clienteMap.get(ticket.cliente_id) || null : null`

## Resumo
| Arquivo | Mudança |
|---|---|
| `src/hooks/useTickets.ts` | +`cliente_id` no select, +enriquecimento com `cliente.nome`, +tipo |
| `src/pages/gestao/GestaoChamados.tsx` | Rename coluna + nova coluna Cliente |
| `src/pages/equipe/EquipeChamados.tsx` | Rename coluna + nova coluna Cliente |
| `src/pages/admin/AdminChamados.tsx` | Rename coluna + nova coluna Cliente |

**0 migrations, 0 hooks novos, 4 arquivos editados.**

