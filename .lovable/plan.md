
## Origem de cada campo do "Novo Chamado" (CreateTicketDialog)

Arquivo: `src/components/gestao/CreateTicketDialog.tsx`
Hooks consumidos: `useTicketClientProfiles`, `useTicketEmpresas`, `useTicketAreasForCliente`, `useCreateTicketGestao` (todos em `src/hooks/useCreateTicket.ts`).

| Rótulo atual | Campo do form (state) | Coluna gravada em `tickets` | Tabela/origem dos itens da lista | Filtro aplicado |
|---|---|---|---|---|
| Usuário (Cliente) * | `user_id` | `tickets.user_id` | `user_roles` (role = `client`) + RPC `get_profiles_with_email` (nome/email do `profiles`) | role = `client` |
| Empresa * | `cliente_id` | `tickets.cliente_id` | `cliente` (id, nome) | `ativo = true`, `excluido = false`, `ambiente = currentAmbiente` |
| Título * | `title` | `tickets.title` | input livre | — |
| Descrição * | `description` | `tickets.description` | textarea livre | — |
| Área * | `estrutura_area_id` (+ `cluster_id` derivado) | `tickets.estrutura_area_id`, `tickets.cluster_id` | `estrutura_areas` (id, name, cluster_id) cruzado com `cliente_clusters` da empresa selecionada | `is_active = true` e `cluster_id IN clusters do cliente` |
| Assunto | `department` | `tickets.department` | enum local `departmentLabels` (contabilidade, icms_ipi, irpj_csll, pis_cofins, produtor_rural, outros) — **não vem do banco** | — |
| Prioridade | `priority` | `tickets.priority` | enum local `priorityLabels` (baixa, normal, alta, urgente) | — |
| Anexos | `selectedFiles` | `ticket_attachments` (+ Storage bucket `ticket-attachments`) | upload do usuário | — |

Campos preenchidos automaticamente no insert (não aparecem no form):
- `tickets.status = 'aberto'`
- `tickets.activity_status = 'aguardando_resposta'`
- `tickets.cluster_id` derivado da Área escolhida
- `tickets.assigned_to`: não preenchido aqui (atribuição posterior)

## Padronização de rótulos proposta

Conforme o restante do app (ex.: tabela de chamados em `/gestao/chamados`, módulo de cadastros), os nomes corretos são:

| Rótulo atual | Rótulo padronizado | Justificativa |
|---|---|---|
| Usuário (Cliente) * | **Representante *** | A entidade é `representante` (pessoa do cliente que abre chamado). Já é o termo usado em listagens. |
| Empresa * | **Cliente *** | Tabela é `cliente`; o restante do sistema usa "Cliente" para a empresa. |
| Área * | **Área *** | Já está correto (vem de `estrutura_areas`). |
| Assunto | **Categoria** | "Assunto" é ambíguo; o restante do app trata esse enum como categoria/departamento do chamado. (Confirmar preferência: Categoria vs Assunto vs Departamento.) |
| Prioridade | **Prioridade** | Mantém. |
| Anexos | **Anexos** | Mantém. |

Placeholders também serão atualizados:
- "Selecione o usuário" → "Selecione o representante"
- "Selecione a empresa" → "Selecione o cliente"
- "Selecione a empresa primeiro" → "Selecione o cliente primeiro"
- Título do diálogo "Crie um chamado em nome de um cliente." → "Crie um chamado em nome de um representante do cliente."

## Mudanças de código

Arquivo único a editar: `src/components/gestao/CreateTicketDialog.tsx`
- Trocar textos das `<Label>` e dos `placeholder` dos `Select` conforme tabela acima.
- Atualizar a `DialogDescription`.
- **Não alterar** nomes dos campos no state, hooks, payload do insert ou colunas do banco — apenas o texto visível ao usuário.

Sem migrations, sem mudanças em hooks, sem mudanças em RLS.

## Pergunta pendente

Confirmar preferência para o rótulo "Assunto":
- (a) **Categoria** (sugestão default)
- (b) **Departamento** (mais próximo do nome técnico da coluna `department`)
- (c) Manter **Assunto**

Se não houver resposta, aplico (a) **Categoria**.
