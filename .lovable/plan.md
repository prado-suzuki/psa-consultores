

## Plano: Adicionar FK `setor_cliente_id` na tabela `contribuinte`

Migration única:

```sql
ALTER TABLE public.contribuinte 
  ADD COLUMN setor_cliente_id uuid REFERENCES public.setor_cliente(id);
```

Sem backfill, sem alterações no frontend.

