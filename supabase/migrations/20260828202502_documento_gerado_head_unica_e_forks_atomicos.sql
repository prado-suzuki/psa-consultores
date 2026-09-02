-- Integridade da linhagem de documento_gerado e do versionamento de bloco.
--
-- Tres buracos, todos do mesmo tipo: sequencia de escritas feita pelo front,
-- sem transacao, com uma janela no meio onde uma falha (ou dois cliques) deixa
-- o banco num estado que o codigo nao sabe ler de volta.
--
--   1. "Selar e forkar" (useDocumentoGerado.useSalvarDocumentoGerado) fazia
--      UPDATE status='revisao' -> INSERT da head nova -> COPIA dos overrides.
--      Falha depois do selo deixava a linhagem SEM head rascunho, e o proximo
--      save caia no ramo "nao existe head" e criava uma RAIZ NOVA: o historico
--      se partia em duas linhagens, calado.
--   2. Nao havia nada garantindo uma head por (cliente, modelo, empresa). A
--      invariante vivia so no `.order(created_at).limit(1)` do front, entao duas
--      abas (ou dois cliques) criavam duas heads e uma sumia da tela.
--   3. Nova versao de bloco fazia UPDATE atual=false -> INSERT atual=true. Entre
--      os dois o bloco fica sem versao atual, e o leitor
--      (`find(v => v.atual) ?? null`) devolve texto vazio. Se o INSERT falhasse,
--      o bloco ficava assim para sempre.
--
-- Nada aqui muda o caminho feliz: mesma ordem de escrita, mesmos valores. O que
-- muda e o que acontece quando algo falha no meio (agora nao acontece nada) e
-- quando duas sessoes correm (agora a segunda toma 23505 em vez de duplicar).
--
-- Idempotente: pode ser reaplicada. Ver docs/planos/ledger-societario-e-alteracao-derivada.md.

-- ---------------------------------------------------------------------------
-- 1. documento_raiz_id se preenche sozinho
-- ---------------------------------------------------------------------------
-- Criar a raiz da linhagem eram DUAS escritas: INSERT e depois UPDATE para
-- apontar documento_raiz_id para o proprio id (que so existe depois do INSERT).
-- Falha no segundo passo deixava raiz nula. Como o valor e funcao da propria
-- linha, quem o preenche e o banco.

CREATE OR REPLACE FUNCTION public.documento_gerado_raiz_default()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Fork passa a raiz herdada; raiz nova nao tem o que passar e vira a si mesma.
  IF NEW.documento_raiz_id IS NULL THEN
    NEW.documento_raiz_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.documento_gerado_raiz_default() IS
  'BEFORE INSERT em documento_gerado: linha sem documento_raiz_id vira raiz da propria linhagem.';

DROP TRIGGER IF EXISTS trg_documento_gerado_raiz ON public.documento_gerado;
CREATE TRIGGER trg_documento_gerado_raiz
  BEFORE INSERT ON public.documento_gerado
  FOR EACH ROW
  EXECUTE FUNCTION public.documento_gerado_raiz_default();

-- ---------------------------------------------------------------------------
-- 2. Uma head rascunho por combinacao
-- ---------------------------------------------------------------------------
-- Dois indices parciais em vez de um porque pj_pessoa_id e NULAVEL e no Postgres
-- NULL nao colide com NULL: um indice unico sobre a coluna deixaria passar
-- quantas heads sem empresa se quisesse. O par cobre os dois casos.
--
-- documento_template_id tambem e nulavel; linha sem modelo nao e head
-- enderecavel pelo app (a busca sempre filtra por modelo), entao fica de fora.
--
-- Conferido antes de criar: zero duplicatas no sandbox e em producao (28/08/2026).

CREATE UNIQUE INDEX IF NOT EXISTS uq_documento_gerado_head_com_pj
  ON public.documento_gerado (cliente_id, documento_template_id, pj_pessoa_id)
  WHERE status = 'rascunho'
    AND documento_template_id IS NOT NULL
    AND pj_pessoa_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documento_gerado_head_sem_pj
  ON public.documento_gerado (cliente_id, documento_template_id)
  WHERE status = 'rascunho'
    AND documento_template_id IS NOT NULL
    AND pj_pessoa_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Selar e forkar numa transacao so
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER de proposito: quem chama ja tem INSERT/UPDATE em
-- documento_gerado e documento_override pelas policies "team_member+", entao a
-- funcao nao precisa de privilegio nenhum alem do do usuario, e o RLS continua
-- valendo dentro dela. Nada aqui e visivel a quem nao podia escrever antes.

CREATE OR REPLACE FUNCTION public.selar_e_forkar_documento(
  _head_id                 uuid,
  _snapshot_flags          jsonb,
  _snapshot_dados          jsonb,
  _snapshot_versoes_blocos jsonb,
  _validado_em             timestamptz
)
RETURNS public.documento_gerado
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_head public.documento_gerado;
  v_nova public.documento_gerado;
