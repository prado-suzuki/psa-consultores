-- ============================================================
-- Filiação passa a ser derivada dos vínculos de parentesco
-- ============================================================
-- SINTOMA (B11 da sprint 11, segunda metade)
--   O mesmo fato tinha duas entradas: os campos `filiacao_pai`/`filiacao_mae`
--   (texto livre com ponteiro opcional para uma PF) e a tabela `parentesco`.
--   Dava para escrever "Joaquim Pai" no texto e cadastrar outro pai na lista,
--   sem que nada reclamasse, e cada consumidor lia uma verdade diferente.
--   O bloco pedia explicitamente que o texto livre virasse derivado ou sumisse.
--
-- DECISÃO: A LISTA É A ORIGEM, AS COLUNAS SÃO O DERIVADO
--   `parentesco` é o cadastro (N vínculos, com tipo e natureza) e as quatro
--   colunas de `pessoa` viram projeção dele, mantidas pelo banco. As colunas não
--   somem porque o gerador de documentos lê `filiacao_pai`/`filiacao_mae` para
--   qualificar a parte; apagá-las esvaziaria o contrato. Derivar no banco, e não
--   na tela, pelo mesmo motivo do cônjuge: qualquer caminho de escrita conta.
--
-- QUEM É PAI E QUEM É MÃE
--   O vocabulário da tela passa a ter `Pai` e `Mãe` separados (antes era um
--   único `Pai/Mãe`, que não dizia qual slot preencher). Vínculo legado gravado
--   como `Pai/Mãe` é resolvido pelo `genero` do parente; sem gênero, ele não
--   ocupa slot nenhum e o texto que já estava lá continua intacto.
--
-- O TEXTO LIVRE NÃO É DESTRUÍDO
--   Quando não existe vínculo para o slot, a projeção só limpa a coluna se o
--   valor anterior tinha vindo de um vínculo (`filiacao_*_pessoa_id` não nulo).
--   Filiação digitada à mão para um pai sem cadastro sobrevive, porque nesse
--   caso ela é a única origem que existe.
--
-- PROVA
--   `supabase/tests/b10-conjuge-reciproco/run.sh` também exercita este gatilho
--   (arquivo 06-filiacao.sql): projeção, empate legado por gênero, remoção de
--   vínculo e preservação do texto livre.
--
-- Idempotente: pode ser reaplicada.
--
-- Reversão:
--   drop trigger if exists trg_parentesco_projeta_filiacao on public.parentesco;
--   drop trigger if exists trg_pessoa_renome_projeta_filiacao on public.pessoa;
--   drop function if exists public.tg_parentesco_projeta_filiacao();
--   drop function if exists public.tg_pessoa_renome_projeta_filiacao();
--   drop function if exists public.projetar_filiacao_da_pessoa(uuid);
-- ============================================================

