

## Plan: Aba "Histórico" no modal do cliente

### Diagnóstico

**Abas atuais:** shadcn `Tabs` com 5 valores: `cliente`, `contribuintes`, `participantes`, `contratos`, `faturamento` (grid-cols-5).

**Audit logs relevantes:** Todos com `area: 'dev'` e entity_types: `cliente`, `contribuinte`, `participante`, `ordem_servico`.

**Como o entity_id é gravado:**
- `cliente` → `entity_id = clienteId`
- Sub-entidades (contribuinte, participante, ordem_servico) → `entity_id = _dbId` (ID próprio) quando já existe, ou `entity_id = clienteId` quando é criação nova (sem `_dbId`)
- Sub-entidades sempre têm `details: "Cliente: NomeDoCliente"`

**Estratégia de filtro:** Para pegar todos os logs de um cliente:
1. Buscar logs com `entity_type = 'cliente'` AND `entity_id = clienteId`
2. Buscar IDs dos contribuintes, participantes e ordens_servico do cliente
3. Buscar logs com `entity_id IN (...)` para esses IDs
4. Também buscar logs com `entity_id = clienteId` para cobrir criações onde `_dbId` ainda não existia

Na prática, uma query simples: `entity_id IN [clienteId, ...contribIds, ...osIds, ...participantIds]` AND `area = 'dev'`.

### Alterações

**1. `src/components/equipe/NewClientModal.tsx`**

- Expandir tipo de `activeTab` para incluir `"historico"`
- Mudar grid de `grid-cols-5` para `grid-cols-6`
- Adicionar `TabsTrigger` "Histórico" (ícone `History`) — visível apenas quando `editingClienteId` existe
- Adicionar `TabsContent` para `"historico"` renderizando novo componente `ClientHistoryTab`

**2. Novo: `src/components/equipe/client-form/HistoricoTab.tsx`**

Componente que recebe `clienteId`, `entities` (contribuintes), `contracts` (OS) e `participants` como props para extrair os IDs relevantes.

- Query com `useQuery` na tabela `audit_logs` filtrando:
  ```sql
  area = 'dev' AND entity_id IN (clienteId, ...contribDbIds, ...osDbIds, ...participantDbIds)
  ```
  Ordenado por `performed_at DESC`, limit 200
- Busca lookup de profiles (reutilizando pattern do `AuditLogTable`)
- Tabela com colunas: Data/Hora, Usuário, Ação (badge), Tipo (entity_type traduzido), Entidade (entity_name), Detalhes (details ou changed_fields se houver)
- Expandir row se `changed_fields` tiver dados (reutilizar `formatChangedFields` do `auditFieldFormatter`)

**3. Labels de entity_type:** Adicionar mapeamento `{ cliente: 'Cliente', contribuinte: 'Contribuinte', participante: 'Participante', ordem_servico: 'Ordem de Serviço' }`.

### Resumo

| Arquivo | Alteração |
|---|---|
| `NewClientModal.tsx` | +1 aba "Histórico", grid-cols-6, condicional a `editingClienteId` |
| `client-form/HistoricoTab.tsx` | Novo componente — query audit_logs, tabela com expand |

**2 arquivos, ~120 linhas novas.**

