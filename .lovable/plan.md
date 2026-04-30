
## Diagnóstico

Confirmei no banco: dos últimos 9 chamados, **0 têm `estrutura_area_id`** e apenas 2 têm `cluster_id`/`cliente_id`. Há dois problemas distintos, conectados:

### Problema 1 — Chamados novos vêm sem Cliente/Cluster/Área

O fluxo `cliente/NovoChamado.tsx` (página usada pelos representantes) só envia:
- `user_id`, `title`, `department`, `description`, `priority`, `cluster_id` (apenas se ele tiver 2+ clusters).

E o hook `useCreateTicketCliente` (em `useCreateTicket.ts`) resolve `cliente_id` a partir do representante, **mas nunca grava `estrutura_area_id`**. Resultado: chamados criados pelo cliente ficam sem área. Quando o representante tem 1 só cluster, esse cluster é setado no form, mas se ele não tiver cluster algum (caso de tickets antigos) nem isso é gravado.

O fluxo `gestao/CreateTicketDialog.tsx` já grava os 3 campos corretamente — esse não é o problema.

### Problema 2 — A tela de detalhe (gestão) não permite editar Cliente/Cluster/Área

`GestaoDetalhesChamado.tsx` só tem dois `Select` no header: **Status** e **Responsável**. Não há UI nem mutation para alterar Cliente/Cluster/Área. O hook `useTicketMutations` também só expõe `useAssignTicket`, `useUpdateTicketStatus`, `useUpdateTicketDeadline` — nenhum mutation cobre os 3 campos de roteamento.

Por isso o usuário "não consegue editar" — o controle simplesmente não existe na tela.

---

## Plano de solução

### 1. Mutation única para roteamento do chamado (hook)
Em `src/hooks/useTicketMutations.ts`, criar `useUpdateTicketRouting` que atualiza, em uma única chamada, qualquer combinação de `cliente_id`, `cluster_id`, `estrutura_area_id`. Ela deve:
- Aceitar `{ ticketId, cliente_id?, cluster_id?, estrutura_area_id? }`.
- Validar coerência: se mudar `cliente_id`, e o `cluster_id` atual não pertence mais ao novo cliente (ver `cliente_clusters`), zerar `cluster_id` e `estrutura_area_id`.
- Validar: se mudar `cluster_id`, e a área atual não pertence ao cluster, zerar `estrutura_area_id`.
- Logar via `useAuditLog` com `changed_fields` campo-a-campo (padrão do projeto, conforme `useAuditLog`/`diffUtils`).
- Invalidar `['tickets']` e `['tickets', 'detail', id]`.

### 2. Painel "Roteamento" no detalhe da gestão
Em `src/pages/gestao/GestaoDetalhesChamado.tsx`, adicionar na Card principal um bloco "Roteamento" com 3 selects controlados em cascata (mesmo padrão do `CreateTicketDialog`):

```text
[ Cliente ▾ ]   [ Cluster ▾ ]   [ Área ▾ ]
                              ^ desabilitado se cluster vazio
```

Reaproveitar:
- `useTicketEmpresas()` — lista de clientes ativos do ambiente atual.
- Novo hook leve `useTicketClustersForCliente(clienteId)` — clusters via `cliente_clusters` + nomes em `estrutura_clusters` (já feito parcialmente em `useClienteClusters`, extrair).
- Adaptar `useTicketAreasForCliente` para também aceitar filtro por `cluster_id` (ou criar `useTicketAreasForCluster`), de modo que ao escolher Cluster a lista de Áreas seja restrita.

Ao alterar qualquer select, chamar `useUpdateTicketRouting` (debounce não é necessário — usuário escolhe 1 valor por vez). Toast de sucesso/erro padronizado.

Também expor o `cluster_id` no retorno de `useTicketDetail` (hoje só retorna `estrutura_area_id` e `cliente_id`) para alimentar o select.

