-- Limpeza do corte de fonte do quadro societário: cai a tabela que ninguém mais
-- lê e caem as duas colunas que só existiam para descrever o modelo antigo.
--
-- A migration 20260818192932 deixou `quadro_societario` intocada de propósito,
-- como rede de segurança, e manteve `movimentacao_quotas.socio_pessoa_id` e
-- `.empresa_destino_pessoa_id` preenchidas em espelho porque eram NOT NULL. Os
-- três leitores da tabela velha já apontam para `v_quadro_societario`: o gerador
-- de documento (useListasDaEmpresa), o CRUD do quadro (que virou registro de
-- movimento) e o relatório societário. Nada mais a lê nem escreve nela.
--
-- O que a tabela guardava e não se perde: as 53 linhas foram convertidas ou
-- importadas para o livro de movimentos pela migration anterior (42 convertidas
-- de capital_integralizacao + 11 importadas), `percentual` é derivável de quotas
-- (e é por isso que a view não o guarda) e `data_referencia` estava vazia em
-- todas as 53 linhas.
--
-- Idempotente: vai ser aplicada por dois caminhos (CLI no sandbox, Lovable em
-- produção) e precisa poder rodar duas vezes sem estragar nada.

-- ---------------------------------------------------------------------------
-- 1. As colunas legadas do modelo de aporte. Nenhuma policy, constraint ou view
--    as referencia (`v_quadro_societario` lê empresa_pessoa_id / origem / destino).
-- ---------------------------------------------------------------------------
alter table public.movimentacao_quotas
  drop column if exists socio_pessoa_id,
  drop column if exists empresa_destino_pessoa_id;

-- ---------------------------------------------------------------------------
-- 2. A tabela. Sem FK apontando para ela e sem view dependente — conferido.
-- ---------------------------------------------------------------------------
drop table if exists public.quadro_societario;
