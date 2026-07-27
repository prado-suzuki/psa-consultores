## Objetivo
Repontar o único representante da conta de automação (`automacao@psaconsultores.com.br`) do cliente dev "Alessio Sansão" para o cliente prod "Mms" (`9a74adf6-925a-4b5c-9725-b27721a057e0`), preservando o vínculo único exigido por `resolve_user_cliente_id`.

## Passos

1. **Update cirúrgico** na linha `representante` com `id_representante = 4515d72f-f2b0-4a1f-b5ab-6173972ad814`:
   ```sql
   UPDATE public.representante
   SET id_cliente = '9a74adf6-925a-4b5c-9725-b27721a057e0',
       observacoes = 'VINCULO DE TESTE - automacao para MMS prod (upload)',
       updated_at = now()
   WHERE id_representante = '4515d72f-f2b0-4a1f-b5ab-6173972ad814';
   ```

2. **GATE de verificação** (SELECTs):
   - `SELECT public.resolve_user_cliente_id('3f4870f5-cd37-4892-bcc9-c2bbfeb005a2')` → deve retornar `9a74adf6-925a-4b5c-9725-b27721a057e0` sem erro.
   - `SELECT count(*) FROM public.representante WHERE user_id = '3f4870f5-cd37-4892-bcc9-c2bbfeb005a2' AND excluido = false` → deve retornar `1`.
   - Confirmar `id_cliente` da linha `4515d72f` = MMS prod (`9a74adf6-...`).

## Fora de escopo
- Não criar novos representantes (evitar múltiplos vínculos que quebram `resolve_user_cliente_id`).
- Não mexer em outros clientes/representantes.
- Sem mudanças de schema, RLS ou frontend.
