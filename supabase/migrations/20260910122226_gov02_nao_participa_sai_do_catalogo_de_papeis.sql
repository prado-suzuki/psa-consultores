-- GOV-02: acerta o catálogo de papéis em dois pontos.
--
-- 1. "NÃO PARTICIPA" DEIXA DE SER PAPEL.
--
-- Eu semeei "Não participa" como papel do catálogo E criei a coluna
-- `matriz_competencia.nao_participa`. São duas formas de escrever a mesma coisa,
-- exatamente o defeito que eu tinha apontado na exceção redundante duas horas
-- antes e repeti aqui sem perceber.
--
-- Fica a MARCA, e não o papel: a pergunta "este órgão participa desta
-- atividade?" precisa ter resposta sem abrir a lista de papéis, porque um quarto
-- das células das matrizes reais é isto e é o que separa matriz pronta de matriz
-- pela metade. Um papel homônimo ainda deixaria gravar "Não participa" junto de
-- "Aprova".
--
-- Soft delete e não DELETE: o elo é `ON DELETE RESTRICT`, então apagar falharia
-- se alguma célula já tivesse apontado para ele.
--
-- 2. ENTRAM OS TRÊS VERBOS QUE O CARD NOMEIA E O SEED ESQUECEU.
--
-- Os pontos de atenção da tarefa listam os verbos que aparecem no modelo além
-- das catorze palavras conhecidas: "elege, participa, define, realiza, valida,
-- implanta, outorga, solicita e elabora". O seed de 09/09 cobriu seis e deixou
-- três de fora. Cada um sai de uma célula real do `VF_Matriz de Alcadas.xlsx`:
--
--   Solicita   "Solicita ao setor de compras a prestação de serviços de natureza
--              operacional" (Gerente de Unidade, contratação de prestadores)
--   Realiza    "Define e realiza o levantamento do volume e especificações de
--              produtos a serem adquiridos" (aquisição de insumos)
--   Implanta   "Implanta e acompanha a execução do Plano Tático e presta contas
--              ao Conselho" (Diretor Executivo, planejamento estratégico)
--
-- Idempotente por nome, como o seed original.

UPDATE public.papel_governanca
SET excluido = true, updated_at = now()
WHERE cliente_id IS NULL
  AND excluido = false
  AND lower(btrim(nome)) = 'não participa';

INSERT INTO public.papel_governanca (cliente_id, nome, grupo, ordem)
SELECT NULL, v.nome, v.grupo, v.ordem
FROM (VALUES
  ('Solicita', 'Análise',  115),
  ('Realiza',  'Execução', 245),
  ('Implanta', 'Execução', 255)
) AS v(nome, grupo, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.papel_governanca p
  WHERE p.cliente_id IS NULL
    AND p.excluido = false
    AND lower(btrim(p.nome)) = lower(btrim(v.nome))
);

DO $$
DECLARE
  v_ativo   int;
  v_faltam  text[];
  v_em_uso  int;
BEGIN
  SELECT count(*) INTO v_ativo
  FROM public.papel_governanca
  WHERE cliente_id IS NULL AND excluido = false AND lower(btrim(nome)) = 'não participa';

  IF v_ativo > 0 THEN
    RAISE EXCEPTION 'GATE GOV-02: "Não participa" continua ativo no catálogo de papéis';
  END IF;

  -- Os nove verbos que o card nomeia, conferidos por radical.
  SELECT array_agg(v.raiz) INTO v_faltam
  FROM (VALUES
    ('eleg'), ('participa'), ('defin'), ('realiza'),
    ('valida'), ('implanta'), ('outorga'), ('solicita'), ('elabora')
  ) AS v(raiz)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.papel_governanca p
    WHERE p.cliente_id IS NULL AND p.excluido = false
      AND lower(p.nome) LIKE '%' || v.raiz || '%'
  );

  IF v_faltam IS NOT NULL THEN
    RAISE EXCEPTION 'GATE GOV-02: o catálogo não cobre %', array_to_string(v_faltam, ', ');
  END IF;

  SELECT count(*) INTO v_em_uso
  FROM public.matriz_competencia_papel cp
  JOIN public.papel_governanca p ON p.id = cp.papel_id
  WHERE lower(btrim(p.nome)) = 'não participa';

  IF v_em_uso > 0 THEN
    RAISE WARNING
      '% célula(s) usam "Não participa" como papel e precisam virar a marca da coluna', v_em_uso;
  END IF;
END
$$;
