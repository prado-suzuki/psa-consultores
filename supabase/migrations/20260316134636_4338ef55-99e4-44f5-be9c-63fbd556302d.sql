
-- Etapa 1: Normalizar dados existentes para Title Case

-- cliente
UPDATE cliente SET nome = initcap(nome) WHERE excluido = false AND nome IS NOT NULL;

-- cliente_dev
UPDATE cliente_dev SET nome = initcap(nome) WHERE excluido = false AND nome IS NOT NULL;

-- contribuinte (nome_razao_social + nome_fantasia)
UPDATE contribuinte SET
  nome_razao_social = initcap(nome_razao_social),
  nome_fantasia = CASE WHEN nome_fantasia IS NOT NULL THEN initcap(nome_fantasia) ELSE NULL END
WHERE excluido = false;

-- contribuinte_dev
UPDATE contribuinte_dev SET
  nome_razao_social = initcap(nome_razao_social),
  nome_fantasia = CASE WHEN nome_fantasia IS NOT NULL THEN initcap(nome_fantasia) ELSE NULL END
WHERE excluido = false;

-- Etapa 3: Trigger preventivo para normalização automática

CREATE OR REPLACE FUNCTION public.normalize_name_title_case()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('cliente', 'cliente_dev') THEN
    IF NEW.nome IS NOT NULL THEN
      NEW.nome := initcap(NEW.nome);
    END IF;
  ELSE
    IF NEW.nome_razao_social IS NOT NULL THEN
      NEW.nome_razao_social := initcap(NEW.nome_razao_social);
    END IF;
    IF NEW.nome_fantasia IS NOT NULL THEN
      NEW.nome_fantasia := initcap(NEW.nome_fantasia);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers nas 4 tabelas
CREATE TRIGGER trg_normalize_nome_cliente
  BEFORE INSERT OR UPDATE ON public.cliente
  FOR EACH ROW EXECUTE FUNCTION public.normalize_name_title_case();

CREATE TRIGGER trg_normalize_nome_cliente_dev
  BEFORE INSERT OR UPDATE ON public.cliente_dev
  FOR EACH ROW EXECUTE FUNCTION public.normalize_name_title_case();

CREATE TRIGGER trg_normalize_nome_contribuinte
  BEFORE INSERT OR UPDATE ON public.contribuinte
  FOR EACH ROW EXECUTE FUNCTION public.normalize_name_title_case();

CREATE TRIGGER trg_normalize_nome_contribuinte_dev
  BEFORE INSERT OR UPDATE ON public.contribuinte_dev
  FOR EACH ROW EXECUTE FUNCTION public.normalize_name_title_case();
