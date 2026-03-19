
-- 1. Adicionar coluna ambiente nas tabelas principais
ALTER TABLE public.cliente ADD COLUMN IF NOT EXISTS ambiente text NOT NULL DEFAULT 'producao';
ALTER TABLE public.contribuinte ADD COLUMN IF NOT EXISTS ambiente text NOT NULL DEFAULT 'producao';

-- 2. Migrar dados de cliente_dev → cliente
INSERT INTO public.cliente (id, nome, ativo, fixo, telefone, setor_cliente, municipio, uf, categoria, regiao, excluido, created_at, updated_at, ambiente)
SELECT id, nome, ativo, fixo, telefone, setor_cliente, municipio, uf, categoria, regiao, excluido, created_at, updated_at, 'desenvolvimento'
FROM public.cliente_dev
ON CONFLICT (id) DO NOTHING;

-- 3. Migrar dados de contribuinte_dev → contribuinte
INSERT INTO public.contribuinte (id, cliente_id, tipo_pessoa, nome_razao_social, cpf_cnpj, inscricao_estadual, cod_cnae, setor, simples_nacional, nome_fantasia, telefone, cep, logradouro, numero, complemento, bairro, municipio, uf, situacao_inscricao_estadual, contribuinte_faturamento, excluido, created_at, updated_at, ambiente)
SELECT id, cliente_id, tipo_pessoa, nome_razao_social, cpf_cnpj, inscricao_estadual, cod_cnae, setor, simples_nacional, nome_fantasia, telefone, cep, logradouro, numero, complemento, bairro, municipio, uf, situacao_inscricao_estadual, contribuinte_faturamento, excluido, created_at, updated_at, 'desenvolvimento'
FROM public.contribuinte_dev
ON CONFLICT (id) DO NOTHING;

-- 4. Migrar dados de participante_dev → participante
INSERT INTO public.participante (id_participante, id_cliente, nome, email, telefone, cargo, acesso_chamados, excluido, created_at, updated_at, tipo_participante, observacoes)
SELECT id_participante, id_cliente, nome, email, telefone, cargo, acesso_chamados, excluido, created_at, updated_at, tipo_participante, observacoes
FROM public.participante_dev
ON CONFLICT (id_participante) DO NOTHING;

-- 5. Atualizar funções (remover referências a _dev)
CREATE OR REPLACE FUNCTION public.validate_per_contribuinte()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contribuinte WHERE id = NEW.id_contribuinte) THEN
    RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado', NEW.id_contribuinte;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_tax_project_external_client()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.external_client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE id = NEW.external_client_id) THEN
      RAISE EXCEPTION 'Cliente invalido: id % nao encontrado', NEW.external_client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_tax_project_contribuinte()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.contribuinte_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.contribuinte WHERE id = NEW.contribuinte_id) THEN
      RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado', NEW.contribuinte_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_ordens_by_client_name(p_client_id uuid)
 RETURNS SETOF ordem_servico LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT os.* FROM ordem_servico os
  WHERE os.id_cliente IN (
    SELECT c2.id FROM cliente c2
    WHERE c2.nome = (SELECT nome FROM cliente WHERE id = p_client_id LIMIT 1)
      AND c2.excluido = false
  )
    AND os.excluido = false
  ORDER BY os.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_name_title_case()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'cliente' THEN
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
$function$;

-- 6. Remover tabelas _dev
DROP TABLE IF EXISTS public.participante_dev CASCADE;
DROP TABLE IF EXISTS public.contribuinte_dev CASCADE;
DROP TABLE IF EXISTS public.cliente_dev CASCADE;
