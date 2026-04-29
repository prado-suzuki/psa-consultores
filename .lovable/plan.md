
# Importação direta do histórico de chamados (via migration SQL)

Operação one-shot, sem mudanças de schema, sem nova UI e sem disparo de webhooks. Toda a carga acontece em uma única migration SQL versionada, com migration espelho de rollback.

A aba "Importar histórico" permanece desabilitada ("Em breve") — não será habilitada.

## Princípios

- **Sem alteração de schema**: nada de `legacy_id`, `import_batch_id`, `is_legacy`, nem tabela nova. Usa apenas `tickets`, `representante`, `profiles` como estão.
- **Sem criação de usuário**: linhas cujo representante (match por email) **não tenha `user_id`** são **puladas** e listadas via `RAISE NOTICE`.
- **Sem webhook n8n**: a carga é INSERT direto em `tickets` via SQL — não passa pela edge function `notify-ticket` nem por nenhum hook do app. Nenhuma chamada a `supabase.functions.invoke` acontece. Confirmado também que não existe trigger no banco enviando webhook em insert de `tickets`.
- **Todos como `resolvido`**: independentemente do `Status` do CSV ("Novo", "Em Progresso", "Fechado"), todo registro entra com `status = 'resolvido'` e `activity_status = 'resolvido'`. Por serem legados, todos foram efetivamente concluídos antes da migração.
- **Reversibilidade no nível SQL**: a migration de carga gera UUIDs explícitos materializados em tempo de geração; a migration de rollback usa exatamente esses UUIDs para `DELETE`. Nenhuma coluna de marcação é necessária.

## Mapeamentos

| Campo do CSV | Coluna em `tickets` | Regra |
|---|---|---|
| `Email do cliente/representante` | `user_id`, `cliente_id` | `representante` ativo do ambiente prod com `lower(trim(email))` igual; usar o registro **mais recente** quando houver múltiplos. Se `user_id IS NULL` → linha pulada. |
| `Responsável` (nome) | `assigned_to` | Match por `profiles.first_name + last_name` (case-insensitive). Sem match → fallback **Maria Lizot** (`b9d78de7-708b-407e-9e5f-14879c4a0a12`). |
| `Titulo` | `title` | Direto. |
| `Histórico` | `description` | Texto multi-linha completo, escapado. |
| `Departamento` | `department` | Quando não vazio. |
| `Data abertura` (`DD/MM/AAAA às HH:MM`) | `created_at` | Parse em `America/Sao_Paulo`, gravado em UTC. |
| `Atividade` (`fechado em: AAAA-MM-DD às: HH:MM:SS`) | `updated_at` | Quando presente; senão `= created_at`. |
| (fixo) | `status` | `'resolvido'` para todos. |
| (fixo) | `activity_status` | `'resolvido'` para todos. |
| (fixo) | `priority` | `'media'`. |

### Aliases de email (normalização antes do match)

Antes de buscar o representante, aplicar a tabela de aliases abaixo sobre `Email do cliente/representante`:

| Email no CSV | Tratado como |
|---|---|
| `simonecavalcante@agrocataratas.com.br` | `luisfernando@agrocataratas.com.br` |

Ou seja, qualquer chamado com remetente Simone Cavalcante é atribuído ao representante e cliente do Luis Fernando (Agro Cataratas), reaproveitando o `user_id` e `cliente_id` dele. A tabela de aliases é mantida no topo da migration, fácil de estender.

`cliente_id` preenchido garante que **clientes do portal vejam** os chamados via RLS atual; `assigned_to` preenchido garante que o **responsável vê** via `is_ticket_assigned_to`. Sem mudança de RLS.

## Arquivos entregues

- `supabase/migrations/<timestamp>_import_legacy_tickets.sql`
  - `INSERT INTO tickets (id, user_id, cliente_id, assigned_to, title, description, department, status, activity_status, priority, created_at, updated_at) VALUES (...), (...);`
  - `ON CONFLICT (id) DO NOTHING` como guarda extra.
  - Bloco `DO $$ ... RAISE NOTICE $$;` listando linhas puladas (com o ID original do CSV e motivo: "representante sem user_id" ou "email não encontrado") — apenas no log da migration, **sem gravar em nenhuma tabela**.
  - Cabeçalho com totais: inseridos, pulados, mapping de responsáveis aplicado, fallback para Maria Lizot e aliases de email aplicados (incluindo `simonecavalcante@agrocataratas.com.br → luisfernando@agrocataratas.com.br`).
- `supabase/migrations/<timestamp>_revert_legacy_tickets.sql` (criado mas **não aplicado** automaticamente — disponível para apply manual quando/se necessário):
  - `DELETE FROM tickets WHERE id = ANY (ARRAY[<UUIDs gerados>]::uuid[]);`

Nenhum hook, edge function, componente ou rota é tocado.

## Validações antes de gerar o SQL

- Reconfirmar via `read_query` o representante mais recente por email no ambiente prod (já com aliases aplicados).
- Reconfirmar parsing de datas em fuso `America/Sao_Paulo`.
- Conferir que `tickets` aceita `priority='media'` e `status='resolvido'` (alinhado com o uso atual no app).

## Resumo das garantias

- ✅ Sem coluna nova, sem tabela nova.
- ✅ Sem disparo de webhook n8n (INSERT direto via SQL, fora do fluxo do app).
- ✅ Todos os chamados importados entram como `status = 'resolvido'`.
- ✅ Reversibilidade via migration de rollback com lista de UUIDs.
- ✅ Sem criação de usuário; linhas sem `user_id` são puladas e reportadas.
- ✅ Responsáveis sem profile caem em Maria Lizot.
- ✅ `simonecavalcante@agrocataratas.com.br` é tratado como `luisfernando@agrocataratas.com.br`.
