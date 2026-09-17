-- 20260914210309_gov03_cadastro_do_acordo_de_quotistas.sql
-- GOV-03: o cadastro do Acordo de Quotistas.
--
-- Uma tabela pai e cinco filhas, mais duas colunas numa tabela que ja existe:
--
--   acordo_quotistas               o acordo de um cliente, com data e versao
--     acordo_quorum                um quorum: materia + quanto + sobre o que
--     acordo_ramo_familiar         um ramo da familia, com o rotulo escolhido
--     acordo_ordem_preferencia     a ordem em que se oferece a quota
--     acordo_signatario            os quotistas que assinaram a primeira versao
--     acordo_sociedade_relacionada as sociedades que o acordo alcanca
--
--   quadro_societario              ganha `com_usufruto` e `voto_exercido_por`
--
-- MEDICOES QUE SUSTENTAM AS DECISOES. Foram lidos os SETE acordos do acervo
-- (Via Fertil, AgroAlianca, AgroFerragens Luizao, Horita, Perci, Utida e o
-- modelo VF) e os OITO contratos, e o que esta abaixo saiu de contagem.
--
-- POR QUE `acordo_quorum` E TABELA, E NAO COLUNAS. O card previa tres quoruns.
-- Medindo o modelo, sao SETE, e cada um precisa de tres informacoes (quanto,
-- de que tipo, e sobre qual base). Como coluna seriam 21, e cada quorum novo
-- pediria outra migration. Como linha, sao quatro colunas e sete registros que
-- a tela semeia ao criar o acordo, o mesmo desenho da Matriz de Alcadas.
--
-- POR QUE A BASE E COLUNA, e nao uma escolha global do acordo. O modelo usa as
-- duas formas no mesmo documento: a escada de deliberacao conta "os VOTOS dos
-- QUOTISTAS presentes", o aumento de capital conta "¾ das QUOTAS" e a reuniao
-- previa conta "a maioria das QUOTAS". Numa segunda convocacao, que instala com
-- qualquer numero, um socio de 40% e 100% dos presentes e 40% do capital: a
-- mesma votacao aprova numa leitura e reprova na outra.
--
-- POR QUE O TIPO E SEPARADO DO PERCENTUAL. Tres dos sete nao sao percentual:
-- "maioria dos presentes" e "todos os QUOTISTAS" nao viram numero sem mentir.
-- Guardar 50,01 para maioria e 100 para unanimidade escreveria no contrato um
-- numero que o documento nao diz.
--
-- POR QUE TRES QUARTOS EXISTE, contra o que o card afirma. Ele aparece no
-- MODELO do escritorio duas vezes (¾ das QUOTAS para aumento de capital sem
-- justificativa, e 75% para alterar o contrato social), no acordo da
-- AgroFerragens, e no bloco de contrato "Instalacao da Reuniao de Socios", que
-- e a transcricao do art. 1.074 do Codigo Civil. Nao e preferencia do
-- escritorio, e a lei. Aprovado pelo Bernardo em 14/09.
--
-- POR QUE `nome` E LIVRE NO RAMO, E O ROTULO E FECHADO. O card proibe "nucleo
-- familiar", porque o termo exclui o conjuge implicitamente, e aceita dois
-- rotulos: "RAMO [nome]" e "DESCENDENTES DE [nome]". O nome varia por familia,
-- o rotulo nao: por isso um e texto e o outro e CHECK.
--
-- POR QUE O USUFRUTO ALTERA `quadro_societario`, e nao cria tabela paralela. E
-- ordem expressa do card, e o motivo esta na propria tabela: ela ja tem
-- `percentual` e `data_referencia`, que sao a base de qualquer conta de quorum.
-- Quem detem a quota nao e necessariamente quem vota, e o contrato do Perci
-- escreve isso: "reservado o usufruto vitalicio, incluindo o direito a voto".
-- Uma tabela paralela deixaria a conta de quorum lendo dois lugares.
--
-- O QUE NAO ENTRA, E POR QUE. **Limite de aval e fianca.** O card afirma que
-- existe, em percentual do faturamento. Procurei percentual, "faturamento" e
-- "limite" ao redor de "aval" e "fianca" nos sete acordos e nos oito contratos:
-- zero ocorrencias. A Clausula Decima Quarta do modelo tem cinco regras e
-- nenhum numero: ela diz QUEM pode garantir QUEM, nao quanto. Decisao do
-- usuario em 14/09: se nao esta em documento nenhum, nao existe.
--
-- **A composicao dos orgaos** tambem nao entra, embora a Clausula Decima Sexta
-- do acordo a repita ("CONSELHO composto por no minimo 04 (tres) e no maximo 05
-- (cinco) membros"). Esses numeros ja vivem em `orgao_governanca` desde 11/09.
-- Campo proprio aqui faria o contrato dizer um numero e o acordo dizer outro.
--
-- OS VALORES PADRAO NAO ESTAO AQUI. Os sete quoruns e a marcacao inicial dos
-- mecanismos sao SEMENTE DE APLICACAO, num arquivo de `src/lib`, e nao seed de
-- migration: eles pertencem a um acordo, que so existe quando alguem cria. Isso
-- e de proposito e e o que torna barata a resposta da consultoria, que ainda nao
-- chegou: mudar um numero vira edicao de constante, nunca migration.
--
-- Fora de escopo: o hook, a tela, o template do motor e o `types.ts`.
--
-- Reversao: `DROP TABLE public.acordo_sociedade_relacionada, public.acordo_signatario,
-- public.acordo_ordem_preferencia, public.acordo_ramo_familiar, public.acordo_quorum,
-- public.acordo_quotistas;` mais `ALTER TABLE public.quadro_societario
-- DROP COLUMN com_usufruto, DROP COLUMN voto_exercido_por;`.

-- ─────────────────────────────────────────────────────────────────────────────
-- O acordo de um cliente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.acordo_quotistas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,

  -- A data que o proprio acordo carrega, e a versao. Mesmo motivo da Matriz: o
  -- acordo vira clausula de contrato, e saber qual versao virou qual contrato
  -- importa. A anterior nao some.
  data_referencia   date,
  versao            integer NOT NULL DEFAULT 1,

  -- Nulo enquanto for minuta. O motor usa isto para escrever "firmado em" ou
  -- deixar a lacuna assinalavel.
  assinado_em       date,
  vigencia_anos     integer,
  prazo_sigilo_anos integer,

  -- ── Quanto vale a quota de quem sai ────────────────────────────────────────
  -- Os cinco campos deste bloco DESCEM AO CONTRATO SOCIAL: a clausula de
  -- apuracao de haveres esta nos oito contratos do acervo, com 4 a 8 mencoes
  -- cada. E o unico bloco do acordo que o contrato repete por inteiro.

  -- Lista porque o modelo combina mais de um: "sera mensurado atraves do MAIOR
  -- VALOR atingido por uma das seguintes metodologias".
  metodos_avaliacao      text[],
  regra_combinacao       text,
  -- "levantado, no maximo, 60 (sessenta) dias antes do evento"
  prazo_balanco_dias     integer,
  -- "fluxo de caixa projetado para um periodo de 05 (cinco) anos"
  horizonte_fluxo_anos   integer,
  -- "a taxa de crescimento nao inferior ao indice projetado pelo IPCA"
  taxa_minima_crescimento text,
  consolida_composse     boolean NOT NULL DEFAULT false,

  -- ── Nao concorrencia ───────────────────────────────────────────────────────
  -- Em 6 dos 7 acordos. A multa e texto, e nao moeda, porque o modelo a define
  -- por formula e nao por valor fixo.
  nao_concorrencia                  boolean NOT NULL DEFAULT false,
  nao_concorrencia_prazo_anos       integer,
  nao_concorrencia_area             text,
  nao_concorrencia_multa            text,
  nao_concorrencia_alcanca_parentes boolean NOT NULL DEFAULT false,

  -- ── Opcoes de compra e venda ───────────────────────────────────────────────
  -- Clausula Oitava. Compra em 5 dos 7 acordos, venda em 3.
  opcao_compra_prevista boolean NOT NULL DEFAULT false,
  opcao_compra_quem     text,
  opcao_compra_preco    text,
  opcao_venda_prevista  boolean NOT NULL DEFAULT false,

  -- ── Preferencia e aumento de capital ───────────────────────────────────────
  -- O direito de preferencia esta nos 7 acordos E nos 8 contratos, mas a ORDEM
  -- so no acordo: o contrato diz apenas "aos demais socios, na proporcao".
  objetos_preferencia    text[],
  juros_valor_subscrito  text,

  reuniao_previa_obrigatoria boolean NOT NULL DEFAULT false,

  -- ── Solucao de conflitos ───────────────────────────────────────────────────
  -- Arbitragem esta nos 7 acordos e em ZERO dos 8 contratos.
  solucao_litigios              text,
  camara_arbitral               text,
  prazo_indicacao_arbitros_dias integer,

  representante_pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE SET NULL,

  -- Os mecanismos marcados. Cada um liga uma clausula inteira do documento
  -- gerado, como `entra_no_contrato` faz com o orgao. Lista aberta de proposito:
  -- a consultoria ainda vai dizer quais sao padrao, e isso muda a semente da
  -- aplicacao, nao esta coluna.
  mecanismos text[],

  excluido   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT acordo_quotistas_versao_ck CHECK (versao >= 1),
  CONSTRAINT acordo_quotistas_vigencia_ck
    CHECK (vigencia_anos IS NULL OR vigencia_anos >= 1),
  CONSTRAINT acordo_quotistas_sigilo_ck
    CHECK (prazo_sigilo_anos IS NULL OR prazo_sigilo_anos >= 1),
  CONSTRAINT acordo_quotistas_balanco_ck
    CHECK (prazo_balanco_dias IS NULL OR prazo_balanco_dias >= 1),
  CONSTRAINT acordo_quotistas_horizonte_ck
    CHECK (horizonte_fluxo_anos IS NULL OR horizonte_fluxo_anos >= 1),
  CONSTRAINT acordo_quotistas_nc_prazo_ck
    CHECK (nao_concorrencia_prazo_anos IS NULL OR nao_concorrencia_prazo_anos >= 1),
  CONSTRAINT acordo_quotistas_arbitros_ck
    CHECK (prazo_indicacao_arbitros_dias IS NULL OR prazo_indicacao_arbitros_dias >= 1),
  CONSTRAINT acordo_quotistas_litigios_ck
    CHECK (solucao_litigios IS NULL OR solucao_litigios IN ('arbitragem', 'judicial')),

  -- AS TRES LISTAS SAO FECHADAS, e nao texto livre dentro de array. Mesma regra
  -- da base de calculo da GOV-02: o card cobra o cadastro "sem nenhum campo
  -- sobrando em texto livre", e array sem CHECK e exatamente isso, com o
  -- agravante de aceitar erro de digitacao que ninguem ve. Um valor novo custa
  -- uma linha de migration, que e barato e falha alto.
  CONSTRAINT acordo_quotistas_mecanismos_ck CHECK (
    mecanismos IS NULL OR mecanismos <@ ARRAY[
      'preferencia', 'arbitragem', 'nao_concorrencia', 'lock_up', 'tag_along',
      'drag_along', 'opcao_compra', 'opcao_venda', 'usufruto', 'quarentena'
    ]::text[]
  ),
  CONSTRAINT acordo_quotistas_metodos_ck CHECK (
    metodos_avaliacao IS NULL OR metodos_avaliacao <@ ARRAY[
      'patrimonio_liquido', 'fluxo_de_caixa_descontado', 'dupla_avaliacao'
    ]::text[]
  ),
  CONSTRAINT acordo_quotistas_objetos_ck CHECK (
    objetos_preferencia IS NULL OR objetos_preferencia <@ ARRAY[
      'quotas', 'imoveis', 'maquinas', 'equipamentos', 'oportunidades', 'participacoes'
    ]::text[]
  )
);

