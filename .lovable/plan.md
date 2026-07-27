## Objetivo
Corrigir o vínculo da conta de automação (`representante 4515d72f`): repontar do MMS vazio (`9a74adf6`) para o MMS correto com dados (`40e25d24`), e soft-deletar o MMS vazio duplicado.

## Passos

1. **Repontar representante** para o MMS correto:
   ```sql
   UPDATE public.representante
   SET id_cliente = '40e25d24-c1f1-4644-936d-fb9c8b5aa33c',
       observacoes = 'VINCULO DE TESTE - automacao para MMS prod (upload)',
       updated_at = now()
   WHERE id_representante = '4515d72f-f2b0-4a1f-b5ab-6173972ad814';
   ```

2. **Soft-delete do MMS vazio** e remoção dos vínculos de cluster:
   ```sql
   UPDATE public.cliente SET excluido = true, updated_at = now()
   WHERE id = '9a74adf6-925a-4b5c-9725-b27721a057e0';

   DELETE FROM public.cliente_clusters
   WHERE cliente_id = '9a74adf6-925a-4b5c-9725-b27721a057e0';
   ```

## GATE
- `SELECT public.resolve_user_cliente_id('3f4870f5-cd37-4892-bcc9-c2bbfeb005a2')` → `40e25d24-...`, sem erro de múltiplos vínculos.
- `SELECT count(*) FROM public.representante WHERE user_id = '3f4870f5-cd37-4892-bcc9-c2bbfeb005a2' AND excluido = false` → `1`.
- Cliente `9a74adf6` com `excluido = true`; `40e25d24` ativo, com 6 pessoas e 35 itens de checklist.

## Fora de escopo
- Schema, RLS, frontend.
- Criar novos representantes (manter 1 vínculo ativo para não quebrar `resolve_user_cliente_id`).
- Alterar outros clientes ou representantes.
