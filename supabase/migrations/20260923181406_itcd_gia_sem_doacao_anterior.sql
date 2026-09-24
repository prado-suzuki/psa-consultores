-- Sai `itcd_simulacao_gia.vlr_doacao_anterior`, que ficou sem quem a preencha.
--
-- A coluna nasceu na 20260831100000 para a acumulação da Lei 10.488/2016 (mesmo doador ·
-- mesmo beneficiário · mesmo ano civil). A OSG não acompanha doação anterior — o sistema
-- da SEFAZ acumula sozinho ao emitir a guia —, e o campo saiu da tela em 31/08/2026: o
-- controlador manda sempre nulo, e a coluna está nula em toda linha, no sandbox e em
-- produção. O motor (`simulacao.ts`) mantém a capacidade, sem produtor; é decisão
-- registrada no próprio controlador, e não muda aqui.
--
-- A trava `itcd_simulacao_gia_vlr_doacao_anterior_check` sai junto com a coluna: o
-- Postgres remove sozinho a restrição que só olha para ela.
--
-- ── ORDEM, E POR QUE ESTA MIGRAÇÃO É SEPARADA ───────────────────────────────────
--
-- É destrutiva, e dois leitores dependem da coluna:
--
--   1. a função `itcd_gravar_simulacao` — deixa de gravá-la na 20260923180813, e a
--      conferência abaixo recusa rodar antes dela;
--   2. o front: `useSimulacoesItcmd` seleciona `vlr_doacao_anterior`, e o PostgREST
--      recusa select de coluna que não existe. Rodar esta migração antes de o front
--      parar de ler DERRUBA O HISTÓRICO DA CALCULADORA. No sandbox, isso vale para
--      todo mundo na `develop`; em produção, esta migração só vai depois que o front
--      sem a coluna estiver na `main`.
--
-- Idempotente: `drop column if exists`, e a conferência passa na segunda vez.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'itcd_gravar_simulacao'
      and p.prosrc like '%vlr_doacao_anterior%'
  ) then
    raise exception
      'itcd_gravar_simulacao ainda grava vlr_doacao_anterior. Aplique antes a 20260923180813_suc02_base_comparada_e_apresentacao_sucessoria.';
  end if;
end $$;

alter table public.itcd_simulacao_gia drop column if exists vlr_doacao_anterior;
