-- 20260903194803_gov01_comentarios_das_colunas.sql
-- GOV-01: escrever no banco o que tres colunas de `orgao_governanca` querem dizer.
--
-- So `entra_no_contrato` tinha comentario. As outras nasceram mudas, e tres
-- delas carregam decisao que nao se adivinha olhando o tipo.
--
-- `ordem` E A MAIS IMPORTANTE, e o motivo desta migration. Ela nao e ordenacao
-- visual: e HIERARQUIA DE AUTORIDADE, e e ela que a Matriz de Alcadas usa para
-- saber para onde a decisao sobe quando o valor passa da alcada ("ate R$ 2
-- milhoes a Diretoria, acima disso o Conselho"). Hoje essa regra vive so na tela
-- e na conversa com a consultoria de 03/09/2026. Quem abrir a tabela daqui a
-- seis meses ve uma coluna chamada `ordem` com numeros e conclui que pode
-- reordenar por gosto, ou escreve um relatorio ordenando por nome, e o
-- escalonamento passa a apontar para o orgao errado sem ninguem perceber.
--
-- O comentario no banco e o unico lugar que acompanha a coluna para sempre,
-- independente de front, de documento e de memoria de quem estava na conversa.
--
-- `nome` e texto livre DE PROPOSITO, e isso tambem se perde: a lista de orgaos
-- nao e fixa, tres sao padrao e o cliente acrescenta os dele. Sem o comentario,
-- a proxima pessoa "arruma" transformando em enum e quebra o caso real dos
-- gerentes.
--
-- `excluido` e o soft delete que a tela usa. O DELETE fisico existe na RLS para
-- sublider ou acima, mas a tela nunca o chama: apagar de verdade um orgao que ja
-- e coluna de uma Matriz assinada apagaria historia.
--
-- `vigencia_inicio` e `vigencia_fim` nao dizem de que periodo falam. E o tempo em
-- que o ORGAO existiu na estrutura do cliente, nao o mandato das pessoas nele.
-- Mandato e outra coisa, e o levantamento da EDU-14 registra que ele continua sem
-- lugar no banco, junto com quorum e alcada.
--
-- POR QUE `ordem` NAO TEM INDICE UNICO, e isto e para ninguem "consertar" depois:
-- um unique em (cliente_id, ordem) parece obvio, mas quebraria a troca de posicao.
-- Subir um orgao troca o numero de duas linhas, e um indice unico nao deferido
-- recusa a colisao no meio da instrucao. Quem garante que nao ha repetido e o
-- app, que renumera a lista inteira de 0 a n-1 a cada movimento, num upsert unico.
--
-- Nao altera estrutura, nao altera dado, nao altera RLS. So metadado.
--
-- Reversao: `COMMENT ON COLUMN ... IS NULL` nas cinco.

COMMENT ON COLUMN public.orgao_governanca.ordem IS
  'Hierarquia de autoridade, do maior para o menor, e NAO ordem de exibicao. Os '
  'orgaos padrao ocupam as primeiras posicoes em ordem fixa (Reuniao de Socios, '
  'Conselho de Administracao, Diretor Executivo) e orgao de cliente nunca fica '
  'acima deles. E esta coluna que diz para onde a decisao sobe quando o valor '
  'passa da alcada na Matriz.';

COMMENT ON COLUMN public.orgao_governanca.nome IS
  'Texto livre DE PROPOSITO. A lista de orgaos nao e fixa: tres sao padrao da OSG '
  'e o cliente acrescenta os dele, com nome proprio (o caso real sao os gerentes). '
  'Nao transformar em enum.';

COMMENT ON COLUMN public.orgao_governanca.excluido IS
  'Soft delete. E o que a tela usa; o DELETE fisico existe na RLS para sublider ou '
  'acima mas nao e chamado, porque apagar um orgao que ja e coluna de uma Matriz '
  'assinada apagaria historia. O indice unico do nome e parcial por causa disto.';

COMMENT ON COLUMN public.orgao_governanca.vigencia_inicio IS
  'Quando o ORGAO passou a existir na estrutura do cliente. Nao e mandato de '
  'pessoa: mandato e outra coisa e ainda nao tem lugar no banco. Nulo = nao '
  'informado.';

COMMENT ON COLUMN public.orgao_governanca.vigencia_fim IS
  'Quando o orgao deixou de existir. Nulo = vigente hoje, que e o caso normal.';

-- GATE: as cinco ficaram com comentario, e o da `ordem` diz o que precisa dizer.
DO $$
DECLARE
  v_ordem text;
  v_sem   text;
BEGIN
  SELECT string_agg(a.attname, ', ') INTO v_sem
    FROM pg_attribute a
   WHERE a.attrelid = 'public.orgao_governanca'::regclass
     AND a.attname IN ('ordem', 'nome', 'excluido', 'vigencia_inicio', 'vigencia_fim')
     AND col_description(a.attrelid, a.attnum) IS NULL;
  IF v_sem IS NOT NULL THEN
    RAISE EXCEPTION 'GATE: coluna sem comentario: %', v_sem;
  END IF;

  SELECT col_description(a.attrelid, a.attnum) INTO v_ordem
    FROM pg_attribute a
   WHERE a.attrelid = 'public.orgao_governanca'::regclass AND a.attname = 'ordem';
  IF v_ordem NOT LIKE '%Hierarquia de autoridade%' THEN
    RAISE EXCEPTION 'GATE: o comentario de ordem nao fala em hierarquia: %', v_ordem;
  END IF;
END $$;
