
# Adicionar campo de responsavel na pagina de detalhes do chamado (gestao)

## Problema

Na pagina `/gestao/chamados/:id` (GestaoDetalhesChamado), nao existe um campo para atribuir/delegar o responsavel pelo chamado. Atualmente so e possivel atribuir responsaveis pela lista geral em `/gestao/chamados`.

## Solucao

Adicionar um Select de "Responsavel" ao lado do Select de status no card de detalhes do chamado, permitindo que a gestora delegue o chamado diretamente da pagina de detalhes.

## Alteracoes

**Arquivo**: `src/pages/gestao/GestaoDetalhesChamado.tsx`

1. **Adicionar estado para agentes e responsavel**:
   - Novo estado `agents` com lista de membros da equipe (profiles com role `team_member` ou `admin`)
   - Fetch dos agentes ao carregar a pagina (mesmo padrao usado em GestaoChamados)

2. **Adicionar funcao `handleAssign`**:
   - Atualiza `assigned_to` no banco
   - Dispara notificacao `ticket_assigned` via edge function (mesmo padrao de GestaoChamados)
   - Atualiza o estado local do ticket
   - Exibe toast de confirmacao

3. **Adicionar Select de responsavel na UI**:
   - Posicionado ao lado do Select de status, no canto superior direito do card
   - Label visual "Responsavel" seguido do Select com opcoes:
     - "Nao atribuido" (valor `none`)
     - Lista de agentes (nome completo)
   - Se ja houver um responsavel atribuido, exibir o nome selecionado

### Layout visual resultante

```text
+---------------------------------------------+
| Yo, eai galera                    [Status v] |
| Cliente: Bernardo Kropiwiec  [Responsavel v] |
| [Aberto] [Prioridade: Normal] [Dep: PIS/..] |
+---------------------------------------------+
```

### Detalhes tecnicos

- Buscar agentes: `SELECT id, first_name, last_name FROM profiles WHERE id IN (SELECT user_id FROM user_roles WHERE role IN ('admin','team_member'))`
- Reutilizar a mesma logica de `assignAgent` do GestaoChamados, incluindo a chamada `notify-ticket` com `event_type: 'ticket_assigned'`
- Importar `useQueryClient` do tanstack para invalidar cache de notificacoes apos atribuicao
