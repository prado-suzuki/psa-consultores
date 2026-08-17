-- 20260814180000_notificacao_envio_status.sql
-- ALE-2 · Estado de envio, idempotência com garantia e correlação com o provedor.
--
-- ⚠️ PROCEDÊNCIA: aplicada em 14/08/2026 FORA do fluxo padrão do Lovable, por
-- execução SQL direta, com autorização do Alexandre. Motivo: os créditos do
-- Lovable estavam escassos (3 restantes) e cada mensagem ao agente é cobrada;
-- a publicação das edge functions `notificar` e `notificacao-status` não tem
-- alternativa fora do Lovable, mas ESTE arquivo tem.
--
-- Consequência: NÃO está registrada em supabase_migrations.schema_migrations.
-- Ambiente novo ou restauração não a reproduz até a próxima aplicação oficial.
-- Ela se cura sozinha: todo o arquivo é IF NOT EXISTS / CREATE OR REPLACE, então
-- quando o Lovable aplicar migrações oficialmente, roda sem erro, sem duplicar
-- nada, e o registro entra. Mesmo caminho documentado em
-- docs/ALE-1-registro-notificacao-tipo-chamado.md.
--
-- Isto é diferente de documento_arquivo.revisao, que foi aplicada fora do fluxo
-- SEM arquivo nenhum e por isso não tem como se curar. Ver
-- docs/geral/banco-notificacoes-mudancas.md, item 5.
--
-- Molde: 20260812120000_notificacao_base.sql (EDU-1), que criou a tabela e a
-- registrar_envio. Esta migração acrescenta em cima, sem recriar nada.
--
-- POR QUE
--   1. `sucesso boolean` tem 2 estados e o fluxo tem 6. Hoje "cliente sem
--      telefone" e "a Meta recusou" viram os dois `false`, indistinguíveis --
--      o primeiro é esperado, o segundo é erro.
--   2. `sucesso` é gravado com o retorno HTTP da chamada ao n8n, ou seja
--      "o n8n aceitou o POST", não "o cliente recebeu".
--   3. `enviado_em NOT NULL` impede criar linha ANTES do envio, então a tabela
--      só registra o que já aconteceu -- não consegue registrar intenção. Sem
--      isso não há como fechar a janela em que a função de borda morre entre o
--      envio e o registro, e a mensagem sai sem deixar rastro.
--   4. Sem guardar o identificador do provedor (`wamid`), o webhook de status
--      da Meta chega e não há como saber a qual linha pertence.
--
-- CONFERIDO NO BANCO EM 14/08/2026, NÃO PRESUMIDO
--   notificacao_envio existe, tem 0 linhas (logo, sem backfill a decidir), e
--   suas colunas NOT NULL ou têm default (id, sucesso, metadata, enviado_em) ou
--   são preenchidas pela registrar_envio (canal, tipo, entidade_tipo,
--   entidade_id); registrar_envio existe com 13 parâmetros, 9 com DEFAULT;
--   notificacao_canal = sino|email|whatsapp; RLS está ativa na tabela com 1
--   policy, e a registrar_envio é SECURITY DEFINER com owner postgres, então a
--   escrita não passa por policy.
--
-- DECISÕES
--   - `sucesso` FICA, agora derivado do status. A notify-ticket está em produção
--     chamando registrar_envio e não deve precisar de alteração por causa desta
--     migração. Remover a coluna é uma segunda passada, depois que nada mais a lê.
--   - DEFAULT 'pendente' e não 'enviado': linha gravada sem status explícito não
--     deve afirmar que foi enviada. É o mesmo tipo de afirmação sem base que
--     esta migração existe para corrigir.
--   - Estados AVANÇAM (pendente -> enviado -> entregue -> lido). A confirmar_envio
--     não deixa regredir, porque a Meta pode entregar webhooks fora de ordem.
--   - Índice de idempotência é PARCIAL e a coluna é nulável, para não invalidar
--     as linhas da notify-ticket, que não vai preencher a chave de imediato.
--
-- REVERSÃO
--   drop function if exists public.confirmar_envio(uuid, notificacao_envio_status, text, text, text);
--   drop function if exists public.reservar_envio(text, notificacao_canal, notificacao_tipo, text, uuid, uuid, text, text, text, jsonb);
--   drop index if exists public.notificacao_envio_provedor_msg_idx;
--   drop index if exists public.notificacao_envio_idem_uidx;
--   alter table public.notificacao_envio
--     drop column if exists provedor_message_id,
--     drop column if exists chave_idempotencia,
--     drop column if exists erro_codigo,
--     drop column if exists lido_em,
--     drop column if exists entregue_em,
--     drop column if exists status;
--   drop type if exists public.notificacao_envio_status;
--   -- e restaurar registrar_envio da 20260812120000_notificacao_base.sql