COMMENT ON TABLE public.acordo_quotistas IS
  'GOV-03: o Acordo de Quotistas de um cliente. Versionado porque vira clausula '
  'de contrato. Os campos de apuracao de haveres descem ao contrato social.';

COMMENT ON COLUMN public.acordo_quotistas.mecanismos IS
  'Os mecanismos presentes neste acordo (lock_up, tag_along, drag_along, '
  'opcao_compra, opcao_venda, quarentena, nao_concorrencia, preferencia, '
  'usufruto, arbitragem). Cada um liga uma clausula do documento gerado.';

COMMENT ON COLUMN public.acordo_quotistas.nao_concorrencia_multa IS
  'Texto, e nao moeda: o modelo define a multa por formula, nao por valor fixo.';

CREATE INDEX IF NOT EXISTS acordo_quotistas_cliente_idx
  ON public.acordo_quotistas (cliente_id, versao DESC)
  WHERE excluido = false;

CREATE UNIQUE INDEX IF NOT EXISTS acordo_quotistas_versao_uq
  ON public.acordo_quotistas (cliente_id, versao)
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_acordo_quotistas_updated_at ON public.acordo_quotistas;
CREATE TRIGGER update_acordo_quotistas_updated_at
  BEFORE UPDATE ON public.acordo_quotistas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Os quoruns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.acordo_quorum (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id  uuid NOT NULL REFERENCES public.acordo_quotistas(id) ON DELETE CASCADE,

  -- O assunto que este quorum governa. Texto livre porque a lista cresce por
  -- cliente: o Perci acrescenta emprestimo a quotista e exercicio da opcao de
  -- compra, que o modelo nao tem.
  materia    text NOT NULL,

  -- A IDENTIDADE DO QUORUM PADRAO, QUE SOBREVIVE A UM RENAME, e ela existe por
  -- uma licao de 14/09. Em `orgao_governanca` o reconhecimento era por nome, e
  -- bastou trocar uma letra em "Reuniao de Socios" para o sistema achar que o
  -- orgao tinha sumido e oferecer criar outro. Aqui o risco e pior: o gerador
  -- procura o quorum de "alterar o contrato social" para escrever a clausula, e
  -- um consultor que reescreva a materia faria a clausula sair sem numero.
  -- Nula no quorum que o cliente acrescenta, que e onde nao ha padrao a manter.
  chave      text,

  -- 'maioria' e 'unanimidade' nao carregam percentual; 'percentual' exige um.
  tipo       text NOT NULL,
  percentual numeric(5,2),

  -- 'presentes' conta so quem compareceu; 'capital' conta o capital inteiro.
  base       text NOT NULL DEFAULT 'presentes',

  ordem      integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT acordo_quorum_tipo_ck
    CHECK (tipo IN ('maioria', 'percentual', 'unanimidade')),
  CONSTRAINT acordo_quorum_base_ck
    CHECK (base IN ('presentes', 'capital')),
  -- O percentual so existe quando o tipo pede, e nunca fora de 0 a 100. Sem
  -- isto, "maioria" com 50,01 guardado escreveria no contrato um numero que o
  -- documento nao diz.
  CONSTRAINT acordo_quorum_percentual_ck CHECK (
    (tipo = 'percentual' AND percentual IS NOT NULL AND percentual > 0 AND percentual <= 100)
    OR (tipo <> 'percentual' AND percentual IS NULL)
  ),
  CONSTRAINT acordo_quorum_materia_ck CHECK (btrim(materia) <> ''),
  CONSTRAINT acordo_quorum_chave_ck CHECK (
    chave IS NULL OR chave IN (
      'instalacao', 'ordinaria', 'alterar_contrato_social',
      'nomear_administrador_nao_socio', 'destituir_administrador',
      'aumento_de_capital', 'reuniao_previa'
    )
  )
);

