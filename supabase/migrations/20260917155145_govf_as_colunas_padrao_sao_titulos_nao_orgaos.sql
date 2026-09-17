-- 20260917155145_govf_as_colunas_padrao_sao_titulos_nao_orgaos.sql
-- GOV-F: troca as tres colunas padrao do protocolo, por orientacao da consultoria.
--
-- A COLUNA NAO DERIVA DE LUGAR NENHUM. Ela nao vem do cadastro de orgaos, nem do
-- contrato, nem da Matriz de Alcadas: ela e definida na conversa com o cliente e
-- serve so para diferenciar quem recebe o que. E titulo, nao orgao de governanca.
-- A modelagem ja estava certa (a coluna mora em `protocolo_beneficiario`, nao em
-- `orgao_governanca`); o que estava errado era o PADRAO que ela oferecia.
--
-- O SEED ANTIGO VEIO DO MODELO DA CASA e induzia exatamente a confusao que a
-- modelagem evita: `VF_Protocolo Remuneracao.xlsx` traz "Acionistas",
-- "Conselheiros de Administracao" e "Diretores", e dois desses tres sao nome de
-- ORGAO. Quem abrisse a tela pela primeira vez veria o protocolo pedindo orgao de
-- governanca, que e o oposto do que ele pede.
--
-- O SEED NOVO E O DA CONSULTORIA: "Fundadores", "Socios" e "Socios Gestores".
-- Quem conduz a conversa com o cliente e quem sabe como esses grupos sao
-- chamados, e este cadastro existe para servir essa conversa.
--
-- HONESTIDADE SOBRE A MEDICAO, para ninguem ler mais do que ela diz. Os arquivos
-- reais varridos em 17/09/2026 trazem:
--
--     Potrich       Socios Fundadores | Sucessores na Gestao
--     Toqueto V1    Socios Fundadores | Familiares Gestores
--     Toqueto VF    Gestores | Fundadores | Socios/Filhos 1a geracao
--
-- Destes tres nomes novos, so "Fundadores" aparece literal (Toqueto VF). "Socios"
-- e "Socios Gestores" sao a forma canonica da consultoria, e o que os clientes
-- mostram sao variacoes dela ("Socios Fundadores", "Socios/Filhos 1a geracao",
-- "Familiares Gestores", "Sucessores na Gestao"). Ou seja: a medicao sustenta o
-- VOCABULARIO, nao a grafia exata, e e por isso que o padrao e ponto de partida
-- editavel e nao lista fechada.
--
-- O que a medicao sustenta com forca e o lado negativo: NENHUM dos tres nomes do
-- modelo da casa aparece em cliente nenhum. O padrao antigo nao era usado na vida
-- real por ninguem.
--
-- TROCA E SEGURA, e isto foi medido antes de escrever: no sandbox ha 0 protocolos
-- criados, 0 colunas de protocolo e 0 celulas escritas. Nenhum protocolo copiou o
-- padrao antigo, entao apagar as tres linhas nao orfana nada. Se um dia houver
-- protocolo, as colunas dele sao COPIAS com `protocolo_id` preenchido, e esta
-- migration nao as toca: o trabalho do consultor fica onde esta.
--
-- Reversao: reinserir os tres nomes antigos e apagar os tres novos.

-- ─────────────────────────────────────────────────────────────────────────────
-- Sai o padrao que vinha do modelo da casa
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `protocolo_id IS NULL` restringe ao padrao da casa. Coluna de protocolo de
-- cliente, mesmo que alguem tenha chamado de "Diretores", nao e alcancada.
--
-- O `NOT EXISTS` faz deste um passo UNICO, e nao uma limpeza que roda toda vez.
-- Sem ele, o `db:sync` reaplicando o arquivo da develop apagaria um "Diretores"
-- que alguem tivesse criado de proposito como padrao depois. Com ele, a presenca
-- de qualquer um dos tres nomes novos ja diz que esta migration cumpriu o papel
-- dela, e a limpeza nao repete.

DELETE FROM public.protocolo_beneficiario
WHERE protocolo_id IS NULL
  AND lower(btrim(nome)) IN ('acionistas', 'conselheiros de administração', 'diretores')
  AND NOT EXISTS (
    SELECT 1 FROM public.protocolo_beneficiario ja
    WHERE ja.protocolo_id IS NULL
      AND ja.excluido = false
      AND lower(btrim(ja.nome)) IN ('fundadores', 'sócios', 'sócios gestores')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Entram os tres da consultoria
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Idempotente por nome, entre os ativos, igual aos outros seeds do GOV-F.

INSERT INTO public.protocolo_beneficiario (protocolo_id, nome, ordem)
SELECT NULL, v.nome, v.ordem
FROM (VALUES
  ('Fundadores',      10),
  ('Sócios',          20),
  ('Sócios Gestores', 30)
) AS v(nome, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.protocolo_beneficiario b
  WHERE b.protocolo_id IS NULL
    AND b.excluido = false
    AND lower(btrim(b.nome)) = lower(btrim(v.nome))
);

COMMENT ON TABLE public.protocolo_beneficiario IS
  'GOV-F: as colunas do protocolo, o grupo que tem direito ao que esta na celula. '
  'NAO e orgao de governanca nem papel, e nao deriva de cadastro nenhum: e titulo '
  'combinado na conversa com o cliente, so para diferenciar quem recebe o que. '
  '`protocolo_id` nulo e o padrao da casa (Fundadores, Socios, Socios Gestores), '
  'que a tela copia para um protocolo novo e o consultor renomeia, acrescenta ou '
  'tira. Nos arquivos reais cada cliente usa uma variacao desse vocabulario: '
  '"Socios Fundadores" no Potrich, "Familiares Gestores" no Toqueto V1, '
  '"Socios/Filhos 1a geracao" no Toqueto VF.';

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

-- O GATE NAO FIXA OS TRES NOMES, DE PROPOSITO, e isso e uma decisao e nao um
-- descuido. Estes titulos existem para serem editados: o consultor renomeia,
-- acrescenta e tira. Um GATE que exigisse exatamente
-- "Fundadores | Socios | Socios Gestores" transformaria uma edicao legitima em
-- deploy quebrado, porque o `db:sync` reaplica o arquivo da develop sobre um
-- banco onde alguem ja pode ter renomeado ou acrescentado coluna padrao.
--
-- Entao ele afere so o unico estado que e defeito desta migration em qualquer
-- cenario: o padrao ter ficado VAZIO, que e o que acontece se o DELETE levar os
-- tres antigos e o INSERT nao gravar nada. Qualquer outro estado e edicao de
-- gente, e edicao de gente nao e falha.
--
-- Chegou a existir aqui uma segunda afericao, "nenhum nome do modelo da casa
-- sobrou", e ela saiu pelo mesmo motivo do paragrafo acima: com o DELETE virando
-- passo unico, um "Diretores" criado de proposito depois e dado legitimo, e a
-- afericao o chamaria de falha.

DO $$
DECLARE
  v_padroes int;
BEGIN
  SELECT count(*) INTO v_padroes
  FROM public.protocolo_beneficiario
  WHERE protocolo_id IS NULL AND excluido = false;

  IF v_padroes = 0 THEN
    RAISE EXCEPTION
      'GATE GOV-F colunas padrao: o padrao ficou vazio, o DELETE rodou e o INSERT nao';
  END IF;
END
$$;