BEGIN;

-- ── 1) O estado ──────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type t
                   join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'notificacao_envio_status' and n.nspname = 'public') then
    create type public.notificacao_envio_status as enum (
      'pendente',   -- linha reservada, envio ainda não confirmado
      'enviado',    -- o provedor aceitou. NÃO é prova de entrega
      'entregue',   -- 2 tiques. Só WhatsApp, e só com o webhook da Meta assinado
      'lido',       -- 2 tiques azuis. Idem
      'falhou',
      'ignorado'    -- sem destinatário alcançável: esperado, não é erro
    );
  end if;
end $$;

alter table public.notificacao_envio
  add column if not exists status              public.notificacao_envio_status not null default 'pendente',
  add column if not exists entregue_em         timestamptz,
  add column if not exists lido_em             timestamptz,
  add column if not exists erro_codigo         text,
  add column if not exists chave_idempotencia  text,
  add column if not exists provedor_message_id text;

alter table public.notificacao_envio
  alter column enviado_em drop not null;

comment on column public.notificacao_envio.status is
  'Estados avançam: pendente -> enviado -> entregue -> lido. `entregue` e `lido` só são preenchidos pelo webhook messages da Meta; no e-mail via nó Gmail não existe sinal de entrega, então lá o estado final é `enviado`.';
comment on column public.notificacao_envio.erro_codigo is
  'Código numérico do provedor, separado de `erro` porque a decisão de retry depende do número: 130429/131000/133004/2 são transitórios; 132000/132001/132015/190/100 são permanentes.';
comment on column public.notificacao_envio.chave_idempotencia is
  'tipo:entidade_tipo:entidade_id:canal:destinatario:AAAA-MM-DD. A data no fim deixa a cobrança diária repetir dia após dia e impede o mesmo aviso sair duas vezes no mesmo dia.';
comment on column public.notificacao_envio.provedor_message_id is
  'wamid do WhatsApp. Vem na resposta do envio e volta no webhook de status: é a única cola entre os dois.';
comment on column public.notificacao_envio.sucesso is
  'MANTIDA por compatibilidade com notify-ticket. Derivada de status; a fonte de verdade é `status`.';

-- ── 2) Índices ───────────────────────────────────────────────────────────────
-- Parciais de propósito: as linhas da notify-ticket não preenchem estas colunas,
-- e um índice único total recusaria a segunda linha com chave nula.

create unique index if not exists notificacao_envio_idem_uidx
  on public.notificacao_envio (chave_idempotencia)
  where chave_idempotencia is not null;

create index if not exists notificacao_envio_provedor_msg_idx
  on public.notificacao_envio (provedor_message_id)
  where provedor_message_id is not null;

-- ── 3) registrar_envio: mesma assinatura, agora grava o estado ────────────────
-- MESMOS 13 parâmetros na MESMA ordem. A notify-ticket em produção chama com 7
-- deles por nome e não pode precisar de alteração por causa desta migração.
-- O que muda é só o INSERT, que passa a preencher `status` derivado do _sucesso.

create or replace function public.registrar_envio(
  _canal            public.notificacao_canal,
  _tipo             public.notificacao_tipo,
  _entidade_tipo    text,
  _entidade_id      uuid,
  _notificacao_id   uuid    default null,
  _destinatario_id  uuid    default null,
  _email            text    default null,
  _telefone         text    default null,
  _papel            text    default null,
  _agrupamento      text    default null,
  _sucesso          boolean default true,
  _erro             text    default null,
  _metadata         jsonb   default '{}'::jsonb)
returns uuid
language sql
security definer
set search_path to 'public'
as $function$
  insert into public.notificacao_envio (
    notificacao_id, canal, tipo, entidade_tipo, entidade_id, agrupamento_chave,
    destinatario_id, destinatario_email, destinatario_telefone,
    destinatario_papel, sucesso, erro, metadata, status, enviado_em)
  values (_notificacao_id, _canal, _tipo, _entidade_tipo, _entidade_id, _agrupamento,
          _destinatario_id, _email, _telefone, _papel, _sucesso, _erro,
          coalesce(_metadata, '{}'::jsonb),
          case when _sucesso then 'enviado' else 'falhou' end::public.notificacao_envio_status,
          now())
  returning id;
