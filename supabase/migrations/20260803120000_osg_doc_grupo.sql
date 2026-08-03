-- EDU-19 · O grupo (gaveta da área do cliente) vira dado gravado, não palpite.
--
-- Hoje nenhuma tabela guarda em qual das 4 gavetas da área do cliente um
-- documento aparece; cada tela deduz do seu jeito:
--   - área do cliente   → deduz do texto de `entidade`  (grupoDaEntidade, src/lib/coletaDocumentosCliente.ts)
--   - arquivo recebido  → deduz da `categoria`          (grupoDaCategoria, src/lib/agrupadorDocumentos.ts)
--   - tela do consultor → lista própria                 (ONBOARDING_GROUPS, src/lib/onboarding.ts)
-- Em 31/07/2026 mediu-se em produção que as duas primeiras discordam em 4 dos
-- 58 itens do catálogo: o documento pedido cai numa gaveta e o arquivo recebido
-- em outra. Daqui em diante o grupo é coluna.
--
-- Esta migration SÓ cria o tipo e a coluna. Não carrega valor em linha nenhuma
-- (é a ALE-26, que também troca a coluna para NOT NULL) e não toca no front
-- (é a EDU-26, que alinha a lib canônica para a chave `bens_imoveis`).
--
-- ORDEM IMPORTA: a EDU-20 renomeia `checklist_item_padrao` para `documento_tipo`.
-- Esta migration roda ANTES dela e por isso usa o nome antigo. A migration da
-- EDU-20 precisa ter timestamp posterior a 20260803120000.
--
-- Reversão:
--   alter table public.checklist_item_padrao drop column if exists grupo;
--   drop type if exists public.osg_doc_grupo;

BEGIN;

-- CREATE TYPE não aceita IF NOT EXISTS → guard, no mesmo padrão de
-- 20260707130000_osg_checklist_schema.sql (linhas 11-19).
-- Os 4 valores nascem juntos de propósito: ALTER TYPE ... ADD VALUE não roda
-- dentro de transação, e assim esta migration continua sendo um arquivo só.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_doc_grupo') then
    create type public.osg_doc_grupo as enum ('pf', 'pj', 'bens_imoveis', 'outros');
  end if;
end $$;

-- Nulável e sem default de propósito: as 58 linhas existentes ainda não têm
-- valor, e um NOT NULL aqui faria a migration falhar. O NOT NULL entra na
-- ALE-26, depois da carga.
alter table public.checklist_item_padrao
  add column if not exists grupo public.osg_doc_grupo;

comment on column public.checklist_item_padrao.grupo is
  'Gaveta da área do cliente em que o documento aparece. Dado gravado, não inferido de entidade nem de categoria.';

COMMIT;
