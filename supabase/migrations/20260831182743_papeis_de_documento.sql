-- Papéis de documento: o que a peça FAZ com a sociedade deixa de ser inferido.
--
-- Hoje o sistema descobre o tipo de uma peça por efeito colateral: "é alteração
-- contratual" sai de `respostasDaAlteracao.length > 0`, "pode gerar alteração"
-- sai de o modelo ter flags manuais penduradas, e "constituição ou terceira
-- alteração" sai do campo digitado `numeroAlteracao`. Nenhuma das três é uma
-- declaração, e as três decidem coisa séria (quais movimentos do ledger a peça
-- carimba, quais gestos a tela oferece).
--
-- A tentação é pendurar um tipo no MODELO, mas o banco desmente: a alteração
-- contratual usa o MESMO `documento_template_id` do contrato social que ela
-- substitui (as duas sucessões do sandbox, template idêntico ao substituído).
-- No nível do modelo a resposta não existe. Então são duas alturas:
--
--   tmpl_documento.escopo  — o modelo declara se entra na vida societária.
--   documento_gerado.papel — a peça carimba o que exerce, ao nascer.
--
-- "Agro" e "Participações" não entram nisso: quem diz de qual sociedade a peça
-- fala é `pj_pessoa_id`, e o que ela é (PR ou CN) já está em pessoa.tipo_empresa.
-- É o que faz N proprietárias sob uma controladora funcionarem sem N tipos:
-- são N cadeias do mesmo modelo, uma por empresa.

-- ── 1. O escopo do modelo ─────────────────────────────────────────────────────
-- Default 'avulso': no dia da migration nada muda de comportamento, exceto onde
-- a declaração é feita de propósito, logo abaixo. Contrato de parceria, composse
-- e descrição de imóvel seguem sendo o gerador aberto, sem declarar nada.
alter table public.tmpl_documento
  add column if not exists escopo text not null default 'avulso';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.tmpl_documento'::regclass
                    and conname = 'tmpl_documento_escopo_check') then
    alter table public.tmpl_documento
      add constraint tmpl_documento_escopo_check
        check (escopo in ('sociedade', 'avulso'));
  end if;
end $$;

comment on column public.tmpl_documento.escopo is
  'Se as peças deste modelo participam da vida societária (registro na junta, '
  'carimbo no ledger, sucessão) ou são avulsas. Não confundir com `tipo`, que é '
  'rótulo livre digitado na tela de Montagem.';

-- Os dois contratos sociais. Casados por `tipo`, e não por nome: os dois modelos
-- foram RENOMEADOS em 31/08/2026 17:20 (de "Contrato Social — Sociedade Limitada
-- (Agro)" para "Contrato Social - (Agro)"), o que é justamente o motivo de existir
-- uma coluna declarada em vez de consulta por nome.
update public.tmpl_documento
   set escopo = 'sociedade',
       updated_at = now()
 where tipo = 'societario'
   and escopo <> 'sociedade';

-- ── 2. O papel da peça ────────────────────────────────────────────────────────
-- Nulo quando o modelo é avulso: papel é sobre a sociedade, e peça avulsa não
-- fala de sociedade nenhuma.
alter table public.documento_gerado
  add column if not exists papel text;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.documento_gerado'::regclass
                    and conname = 'documento_gerado_papel_check') then
    alter table public.documento_gerado
      add constraint documento_gerado_papel_check
        check (papel is null or papel in ('constitutivo', 'alterador'));
  end if;

  -- Peça de sociedade sem empresa apontada não existe: ela é SOBRE alguém. Hoje
  -- nenhuma das 17 peças societárias está sem `pj_pessoa_id`, então o CHECK
  -- entra sem violação e passa a impedir a próxima.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.documento_gerado'::regclass
                    and conname = 'documento_gerado_papel_exige_empresa') then
    alter table public.documento_gerado
      add constraint documento_gerado_papel_exige_empresa
        check (papel is null or pj_pessoa_id is not null);
  end if;
end $$;

comment on column public.documento_gerado.papel is
  'O que esta peça faz com a sociedade: constitutivo (a primeira, publica a '
  'existência) ou alterador (sucede outra). Carimbado ao nascer e imutável: '
  'mudar o modelo depois não reescreve a história de peça registrada.';

