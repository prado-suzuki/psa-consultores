## Diagnóstico

Confirmado pelo banco:

- Migrations aplicadas: a mais recente é `20260428205348`. A migration `20260429120000_import_legacy_tickets.sql` **nunca foi aplicada** — existe no repositório (`supabase/migrations/`, 1.36 MB, 13 458 linhas) mas o pipeline de aplicação não a executou nesta sessão.
- Tabela `tickets`: 7 registros, nenhum com `status='resolvido'`, último `created_at = 2026-04-27`. Ou seja, zero tickets legados foram inseridos.
- O schema da tabela `tickets` é compatível com o INSERT da migration (todas as colunas usadas existem; `department` é nullable; sem CHECK constraints conflitantes).

Conclusão: não houve falha de SQL — a migration apenas precisa ser **reapresentada para aplicação**. Como o registro `version = 20260429120000` não está em `supabase_migrations.schema_migrations`, basta disparar uma nova aplicação que ela será executada.

## Plano de correção

1. **Reaplicar a migration existente sem alterá-la** (mesmo conteúdo já aprovado anteriormente: 277 INSERTs, status `resolvido`, fallback Maria Lizot, alias Simone→Luis Fernando, sem webhook).

   - Estratégia: criar uma cópia versionada com novo timestamp (`20260429130000_import_legacy_tickets_retry.sql`) com **conteúdo idêntico** ao arquivo original, exceto por um `ON CONFLICT (id) DO NOTHING` adicionado ao `INSERT` para tornar a operação **idempotente** (caso parte tenha sido aplicada por algum motivo, não duplica).
   - O arquivo original `20260429120000_import_legacy_tickets.sql` **permanece** no repo (não removo) — apenas não será mais executado por já estar "à frente" do timestamp atual aplicado, mas o retry com timestamp posterior garante execução.

2. **Submeter via ferramenta de migration do Lovable Cloud** (não via `INSERT` em runtime, não via Edge Function), garantindo:
   - Sem disparo de webhook n8n.
   - Sem criação de usuário.
   - Sem alteração de schema.

3. **Validar pós-execução** com queries de leitura:
   - `SELECT COUNT(*) FROM tickets WHERE status='resolvido'` deve retornar **277** (ou 277 + qualquer pré-existente, atualmente 0).
   - `SELECT COUNT(DISTINCT assigned_to) FROM tickets WHERE status='resolvido'` para conferir distribuição.
   - Spot-check em 3 UUIDs do arquivo de rollback.

4. **Atualizar `.lovable/plan.md`** com o novo timestamp e o resultado da contagem real obtida do banco após aplicação.

5. **Rollback continua disponível**: o arquivo `20260429120001_revert_legacy_tickets.sql.disabled` permanece válido — os UUIDs inseridos serão exatamente os mesmos (são literais no SQL, não gerados em runtime).

## Detalhes técnicos

- O `ON CONFLICT (id) DO NOTHING` é seguro porque os UUIDs são literais e únicos; não há risco de mascarar erro real (qualquer erro de FK em `user_id`/`cliente_id`/`assigned_to` continua estourando normalmente).
- Não vou tocar nas tabelas `representante`, `profiles` ou `cliente`.
- Não vou criar nem modificar Edge Functions, hooks, componentes ou qualquer arquivo fora de `supabase/migrations/` e `.lovable/plan.md`.
- A interface `EquipeChamados`/`GestaoChamados` já lê `tickets` com enriquecimento (`useTicketsList`) — assim que os 277 registros entrarem, eles aparecerão automaticamente para os usuários com RLS satisfeita (cliente dono, assigned_to, e roles de gestão).

## Arquivos a criar/editar

- `supabase/migrations/20260429130000_import_legacy_tickets_retry.sql` (novo, ~1.36 MB, idempotente)
- `.lovable/plan.md` (atualizar bloco "Aplicação" com resultado real)

## O que NÃO será feito

- Não criar tabelas nem colunas.
- Não criar usuários.
- Não disparar webhooks.
- Não alterar a migration original `20260429120000_import_legacy_tickets.sql` (fica como histórico).
- Não mexer em UI da aba "Importar histórico".
