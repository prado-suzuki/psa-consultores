-- ✅ É ESTA QUE VAI PARA PRODUÇÃO, e não a `20260824212259`, que é o registro da
-- forma de UM passo que rodou no sandbox e carimbou as linhas existentes. A
-- diferença, e a razão dos dois comandos, está explicada mais abaixo.
--
-- 20260824205811_notificacao_envio_created_at.sql
-- Duas correcoes na `notificacao_envio`, aditivas e independentes uma da outra.
-- Achadas no teste da GES-04 em 24/08/2026.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. `enviado_em` PERDE o `default now()`
--
--    A coluna hoje promete: "se ninguem disser quando isso foi enviado, assuma
--    que foi agora". Mas a linha nasce ANTES do envio -- a ordem que a ALE-15
--    estabeleceu e reserva -> envia -> confirma, para que uma queda no meio deixe
--    rastro. No instante do insert nada saiu, e "enviado em = agora" e falso.
--
--    O `reservar_envio` sabe disso e grava `null` explicitamente por cima do
--    default, entao HOJE nada quebra: existe um escritor so, e ele e explicito.
--
--    O default e fossil do padrao antigo, que a `notify-ticket` ainda usa: la a
--    linha e gravada DEPOIS de enviar, e ali `default now()` estava correto. A
--    ordem foi invertida, o significado da coluna mudou, e o default ficou.
--
--    Por que remover: e uma promessa a QUALQUER escritor futuro. Um backfill, um
--    script de correcao ou uma funcao nova que omita a coluna cria linha
--    afirmando um envio que nao houve -- e sem erro, a linha so mente. Sem o
--    default, so quem sabe que a mensagem saiu preenche: o `confirmar_envio`.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Entra `created_at`
--
--    A tabela tem 21 colunas e NENHUMA de criacao: "quando esta linha foi
--    reservada" e hoje inrespondivel. A unica pista sempre presente e a data
--    dentro da `chave_idempotencia`, o que obriga a fazer parsing de chave para
--    responder uma pergunta trivial.
--
--    E e inconsistencia, nao decisao: a tabela irma `notificacao`, da mesma
--    migracao da EDU-1, TEM `created_at`. Esta nao ganhou porque veio de
--    migracao escrita a mao, sem o padrao do Lovable.
--
--    NOME EM INGLES por convencao medida em producao em 24/08/2026: 123 tabelas
--    usam `created_at` contra 6 com `criado_em`, e as seis sao todas do modulo
--    PERDCOMP/DIFAL (`dcomp`, `per`, `per_situacao`, `difal_sessao`,
--    `distribuicao_dcomp`, `per_with_contribuinte`).
--
--    ACEITA NULO, E SEM BACKFILL, por decisao de 24/08/2026. Linha anterior a
--    esta migracao fica `null`, que se le como "reservada antes de a coluna
--    existir" -- e verdade. Com `not null default now()` as linhas existentes
--    passariam a afirmar que nasceram no instante do deploy: em producao sao 67
--    linhas de avisos de chamado reais, de 14 a 20/08, que ficariam todas com
--    data errada. Coluna nova nao deve inventar passado.
--
--    Linha NOVA recebe `now()` pelo default, sem o `reservar_envio` precisar
--    mencionar a coluna.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- NAO decide a regua de cobranca da GES-04. Se a regua for por periodo dentro da
-- chave de idempotencia, esta coluna e melhoria de auditoria e nada mais; se for
-- por consulta de historico, ela passa a ser o dado que a consulta le. As duas
-- correcoes valem em qualquer um dos casos.
--
-- IDEMPOTENTE: `drop default` e no-op se ja removido; `add column if not exists`.

alter table public.notificacao_envio
  alter column enviado_em drop default;

-- ⚠️ DOIS PASSOS, E A ORDEM E O PONTO INTEIRO.
--
-- `add column ... default now()` num comando so NAO deixa as linhas existentes
-- nulas: o Postgres faz todas elas LEREM o default. Medido em dev em 24/08/2026 --
-- as 31 linhas da replica passaram a afirmar que nasceram no instante da migracao.
-- Em producao seriam as 67 linhas de avisos de chamado reais, de 14 a 20/08.
--
-- Adicionando SEM default, linha existente fica nula de verdade. O default entra
-- depois e vale so para insercao nova.
alter table public.notificacao_envio
  add column if not exists created_at timestamptz;

alter table public.notificacao_envio
  alter column created_at set default now();

comment on column public.notificacao_envio.created_at is
  'Quando a linha foi RESERVADA (reservar_envio), nao quando a mensagem saiu -- isso e enviado_em, preenchido depois pelo confirmar_envio. Nulo em linhas anteriores a 24/08/2026, quando a coluna passou a existir: sem backfill, de proposito, para nao inventar passado.';

comment on column public.notificacao_envio.enviado_em is
  'Quando a mensagem saiu de fato, preenchido pelo confirmar_envio. Nulo enquanto o envio nao se confirma -- a linha nasce antes do envio (reserva -> envia -> confirma, ALE-15). Perdeu o default now() em 24/08/2026: era fossil da ordem antiga, em que a linha era gravada depois de enviar.';

-- ── Conferencia depois de rodar ────────────────────────────────────────────
-- select column_name, is_nullable, coalesce(column_default,'(sem default)') as padrao
--   from information_schema.columns
--  where table_schema='public' and table_name='notificacao_envio'
--    and column_name in ('created_at','enviado_em');
--
-- Esperado:  created_at  YES  now()
--            enviado_em  YES  (sem default)