COMMENT ON TABLE public.acordo_quorum IS
  'GOV-03: um quorum do acordo. Sete no modelo: instalacao, assunto comum, '
  'alterar contrato social, nomear administrador nao socio, destituir '
  'administrador, aumento de capital e reuniao previa.';

CREATE UNIQUE INDEX IF NOT EXISTS acordo_quorum_materia_uq
  ON public.acordo_quorum (acordo_id, lower(btrim(materia)));

-- Um acordo nao tem dois quoruns do mesmo padrao. Parcial porque a chave e nula
-- no quorum que o cliente inventa, e nulo nao colide com nulo.
CREATE UNIQUE INDEX IF NOT EXISTS acordo_quorum_chave_uq
  ON public.acordo_quorum (acordo_id, chave)
  WHERE chave IS NOT NULL;

CREATE INDEX IF NOT EXISTS acordo_quorum_acordo_idx
  ON public.acordo_quorum (acordo_id, ordem);

DROP TRIGGER IF EXISTS update_acordo_quorum_updated_at ON public.acordo_quorum;
CREATE TRIGGER update_acordo_quorum_updated_at
  BEFORE UPDATE ON public.acordo_quorum
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Os ramos da familia
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.acordo_ramo_familiar (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id  uuid NOT NULL REFERENCES public.acordo_quotistas(id) ON DELETE CASCADE,

  nome       text NOT NULL,

  -- Fechado de proposito. O card proibe "nucleo familiar", porque o termo exclui
  -- o conjuge implicitamente, e aceita so estes dois.
  rotulo     text NOT NULL DEFAULT 'ramo',

  ordem      integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT acordo_ramo_rotulo_ck CHECK (rotulo IN ('ramo', 'descendentes')),
  CONSTRAINT acordo_ramo_nome_ck CHECK (btrim(nome) <> '')
);

