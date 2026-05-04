## Problema

O chamado `d25222e6-…` foi criado sem `cliente_id`, `cluster_id` nem `estrutura_area_id`, aparecendo na gestão como "Sem cliente / Sem cluster / Sem área".

### Causa raiz

Em `src/hooks/useCreateTicket.ts` (`useCreateTicketCliente`) e em `src/hooks/useClienteClusters.ts`, a resolução do cliente a partir do representante faz:

```ts
supabase.from('cliente')
  .select('id').in('id', candidateIds)
  .eq('ambiente', currentAmbiente)   // ← filtra por ambiente
  .eq('excluido', false)
```

A tabela `representante` **não tem coluna `ambiente`** — ela aponta diretamente para `cliente.id` via `id_cliente`. No banco, o representante da Francelina (`user_id e66d…`) aponta para o cliente Transoeste, que está cadastrado com `ambiente='prod'`.

`currentAmbiente` é derivado do hostname: só é `'prod'` em `psa-consultores.lovable.app` / `psaconsultores.com.br`. Em qualquer outro host (preview `id-preview--…lovable.app`, sandbox, domínio alternativo), vira `'dev'`, o filtro não casa, `clienteId` fica `null`, o cluster/area também não é resolvido e o ticket é inserido "órfão".

Como a relação representante → cliente já é uma FK direta e o representante é único por ambiente de uso, o filtro por `ambiente` nessa etapa é incorreto — basta usar o `id_cliente` da linha do representante e validar apenas que o cliente não está excluído.

## Mudanças

**1. `src/hooks/useCreateTicket.ts` – `useCreateTicketCliente`**
- Remover o `.eq('ambiente', currentAmbiente)` da resolução de `clienteId`. Manter apenas `.in('id', candidateIds).eq('excluido', false)`.
- Se mesmo assim `clienteId` for `null` após ter `candidateIds`, logar um `console.warn` para facilitar debug futuro (sem bloquear, igual hoje).

**2. `src/hooks/useClienteClusters.ts`**
- Mesma correção: remover `.eq('ambiente', currentAmbiente)` na resolução do cliente a partir do representante.

**3. Backfill do ticket existente (migração)**
- Atualizar o ticket `d25222e6-4626-4648-8e54-553871cc8bde` setando:
  - `cliente_id = de202952-beac-40a0-96dd-024b689dbb48` (Transoeste Logística)
  - `cluster_id` e `estrutura_area_id` resolvidos automaticamente se a Transoeste tiver exatamente 1 cluster e 1 área ativa (caso contrário deixar null para a gestão atribuir manualmente).

## Fora do escopo

- Não mexer em `useCreateTicketGestao` (lá o cliente é selecionado manualmente e funciona).
- Não alterar a lógica de `currentAmbiente` — ela continua válida para outras tabelas que de fato têm a coluna `ambiente`.
