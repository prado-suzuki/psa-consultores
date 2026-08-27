-- 20260824212259_notificacao_envio_created_at.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- 20260824205811_notificacao_envio_created_at.sql
-- Duas correcoes na `notificacao_envio`, aditivas e independentes. Achadas no teste
-- da GES-04 em 24/08/2026.
--
-- 1. `enviado_em` PERDE o `default now()`. A linha nasce ANTES do envio (reserva ->
--    envia -> confirma, ALE-15), entao "enviado em = agora" no insert e falso. O
--    `reservar_envio` ja grava null explicitamente por cima, entao hoje nada quebra
--    -- mas o default e promessa a qualquer escritor futuro que omita a coluna, e
--    produziria linha afirmando um envio que nao houve, sem erro. E fossil do padrao
--    antigo (`notify-ticket`), em que a linha era gravada DEPOIS de enviar.
--
-- 2. Entra `created_at`. A tabela tem 21 colunas e nenhuma de criacao: "quando esta
--    linha foi reservada" so se responde hoje fazendo parsing da chave de
--    idempotencia. E inconsistencia, nao decisao -- a tabela irma `notificacao`, da
--    mesma migracao da EDU-1, tem `created_at`. Nome em ingles pela convencao medida
--    em producao: 123 tabelas com `created_at` contra 6 com `criado_em`, e as seis
--    sao todas do modulo PERDCOMP/DIFAL.
--
--    ACEITA NULO E SEM BACKFILL, por decisao de 24/08/2026. Linha anterior fica
--    null, que se le como "reservada antes de a coluna existir" -- verdade. Com
--    `not null default now()` as 67 linhas de avisos de chamado reais que existem em
--    producao (14 a 20/08) passariam a afirmar que nasceram no instante do deploy.
--    Coluna nova nao inventa passado.
--
-- NAO decide a regua de cobranca da GES-04: vale em qualquer um dos caminhos.
-- IDEMPOTENTE: `drop default` e no-op se ja removido; `add column if not exists`.

alter table public.notificacao_envio
  alter column enviado_em drop default;

alter table public.notificacao_envio
  add column if not exists created_at timestamptz default now();

comment on column public.notificacao_envio.created_at is
  'Quando a linha foi RESERVADA (reservar_envio), nao quando a mensagem saiu -- isso e enviado_em, preenchido depois pelo confirmar_envio. Nulo em linhas anteriores a 24/08/2026, quando a coluna passou a existir: sem backfill, de proposito, para nao inventar passado.';

comment on column public.notificacao_envio.enviado_em is
  'Quando a mensagem saiu de fato, preenchido pelo confirmar_envio. Nulo enquanto o envio nao se confirma -- a linha nasce antes do envio (reserva -> envia -> confirma, ALE-15). Perdeu o default now() em 24/08/2026: era fossil da ordem antiga, em que a linha era gravada depois de enviar.';
