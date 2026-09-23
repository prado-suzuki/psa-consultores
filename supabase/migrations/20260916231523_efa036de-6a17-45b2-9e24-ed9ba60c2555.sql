-- 20260916181629_gov03_o_que_e_do_cadastro_sai_do_gerador.sql
-- GOV-03: tres fatos que o consultor redigitava a cada documento passam a ser
-- cadastro. (cabecalho completo no arquivo do repositorio)

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