### 3. Corrigir criação no portal do cliente (NovoChamado)
Em `src/hooks/useCreateTicket.ts` → `useCreateTicketCliente`:
- Sempre resolver `cliente_id` (já faz).
- Se `cluster_id` não veio do form, usar o **único cluster** do cliente quando houver apenas 1 (consultar `cliente_clusters`); se houver vários e o cliente não escolheu, manter null e exigir escolha no form.
- Se houver `cluster_id` definido e o cliente possui apenas **uma área ativa nesse cluster**, gravar também `estrutura_area_id` automaticamente (consulta a `estrutura_areas` por `cluster_id` + `is_active`). Quando houver várias áreas, deixar para a Gestão decidir (UI da etapa 2).

Em `src/pages/cliente/NovoChamado.tsx`, o auto-select de cluster único já existe — manter. Sem mudar a UX do cliente (não vamos pedir Área para ele).

### 4. Backfill dos chamados existentes (migration)
Migration SQL que tenta inferir, **somente onde os campos estão null**:
- `cliente_id`: a partir do `representante` do `user_id` (filtrando ambiente igual ao do registro mais recente — ou fallback para o único registro existente).
- `cluster_id`: se o `cliente_id` (resolvido ou existente) tiver **exatamente um** registro em `cliente_clusters`, usar esse.
- `estrutura_area_id`: se o `cluster_id` (resolvido) tiver **exatamente uma** `estrutura_areas` ativa, usar essa.

Tickets ambíguos (várias opções) ficam null e aparecerão sem área na lista, prontos para a Gestão completar via UI da etapa 2.

### 5. RLS
Verificar policy de UPDATE em `tickets`. Hoje a tela de assign já atualiza, então policy para internos existe. Se a policy atual filtra por colunas específicas, garantir que `cliente_id`, `cluster_id`, `estrutura_area_id` estejam permitidos para `team_member` ou superior (`has_role_or_higher`). Caso necessário, migration ajusta a policy.

---

## Detalhes técnicos

**Tabelas envolvidas:** `tickets`, `cliente`, `cliente_clusters`, `estrutura_clusters`, `estrutura_areas`, `representante`.

**Cascata de validação no mutation (server-side via lookup antes do update):**
```text
clienteAtual ── cliente_clusters ──> clusters válidos
clusterEscolhido ── estrutura_areas (cluster_id) ──> áreas válidas
```
Se a UI escolher um par inválido, o hook normaliza zerando os filhos antes de salvar — evitando estado inconsistente.

**Audit log** (exemplo):
```ts
logAction({
  area: 'cadastros',
  entity_type: 'cliente',
  entity_id: ticketId,
  entity_name: 'Chamado',
  action: 'updated',
  changed_fields: computeFieldDiff(before, after, ['cliente_id','cluster_id','estrutura_area_id']),
});
```

**Arquivos a alterar/criar:**
- `src/hooks/useTicketMutations.ts` — adicionar `useUpdateTicketRouting`.
- `src/hooks/useTickets.ts` — incluir `cluster_id` em `TicketDetail`.
- `src/hooks/useCreateTicket.ts` — `useTicketAreasForCliente` aceita filtro opcional por cluster; `useCreateTicketCliente` auto-resolve cluster/área quando únicos.
- `src/pages/gestao/GestaoDetalhesChamado.tsx` — novo bloco Roteamento com 3 selects.
- `supabase/migrations/<timestamp>_ticket_routing_backfill.sql` — backfill + (se necessário) ajuste de policy.

**Sem alterações em:** `cliente/NovoChamado.tsx` (UX inalterada para o representante), `CreateTicketDialog.tsx` (já correto), tabela `GestaoChamados.tsx` (já lê os campos via `useTicketsList`).

---

## Resultado esperado
1. No `/gestao/chamados/:id`, três selects em cascata permitem reatribuir Cliente, Cluster e Área com auditoria.
2. Chamados criados pelo cliente já chegam com `cliente_id` sempre, `cluster_id` quando inferível e `estrutura_area_id` quando inferível.
3. Chamados antigos recebem o que for inferível via migration; o restante fica visível como "—" na lista e pode ser completado manualmente pela Gestão.