COMMENT ON TABLE public.acordo_ramo_familiar IS
  'GOV-03: um ramo da familia. O rotulo vira "RAMO [nome]" ou "DESCENDENTES DE '
  '[nome]" no documento. Conjuge nao integra ramo e nao ingressa no quadro.';

CREATE UNIQUE INDEX IF NOT EXISTS acordo_ramo_nome_uq
  ON public.acordo_ramo_familiar (acordo_id, lower(btrim(nome)));

DROP TRIGGER IF EXISTS update_acordo_ramo_familiar_updated_at ON public.acordo_ramo_familiar;
CREATE TRIGGER update_acordo_ramo_familiar_updated_at
  BEFORE UPDATE ON public.acordo_ramo_familiar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- A ordem do direito de preferencia
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.acordo_ordem_preferencia (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id  uuid NOT NULL REFERENCES public.acordo_quotistas(id) ON DELETE CASCADE,

  -- A quem se oferece nesta posicao. Texto porque as duas ordens medidas usam
  -- vocabularios diferentes: a Via Fertil oferece primeiro a holding, o modelo
  -- oferece primeiro aos descendentes dos signatarios.
  quem       text NOT NULL,
  ordem      integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT acordo_ordem_quem_ck CHECK (btrim(quem) <> '')
);

