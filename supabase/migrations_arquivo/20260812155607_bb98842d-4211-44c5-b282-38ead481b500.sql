DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pessoa_conjuge_nao_e_a_propria'
      AND conrelid = 'public.pessoa'::regclass
  ) THEN
    ALTER TABLE public.pessoa
      ADD CONSTRAINT pessoa_conjuge_nao_e_a_propria
      CHECK (conjuge_id IS DISTINCT FROM id) NOT VALID;
  END IF;
END $$;

DO $$
DECLARE
  v_caso record;
  v_fechados int;
BEGIN
  FOR v_caso IN
    SELECT origem.conjuge_id AS parceiro_id,
           count(*)                                        AS origens,
           string_agg(origem.id::text, ', ' ORDER BY origem.id) AS ids,
           bool_or(origem.cliente_id <> parceiro.cliente_id)    AS tem_cruzamento
      FROM public.pessoa AS origem
      JOIN public.pessoa AS parceiro ON parceiro.id = origem.conjuge_id
     WHERE origem.conjuge_id IS NOT NULL
       AND origem.id <> parceiro.id
       AND parceiro.conjuge_id IS NULL
     GROUP BY origem.conjuge_id
    HAVING count(*) > 1 OR bool_or(origem.cliente_id <> parceiro.cliente_id)
  LOOP
    RAISE NOTICE
      'conjuge pendente: pessoa % é apontada por % pessoa(s) [%]%. Vínculo NÃO foi fechado; resolver à mão.',
      v_caso.parceiro_id, v_caso.origens, v_caso.ids,
      CASE WHEN v_caso.tem_cruzamento THEN ' e há origem de outro cliente' ELSE '' END;
  END LOOP;

  WITH unica AS (
    SELECT origem.conjuge_id AS parceiro_id, (array_agg(origem.id))[1] AS origem_id
      FROM public.pessoa AS origem
      JOIN public.pessoa AS parceiro ON parceiro.id = origem.conjuge_id
     WHERE origem.conjuge_id IS NOT NULL
       AND origem.id <> parceiro.id
       AND parceiro.conjuge_id IS NULL
       AND origem.cliente_id = parceiro.cliente_id
     GROUP BY origem.conjuge_id
    HAVING count(*) = 1
  )
  UPDATE public.pessoa AS parceiro
     SET conjuge_id = unica.origem_id
    FROM unica
   WHERE parceiro.id = unica.parceiro_id;

  GET DIAGNOSTICS v_fechados = ROW_COUNT;
  RAISE NOTICE 'conjuge: % vínculo(s) pela metade fechado(s) sem ambiguidade', v_fechados;
END $$;

CREATE OR REPLACE FUNCTION public.tg_pessoa_conjuge_reciproco()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conjuge_do_novo uuid;
  v_cliente_do_novo uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF NEW.conjuge_id IS NULL AND (TG_OP = 'INSERT' OR OLD.conjuge_id IS NULL) THEN
    RETURN NULL;
  END IF;

  IF NEW.conjuge_id IS NOT NULL THEN
    SELECT cliente_id INTO v_cliente_do_novo
      FROM public.pessoa
     WHERE id = NEW.conjuge_id;

    IF v_cliente_do_novo IS DISTINCT FROM NEW.cliente_id THEN
      IF TG_OP = 'INSERT'
         OR NEW.conjuge_id IS DISTINCT FROM OLD.conjuge_id
         OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id THEN
        RAISE EXCEPTION
          'Cônjuge (%) pertence a outro cliente; o vínculo conjugal vive dentro de um cliente só',
          NEW.conjuge_id
          USING ERRCODE = '23514';
      END IF;
      RETURN NULL;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.conjuge_id IS NOT NULL
     AND OLD.conjuge_id IS DISTINCT FROM NEW.conjuge_id THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE id = OLD.conjuge_id
       AND conjuge_id = NEW.id
       AND cliente_id = NEW.cliente_id;
  END IF;

  IF NEW.conjuge_id IS NULL THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE conjuge_id = NEW.id
       AND cliente_id = NEW.cliente_id;
    RETURN NULL;
  END IF;

  SELECT conjuge_id INTO v_conjuge_do_novo
    FROM public.pessoa
   WHERE id = NEW.conjuge_id;

  IF v_conjuge_do_novo IS NOT NULL AND v_conjuge_do_novo <> NEW.id THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE id = v_conjuge_do_novo
       AND conjuge_id = NEW.conjuge_id
       AND cliente_id = NEW.cliente_id;
  END IF;

  UPDATE public.pessoa
     SET conjuge_id = NULL
   WHERE conjuge_id = NEW.conjuge_id
     AND id <> NEW.id
     AND cliente_id = NEW.cliente_id;

  UPDATE public.pessoa
     SET conjuge_id = NULL
   WHERE conjuge_id = NEW.id
     AND id <> NEW.conjuge_id
     AND cliente_id = NEW.cliente_id;

  UPDATE public.pessoa
     SET conjuge_id = NEW.id
   WHERE id = NEW.conjuge_id
     AND conjuge_id IS DISTINCT FROM NEW.id
     AND cliente_id = NEW.cliente_id;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.tg_pessoa_conjuge_reciproco() IS
  'Mantém pessoa.conjuge_id simétrico e exclusivo em qualquer caminho de '
  'escrita: espelha o vínculo no parceiro, desfaz o vínculo anterior dos dois '
  'lados na troca e limpa o outro lado quando o cônjuge é removido. Tudo '
  'confinado ao mesmo cliente_id; cônjuge de outro cliente é rejeitado (23514). '
  'SECURITY DEFINER porque é consequência de sistema, não uma escrita do '
  'usuário na linha do parceiro.';

DROP TRIGGER IF EXISTS trg_pessoa_conjuge_reciproco ON public.pessoa;
CREATE TRIGGER trg_pessoa_conjuge_reciproco
  AFTER INSERT OR UPDATE OF conjuge_id, cliente_id ON public.pessoa
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_pessoa_conjuge_reciproco();

COMMENT ON COLUMN public.pessoa.conjuge_id IS
  'Cônjuge/companheiro(a). Relação simétrica e exclusiva garantida pelo gatilho '
  'trg_pessoa_conjuge_reciproco — escrever de um lado escreve o outro.';