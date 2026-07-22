# EDU-01 — Documentos na Área do Cliente

Permitir que o cliente (role `client`) anexe e liste seus próprios documentos na Área do Cliente, reusando o pipeline OSG (sign-upload → PUT GCS → finalize → insert em `documento_arquivo`).

## 1. Migration RLS (aditiva, `to authenticated`)

Arquivo: `supabase/migrations/<ts>_documento_arquivo_cliente_portal_rls.sql`

Duas policies novas, sem tocar nas existentes de `team_member+`/admin:

```sql
create policy "cliente can view own documento_arquivo"
on public.documento_arquivo for select to authenticated
using (
  fonte = 'cliente'
  and excluido = false
  and cliente_id = public.resolve_user_cliente_id(auth.uid())
);

create policy "cliente can insert own documento_arquivo"
on public.documento_arquivo for insert to authenticated
with check (
  fonte = 'cliente'
  and cliente_id = public.resolve_user_cliente_id(auth.uid())
);
```

Sem UPDATE/DELETE para cliente nesta fase (fora de escopo). `resolve_user_cliente_id` retorna `null` para quem não é representante → igualdade nunca casa, isolando por construção.

## 2. Frontend

### 2.1 Hooks (extensão de `src/hooks/useDocumentoArquivo.ts`)
Reusa `enviarUmDocumento`. Novos hooks enxutos que não exigem `vinculo`:

- `useUploadDocumentoCliente()` — chama `enviarUmDocumento` com `vinculo={}`, `categoria='outros'`, `fonte='cliente'`. Invalida a lista.
- Já existem `useDocumentosByCliente(clienteId)` e `useBaixarDocumento` — reusar direto.

### 2.2 Página `src/pages/cliente/MeusDocumentos.tsx`
- Usa `useClienteAtual()` para obter `cliente_id`.
- Se `cliente_id == null` (e não carregando): card de aviso "Sua conta ainda não está vinculada a um cliente. Fale com a PSA." — sem uploader.
- Se vinculado:
  - **Dropzone nativo, mesmo padrão do `DocUploadDialog` da OSG**: `<input type="file" multiple>` oculto + handlers `onDragOver` / `onDragLeave` / `onDrop` em um `<div>` que atua como área de arrastar-e-soltar. **Não** adicionar `react-dropzone` — sem nova dependência.
  - Validar cada arquivo com `ACCEPT` / `MAX_BYTES` de `docMeta.ts` e disparar `useUploadDocumentoCliente.mutate` para cada um.
  - Lista simples (nome, data, botão download) usando `useDocumentosByCliente`; a própria RLS garante `fonte='cliente'`, mas mantemos filtro defensivo no client.
- Segue padrões visuais das outras páginas `/cliente/*`.

### 2.3 Rota e navegação
- `src/App.tsx`: `<Route path="/cliente/documentos" element={<ProtectedRoute><MeusDocumentos /></ProtectedRoute>} />`.
- `src/pages/cliente/ClienteDashboard.tsx`: novo card/atalho "Meus Documentos" apontando para `/cliente/documentos`.

## 3. Fora de escopo (não tocar)
- Policies existentes `team_member+`/admin em `documento_arquivo`.
- Endpoints Cloud Run (`sign-upload`, `finalize`, `sign-download`).
- Metadados "quem enviou/quando" (EDU-02) e checklist/classificação (EDU-03).
- UPDATE/DELETE pelo cliente.

## 4. GATE (validar em dev)
1. Cliente vinculado: dropzone → arquivo aparece no GCS, linha em `documento_arquivo` com `fonte='cliente'` e `cliente_id` correto, aparece na lista, persiste após reload; download funciona.
2. Cliente sem representante: mensagem "conta não vinculada"; uploader ausente; nenhum erro cru.
3. Isolamento: usuário do cliente A não vê linhas do cliente B nem linhas `fonte='psa'` (validar via tela e via SQL).
4. Regressão OSG: team_member continua vendo/inserindo documentos em `Documentos do Cliente` normalmente.

## Detalhes técnicos
- `ambiente` é setado por `enviarUmDocumento` a partir de `sign.ambiente ?? currentAmbiente`.
- `excluido=false` e `status='ativo'` já são filtrados por `useDocumentosByCliente`.
- `categoria='outros'` é valor válido do enum `osg_doc_categoria`.
