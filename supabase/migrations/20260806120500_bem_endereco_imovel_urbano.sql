-- Endereço do imóvel urbano em `bem`.
--
-- O QUE FALTAVA
-- O modelo de descrição de imóvel urbano identifica o imóvel pelo ENDEREÇO
-- ("localizado na [logradouro, nº, apartamento, bairro], no município de X,
-- Estado de Y, CEP: Z"), onde o rural usa a denominação. Nenhuma das duas
-- tabelas tinha onde guardar isso: `bem` tem 24 colunas e `matricula` 32, e não
-- há logradouro, número, complemento, bairro nem CEP em nenhuma das duas. Sem
-- essas colunas a família urbana de blocos não tem o que renderizar.
--
-- POR QUE EM `bem` E NÃO EM `matricula`
-- Endereço é atributo do imóvel, não do registro. Um bem pode ter mais de uma
-- matrícula (desmembramento, matrícula anterior), e o endereço é o mesmo em
-- todas. `inscricao_municipal`, que é o cadastro urbano equivalente ao CCIR, já
-- mora em `bem`, então o endereço fica ao lado do dado da mesma natureza.
--
-- POR QUE NÃO ENTRAM MUNICÍPIO E UF
-- `matricula.municipio_imovel` e `matricula.uf_imovel` já existem e são NOT NULL,
-- e o mapeador da geração já os lê. Repetir aqui criaria duas fontes para o mesmo
-- dado, com a divergência aparecendo em contrato.
--
-- ÁREA CONSTRUÍDA
-- Vem na mesma migration porque é a outra ausência que trava o mesmo modelo
-- ("sendo ___ de área construída", que o modelo manda escrever só quando a
-- construída é menor que a total). A unidade está no nome da coluna em vez de
-- virar uma segunda coluna de unidade: área construída é sempre em m², diferente
-- de `matricula.area_documento`, que precisa de `area_unidade` porque rural vem
-- em hectare e urbano em m².
--
-- O QUE ESTA MIGRATION NÃO FAZ
-- Não obriga endereço em imóvel urbano nem o proíbe em rural: as colunas entram
-- nulas para as 24 colunas de bem já existentes, e a exigência por tipo_bem é
-- validação de formulário (BemDadosTab já ramifica por tipo_bem, mostrando CCIR
-- para IR e inscrição municipal para IB). Um not null aqui quebraria todo bem
-- rural já cadastrado.
--
-- Reversão:
--   alter table public.bem
--     drop column endereco_logradouro, drop column endereco_numero,
--     drop column endereco_complemento, drop column endereco_bairro,
--     drop column endereco_cep, drop column area_construida_m2;

BEGIN;

-- Mesmos nomes das colunas de endereço de `pessoa` (endereco_logradouro,
-- endereco_numero, endereco_complemento, endereco_bairro, endereco_cep), para o
-- mapeador da geração reaproveitar a montagem de endereço em prosa que já existe.
alter table public.bem
  add column endereco_logradouro text,
  add column endereco_numero text,
  add column endereco_complemento text,
  add column endereco_bairro text,
  add column endereco_cep text,
  add column area_construida_m2 numeric;

comment on column public.bem.endereco_logradouro is
  'Logradouro do imóvel urbano (rua, avenida, rodovia). Município e UF vivem em matricula.municipio_imovel/uf_imovel.';

comment on column public.bem.endereco_numero is
  'Número do imóvel urbano. Texto porque aceita "s/n" e sufixos ("119-A").';

comment on column public.bem.endereco_complemento is
  'Complemento do imóvel urbano (apartamento, bloco, sala, conjunto), citado no modelo de descrição urbana.';

comment on column public.bem.endereco_bairro is
  'Bairro do imóvel urbano.';

comment on column public.bem.endereco_cep is
  'CEP do imóvel urbano, exigido pelo modelo de descrição urbana.';

comment on column public.bem.area_construida_m2 is
  'Área construída em m². O modelo urbano só a menciona quando é menor que a área total (matricula.area_documento). Unidade fixa no nome: área construída não vem em hectare.';

COMMIT;
