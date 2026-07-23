# EDU-03 — Envio classificado pelo cliente (checklist)

Cliente externo passa a enviar documentos vinculados aos itens que a PSA pediu no `checklist_cliente_item`. Classificação (categoria/pessoa/bem/matrícula/checklist_item_id) é 100% server-side; o cliente só escolhe o item e o arquivo.

## 1) Migração SQL (schema-only, sem tocar dados)

Arquivo: `supabase/migrations/<timestamp>_edu03_checklist_cliente_rpcs.sql`

- `public.get_checklist_solicitado_cliente()` — `SECURITY DEFINER STABLE`, `search_path=public`. Lê `checklist_cliente_item` do cliente resolvido por `resolve_user_cliente_id(auth.uid())`, exclui status `dispensado`/`nao_aplicavel`, deriva `recebido` (status='recebido' OU existe `documento_arquivo` ativo com `checklist_item_id=i.id`) e `arquivo_nome` (mais recente ativo, `fonte='cliente'`). Rótulo por `pessoa.denominacao` / `bem.denominacao` / `Matrícula N (mun/uf)`. `REVOKE ALL FROM public; GRANT EXECUTE TO authenticated`.
- `public.anexar_documento_solicitado(_item_id, _gcs_uri, _checksum, _tamanho, _mime, _nome_original, _ambiente)` — `SECURITY DEFINER VOLATILE`, `search_path=public`. Valida:
  - `resolve_user_cliente_id(auth.uid())` não nulo (senão 42501)
  - item existe e `cliente_id` bate (senão 42501)
  - item não está em `dispensado`/`nao_aplicavel` (42501)
  - `categoria::text <> 'georreferenciamento'` (42501)
  - `position('/' || v_cliente::text || '/' in _gcs_uri) > 0` (defesa contra URI de outro cliente)
  Insere `documento_arquivo` copiando `categoria` (fallback `'outros'`), `pessoa_id`, `bem_id`, `matricula_id`, `checklist_item_id=item.id`, `fonte='cliente'`, `status='ativo'`, `created_by=auth.uid()`. Retorna `uuid`. `REVOKE/GRANT` como acima.
- Não abre policy nova em `checklist_cliente_item` nem policy de UPDATE em `documento_arquivo` para o cliente.

Após aplicar: regenerar `src/integrations/supabase/types.ts`.

## 2) Hook `src/hooks/useDocumentoArquivo.ts`

- Extrair de `enviarUmDocumento` um helper interno `subirArquivoGcs(fetchWithAuth, { clienteId, file, categoria, matriculaId?, nrMatricula? })` que faz sign-upload → PUT GCS → finalize e devolve `{ gcs_uri, checksum, tamanho, mime, ambiente }`. `enviarUmDocumento` passa a chamar o helper + o insert atual (comportamento inalterado — sem mudar payloads, chaves de query ou ordem).
- `useChecklistSolicitadoCliente(clienteId: string | null)`: `useQuery` com key `['checklist-solicitado', clienteId]`, `enabled: !!clienteId`, chama `supabase.rpc('get_checklist_solicitado_cliente')`. Tipo local `ChecklistSolicitadoItem` com os campos da RPC.
- `useUploadDocumentoSolicitado()`: mutação `{ clienteId, itemId, categoria, file }`. Recusa `categoria === 'georreferenciamento'` no cliente por segurança. Chama `subirArquivoGcs` com `categoria` (ou `'outros'` se null) e depois `supabase.rpc('anexar_documento_solicitado', {...})`. `onSuccess`: invalidar `['checklist-solicitado', clienteId]` e prefixo `[LIST_KEY, clienteId]`. Toasts padrão.

## 3) UI `src/pages/cliente/MeusDocumentos.tsx`

- Nova seção topo "Documentos solicitados" alimentada por `useChecklistSolicitadoCliente(clienteId)`. Esconder a seção se a lista vier vazia.
- Cada linha: `documento` + (` — ${rotulo_instancia}` se houver) + `entidade` como legenda. Se `recebido`: ícone check + `arquivo_nome ?? 'Recebido'`. Se pendente: botão "Enviar" que abre `<input type="file" accept={ACCEPT}>`. Valida tamanho/extensão (mesmas regras do bloco atual) e chama `useUploadDocumentoSolicitado.mutate({ clienteId, itemId, categoria, file })`. Botão desabilitado enquanto `isPending`.
- Renomear seção existente para "Outros documentos". A listagem "Documentos enviados" passa a filtrar `d.checklist_item_id == null` para não duplicar o que foi enviado via checklist.

## Segurança / fora de escopo (reforço)

- Sem UPDATE de cliente em `documento_arquivo` ou `checklist_cliente_item`. Sem SELECT policy nova no checklist. Sem alteração das policies de equipe. EDU-01/02 e georreferenciamento intactos.

## GATE

1. `rpc get_checklist_solicitado_cliente` como cliente: só itens do próprio; sem `dispensado/nao_aplicavel`; `rotulo_instancia` preenchido para pessoa/bem/matrícula; vazio para usuário sem cliente.
2. `rpc anexar_documento_solicitado` em item pendente próprio: cria linha com categoria/vínculo copiados, `checklist_item_id` preenchido, `fonte='cliente'`, `created_by=uid`; o item passa a `recebido` na próxima leitura.
3. Erros esperados (todos 42501): item de outro cliente; item `dispensado`/`nao_aplicavel`; item georref; `_gcs_uri` sem `/<cliente_id>/`.
4. Item com categoria real (ex.: `contrato_social`) sobe pelo sign-upload sem exigir campos extras.
5. Regressão: equipe segue editando checklist e documentos; EDU-01 (upload livre) e EDU-02 (uploader/soft-delete) intactos; item classificado não aparece em "Outros documentos".
