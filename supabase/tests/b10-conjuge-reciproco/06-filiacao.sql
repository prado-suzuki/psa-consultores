-- =============================================================================
-- Prova da filiação derivada — uma origem só para o mesmo fato
-- =============================================================================
-- Antes: o texto livre em `pessoa` e a lista em `parentesco` eram dois cadastros
-- do mesmo fato, e dava para escrever "Joaquim Pai" num e cadastrar outro pai no
-- outro sem que nada reclamasse. Agora a lista é a origem e as colunas são
-- projeção dela, mantidas pelo banco em qualquer caminho de escrita.
-- =============================================================================
SET client_min_messages = notice;

-- ----------------------------------------------------------------------------
-- 1. Escrever direto na coluna não cria segunda verdade: a lista reprojeta
-- ----------------------------------------------------------------------------
UPDATE public.pessoa SET filiacao_pai = 'Nome Divergente'
 WHERE id = 'a0000000-0000-4000-8000-00000000000f';

UPDATE public.parentesco SET natureza = 'Civil'
 WHERE pessoa_id = 'a0000000-0000-4000-8000-00000000000f' AND tipo = 'Pai';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT filiacao_pai FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000f')
      = 'Joaquim Pai',
    'filiação: qualquer toque no vínculo devolve a projeção, a divergência não sobrevive');
END $$;

-- ----------------------------------------------------------------------------
-- 2. Remover o vínculo do pai limpa o slot, sem encostar no da mãe
-- ----------------------------------------------------------------------------
DELETE FROM public.parentesco
 WHERE pessoa_id = 'a0000000-0000-4000-8000-00000000000f' AND tipo = 'Pai';

DO $$
DECLARE p public.pessoa;
BEGIN
  SELECT * INTO p FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000f';
  PERFORM public.afirma(p.filiacao_pai IS NULL AND p.filiacao_pai_pessoa_id IS NULL,
    'filiação: removido o vínculo, o slot do pai ficou vazio');
  PERFORM public.afirma(p.filiacao_mae = 'Marta Mae',
    'filiação: o slot da mãe não foi afetado');
END $$;

-- ----------------------------------------------------------------------------
-- 3. Vínculo que não é de pai nem de mãe não ocupa slot
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT count(*) FROM public.parentesco
      WHERE pessoa_id = 'a0000000-0000-4000-8000-00000000000f' AND tipo = 'Tio(a)') = 1,
    'filiação: o vínculo de tio continua cadastrado');
  PERFORM public.afirma(
    (SELECT filiacao_pai IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-00000000000f'),
    'filiação: tio não vira pai');
END $$;

-- ----------------------------------------------------------------------------
-- 4. Cadastrar o pai que só existia como texto: a lista assume
-- ----------------------------------------------------------------------------
INSERT INTO public.parentesco (pessoa_id, parente_pessoa_id, tipo)
VALUES ('a0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000010', 'Pai');

DO $$
DECLARE p public.pessoa;
BEGIN
  SELECT * INTO p FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000014';
  PERFORM public.afirma(p.filiacao_pai = 'Joaquim Pai'
    AND p.filiacao_pai_pessoa_id = 'a0000000-0000-4000-8000-000000000010',
    'filiação: cadastrado o vínculo, ele substitui o texto que estava lá');
END $$;

-- ----------------------------------------------------------------------------
-- 5. Corrigir o nome do parente acompanha a projeção
-- ----------------------------------------------------------------------------
UPDATE public.pessoa SET denominacao = 'Joaquim Pai da Silva'
 WHERE id = 'a0000000-0000-4000-8000-000000000010';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT filiacao_pai FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000014')
      = 'Joaquim Pai da Silva',
    'filiação: renomear o parente atualiza a projeção de quem o aponta');
END $$;

-- ----------------------------------------------------------------------------
-- 6. Removido o vínculo, o slot volta a vazio (não ressuscita o texto antigo)
-- ----------------------------------------------------------------------------
DELETE FROM public.parentesco
 WHERE pessoa_id = 'a0000000-0000-4000-8000-000000000014' AND tipo = 'Pai';

DO $$
BEGIN
  PERFORM public.afirma(
    (SELECT filiacao_pai IS NULL FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-000000000014'),
    'filiação: o que veio de vínculo some com o vínculo');
END $$;

-- ----------------------------------------------------------------------------
-- 7. Texto livre de quem nunca teve vínculo continua intocado
-- ----------------------------------------------------------------------------
INSERT INTO public.pessoa (id, cliente_id, denominacao, filiacao_pai)
VALUES ('a0000000-0000-4000-8000-0000000000aa', 'c1000000-0000-4000-8000-000000000001',
        'Filha Só Texto', 'Pai Que Nunca Teve Cadastro');

INSERT INTO public.parentesco (pessoa_id, parente_pessoa_id, tipo)
VALUES ('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-000000000011', 'Mãe');

DO $$
DECLARE p public.pessoa;
BEGIN
  SELECT * INTO p FROM public.pessoa WHERE id = 'a0000000-0000-4000-8000-0000000000aa';
  PERFORM public.afirma(p.filiacao_pai = 'Pai Que Nunca Teve Cadastro',
    'filiação: texto livre do slot sem vínculo sobrevive à projeção do outro slot');
  PERFORM public.afirma(p.filiacao_mae = 'Marta Mae',
    'filiação: o slot com vínculo foi projetado na mesma escrita');
END $$;