-- ── 3. Backfill ───────────────────────────────────────────────────────────────
-- O papel é da LINHAGEM, não da versão: `documento_raiz_id` agrupa as versões
-- seladas do mesmo documento (rascunho/revisão/registrado), e todas elas exercem
-- o mesmo papel. A linhagem cuja raiz não substitui ninguém é a constituição.
--
-- É determinístico porque nenhuma sociedade tem duas linhagens candidatas: no
-- sandbox, 8 sociedades e 8 linhagens sem antecessor (as duas que pareciam
-- ambíguas tinham VERSÕES da mesma linhagem). Resultado esperado: 15
-- constitutivos e 2 alteradores no sandbox; 8 constitutivos em produção, onde
-- ainda não há nada registrado nem nenhuma alteração.
update public.documento_gerado dg
   set papel = case when raiz.substitui_documento_id is null
                    then 'constitutivo'
                    else 'alterador' end
  from public.documento_gerado raiz,
       public.tmpl_documento td
 where raiz.id = coalesce(dg.documento_raiz_id, dg.id)
   and td.id = dg.documento_template_id
   and td.escopo = 'sociedade'
   and dg.papel is null;

-- ── 4. A peça acessória ───────────────────────────────────────────────────────
-- Toda doação de quotas sai como DUAS peças: a alteração contratual, que faz o
-- trabalho societário e vai à junta, e o contrato particular de doação, que não
-- vai. A segunda é avulsa no eixo do papel, mas não é solta: ela acompanha uma
-- peça específica. Um FK nulo, no vocabulário que a tabela já usa
-- (`substitui_documento_id`, `documento_anterior_id`, `documento_raiz_id`).
alter table public.documento_gerado
  add column if not exists acompanha_documento_id uuid
    references public.documento_gerado(id) on delete set null;

comment on column public.documento_gerado.acompanha_documento_id is
  'A peça que esta acompanha (ex.: contrato particular de doação ao lado da '
  'alteração contratual que a formaliza). Só peça de escopo avulso acompanha.';

create index if not exists idx_documento_gerado_acompanha
  on public.documento_gerado (acompanha_documento_id)
  where acompanha_documento_id is not null;

-- ── 5. Uma sociedade se constitui uma vez ─────────────────────────────────────
-- Invariante que hoje não é expressável, e é o motivo de `papel` morar na tabela
-- da peça em vez de ser derivado da cadeia em tempo de leitura. Zero violações
-- no sandbox: sociedade com dois documentos registrados tem constitutivo + uma
-- alteração, e não duas constituições.
create unique index if not exists documento_gerado_um_constitutivo_registrado
  on public.documento_gerado (cliente_id, pj_pessoa_id)
  where papel = 'constitutivo' and status = 'registrado';

-- ── 6. O fork da linhagem carrega o papel ─────────────────────────────────────
-- `selar_e_forkar_documento` cria a head nova copiando da selada. O papel é da
-- LINHAGEM, então ele viaja junto, pela mesma razão que a própria função já dá
-- para `substitui_documento_id`: toda versão responde o que ela é sem join até a
-- raiz. `acompanha_documento_id` vai pelo mesmo motivo.
CREATE OR REPLACE FUNCTION public.selar_e_forkar_documento(_head_id uuid, _snapshot_flags jsonb, _snapshot_dados jsonb, _snapshot_versoes_blocos jsonb, _validado_em timestamp with time zone)
 RETURNS documento_gerado
 LANGUAGE plpgsql
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
  -- responder o que ela substitui sem join ate a raiz. papel e
  -- acompanha_documento_id viajam pela mesma razao.
  INSERT INTO public.documento_gerado (
    cliente_id, pj_pessoa_id, documento_template_id, status,
    documento_anterior_id, documento_raiz_id, substitui_documento_id,
    papel, acompanha_documento_id,
    gerado_por_id, snapshot_flags, snapshot_dados, snapshot_versoes_blocos,
    snapshot_validado_em
  ) VALUES (
    v_head.cliente_id, v_head.pj_pessoa_id, v_head.documento_template_id, 'rascunho',
    v_head.id, COALESCE(v_head.documento_raiz_id, v_head.id), v_head.substitui_documento_id,
    v_head.papel, v_head.acompanha_documento_id,
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
