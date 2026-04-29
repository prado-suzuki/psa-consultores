# Importação do histórico de chamados — execução

## Resultado da geração

Arquivos criados:

- `supabase/migrations/20260429120000_import_legacy_tickets.sql` (1.3 MB, ~13 458 linhas)
- `supabase/migrations/20260429120001_revert_legacy_tickets.sql.disabled` (rollback, **não aplicado** — basta renomear para `.sql` e republicar para reverter)

## Estatísticas (CSV: 290 linhas)

| Métrica | Valor |
|---|---|
| Inseridos em `tickets` | **277** |
| Pulados | **13** (todos por email sem cliente em prod) |
| Aliases de email aplicados | 0 (CSV anexo não tem Simone Cavalcante; alias permanece registrado) |
| Fallback `assigned_to = Maria Lizot` | 42 chamados |

## Pulados (registrados via `RAISE NOTICE` na própria migration)

- 11× `cliente@pradoconsultores.com` — sem cliente cadastrado em prod
- 1× `marcus.laurentino@prado-advogados.com` — idem
- 1× `solange.silva@tecnomyl.com` — idem

## Como o sistema atribuiu cada campo

- `user_id` + `cliente_id` → representante mais recente em `prod` por email (canonicalizado via aliases). Linhas sem `user_id` foram puladas (regra: nunca criar usuário).
- `assigned_to` → `profiles.first_name + last_name` (case-insensitive). Sem match → Maria Lizot (`b9d78de7-708b-407e-9e5f-14879c4a0a12`).
  - Sem profile na base: Claudionor Ferreira, Matheus Lopes, Mateus Parente, Willian Lima, Prado Suporte, prado_administrador.
- `status = 'resolvido'` e `activity_status = 'resolvido'` para **todos**.
- `priority = 'media'` (padrão; CSV não traz).
- `created_at` extraído de `Data abertura` (parse robusto, aceita também o formato "Última modificação\nDD/MM/YYYY às HH:MM" presente em chamados não fechados).
- `updated_at` extraído do bloco `fechado em: AAAA-MM-DD às: HH:MM:SS` da coluna `Atividade`; quando ausente, recebe `created_at`.
- `description` recebe o texto integral da coluna `Histórico` (quebras de linha preservadas).

## Garantias

- ✅ Sem alteração de schema — só `INSERT` em `tickets`.
- ✅ Sem disparo de webhook n8n (SQL puro, fora do app).
- ✅ Sem criação de usuário.
- ✅ Reversibilidade pura via SQL: `*_revert_legacy_tickets.sql.disabled` faz `DELETE` pelos 277 UUIDs explícitos.
- ✅ Cliente do portal e responsável atribuído passam a ver os chamados imediatamente (RLS atual já cobre `cliente_id` e `assigned_to`).

## Aplicação

A migration tem nome no padrão `<timestamp>_*.sql` em `supabase/migrations/`, portanto será aplicada automaticamente no próximo deploy do Lovable Cloud (publish/preview do projeto). O arquivo de rollback fica versionado mas inerte enquanto mantiver a extensão `.sql.disabled`.
