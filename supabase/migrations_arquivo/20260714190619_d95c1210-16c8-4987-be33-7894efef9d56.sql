
-- 1) Nome não pode ser vazio/branco em cliente
ALTER TABLE public.cliente
  ADD CONSTRAINT cliente_nome_nao_vazio CHECK (btrim(nome) <> '') NOT VALID;
ALTER TABLE public.cliente VALIDATE CONSTRAINT cliente_nome_nao_vazio;

-- 2) Cluster obrigatório: constraint trigger DEFERRABLE — valida no fim da transação,
-- permitindo INSERT cliente + INSERT cliente_clusters na mesma transação.
CREATE OR REPLACE FUNCTION public.enforce_cliente_tem_cluster()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.excluido = false
     AND NOT EXISTS (SELECT 1 FROM public.cliente_clusters cc WHERE cc.cliente_id = NEW.id) THEN
    RAISE EXCEPTION 'Cliente % (%) precisa estar vinculado a pelo menos 1 cluster (cliente_clusters).', NEW.nome, NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_tem_cluster ON public.cliente;
CREATE CONSTRAINT TRIGGER trg_cliente_tem_cluster
  AFTER INSERT OR UPDATE ON public.cliente
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_cliente_tem_cluster();

-- 3) Impedir remover o último cluster de um cliente ativo
CREATE OR REPLACE FUNCTION public.enforce_cliente_cluster_last()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cliente c
    WHERE c.id = OLD.cliente_id AND c.excluido = false
  ) AND NOT EXISTS (
    SELECT 1 FROM public.cliente_clusters cc
    WHERE cc.cliente_id = OLD.cliente_id AND cc.cluster_id <> OLD.cluster_id
  ) THEN
    RAISE EXCEPTION 'Não é possível remover o último cluster do cliente %. Vincule outro cluster antes.', OLD.cliente_id
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_cluster_last ON public.cliente_clusters;
CREATE TRIGGER trg_cliente_cluster_last
  BEFORE DELETE ON public.cliente_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_cliente_cluster_last();
