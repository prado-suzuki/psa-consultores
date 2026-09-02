-- 20260825143000_alteracao_contratual_sucessao_e_escopo_documento.sql
--
-- A alteração contratual deixa de ser um PASSO do assistente de geração e passa
-- a ser um DOCUMENTO PRÓPRIO, criado a partir de outro documento e substituindo
-- o antigo. Esta migration abre no schema as três coisas que esse desenho pede e
-- que ainda não existiam.
--
-- O desenho, em uma passada:
--
--   1. O contrato social é gerado e validado como hoje (documento_gerado head,
--      status 'rascunho', com os snapshots congelados).
--   2. Registrado na junta, ele é TRAVADO: status 'registrado'. Não se edita
--      mais, não se forka versão nova, não se re-sincroniza do cadastro. É a
--      peça que valeu.
--   3. Da folha desse documento travado sai "Gerar alteração contratual": um
--      assistente em modal que pergunta QUE EVENTOS aconteceram depois dele.
--   4. As respostas compõem ao vivo o documento da alteração (resoluções pelas
--      flags + consolidado do cadastro atualizado), e "Validar versão" cria o
--      documento NOVO, que aponta para o registrado em substitui_documento_id.
--   5. Registrada a alteração, o ciclo recomeça a partir dela.
--
-- Nada aqui aplica em produção. Segue o fluxo normal (sandbox pelo CLI,
-- produção pelo chat do Lovable).

