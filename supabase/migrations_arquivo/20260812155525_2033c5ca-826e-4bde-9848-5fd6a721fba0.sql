CREATE OR REPLACE FUNCTION public.nome_cliente_normalizado(p_nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT lower(btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')));
$$;

COMMENT ON FUNCTION public.nome_cliente_normalizado(text) IS
  'Forma canônica de um nome de cliente para comparação (minúsculas, espaço aparado e colapsado). Gêmea de chaveDeNomeCliente em src/lib/nomeProprio.ts: mudou uma, muda a outra.';

CREATE INDEX IF NOT EXISTS idx_cliente_nome_normalizado
  ON public.cliente (public.nome_cliente_normalizado(nome));

CREATE OR REPLACE FUNCTION public.get_ordens_by_client_name(p_client_id uuid)
 RETURNS SETOF ordem_servico LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT os.* FROM ordem_servico os
  WHERE os.id_cliente IN (
    SELECT c2.id FROM cliente c2
    WHERE public.nome_cliente_normalizado(c2.nome)
        = public.nome_cliente_normalizado((SELECT nome FROM cliente WHERE id = p_client_id LIMIT 1))
      AND c2.excluido = false
  )
    AND os.excluido = false
  ORDER BY os.created_at DESC;
$function$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tabela, n.nspname AS esquema, t.tgname AS gatilho
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND t.tgfoid = 'public.normalize_name_title_case()'::regprocedure
  LOOP
    EXECUTE format('DROP TRIGGER %I ON %I.%I', r.gatilho, r.esquema, r.tabela);
    RAISE NOTICE 'Gatilho de initcap removido: %.% / %', r.esquema, r.tabela, r.gatilho;
  END LOOP;
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'normalize_name_title_case() não existe — nada a remover.';
END $$;

DROP FUNCTION IF EXISTS public.normalize_name_title_case();