BEGIN
  -- FOR UPDATE serializa duas sessoes selando a mesma head: a segunda espera e
  -- encontra status 'revisao', em vez de selar de novo e forkar uma terceira head.
  SELECT * INTO v_head
    FROM public.documento_gerado
   WHERE id = _head_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento % nao encontrado', _head_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_head.status <> 'rascunho' THEN
    RAISE EXCEPTION 'Este documento nao esta mais em rascunho (status %) - recarregue a tela', v_head.status
      USING ERRCODE = '22023';
  END IF;

  -- Selo: congela o estado atual na versao que sai de circulacao. Sem gravar os
  -- snapshots aqui, a versao selada renderizaria o texto PRE-override, porque o
  -- viewer de versao le do snapshot e nao dos cadastros.
  UPDATE public.documento_gerado
     SET status                  = 'revisao',
         snapshot_flags          = _snapshot_flags,
         snapshot_dados          = _snapshot_dados,
         snapshot_versoes_blocos = _snapshot_versoes_blocos,
         snapshot_validado_em    = _validado_em
   WHERE id = v_head.id;

  -- Fork: a head nova continua de onde a selada parou. substitui_documento_id
  -- vem da head (nao do chamador) para toda versao da linhagem de uma alteracao
  -- responder o que ela substitui sem join ate a raiz.
  INSERT INTO public.documento_gerado (
    cliente_id, pj_pessoa_id, documento_template_id, status,
    documento_anterior_id, documento_raiz_id, substitui_documento_id,
    gerado_por_id, snapshot_flags, snapshot_dados, snapshot_versoes_blocos,
    snapshot_validado_em
  ) VALUES (
    v_head.cliente_id, v_head.pj_pessoa_id, v_head.documento_template_id, 'rascunho',
    v_head.id, COALESCE(v_head.documento_raiz_id, v_head.id), v_head.substitui_documento_id,
    auth.uid(), _snapshot_flags, _snapshot_dados, _snapshot_versoes_blocos,
    _validado_em
  )
  RETURNING * INTO v_nova;

  -- Overrides vivos: o texto resolvido ja viajou no snapshot, mas a head nova
  -- precisa deles para seguir editando os mesmos blocos.
  INSERT INTO public.documento_override (
    documento_gerado_id, tipo, bloco_alvo_id, bloco_substituto_id, observacao
  )
  SELECT v_nova.id, o.tipo, o.bloco_alvo_id, o.bloco_substituto_id, o.observacao
    FROM public.documento_override o
   WHERE o.documento_gerado_id = v_head.id;

  RETURN v_nova;
END;
$function$;

COMMENT ON FUNCTION public.selar_e_forkar_documento(uuid, jsonb, jsonb, jsonb, timestamptz) IS
  'Atualizar versao: sela a head atual (rascunho->revisao, snapshots congelados) e cria a head seguinte encadeada, copiando os overrides. Tudo numa transacao: nao existe mais o estado intermediario em que a linhagem fica sem head.';

REVOKE ALL ON FUNCTION public.selar_e_forkar_documento(uuid, jsonb, jsonb, jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.selar_e_forkar_documento(uuid, jsonb, jsonb, jsonb, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Nova versao de bloco numa transacao so
-- ---------------------------------------------------------------------------
-- Dois chamadores hoje: o editor da Biblioteca (useBibliotecaModelos) e o ajuste
-- pontual de bloco no documento (useOverrideBloco). Os dois faziam a mesma
-- sequencia de duas escritas, com a mesma janela sem versao atual.

CREATE OR REPLACE FUNCTION public.nova_versao_bloco(
  _bloco_id  uuid,
  _conteudo  text,
  _changelog text DEFAULT NULL
)
RETURNS public.tmpl_bloco_versao
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  v_atual  public.tmpl_bloco_versao;
  v_numero integer;
  v_nova   public.tmpl_bloco_versao;
BEGIN
  -- Trava no bloco PAI, e nao na versao: duas sessoes versionando o mesmo bloco
  -- podem nem enxergar a mesma linha de versao, mas o pai e sempre o mesmo.
  PERFORM 1
     FROM public.tmpl_bloco
    WHERE id = _bloco_id
      FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bloco % nao encontrado', _bloco_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_atual
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = _bloco_id
     AND atual;

  -- MAX + 1, e nao "a atual + 1": se uma versao mais alta ja existir sem ser a
  -- atual (reversao, importacao), somar a partir da atual bateria na constraint
  -- tmpl_bloco_versao_unica (bloco_id, numero_versao).
  SELECT COALESCE(MAX(numero_versao), 0) + 1 INTO v_numero
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = _bloco_id;

  IF v_atual.id IS NOT NULL THEN
    UPDATE public.tmpl_bloco_versao
       SET atual = false
     WHERE id = v_atual.id;
  END IF;

  INSERT INTO public.tmpl_bloco_versao (
    bloco_id, numero_versao, conteudo, atual, autor_id, changelog
  ) VALUES (
    _bloco_id, v_numero, _conteudo, true, auth.uid(), _changelog
  )
  RETURNING * INTO v_nova;

  RETURN v_nova;
END;
$function$;

COMMENT ON FUNCTION public.nova_versao_bloco(uuid, text, text) IS
  'Publica uma nova versao atual do bloco: baixa a anterior e insere a nova na mesma transacao, para o bloco nunca ficar sem versao atual (o leitor resolveria texto vazio). Numera por MAX(numero_versao)+1.';

REVOKE ALL ON FUNCTION public.nova_versao_bloco(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nova_versao_bloco(uuid, text, text) TO authenticated;
