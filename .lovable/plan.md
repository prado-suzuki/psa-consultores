# Plano: Registrar data de entrada e data de fechamento dos chamados

## Situação atual
- A tabela `tickets` já possui `created_at` (data de entrada) — não precisa de alteração para isso.
- **Não existe** coluna para registrar quando o chamado foi fechado/resolvido.
- O hook `useUpdateTicketStatus` (`src/hooks/useTicketMutations.ts:164`) só atualiza `status`, sem registrar timestamp de fechamento.
- Status considerados "fechados" no sistema: `resolvido` e `fechado` (visto em `GestaoChamados.tsx`).

## Mudanças

### 1. Migração de banco
Adicionar coluna `closed_at timestamptz` em `public.tickets` (nullable).

Backfill: preencher `closed_at = updated_at` para todos os tickets existentes cujo `status IN ('resolvido','fechado')` e `closed_at IS NULL` — assim os chamados já fechados ficam com uma data razoável retroativa.

Trigger `BEFORE UPDATE ON tickets` (SECURITY DEFINER, search_path public):
- Quando `NEW.status` muda para `'resolvido'` ou `'fechado'` e `OLD.status` não era → setar `NEW.closed_at = now()`.
- Quando `NEW.status` muda de fechado para reaberto (`aberto`/`em_andamento`) → setar `NEW.closed_at = NULL`.

Isso garante consistência mesmo se o status for alterado por outras vias (admin, edge function, etc.).

### 2. Hook `useUpdateTicketStatus`
Após a migração, o trigger cuida do timestamp automaticamente. Manter o hook como está, mas:
- Incluir `closed_at` no `changed_fields` do log de auditoria quando o status mudar para fechado/resolvido (informativo).

### 3. Tipos e exibição
- `src/hooks/useTickets.ts`: incluir `closed_at` nos `select(...)` da listagem e do detalhe, e na interface `TicketDetail`/`TicketListItem`.
- `src/pages/gestao/GestaoDetalhesChamado.tsx`: mostrar no painel de informações:
  - **Data de abertura**: `created_at` (já exibido em alguns lugares — padronizar rótulo).
  - **Data de fechamento**: `closed_at` (formatado em pt-BR; só exibe quando preenchido).
- `src/pages/gestao/GestaoChamados.tsx`: opcional — adicionar coluna "Fechado em" na tabela (ao lado de "Atualizado em").

## Arquivos afetados
- Migração SQL nova (coluna + backfill + trigger).
- `src/hooks/useTickets.ts` (select + interface).
- `src/hooks/useTicketMutations.ts` (audit log informativo).
- `src/pages/gestao/GestaoDetalhesChamado.tsx` (exibição).
- `src/pages/gestao/GestaoChamados.tsx` (coluna opcional na tabela).

## Detalhes técnicos
- A trigger no banco é a fonte de verdade — qualquer caminho que altere status (UI, edge function, admin) registra corretamente.
- `closed_at` é zerado em reabertura, garantindo que o campo sempre reflete o último fechamento ativo.
- Sem alterações de RLS necessárias (a coluna herda as políticas existentes da tabela).