COMMENT ON TABLE public.acordo_ordem_preferencia IS
  'GOV-03: a ordem em que a quota e oferecida antes de ir a terceiro. So o '
  'acordo tem a ordem; o contrato diz apenas "aos demais socios, na proporcao".';

CREATE UNIQUE INDEX IF NOT EXISTS acordo_ordem_posicao_uq
  ON public.acordo_ordem_preferencia (acordo_id, ordem);

DROP TRIGGER IF EXISTS update_acordo_ordem_preferencia_updated_at ON public.acordo_ordem_preferencia;
CREATE TRIGGER update_acordo_ordem_preferencia_updated_at
  BEFORE UPDATE ON public.acordo_ordem_preferencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Os signatarios originais
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.acordo_signatario (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id  uuid NOT NULL REFERENCES public.acordo_quotistas(id) ON DELETE CASCADE,
  pessoa_id  uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE RESTRICT,
  ordem      integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

COMMENT ON TABLE public.acordo_signatario IS
  'GOV-03: quem assinou a primeira versao do acordo. NAO e o quadro societario '
  'de hoje: o acordo fala em "descendentes dos signatarios", e esse recorte '
  'congela em quem assinou, mesmo depois de o quadro mudar.';

CREATE UNIQUE INDEX IF NOT EXISTS acordo_signatario_uq
  ON public.acordo_signatario (acordo_id, pessoa_id);

DROP TRIGGER IF EXISTS update_acordo_signatario_updated_at ON public.acordo_signatario;
CREATE TRIGGER update_acordo_signatario_updated_at
  BEFORE UPDATE ON public.acordo_signatario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- As sociedades que o acordo alcanca
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.acordo_sociedade_relacionada (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id         uuid NOT NULL REFERENCES public.acordo_quotistas(id) ON DELETE CASCADE,
  empresa_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE RESTRICT,
  ordem             integer NOT NULL DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

COMMENT ON TABLE public.acordo_sociedade_relacionada IS
  'GOV-03: as SOCIEDADES RELACIONADAS que o acordo alcanca. O modelo estende a '
  'quase toda regra a elas, entao a lista muda o alcance do documento inteiro.';

CREATE UNIQUE INDEX IF NOT EXISTS acordo_sociedade_uq
  ON public.acordo_sociedade_relacionada (acordo_id, empresa_pessoa_id);

DROP TRIGGER IF EXISTS update_acordo_sociedade_relacionada_updated_at
  ON public.acordo_sociedade_relacionada;
CREATE TRIGGER update_acordo_sociedade_relacionada_updated_at
  BEFORE UPDATE ON public.acordo_sociedade_relacionada
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- O usufruto NAO entra aqui, e este bloco foi removido em 16/09/2026
-- ─────────────────────────────────────────────────────────────────────────────
--
-- A versao original desta migration acrescentava `com_usufruto` e
-- `voto_exercido_por` a `public.quadro_societario`. Duas coisas erradas nisso,
-- e as duas so apareceram depois:
--
--   1. A TABELA NAO EXISTE. `20260820163000_limpeza_quadro_societario.sql` a
--      derrubou em 20/08/2026, quando `movimentacao_quotas` virou a fonte unica
--      do quadro. A copia que sobrou no sandbox e resto de drift, e nenhum
--      arquivo de `src/` le essa tabela. Em producao o `ALTER TABLE` morria com
--      42P01, e o autoteste do fim do arquivo transformava isso em excecao.
--   2. O USUFRUTO JA ESTAVA MODELADO em `onus_quotas`, e em lugar melhor, junto
--      do ato que criou o gravame. Foi o que a `20260915125745` concluiu no dia
--      seguinte, desfazendo as duas colunas.
--
-- Removido em vez de guardado por `to_regclass`: as colunas nasciam para serem
-- apagadas 24h depois, entao guardar so preservaria o vaivem. Quem procurar o
-- usufruto acha em `onus_quotas`; a tela do Acordo LE de la e manda cadastrar
-- no Quadro Societario.

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Tudo pende do acordo, e o acordo pende do cliente. As filhas sobem a corrente
-- em vez de repetir `cliente_id`, como na Matriz. Mesmo desvio consciente da
-- GOV-01 e da GOV-02: o card pede `is_project_member`, e aqui nao ha projeto, o
-- recorte e por cliente.
--
-- `quadro_societario` nao entra aqui: a RLS dela ja existe e nao muda por causa
-- de duas colunas.

ALTER TABLE public.acordo_quotistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acordo_quorum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acordo_ramo_familiar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acordo_ordem_preferencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acordo_signatario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acordo_sociedade_relacionada ENABLE ROW LEVEL SECURITY;

-- Responde "este acordo e de um cliente que eu enxergo?".
CREATE OR REPLACE FUNCTION public.acordo_visivel_para(_acordo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.acordo_quotistas a
    WHERE a.id = _acordo_id AND public.cliente_visivel_para(a.cliente_id)
  );
$$;

COMMENT ON FUNCTION public.acordo_visivel_para(uuid) IS
  'GOV-03: o recorte das filhas do acordo. Sobe a corrente ate o cliente em vez '
  'de repetir cliente_id em cada tabela.';

DROP POLICY IF EXISTS rls_acordo_quotistas_select ON public.acordo_quotistas;
CREATE POLICY rls_acordo_quotistas_select ON public.acordo_quotistas
  FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_acordo_quotistas_insert ON public.acordo_quotistas;
CREATE POLICY rls_acordo_quotistas_insert ON public.acordo_quotistas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_acordo_quotistas_update ON public.acordo_quotistas;
CREATE POLICY rls_acordo_quotistas_update ON public.acordo_quotistas
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_acordo_quotistas_delete ON public.acordo_quotistas;
CREATE POLICY rls_acordo_quotistas_delete ON public.acordo_quotistas
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

-- As cinco filhas compartilham a mesma forma, entao o laco escreve as politicas
-- em vez de repetir vinte blocos iguais que divergiriam na primeira alteracao.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'acordo_quorum', 'acordo_ramo_familiar', 'acordo_ordem_preferencia',
    'acordo_signatario', 'acordo_sociedade_relacionada'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS rls_%1$s_select ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY rls_%1$s_select ON public.%1$I
        FOR SELECT TO authenticated
        USING (public.acordo_visivel_para(acordo_id))
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS rls_%1$s_insert ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY rls_%1$s_insert ON public.%1$I
        FOR INSERT TO authenticated
        WITH CHECK (
          public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
          AND public.acordo_visivel_para(acordo_id)
        )
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS rls_%1$s_update ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY rls_%1$s_update ON public.%1$I
        FOR UPDATE TO authenticated
        USING (
          public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
          AND public.acordo_visivel_para(acordo_id)
        )
        WITH CHECK (
          public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
          AND public.acordo_visivel_para(acordo_id)
        )
    $f$, t);

    EXECUTE format('DROP POLICY IF EXISTS rls_%1$s_delete ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY rls_%1$s_delete ON public.%1$I
        FOR DELETE TO authenticated
        USING (
          public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
          AND public.acordo_visivel_para(acordo_id)
        )
    $f$, t);
  END LOOP;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_falhas  text[] := '{}';
  t         text;
  v_cliente uuid;
  v_acordo  uuid;
  v_erro    text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'acordo_quotistas', 'acordo_quorum', 'acordo_ramo_familiar',
    'acordo_ordem_preferencia', 'acordo_signatario', 'acordo_sociedade_relacionada'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      v_falhas := v_falhas || format('a tabela %s nao foi criada', t);
    ELSIF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t AND rowsecurity = true
    ) THEN
      v_falhas := v_falhas || format('RLS nao ficou habilitada em %s', t);
    END IF;
  END LOOP;

  -- Nao ha o que conferir em `quadro_societario`: ver a nota do bloco removido.

  -- Nenhuma coluna `ambiente`: o ambiente vem do cliente, como na GOV-01 e 02.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('acordo_quotistas', 'acordo_quorum', 'acordo_ramo_familiar')
      AND column_name = 'ambiente'
  ) THEN
    v_falhas := v_falhas || 'alguma tabela ganhou coluna ambiente, e o ambiente vem do cliente';
  END IF;

  -- Prova viva das restricoes que mais importam, num acordo descartavel.
  SELECT id INTO v_cliente FROM public.cliente LIMIT 1;
  IF v_cliente IS NOT NULL THEN
    INSERT INTO public.acordo_quotistas (cliente_id, versao)
    VALUES (v_cliente, 999999) RETURNING id INTO v_acordo;

    -- "maioria" com percentual guardado escreveria no contrato um numero que o
    -- documento nao diz. Tem de ser recusado.
    BEGIN
      INSERT INTO public.acordo_quorum (acordo_id, materia, tipo, percentual)
      VALUES (v_acordo, 'GATE maioria com numero', 'maioria', 50.01);
      v_falhas := v_falhas || 'o CHECK deixou passar maioria com percentual';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- E percentual sem numero tambem.
    BEGIN
      INSERT INTO public.acordo_quorum (acordo_id, materia, tipo)
      VALUES (v_acordo, 'GATE percentual sem numero', 'percentual');
      v_falhas := v_falhas || 'o CHECK deixou passar percentual sem numero';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- O rotulo do ramo e fechado: "nucleo familiar" nao pode entrar nem por
    -- engano, porque o termo exclui o conjuge.
    BEGIN
      INSERT INTO public.acordo_ramo_familiar (acordo_id, nome, rotulo)
      VALUES (v_acordo, 'GATE', 'nucleo_familiar');
      v_falhas := v_falhas || 'o CHECK do rotulo do ramo deixou passar nucleo_familiar';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    -- Um quorum valido tem de entrar.
    BEGIN
      INSERT INTO public.acordo_quorum (acordo_id, materia, tipo, percentual, base)
      VALUES (v_acordo, 'GATE alterar contrato', 'percentual', 75, 'presentes');
    EXCEPTION WHEN others THEN
      GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
      v_falhas := v_falhas || format('um quorum valido foi recusado: %s', v_erro);
    END;

    DELETE FROM public.acordo_quotistas WHERE id = v_acordo;
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-03: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;