$function$;

comment on function public.registrar_envio is
  'Registro em UM passo, para quem grava depois de enviar (notify-ticket). Quem precisa fechar a janela entre envio e registro usa reservar_envio + confirmar_envio.';

-- ── 4) reservar_envio: a reserva É a checagem de dedup ───────────────────────
-- Devolve o id quando ganhou a vaga, e NULL quando a chave já existia. Checar e
-- reservar na mesma operação é o que elimina a corrida do jaEnviadoHoje, que
-- consulta e depois decide -- duas execuções simultâneas passam as duas.

create or replace function public.reservar_envio(
  _chave            text,
  _canal            public.notificacao_canal,
  _tipo             public.notificacao_tipo,
  _entidade_tipo    text,
  _entidade_id      uuid,
  _destinatario_id  uuid  default null,
  _email            text  default null,
  _telefone         text  default null,
  _papel            text  default null,
  _metadata         jsonb default '{}'::jsonb)
returns uuid
language sql
security definer
set search_path to 'public'
as $function$
  insert into public.notificacao_envio (
    chave_idempotencia, canal, tipo, entidade_tipo, entidade_id,
    destinatario_id, destinatario_email, destinatario_telefone,
    destinatario_papel, metadata, status, sucesso, enviado_em)
  values (_chave, _canal, _tipo, _entidade_tipo, _entidade_id,
          _destinatario_id, _email, _telefone, _papel,
          coalesce(_metadata, '{}'::jsonb), 'pendente', false, null)
  -- O predicado tem de ser repetido: o índice é PARCIAL, e sem ele o Postgres
  -- recusa com "no unique or exclusion constraint matching the ON CONFLICT
  -- specification". _chave nunca é nulo aqui, então a inferência casa.
  on conflict (chave_idempotencia) where chave_idempotencia is not null do nothing
  returning id;
$function$;

comment on function public.reservar_envio is
  'Reserva a vaga antes do envio e devolve o id; NULL significa que a chave já existia e o envio deve ser abortado. `sucesso` nasce false porque nada saiu ainda -- a fonte de verdade é status = pendente.';

-- ── 5) confirmar_envio: fecha a linha, sem deixar o estado regredir ──────────
-- A Meta pode entregar webhooks fora de ordem (há caso documentado do mesmo
-- wamid gerar `delivered` e depois `failed`). Por isso o UPDATE só avança:
-- pendente(0) -> enviado(1) -> entregue(2) -> lido(3). `falhou` e `ignorado`
-- são terminais e sempre podem ser gravados a partir de pendente.

create or replace function public.confirmar_envio(
  _id                  uuid,
  _status              public.notificacao_envio_status,
  _provedor_message_id text default null,
  _erro_codigo         text default null,
  _erro                text default null)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.notificacao_envio e
     set status      = _status,
         sucesso     = (_status in ('enviado','entregue','lido')),
         erro_codigo = coalesce(_erro_codigo, e.erro_codigo),
         erro        = coalesce(_erro, e.erro),
         provedor_message_id = coalesce(_provedor_message_id, e.provedor_message_id),
         enviado_em  = case when _status = 'enviado'  then coalesce(e.enviado_em,  now()) else e.enviado_em  end,
         entregue_em = case when _status = 'entregue' then coalesce(e.entregue_em, now()) else e.entregue_em end,
         lido_em     = case when _status = 'lido'     then coalesce(e.lido_em,     now()) else e.lido_em     end
   where e.id = _id
     and (
       -- terminal: só a partir de pendente, para não apagar uma entrega confirmada
       (_status in ('falhou','ignorado') and e.status = 'pendente')
       -- avanço: o novo estado tem de ser mais adiantado que o atual
       or array_position(array['pendente','enviado','entregue','lido']::text[], _status::text)
        > array_position(array['pendente','enviado','entregue','lido']::text[], e.status::text)
     );
$function$;

comment on function public.confirmar_envio is
  'Fecha a linha reservada. Só AVANÇA o estado: webhook atrasado da Meta não rebaixa uma mensagem já marcada como lida. Terminal (falhou/ignorado) só a partir de pendente.';

COMMIT;
