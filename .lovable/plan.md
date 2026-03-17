

# Plano: Validação cross-environment para `external_client_id`

## Migração SQL única

```sql
-- 1. Remover FK rígida
ALTER TABLE public.tax_projects
  DROP CONSTRAINT tax_projects_external_client_id_fkey;

-- 2. Function de validação (mesmo padrão de validate_tax_project_contribuinte)
CREATE OR REPLACE FUNCTION public.validate_tax_project_external_client()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.external_client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE id = NEW.external_client_id)
    AND NOT EXISTS (SELECT 1 FROM public.cliente_dev WHERE id = NEW.external_client_id) THEN
      RAISE EXCEPTION 'Cliente invalido: id % nao encontrado em cliente nem cliente_dev', NEW.external_client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Trigger
CREATE TRIGGER trg_validate_tax_project_external_client
  BEFORE INSERT OR UPDATE ON public.tax_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tax_project_external_client();
```

## Escopo

- **1 arquivo**: migração SQL
- **0 alterações de código** — nenhum hook ou componente precisa mudar; a validação é transparente no banco

## Conformidade com AI_CONTEXT.md

- Não usa `CHECK` com `now()` — usa trigger de validação ✓
- Não modifica schemas reservados (`auth`, `storage`, etc.) ✓
- Não altera `ALTER DATABASE postgres` ✓
- Function é `SECURITY DEFINER` com `search_path = 'public'` ✓