-- ---------------------------------------------------------------------------
-- 1. A sucessão entre documentos
-- ---------------------------------------------------------------------------
-- documento_raiz_id/documento_anterior_id encadeiam VERSÕES DO MESMO documento:
-- useDocumentoVersoes lista a linhagem por `eq('documento_raiz_id', raiz)` e o
-- histórico da folha mostra tudo que sai dali como "versão N deste documento".
-- A alteração contratual não é isso: é outro documento, com raiz própria e
-- histórico próprio, que TOMA O LUGAR do anterior. Por isso uma coluna nova, e
-- não uma releitura das que existem.
--
-- ON DELETE SET NULL, não CASCADE: apagar o contrato registrado não pode levar
-- junto a alteração que o sucedeu. A alteração perde a referência (e vira um
-- documento solto, visível), mas não some.
ALTER TABLE public.documento_gerado
  ADD COLUMN IF NOT EXISTS substitui_documento_id uuid
    REFERENCES public.documento_gerado(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documento_gerado_substitui
  ON public.documento_gerado (substitui_documento_id)
  WHERE substitui_documento_id IS NOT NULL;

COMMENT ON COLUMN public.documento_gerado.substitui_documento_id IS
  'Documento (registrado) que esta peça substitui. Sucessão entre documentos DISTINTOS, '
  'diferente de documento_raiz_id/documento_anterior_id, que encadeiam versões do mesmo '
  'documento. Preenchido na raiz da alteração contratual e copiado nos forks da linhagem '
  'dela, para que qualquer versão responda o que substitui sem join até a raiz.';

-- ---------------------------------------------------------------------------
-- 2. O escopo 'documento' das flags manuais
-- ---------------------------------------------------------------------------
-- As seis flags de evento nasceram com escopo 'pj' (migration 20260824212848),
-- e no desenho anterior isso bastava: a pergunta era feita uma vez, dentro do
-- assistente, sobre a empresa.
--
-- No desenho novo isso está errado, e o índice único é onde o erro aparece:
-- uq_projeto_flag_valor_escopo_pj é (cliente_id, pj_pessoa_id, flag_id), UMA
-- linha por empresa por flag. "Houve aumento de capital" viraria um interruptor
-- GRUDENTO da empresa, para sempre — e a segunda alteração contratual da mesma
-- empresa nasceria com as respostas da primeira já ligadas, brigando pela mesma
-- linha. A resposta não é da empresa: é do evento.
ALTER TABLE public.tmpl_flag DROP CONSTRAINT IF EXISTS tmpl_flag_escopo_check;
ALTER TABLE public.tmpl_flag
  ADD CONSTRAINT tmpl_flag_escopo_check
    CHECK (escopo = ANY (ARRAY['cliente'::text, 'pj'::text, 'documento'::text]));

-- A chave da resposta é o documento REGISTRADO que a alteração sucede, não o
-- documento da alteração. Duas razões, e a segunda é a que decide:
--
--   (a) O predecessor já existe e está travado quando a pergunta é feita. O
--       documento da alteração ainda não existe — ele só nasce em "Validar
--       versão", e é bom que seja assim: `congelado` no controlador é
--       `documentoGerado != null`, e um documento_gerado criado cedo faria a
--       tela renderizar do snapshot em vez de compor ao vivo do cadastro
--       atualizado. O consolidado é justamente o estado NOVO.
--   (b) A chave fica estável durante toda a vida da alteração. Se a resposta
--       pendurasse no documento da alteração, cada "Atualizar versão" (que sela
--       a head e forka outra) exigiria recopiar as respostas, como já acontece
--       com os overrides. Pendurada no predecessor, que é imutável, ela
--       atravessa a linhagem inteira sem cópia.
--
-- Daí o nome: documento_BASE, o documento a partir do qual esta resposta vale.
ALTER TABLE public.projeto_flag_valor
  ADD COLUMN IF NOT EXISTS documento_base_id uuid
    REFERENCES public.documento_gerado(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.projeto_flag_valor.documento_base_id IS
  'Escopo ''documento'': o documento REGISTRADO a partir do qual esta resposta vale, isto é, '
  'o predecessor que a alteração contratual sucede — nunca o documento da alteração, que só '
  'nasce ao validar. NULL nos escopos ''cliente'' e ''pj''. CASCADE porque a resposta não faz '
  'sentido sem o documento que a ancora.';

-- Os dois únicos parciais que já existem passam a valer só para as linhas SEM
-- documento_base_id. Sem isso, uma resposta de escopo documento que também
-- carregue pj_pessoa_id (e ela carrega, é informação boa de ter) cairia dentro
-- de uq_projeto_flag_valor_escopo_pj e duas alterações da mesma empresa
-- colidiriam — exatamente o defeito que esta seção existe para fechar.
-- Nenhuma linha existente tem documento_base_id, então a recriação é inócua
-- sobre os dados de hoje.
DROP INDEX IF EXISTS public.uq_projeto_flag_valor_escopo_cliente;
CREATE UNIQUE INDEX IF NOT EXISTS uq_projeto_flag_valor_escopo_cliente
  ON public.projeto_flag_valor (cliente_id, flag_id)
  WHERE pj_pessoa_id IS NULL AND documento_base_id IS NULL;

DROP INDEX IF EXISTS public.uq_projeto_flag_valor_escopo_pj;
CREATE UNIQUE INDEX IF NOT EXISTS uq_projeto_flag_valor_escopo_pj
  ON public.projeto_flag_valor (cliente_id, pj_pessoa_id, flag_id)
  WHERE pj_pessoa_id IS NOT NULL AND documento_base_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_projeto_flag_valor_escopo_documento
  ON public.projeto_flag_valor (documento_base_id, flag_id)
  WHERE documento_base_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. As seis flags de evento migram de 'pj' para 'documento'
-- ---------------------------------------------------------------------------
-- UPDATE e não DELETE+INSERT: os ids são referenciados por tmpl_bloco_flag, e o
-- nome é a chave que snapshot_flags congela nas versões já seladas. Trocar id
-- ou nome quebraria a reprodução dessas versões.
--
-- Restrito a tipo = 'manual' por segurança: nenhuma derivada deve virar escopo
-- documento, porque derivada se calcula do cadastro e não tem resposta gravada.
UPDATE public.tmpl_flag
   SET escopo = 'documento', updated_at = now()
 WHERE nome LIKE 'evento\_%'
   AND tipo = 'manual'
   AND escopo <> 'documento';

-- As respostas de escopo 'pj' porventura gravadas pelo desenho anterior (o
-- assistente as escrevia no passo 3) ficam órfãs de qualquer flag: nenhuma flag
-- manual tem mais escopo 'pj'. Apagá-las evita que reapareçam ligadas quando o
-- consultor abrir a primeira alteração. É seguro: são respostas de teste da
-- frente, e o dado real da alteração ainda não existe em lugar nenhum.
DELETE FROM public.projeto_flag_valor v
 USING public.tmpl_flag f
 WHERE v.flag_id = f.id
   AND f.escopo = 'documento'
   AND v.documento_base_id IS NULL;
