

## Ajuste no CreateTicketDialog.tsx — Área filtrada por clusters do cliente

### Problema de vínculo identificado

A tabela `cliente` **não tem** `user_id` nem `email` — não há FK entre `auth.users`/`profiles` e `cliente`. O select atual de "Cliente" escolhe um `user_id` (profile com role `client`), mas `cliente_clusters` opera sobre `cliente.id`.

Isso significa que, ao selecionar um user no select atual, **não é possível resolver automaticamente** o `cliente_id` para buscar clusters.

### Solução proposta

Adicionar um **segundo select de "Empresa"** (tabela `cliente`) logo após o select de cliente (usuário). O fluxo fica:

1. Gestor seleciona o **Usuário** (profile com role client) — preenche `user_id`
2. Gestor seleciona a **Empresa** (tabela `cliente`, filtro `ativo=true`, `excluido=false`) — preenche `cliente_id`
3. Ao selecionar a empresa, o sistema busca `cliente_clusters` → `estrutura_clusters` para aquele `cliente_id`
4. Com os clusters, filtra `estrutura_areas` (via `cluster_id`) e popula o select de **Área**
5. Se a empresa tem áreas em 1 só cluster, pré-seleciona se houver uma única área
6. Ao selecionar a área, grava `estrutura_area_id` no ticket

### Campos do formulário (ordem final)

| Campo | Fonte | Obrigatório | Grava em |
|---|---|---|---|
| Usuário (Cliente) | `get_profiles_with_email` + role client | Sim | `tickets.user_id` |
| Empresa | `cliente` (ativo, não excluído) | Sim | `tickets.cliente_id` |
| Título | input | Sim | `tickets.title` |
| Descrição | textarea | Sim | `tickets.description` |
| Área | `estrutura_areas` filtradas pelos clusters da empresa | Sim | `tickets.estrutura_area_id` |
| Assunto (department) | select hardcoded (ICMS/IPI, PIS/COFINS...) | Não | `tickets.department` |
| Prioridade | select hardcoded | Não (default normal) | `tickets.priority` |
| Anexos | file input | Não | storage + `ticket_attachments` |

### Comportamento do select de Área

- **Sem empresa selecionada**: select desabilitado, placeholder "Selecione a empresa primeiro"
- **Empresa sem clusters**: mostra todas as áreas ativas (fallback)
- **Empresa com clusters**: filtra `estrutura_areas` por `cluster_id IN (clusters da empresa)`
- **Reset**: ao trocar de empresa, limpa `estrutura_area_id`

### Mudanças no label "Departamento"

- Renomear label de "Departamento (legado)" para "Assunto"
- Continua sendo o select hardcoded com as 6 opções
- `department` no INSERT continua vindo deste select (sem mudança)
- A seleção de Área **não** sobrescreve `department`

### Validação no submit

- `formData.user_id` obrigatório
- `formData.cliente_id` obrigatório (novo)
- `formData.title` obrigatório
- `formData.description` obrigatório
- `formData.estrutura_area_id` obrigatório
- `formData.department` opcional

### Arquivo alterado

`src/components/gestao/CreateTicketDialog.tsx` — único arquivo:
- Adicionar state `cliente_id` ao formData
- Adicionar states `clienteEmpresas` (lista de empresas) e `clienteAreas` (áreas filtradas)
- Buscar empresas no open (ou usar query com `useQuery`)
- Ao selecionar empresa → buscar clusters via `cliente_clusters` → filtrar áreas
- Adicionar select de Empresa no form
- Ajustar select de Área para usar `clienteAreas` filtradas
- Renomear label "Departamento (legado)" → "Assunto"
- Incluir `cliente_id` e `estrutura_area_id` no INSERT payload
- Ajustar validação

