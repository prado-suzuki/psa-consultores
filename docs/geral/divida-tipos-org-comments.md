# Dívida técnica — casts de tipo nos comentários (`org_comments`)

**Arquivos:** `src/hooks/useDomainOrgComments.ts`, `src/hooks/useDomainFeedComentarios.ts`
**Criado em:** 2026-07-27 (feature de comentários e anexos)
**Ampliado em:** 2026-07-29 (feed de comentários — RPC `feed_org_comments`)
**Plano:** `docs/planos/plano-comentarios-mencoes-feed.md` (§3.2, §3.8, §6, §10)

## O fato

As migrations da view `public.org_comments_feed`, da função
`public.criar_org_comment` e das tabelas satélites já existem, mas
`src/integrations/supabase/types.ts` (autogerado, não editável) ainda não foi
regenerado e não conhece esses contratos.

Para compilar, o hook usa o contorno que o repo já adota em
`useCatalogoTributos.ts`, `useDomainBoardDashboard.ts` e `useProcedimentos.ts`:

```ts
const VIEW = 'org_comments_feed';
const RPC = 'criar_org_comment';

await (supabase.from(VIEW as never) as unknown as FeedViewQuery)...
await (supabase.rpc as unknown as CriarOrgCommentRpc)(RPC, params)
```

**Achado de 2026-07-29 (caixa de menções):** `types.ts` já tem `org_comments_feed`
(Views) e `criar_org_comment` (Functions) — foi regenerado em algum momento. Mas está
**parcialmente vencido**: o `Row` da view não tem a coluna `excluido`, que a migration
`20260728140000` acrescentou. Ou seja, tipar a leitura da view direto ainda não compila
quando a consulta filtra soft delete, e o shim continua necessário. Falta também
`feed_org_comments`. O passo 2 do "como pagar" segue valendo — e é uma regeneração só,
não uma por contrato.

## Por que isso incomoda

`as never` / `as unknown as` **desligam a checagem de tipo exatamente na camada que mais
depende dela** — a fronteira com o banco. Se o Eduardo publicar a view com outro nome de
coluna, ou a RPC com outro nome de parâmetro, o TypeScript **não avisa**: quebra em runtime.

Mitigação atual: `src/hooks/useDomainOrgComments.test.tsx` trava o contrato
(nome da view, nome da RPC, os 7 parâmetros nomeados, query key, invalidações,
`enabled`, auditoria). O teste é o único guarda-corpo até `types.ts` ser regenerado.

## Contrato assumido (conferir contra a migration)

- **View:** `org_comments_feed` — colunas `id, entity_type, entity_id, project_id,
  parent_id, kind, body, metadata, author_id, author_name, editado_em, created_at,
  updated_at, entity_title, project_name, reply_count, attachment_count, excluido`;
  não filtra `excluido`, para permitir o marcador de raiz excluída em threads.
- **RPC:** `criar_org_comment(_id uuid, _entity_type org_comment_entity, _entity_id uuid,
  _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb) RETURNS uuid`.
- **RPC do feed:** `feed_org_comments(_cursor_created_at timestamptz, _cursor_id uuid,
  _limit integer) RETURNS SETOF org_comments_feed` — migration
  `20260729144600_feed_org_comments.sql`. Devolve as colunas da view, então o mesmo
  `types.ts` regenerado resolve as duas pontas. Guarda-corpo:
  `src/hooks/useDomainFeedComentarios.test.tsx` trava nome da função, os 3 parâmetros
  nomeados, a query key e a regra do cursor.

## Como pagar

1. Aplicar as migrations EDU-08..EDU-13 e os ajustes posteriores no banco alvo.
2. Regenerar `src/integrations/supabase/types.ts`.
3. Em `useDomainOrgComments.ts`: remover as interfaces `SupabaseResult`, `FeedViewQuery`,
   `FeedByIdQuery` (usada por `buscarComentariosPorId`, que a caixa de menções consome),
   `AttachmentQuery`, `UpdateCommentQuery` e o tipo `CriarOrgCommentRpc`; trocar `supabase.from(VIEW as never)` por
   `supabase.from(VIEW)` e `(supabase.rpc as unknown as ...)(RPC, params)` por
   `supabase.rpc(RPC, params)`; apagar o bloco de aviso no topo do arquivo.
   Em `useDomainFeedComentarios.ts`: remover `SupabaseResult`, `FeedRpc` e o cast em
   `supabase.rpc`; o tipo `LinhaDoFeed` passa a sair dos tipos gerados.
4. Rodar `bun run typecheck` — é aqui que uma divergência de nome/coluna aparece.
5. Apagar este arquivo.
