## Causa raiz

O erro `duplicate key value violates unique constraint "dcomp_pkey"` ocorre porque já existe na tabela `public.dcomp` um registro com exatamente o mesmo `nr_documento` (`401329420313042513190760`), mas ele está **soft-deletado** (`excluido = 'E'`).

Detalhes verificados no banco:
- A PK de `dcomp` é `nr_documento` (não composta).
- Padrão do projeto: leituras filtram `excluido` ≠ preenchido, então o DCOMP excluído não aparece na UI nem nas listas de "DCOMPs existentes" do `DcompFormModal.tsx` (linha ~140, `.or('excluido.is.null,excluido.eq.')`).
- O usuário, sem ver o registro, tenta criar de novo. O `INSERT` em `DcompFormModal.tsx` (mutação `createMutation`) bate diretamente na PK e estoura o erro do Postgres, traduzido pela `toast` como "duplicate key…".

Ou seja: não é um bug de digitação nem de PER duplicado — é colisão com um DCOMP previamente excluído logicamente que continua ocupando a chave primária.

## Estratégia de correção

Em vez de bloquear o usuário, tratar o caso de forma transparente: ao detectar que o `nr_documento` informado já existe **somente como soft-delete**, **reativar** o registro com os novos dados (UPSERT seletivo, mantendo o UUID/PK original — em linha com o padrão do projeto "no delete-reinsert / preserve original UUIDs").

Quando existir um registro **vigente** (não excluído) com o mesmo número, manter o bloqueio, mas com mensagem clara.

### Mudanças propostas

1. `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` — `createMutation`:
   - Antes do `INSERT`, fazer `SELECT nr_documento, excluido FROM dcomp WHERE nr_documento = :digits LIMIT 1`.
   - Se não existir → `INSERT` normal (fluxo atual).
   - Se existir e `excluido` estiver vazio/null → abortar com toast: "Já existe um DCOMP ativo com este número. Edite-o em vez de criar um novo."
   - Se existir e `excluido` estiver preenchido (soft-delete) → fazer `UPDATE` setando todos os campos do form **e** `excluido = null`, `nr_cancelamento = null`, atualizando `dt_envio`, `imposto`, `vlr_compensado`, etc. (mantém o UUID/PK original, conforme padrão `no-delete-reinsert-standard`). Toast: "DCOMP reativado com os novos dados."
   - Disparar `syncPerdcompToDW` com o registro reativado (igual ao fluxo atual).
   - Invalidar as mesmas queries já invalidadas hoje.
   - Registrar a operação via `useAuditLog` com `action: 'updated'` e diff dos campos relevantes (entity_type `dcomp`).

2. Tradução de erro genérico: caso ainda assim caia em `23505` (race condition), interceptar `error.code === '23505'` no `onError` e mostrar mensagem amigável ("Já existe um DCOMP com este número. Verifique e tente novamente.") em vez do texto bruto do Postgres.

3. Sem alterações de schema/migration, sem mexer em RLS, sem mudar a lógica de soft-delete existente.

### Verificação

- Reproduzir o cenário do print (usar mesmo `nr_documento` já excluído) e confirmar que o registro é reativado sem erro.
- Tentar criar com um `nr_documento` de um DCOMP **ativo** e confirmar a nova mensagem de bloqueio.
- Conferir no log de auditoria a entrada `updated` com o diff.

## Detalhes técnicos

- A coluna `excluido` em `dcomp` é texto (no registro encontrado vale `'E'`, não boolean) — manter tratamento `IS NULL OR = ''` para "vigente".
- Continuar passando `nr_documento` por `stripToDigits` antes de qualquer query/mutação.
- Não mudar a query `dcomps-existentes` (lista de retificação): ela deve continuar ignorando excluídos.
