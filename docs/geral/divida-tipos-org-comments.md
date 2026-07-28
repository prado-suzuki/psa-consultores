# Dívida técnica — casts de tipo em `useDomainOrgComments`

**Arquivo:** `src/hooks/useDomainOrgComments.ts`
**Criado em:** 2026-07-27 (feature de comentários e anexos)
**Plano:** `docs/planos/plano-comentarios-mencoes-feed.md` (§3.2, §3.8, §6)

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

## Como pagar

1. Aplicar as migrations EDU-08..EDU-13 e os ajustes posteriores no banco alvo.
2. Regenerar `src/integrations/supabase/types.ts`.
3. Em `useDomainOrgComments.ts`: remover as interfaces `SupabaseResult`, `FeedViewQuery`
   `AttachmentQuery`, `UpdateCommentQuery` e o tipo `CriarOrgCommentRpc`; trocar `supabase.from(VIEW as never)` por
   `supabase.from(VIEW)` e `(supabase.rpc as unknown as ...)(RPC, params)` por
   `supabase.rpc(RPC, params)`; apagar o bloco de aviso no topo do arquivo.
4. Rodar `bun run typecheck` — é aqui que uma divergência de nome/coluna aparece.
5. Apagar este arquivo.
