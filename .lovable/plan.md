## EDU-02 — Protocolo de recebimento (uploader + soft-delete pelo cliente) — v2

### 1) Migration

Arquivo: `supabase/migrations/<timestamp>_edu02_uploader_e_soft_delete_cliente.sql`

**a. RPC `public.get_uploader_names(_ids uuid[])`** — resolve nome do uploader com escopo real:
- `SECURITY DEFINER`, `STABLE`, `SET search_path = public`.
- Retorna `TABLE(user_id uuid, display_name text)`.
- Corpo:
  ```sql
  select distinct p.id,
         trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))
  from public.profiles p
  where p.id = any(_ids)
    and exists (
      select 1 from public.documento_arquivo d
      where d.created_by = p.id
        and d.excluido = false
        and (
          public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
          or d.cliente_id = public.resolve_user_cliente_id(auth.uid())
        )
    );
  ```
- `REVOKE ALL ... FROM public;` e `GRANT EXECUTE ... TO authenticated;`.
- Efeito: equipe resolve normalmente; cliente só resolve nomes de uploaders dos próprios documentos.

**b. RPC `public.soft_delete_documento_cliente(_id uuid)`** — único caminho de exclusão pelo cliente:
- `SECURITY DEFINER`, **VOLATILE**, `SET search_path = public`, `LANGUAGE plpgsql`.
- Valida posse dentro da função: linha existe, `fonte = 'cliente'`, `excluido = false` e `cliente_id = public.resolve_user_cliente_id(auth.uid())`.
- Se ok: `update public.documento_arquivo set excluido = true, updated_at = now() where id = _id`.
- Senão: `raise exception 'documento não encontrado ou sem permissão' using errcode = '42501';`.
- `REVOKE ALL ... FROM public;` e `GRANT EXECUTE ... TO authenticated;`.
- **Não** é criada policy de `UPDATE` para o cliente em `documento_arquivo` — o cliente segue sem privilégio de UPDATE na tabela, impedindo alteração de outras colunas (`gcs_uri`, `nome_original`, etc.).

### 2) Hooks (`src/hooks/useDocumentoArquivo.ts`)

- **Novo `useUploaderNames(userIds: string[])`**: `useQuery` com key `['uploader-names', sortedIds.join(',')]`, chama `supabase.rpc('get_uploader_names', { _ids })`, `select` retorna `Record<uuid, string>`, `enabled: userIds.length > 0`.
- **Ajustar `useExcluirDocumento`**: em vez de `.from('documento_arquivo').update({ excluido: true })`, chamar `supabase.rpc('soft_delete_documento_cliente', { _id: id })`. Manter invalidation e toasts atuais. (Uso interno da equipe permanece sem regressão porque as telas internas de exclusão de documento não usam esse hook — se algum caller interno usar, ajustar para uma variante que continue via `update` direto, autorizada pela policy de team_member+; conferir usos antes de aplicar.)
  - Pré-checagem: `rg "useExcluirDocumento" src` para confirmar que os únicos consumidores relevantes ao cliente são MeusDocumentos/DocumentosTab. Se `DocumentosTab` (uso interno) também consome, dividir em dois hooks: `useSoftDeleteDocumentoCliente` (RPC) e manter `useExcluirDocumento` (update direto) para equipe.

### 3) Front cliente — `src/pages/cliente/MeusDocumentos.tsx`

- Importar `useUploaderNames` e o hook de soft-delete de cliente (RPC).
- Derivar `uploaderIds` de `docsCliente.map(d => d.created_by).filter(Boolean)` (únicos).
- Subtítulo de cada item: `formatBytes(...) · dd/MM/yyyy 'às' HH:mm · enviado por <nome ?? '—'>`.
- Botão `Trash2` com `AlertDialog` de confirmação (padrão de `DocumentosTab`) → dispara a RPC → invalida a lista.

### 4) Front interno — tela principal + aba

- **Principal**: `src/pages/equipe/osg/DocumentosCliente.tsx` — acrescentar `useUploaderNames` e exibir `· enviado por <nome> em DD/MM/AAAA HH:MM` em cada card/linha (ler `created_by` e `created_at`).
- **Aba (modais)**: `src/components/equipe/osg/documentos/DocumentosTab.tsx` — mesmo acréscimo textual no `<p className="text-xs …">`, formatando data + hora curta (`toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })`).

### 5) GATE (validar no dev)

1. Cliente em `/cliente/documentos`: cada card mostra "enviado por <nome> · DD/MM/AAAA HH:MM".
2. Equipe em `DocumentosCliente` (e na aba `DocumentosTab`): mesmo texto.
3. Cliente remove documento próprio → some da lista e não volta ao recarregar; via console tentar `supabase.rpc('soft_delete_documento_cliente', { _id: <doc de outro cliente> })` → erro `42501`.
4. **Novo — hardening**: como cliente, tentar `supabase.from('documento_arquivo').update({ gcs_uri: 'x' }).eq('id', <próprio doc>)` e `.update({ nome_original: 'x' })` → falha por ausência de policy de UPDATE. Mesmo teste com `excluido: true` → também falha (o único caminho é a RPC).
5. Regressão: team_member+ continua vendo/inserindo/atualizando `documento_arquivo` normalmente; policies SELECT/INSERT do cliente inalteradas.

### Fora de escopo
- Backend `psa-backend-api` e ETL.
- Reativação de documentos excluídos.
- Auditoria (`useAuditLog`) — mantém comportamento atual do módulo.
