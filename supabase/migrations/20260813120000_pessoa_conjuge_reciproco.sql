-- ============================================================
-- Cônjuge recíproco: a relação é simétrica, o ponteiro não era
-- ============================================================
-- SINTOMA (B10 da sprint 11)
--   Gravar PF-02 apontando PF-01 deixava PF-01 sem cônjuge. Era preciso abrir o
--   outro cadastro e repetir a escrita à mão. Metade dos casais do banco existe
--   hoje só de um lado, e o gerador de documentos, que lê `conjuge_id` de quem
--   está sendo qualificado, enxerga um solteiro no lugar de um casado.
--
-- POR QUE NO BANCO E NÃO NO MODAL
--   Espelhar no ponto do formulário conserta um caminho de escrita e deixa os
--   outros (importação, cadastro por documento, correção em massa, RPC futura)
--   criando vínculo pela metade de novo. A simetria é propriedade do dado, não
--   da tela, então quem garante é a tabela.
--
-- REGRAS QUE O GATILHO IMPÕE (todas na mesma transação da escrita original)
--   1. A aponta B  ->  B passa a apontar A
--   2. A troca B por C  ->  B fica sem cônjuge (deixa de ser "casada" e volta a
--      aparecer como opção livre no cadastro), C aponta A
--   3. A limpa o cônjuge  ->  quem apontava A fica sem cônjuge
--   4. A aponta B, mas B já apontava D  ->  D fica sem cônjuge
--   Ou seja: `conjuge_id` passa a ser, de fato, um par exclusivo.
--
-- POR QUE NÃO UM UNIQUE EM `conjuge_id`
--   Seria a garantia mais forte, mas o índice único falha na criação se o banco
--   de produção já tiver duas pessoas apontando a mesma terceira — e falhar
--   aqui derrubaria a migration inteira. O gatilho normaliza esses casos na
--   primeira escrita de cada um, sem bloquear o deploy. Quando a coluna estiver
--   comprovadamente limpa, o UNIQUE parcial vira uma migration de uma linha.
--
-- ESCOPO DE TENANCY
--   O gatilho é SECURITY DEFINER, então ignora a RLS de `pessoa`. Sem barreira,
--   gravar um `conjuge_id` com o uuid de alguém de outro cliente (a FK só exige
--   que a linha exista) faria o gatilho escrever fora do escopo. Por isso:
--   cônjuge de cliente diferente é REJEITADO na escrita, e todo espelho e toda
--   limpeza levam `cliente_id = NEW.cliente_id`. Rejeitar em vez de ignorar
--   porque casamento entre partes de clientes distintos não é caso de negócio:
--   é dado errado, e falhar alto é melhor que gravar meio. A rejeição só vale
--   para valor NOVO; linha legada com o cruzamento já gravado continua editável
--   (o gatilho apenas não espelha nada), senão a migration trancaria o cadastro.
--
-- O QUE ACONTECE COM OS VÍNCULOS JÁ GRAVADOS PELA METADE
--   O backfill abaixo fecha o lado que falta APENAS quando (a) o parceiro está
--   com `conjuge_id` nulo, (b) existe EXATAMENTE UMA pessoa apontando para ele e
--   (c) os dois são do mesmo cliente. Nenhum ponteiro existente é sobrescrito, e
--   nenhum vencedor é escolhido por sorteio: se A e C apontam o mesmo B vazio,
--   fechar para um dos dois seria decidir de que lado está o casamento sem
--   critério nenhum, então os três ficam como estão e a linha sai em NOTICE para
--   tratamento manual. Idem para o contraditório A→B, B→C. Em todos esses casos
--   a primeira edição de qualquer um deles aplica as regras acima.
--   Reaplicar a migration não muda nada além do que já estava faltando.
--
-- AUDITORIA
--   O espelho é escrita de sistema e não passa por `useAuditLog`: o log da
--   pessoa editada registra a mudança de `conjuge_id` dela, e a linha do
--   parceiro muda por consequência. `updated_at` do parceiro é atualizado pelo
--   gatilho `trg_pessoa_updated_at` que já existe. O gap está registrado em
--   `docs/geral/auditoria-gaps-cud.md`.
--
-- PROVA
--   `supabase/tests/b10-conjuge-reciproco/run.sh` aplica esta migration num
--   Postgres efêmero e exercita as quatro regras, o backfill (inclusive os casos
--   ambíguo e contraditório), a barreira de tenancy e a idempotência.
--
-- Idempotente: pode ser reaplicada.
--
-- Reversão:
--   drop trigger if exists trg_pessoa_conjuge_reciproco on public.pessoa;
--   drop function if exists public.tg_pessoa_conjuge_reciproco();
--   alter table public.pessoa drop constraint if exists pessoa_conjuge_nao_e_a_propria;
--   (o índice `idx_pessoa_conjuge_id` NÃO entra aqui: ele é de 20260525152456 e
--    esta migration não cria índice nenhum)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ninguém é cônjuge de si mesmo
--    NOT VALID de propósito: a constraint vale para toda escrita nova (que é o
--    que importa) sem varrer a tabela inteira nem correr o risco de a migration
--    morrer num dado legado. Validar depois é `ALTER TABLE ... VALIDATE`.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 2. Índice do lado "quem aponta para mim"
--    Nada a fazer: `idx_pessoa_conjuge_id` já existe desde
--    20260525152456_333c7d61-...sql:75, como índice total sobre `conjuge_id`, e
--    atende todas as buscas do gatilho. Um índice parcial aqui seria redundante,
--    e repetir o CREATE com o mesmo nome seria um no-op silencioso que daria
--    falsa impressão de índice novo.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 3. Backfill dos vínculos pela metade
--    Só fecha o que é inequívoco: parceiro vazio, uma única origem apontando
--    para ele, mesmo cliente. Tudo que exige decisão humana sai em NOTICE.
-- ------------------------------------------------------------
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
    -- `(array_agg(...))[1]` e não `min()`: o Postgres não tem agregado min para
    -- uuid, e o HAVING abaixo garante que existe uma linha só.
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

