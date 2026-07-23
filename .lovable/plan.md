## Pré-voo confirmado

- A consulta atual em `pg_proc` mostrou **1 função** `public.anexar_documento_solicitado` no banco, com assinatura:
  - `uuid, text, text, bigint, text, text, text`
- A migração anterior `20260723173413_0f54cb90-427d-4aac-bcb5-3a8d237ef9c7.sql` contém a versão correta com `_tamanho bigint`, `REVOKE ALL` e `GRANT EXECUTE TO authenticated`.

## Plano de execução

1. **Criar uma nova migration versionada**
   - Adicionar uma migration nova em `supabase/migrations/`.
   - Incluir exatamente o bloco `DO $$ ... $$` informado para remover qualquer overload de `public.anexar_documento_solicitado` cuja assinatura não seja `uuid, text, text, bigint, text, text, text`.

2. **Garantir fail-safe da função correta**
   - Após o bloco de limpeza, recriar a função correta com `_tamanho bigint` usando o corpo da migration `20260723173413`.
   - Reaplicar:
     - `REVOKE ALL ON FUNCTION public.anexar_documento_solicitado(uuid,text,text,bigint,text,text,text) FROM public;`
     - `GRANT EXECUTE ON FUNCTION public.anexar_documento_solicitado(uuid,text,text,bigint,text,text,text) TO authenticated;`
   - Não alterar `get_checklist_solicitado_cliente`.
   - Não criar nem alterar policies.

3. **Aplicar a migration**
   - Executar a migration pelo fluxo de backend/migration.

4. **GATE**
   - Confirmar via `pg_proc` que existe exatamente **1** função `public.anexar_documento_solicitado`, com `_tamanho bigint`.
   - Testar a chamada da RPC com `_tamanho` numérico em um item pendente do próprio cliente, se houver um cenário de cliente autenticado/testável disponível.
   - Validar que o documento criado nasce com:
     - `fonte = 'cliente'`
     - `categoria`, `pessoa_id`, `bem_id`, `matricula_id` copiados de `checklist_cliente_item`
     - `checklist_item_id` preenchido
   - Validar que a leitura de `get_checklist_solicitado_cliente` passa a marcar o item como `recebido`.

## Observação de escopo

Se não houver item pendente do próprio cliente disponível para chamada real da RPC, o GATE será dividido entre:
- verificação estrutural obrigatória em `pg_proc`; e
- preparação/execução do teste real assim que houver um item pendente válido para o usuário cliente autenticado.