CREATE OR REPLACE FUNCTION public.projetar_filiacao_da_pessoa(p_pessoa uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_atual    public.pessoa;
  v_pai_id   uuid;
  v_pai_nome text;
  v_mae_id   uuid;
  v_mae_nome text;
  v_novo_pai text;
  v_novo_mae text;
BEGIN
  SELECT * INTO v_atual FROM public.pessoa WHERE id = p_pessoa;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT parente.id, parente.denominacao INTO v_pai_id, v_pai_nome
    FROM public.parentesco AS v
    JOIN public.pessoa AS parente ON parente.id = v.parente_pessoa_id
   WHERE v.pessoa_id = p_pessoa
     AND parente.cliente_id = v_atual.cliente_id
     AND (v.tipo = 'Pai' OR (v.tipo = 'Pai/Mãe' AND parente.genero = 'M'))
   ORDER BY v.created_at, v.id
   LIMIT 1;

  SELECT parente.id, parente.denominacao INTO v_mae_id, v_mae_nome
    FROM public.parentesco AS v
    JOIN public.pessoa AS parente ON parente.id = v.parente_pessoa_id
   WHERE v.pessoa_id = p_pessoa
     AND parente.cliente_id = v_atual.cliente_id
     AND (v.tipo = 'Mãe' OR (v.tipo = 'Pai/Mãe' AND parente.genero = 'F'))
   ORDER BY v.created_at, v.id
   LIMIT 1;

  -- Sem vínculo no slot: preserva o texto digitado à mão, mas apaga o que tinha
  -- vindo de um vínculo que deixou de existir.
  v_novo_pai := CASE
                  WHEN v_pai_id IS NOT NULL THEN v_pai_nome
                  WHEN v_atual.filiacao_pai_pessoa_id IS NOT NULL THEN NULL
                  ELSE v_atual.filiacao_pai
                END;
  v_novo_mae := CASE
                  WHEN v_mae_id IS NOT NULL THEN v_mae_nome
                  WHEN v_atual.filiacao_mae_pessoa_id IS NOT NULL THEN NULL
                  ELSE v_atual.filiacao_mae
                END;

  IF v_novo_pai IS DISTINCT FROM v_atual.filiacao_pai
     OR v_pai_id IS DISTINCT FROM v_atual.filiacao_pai_pessoa_id
     OR v_novo_mae IS DISTINCT FROM v_atual.filiacao_mae
     OR v_mae_id IS DISTINCT FROM v_atual.filiacao_mae_pessoa_id THEN
    UPDATE public.pessoa
       SET filiacao_pai            = v_novo_pai,
           filiacao_pai_pessoa_id  = v_pai_id,
           filiacao_mae            = v_novo_mae,
           filiacao_mae_pessoa_id  = v_mae_id
     WHERE id = p_pessoa;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.projetar_filiacao_da_pessoa(uuid) IS
  'Projeta em pessoa.filiacao_* o pai e a mãe que estiverem em parentesco. '
  'Texto livre sem vínculo é preservado; valor que veio de vínculo removido é '
  'apagado. Confinada ao cliente da própria pessoa.';

-- ------------------------------------------------------------
-- Gatilho 1: mexeu no vínculo, reprojeta
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_parentesco_projeta_filiacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.projetar_filiacao_da_pessoa(OLD.pessoa_id);
    RETURN NULL;
  END IF;

  PERFORM public.projetar_filiacao_da_pessoa(NEW.pessoa_id);
  IF TG_OP = 'UPDATE' AND OLD.pessoa_id IS DISTINCT FROM NEW.pessoa_id THEN
    PERFORM public.projetar_filiacao_da_pessoa(OLD.pessoa_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_parentesco_projeta_filiacao ON public.parentesco;
CREATE TRIGGER trg_parentesco_projeta_filiacao
  AFTER INSERT OR UPDATE OR DELETE ON public.parentesco
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_parentesco_projeta_filiacao();

-- ------------------------------------------------------------
-- Gatilho 2: renomeou o parente, reprojeta quem o aponta
--    Sem isto, corrigir o nome do pai deixaria a projeção velha no documento
--    até alguém tocar no vínculo de novo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_pessoa_renome_projeta_filiacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_filho uuid;
BEGIN
  IF NEW.denominacao IS NOT DISTINCT FROM OLD.denominacao THEN
    RETURN NULL;
  END IF;
  FOR v_filho IN
    SELECT DISTINCT pessoa_id FROM public.parentesco WHERE parente_pessoa_id = NEW.id
  LOOP
    PERFORM public.projetar_filiacao_da_pessoa(v_filho);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pessoa_renome_projeta_filiacao ON public.pessoa;
CREATE TRIGGER trg_pessoa_renome_projeta_filiacao
  AFTER UPDATE OF denominacao ON public.pessoa
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_pessoa_renome_projeta_filiacao();

-- ------------------------------------------------------------
-- Backfill: projeta quem já tem vínculo de pai/mãe cadastrado
-- ------------------------------------------------------------
DO $$
DECLARE
  v_pessoa uuid;
  v_qtd int := 0;
BEGIN
  FOR v_pessoa IN
    SELECT DISTINCT v.pessoa_id
      FROM public.parentesco AS v
     WHERE v.tipo IN ('Pai', 'Mãe', 'Pai/Mãe')
  LOOP
    PERFORM public.projetar_filiacao_da_pessoa(v_pessoa);
    v_qtd := v_qtd + 1;
  END LOOP;
  RAISE NOTICE 'filiacao: % pessoa(s) com vínculo de pai/mãe reprojetada(s)', v_qtd;
END $$;

COMMENT ON COLUMN public.pessoa.filiacao_pai IS
  'Derivado de parentesco (tipo Pai) pelo gatilho trg_parentesco_projeta_filiacao. '
  'Só é escrito à mão quando o pai não tem cadastro de pessoa.';
COMMENT ON COLUMN public.pessoa.filiacao_mae IS
  'Derivado de parentesco (tipo Mãe) pelo gatilho trg_parentesco_projeta_filiacao. '
  'Só é escrito à mão quando a mãe não tem cadastro de pessoa.';
