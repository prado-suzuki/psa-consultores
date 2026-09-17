-- 20260917150005_gov03_sociedades_relacionadas_e_linha_fixa.sql
-- GOV-03: cai `acordo_sociedade_relacionada`, e o substituto do representante.
--
-- ESCRITA EM 17/09/2026.
--
--
-- 1. AS SOCIEDADES RELACIONADAS NAO SE ESCOLHEM, PORQUE A LINHA E FIXA
--
-- A tabela guardava QUAIS empresas do grupo o acordo alcanca. O documento nunca
-- as nomeia: ele diz "da sociedade e das SOCIEDADES RELACIONADAS", generico, e
-- a expressao aparece 47 vezes nos 266 blocos.
--
-- Medido no acervo, quantas vezes cada acordo cita a expressao:
--
--   modelo 60 | Perci 53 | Horita 41 | AgroAlianca 36 | Via Fertil 13 |
--   Agro Ferragens 5 | Utida 0
--
-- A Utida com zero parecia a prova de que existe variacao, e nao e: ela e OUTRO
-- acordo, mais curto, e nao tem nenhuma das frases em questao (nao tem
-- ATIVIDADE CONCORRENTE, nao tem a clausula das oportunidades, nao tem a
-- definicao de ADMINISTRACAO). Nao e o mesmo documento sem a expressao.
--
-- Nenhum acordo do acervo escreve essas frases SEM "e das SOCIEDADES
-- RELACIONADAS". Entao: e texto fixo, e campo de decisao para texto fixo so faz
-- o consultor responder o que o documento ignora.
--
-- A Anne aprovou a linha, e aprovou o que de fato existe: a linha esta mapeada
-- certo e ja sai no documento. O que nao existe e a variacao.
--
-- DADO: 2 vinculos no sandbox, os dois de cliente de TESTE. Producao tem zero
-- acordos.
--
--
-- 2. O SUBSTITUTO DO REPRESENTANTE NAO SE APLICA
--
-- Criado hoje de manha, na migration 20260917143042... na verdade na
-- 20260916181629, junto com o foro eleito e o nome fantasia. A consultoria
-- respondeu em 17/09 que nao se aplica: o acordo nomeia o representante, e a
-- falta dele se resolve em REUNIAO DE QUOTISTAS, que e o que a propria clausula
-- 21.1 ja diz na continuacao ("os quais serao substituidos por outro QUOTISTA
-- caso ocorra o falecimento ou seja declarada a incapacidade civil de ambos").
--
-- O trecho sai do bloco no mesmo commit. DADO: zero linhas preenchidas.

DROP TABLE IF EXISTS public.acordo_sociedade_relacionada;

ALTER TABLE public.acordo_quotistas
  DROP COLUMN IF EXISTS substituto_representante_pessoa_id;