-- ------------------------------------------------------------
-- 4. O gatilho que mantém a simetria daqui para frente
-- ------------------------------------------------------------
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
  -- Só a escrita original espelha. As atualizações disparadas por este próprio
  -- gatilho chegam com profundidade > 1 e param aqui; sem isso A escreve B, B
  -- reescreve A, e o par se persegue até estourar a pilha.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  -- Cadastro/edição sem cônjuge nem antes nem agora: nada a espelhar.
  IF NEW.conjuge_id IS NULL AND (TG_OP = 'INSERT' OR OLD.conjuge_id IS NULL) THEN
    RETURN NULL;
  END IF;

  -- Barreira de tenancy. SECURITY DEFINER ignora RLS, então o escopo do cliente
  -- precisa ser imposto aqui: sem isto, um uuid de outro cliente no campo faria
  -- este gatilho escrever numa linha que o usuário não pode nem enxergar.
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
      -- Valor legado, não alterado nesta escrita: não espelha nem limpa nada
      -- fora do cliente, mas também não tranca a edição do resto do cadastro.
      RETURN NULL;
    END IF;
  END IF;

  -- Regra 2: quem foi trocado fica livre (só se ainda apontava de volta).
  IF TG_OP = 'UPDATE'
     AND OLD.conjuge_id IS NOT NULL
     AND OLD.conjuge_id IS DISTINCT FROM NEW.conjuge_id THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE id = OLD.conjuge_id
       AND conjuge_id = NEW.id
       AND cliente_id = NEW.cliente_id;
  END IF;

  -- Regra 3: declarar-se sem cônjuge desfaz o vínculo do outro lado também.
  IF NEW.conjuge_id IS NULL THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE conjuge_id = NEW.id
       AND cliente_id = NEW.cliente_id;
    RETURN NULL;
  END IF;

  -- Regra 4: o casamento anterior do novo cônjuge se desfaz dos dois lados.
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

  -- Ponteiros órfãos apontando para quem acabou de casar com outra pessoa.
  UPDATE public.pessoa
     SET conjuge_id = NULL
   WHERE conjuge_id = NEW.id
     AND id <> NEW.conjuge_id
     AND cliente_id = NEW.cliente_id;

  -- Regra 1: o espelho, por último, para não ser desfeito pelas limpezas acima.
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
