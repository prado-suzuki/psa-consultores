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
-- O QUE ACONTECE COM OS VÍNCULOS JÁ GRAVADOS PELA METADE
--   O backfill abaixo fecha o lado que falta APENAS quando o parceiro está com
--   `conjuge_id` nulo. Nenhum ponteiro existente é sobrescrito: se A aponta B e
--   B aponta C (dado contraditório, que ninguém sabe resolver sozinho), os três
--   ficam como estão e a primeira edição de qualquer um deles aplica as regras
--   acima. Reaplicar a migration não muda nada além do que já estava faltando.
--
-- AUDITORIA
--   O espelho é escrita de sistema e não passa por `useAuditLog`: o log da
--   pessoa editada registra a mudança de `conjuge_id` dela, e a linha do
--   parceiro muda por consequência. `updated_at` do parceiro é atualizado pelo
--   gatilho `trg_pessoa_updated_at` que já existe.
--
-- Idempotente: pode ser reaplicada.
--
-- Reversão:
--   drop trigger if exists trg_pessoa_conjuge_reciproco on public.pessoa;
--   drop function if exists public.tg_pessoa_conjuge_reciproco();
--   alter table public.pessoa drop constraint if exists pessoa_conjuge_nao_e_a_propria;
--   drop index if exists public.idx_pessoa_conjuge_id;
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
--    Todas as consultas do gatilho procuram por `conjuge_id`, que até aqui só
--    era lido pelo lado da chave primária.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pessoa_conjuge_id
  ON public.pessoa (conjuge_id)
  WHERE conjuge_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Backfill dos vínculos pela metade (antes do gatilho, em uma tacada só)
-- ------------------------------------------------------------
UPDATE public.pessoa AS parceiro
   SET conjuge_id = origem.id
  FROM public.pessoa AS origem
 WHERE origem.conjuge_id = parceiro.id
   AND origem.id <> parceiro.id
   AND parceiro.conjuge_id IS NULL;

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

  -- Regra 2: quem foi trocado fica livre (só se ainda apontava de volta).
  IF TG_OP = 'UPDATE'
     AND OLD.conjuge_id IS NOT NULL
     AND OLD.conjuge_id IS DISTINCT FROM NEW.conjuge_id THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE id = OLD.conjuge_id
       AND conjuge_id = NEW.id;
  END IF;

  -- Regra 3: declarar-se sem cônjuge desfaz o vínculo do outro lado também.
  IF NEW.conjuge_id IS NULL THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE conjuge_id = NEW.id;
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
       AND conjuge_id = NEW.conjuge_id;
  END IF;

  UPDATE public.pessoa
     SET conjuge_id = NULL
   WHERE conjuge_id = NEW.conjuge_id
     AND id <> NEW.id;

  -- Ponteiros órfãos apontando para quem acabou de casar com outra pessoa.
  UPDATE public.pessoa
     SET conjuge_id = NULL
   WHERE conjuge_id = NEW.id
     AND id <> NEW.conjuge_id;

  -- Regra 1: o espelho, por último, para não ser desfeito pelas limpezas acima.
  UPDATE public.pessoa
     SET conjuge_id = NEW.id
   WHERE id = NEW.conjuge_id
     AND conjuge_id IS DISTINCT FROM NEW.id;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.tg_pessoa_conjuge_reciproco() IS
  'Mantém pessoa.conjuge_id simétrico e exclusivo em qualquer caminho de '
  'escrita: espelha o vínculo no parceiro, desfaz o vínculo anterior dos dois '
  'lados na troca e limpa o outro lado quando o cônjuge é removido. '
  'SECURITY DEFINER porque é consequência de sistema, não uma escrita do '
  'usuário na linha do parceiro.';

DROP TRIGGER IF EXISTS trg_pessoa_conjuge_reciproco ON public.pessoa;
CREATE TRIGGER trg_pessoa_conjuge_reciproco
  AFTER INSERT OR UPDATE OF conjuge_id ON public.pessoa
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_pessoa_conjuge_reciproco();

COMMENT ON COLUMN public.pessoa.conjuge_id IS
  'Cônjuge/companheiro(a). Relação simétrica e exclusiva garantida pelo gatilho '
  'trg_pessoa_conjuge_reciproco — escrever de um lado escreve o outro.';
