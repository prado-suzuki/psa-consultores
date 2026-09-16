-- 20260916181629_gov03_o_que_e_do_cadastro_sai_do_gerador.sql
-- GOV-03: tres fatos que o consultor redigitava a cada documento passam a ser
-- cadastro.
--
-- ESCRITA EM 16/09/2026. NAO APLICAR SEM O OK.
--
--
-- O QUE ACONTECEU
--
-- Ao tirar do documento os dados do cliente do modelo, eu precisava de um lugar
-- para o foro eleito, para o substituto do representante e para o apelido da
-- empresa. Declarei os tres como CAMPO MANUAL, que e uma linha de codigo e
-- nenhuma migration, e o painel "Preencher a mao" da tela Gerar passou a pedir
-- os tres em todo documento.
--
-- Campo manual e para o que pertence ao ATO DE ASSINAR: a data, as testemunhas.
-- Isso muda a cada documento e ninguem reabre depois. Os tres abaixo sao o
-- contrario: combinados uma vez, valem por vinte anos, e sao relidos toda vez
-- que alguem gera de novo. Eu peguei o caminho barato.
--
--
-- 1 e 2. O FORO ELEITO
--
-- Clausula 26.6, e tambem o local da arbitragem, que e a mesma cidade em 5 dos 5
-- acordos que trazem as duas. Nao se deriva da sede: o AgroAlianca senta em
-- Sorriso e elege Cuiaba.
--
--   "os QUOTISTAS e a SOCIEDADE elegem o foro da cidade de Cuiaba, estado de
--    Mato Grosso, por mais privilegiado outro o seja"
--
-- Duas colunas e nao uma, porque a frase separa as duas partes com "estado de"
-- no meio. O estado vai POR EXTENSO, digitado: sem entidade por tras nao ha de
-- onde derivar a concordancia, e a coluna guarda o que o documento escreve.
--
--
-- 3. O SUBSTITUTO DO REPRESENTANTE
--
-- O acordo nomeia um representante dos quotistas e, na falta dele, um segundo:
--
--   "na falta ou incapacidade civil, a incumbencia passara ao Sr. FLAVIO"
--
-- FK para `pessoa`, igual ao `representante_pessoa_id` que ja existe e pelo
-- mesmo motivo: e um socio do cliente, e o documento precisa do tratamento
-- concordado pelo genero, que o cadastro da pessoa tem e um texto livre nao.
--
--
-- 4. O APELIDO DA EMPRESA, E POR QUE ELE VAI NA PESSOA E NAO NO ACORDO
--
-- O acordo declara o apelido no preambulo e o repete 189 vezes:
--
--   "doravante nominada «DUAL»"; depois, sempre "a ADMINISTRACAO da DUAL"
--
-- ELE NAO DERIVA DA RAZAO SOCIAL. Medido nos cinco acordos que declaram apelido
-- de empresa:
--
--   DUAL COMERCIO E INDUSTRIA LTDA        DUAL         primeira palavra
--   ALIANCA PARTICIPACOES LTDA            ALIANCA      primeira palavra
--   VIA FERTIL PARTICIPACOES LTDA         VIA FERTIL   duas primeiras
--   PERCI SMANIOTTO AGRONEGOCIOS LTDA     PS AGRO      NAO DERIVA
--   ...COMERCIO E REPRESENTACOES...       NEWCO        NAO DERIVA
--
-- "PS AGRO" e o NOME FANTASIA, que e outra coisa que a empresa tem e o cadastro
-- nao guardava. "NEWCO" e empresa a constituir. Cortar a razao social na
-- primeira palavra acertaria tres e produziria "PERCI" e "COMERCIO" nos outros
-- dois, calado.
--
-- VAI NA `pessoa`, E NAO EM `acordo_quotistas`, por um motivo que nao e de
-- gosto: o acordo e do CLIENTE, e o cliente tem mais de uma empresa. O Abacaxi
-- do sandbox tem tres. Uma coluna no acordo guardaria UM apelido para as tres, e
-- o documento sairia chamando a empresa escolhida pelo apelido de outra.
--
-- Na `pessoa` ele acompanha a empresa que a tela Gerar escolher. E quem quiser
-- um apelido diferente so neste documento continua tendo o caminho de sempre,
-- "Ajustar dados manualmente", que vale para um documento e nao mexe no
-- cadastro.
--
-- Vazio, sai a lacuna assinalavel, como qualquer campo opcional.

ALTER TABLE public.acordo_quotistas
  ADD COLUMN IF NOT EXISTS foro_eleito_comarca text,
  ADD COLUMN IF NOT EXISTS foro_eleito_estado text,
  ADD COLUMN IF NOT EXISTS substituto_representante_pessoa_id uuid
    REFERENCES public.pessoa(id) ON DELETE SET NULL;

ALTER TABLE public.pessoa
  ADD COLUMN IF NOT EXISTS nome_fantasia text;

COMMENT ON COLUMN public.acordo_quotistas.foro_eleito_comarca IS
  'Cidade do foro eleito (clausula 26.6). E tambem a cidade da arbitragem, que e '
  'a mesma em 5 dos 5 acordos que trazem as duas. Nao deriva da sede: o '
  'AgroAlianca senta em Sorriso e elege Cuiaba.';

COMMENT ON COLUMN public.acordo_quotistas.foro_eleito_estado IS
  'Estado do foro eleito, POR EXTENSO, como o documento escreve ("Mato Grosso").';

COMMENT ON COLUMN public.acordo_quotistas.substituto_representante_pessoa_id IS
  'Quem assume a representacao dos quotistas na falta do titular. FK para pessoa '
  'pelo mesmo motivo do representante: o documento precisa do tratamento '
  'concordado pelo genero.';

COMMENT ON COLUMN public.pessoa.nome_fantasia IS
  'Como a empresa e chamada, e nao a razao social. O Acordo de Quotistas o declara '
  'no preambulo e o repete 189 vezes. Nao se deriva da razao social: Perci '
  'Smaniotto Agronegocios e "PS AGRO".';
