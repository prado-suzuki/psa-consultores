-- 20260909205536_resolucao_qualificacao_endereco_socio.sql
--
-- A sétima resolução da alteração contratual: a ATUALIZAÇÃO DO ENDEREÇO NA
-- QUALIFICAÇÃO DE SÓCIO, com a flag que a puxa e a posição dela no instrumento.
--
-- Por que esta matéria, e só ela
-- ------------------------------------------------------------------
-- `evento_alteracao_qualificacao` já existia como constante no código
-- (`src/lib/osg/alteracaoPorEventos.ts`) e não existia no catálogo: a divergência
-- de qualificação era detectada e mostrada como pendência, sem interruptor,
-- porque não havia modelo nem causa homologados. O código passa a separar a
-- qualificação POR MATÉRIA, e esta migration homologa a primeira: o endereço do
-- sócio pessoa física. CPF, profissão, estado civil, RG e data de nascimento
-- seguem como pendência, exatamente como antes.
--
-- A redação abaixo é modelada nos instrumentos REGISTRADOS da casa, e não
-- inventada:
--
--   GMS 7ª, cláusula primeira  — "Em decorrência da atualização do Código de
--     Endereçamento Postal – CEP no município de …, altera-se a qualificação dos
--     sócios A, B, C e D, para fazer constar o atual endereço destes, vigorando a
--     partir de então nos seguintes termos: …"
--   ITFD Participações 2ª, cláusula primeira — mesma abertura, no singular.
--   MMS Participações 1ª, cláusula primeira — sem a abertura de CEP: "Altera-se
--     os endereços dos sócios X e Y, a fim de que se conste, em suas
--     qualificações, os seguintes domicílios, nos moldes abaixo: …"
--   Fartura 8ª, cláusula primeira — plural, com a qualificação reproduzida por
--     inteiro depois dos dois-pontos.
--
-- ATENÇÃO, REVISÃO JURÍDICA: a redação é derivada desses quatro instrumentos e
-- não foi assinada por quem responde pelo texto jurídico. Antes de aplicar em
-- produção, a cláusula precisa do aceite dele — é a mesma pendência que a daily
-- de 24/08 registrou para as resoluções.
--
-- Por que as palavras variáveis não estão no bloco
-- ------------------------------------------------------------------
-- "o sócio … altera-se" x "os sócios … alteram-se", e a abertura que só existe
-- quando a causa é postal: flexão de verbo e de artigo não sai de `sep`/`fim` de
-- seção. Quem concorda é o código (`vocabularioDaRequalificacao`, em
-- mapeadores.ts), pelo mesmo contrato da cláusula de retirada: com a lista vazia
-- os cinco placeholders saem VAZIOS, o bloco renderiza em branco e o motor o
-- derruba por 'lista-vazia'. É isso que faz a resolução não existir na peça em
-- que ninguém foi requalificado.
--
-- Tipo `livre`, como as outras seis: cláusula tem numeração automática contínua,
-- e uma resolução numerada empurraria a numeração do contrato consolidado.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

-- ---------------------------------------------------------------------------
-- 1. A flag do evento
-- ---------------------------------------------------------------------------
INSERT INTO public.tmpl_flag (nome, tipo, escopo, descricao, ativo) VALUES
  ('evento_alteracao_qualificacao', 'manual', 'pj',
   'Houve mudança de endereço de sócio pessoa física', true)
ON CONFLICT (nome) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. O bloco
-- ---------------------------------------------------------------------------
INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES
  ('ac000001-0000-4000-8000-000000000007'::uuid,
   'Resolução: atualização do endereço na qualificação de sócio',
   'alteracao-contratual',
   'Entra quando o evento "Houve mudança de endereço de sócio pessoa física" é marcado no assistente de alteração contratual.',
   'livre', true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. A redação (versão 1, vigente)
-- ---------------------------------------------------------------------------
INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
SELECT r.bloco_id, 1, true, r.conteudo,
       'Redação inicial da resolução de atualização do endereço na qualificação de sócio.'
  FROM (VALUES
    ('ac000001-0000-4000-8000-000000000007'::uuid,
$txt$*Da atualização da qualificação de sócio.* {{ requalificacao.causa }}{{ requalificacao.verbo }} {{ requalificacao.aQualificacao }} {{ requalificacao.titulo }} {{#requalificados sep=", " fim=" e "}}*{{ requalificado.nomeMaiusculo }}*{{/requalificados}}, para fazer constar {{ requalificacao.objeto }}, permanecendo inalterados os demais dados da qualificação e vigorando, a partir de então, nos seguintes termos: {{#requalificados sep="; " fim="; e "}}{{ requalificado.qualificacao }}{{/requalificados}}.$txt$)
  ) AS r(bloco_id, conteudo)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.tmpl_bloco_versao bv WHERE bv.bloco_id = r.bloco_id
 );

-- ---------------------------------------------------------------------------
-- 4. O vínculo com a flag
-- ---------------------------------------------------------------------------
INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT p.bloco_id, f.id
  FROM (VALUES
    ('ac000001-0000-4000-8000-000000000007'::uuid, 'evento_alteracao_qualificacao')
  ) AS p(bloco_id, flag_nome)
  JOIN public.tmpl_flag f ON f.nome = p.flag_nome
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Posição: a PRIMEIRA das resoluções
-- ---------------------------------------------------------------------------
-- Nos quatro instrumentos citados a atualização de qualificação é a Cláusula
-- Primeira, antes da sede e do capital. A razão é a mesma que põe a qualificação
-- das partes no preâmbulo: o instrumento diz QUEM são as partes antes de dizer o
-- que elas deliberam.
--
-- Hoje a seção "DAS ALTERAÇÕES CONTRATUAIS" está em 3 e as seis resoluções em
-- 4..9 (a migration 20260826143500 as empurrou uma casa). Em vez de reservar um
-- número, tudo que vem depois da seção anda uma casa e a resolução nova assume o
-- 4: assim o bloco entra na frente sem depender de os valores de hoje serem
-- exatamente esses, e nenhum bloco muda de ordem RELATIVA a outro.
--
-- A guarda de idempotência é a existência do vínculo documento↔bloco, como nas
-- migrations anteriores: rodar de novo não empurra nada uma segunda vez.
DO $$
DECLARE
  v_documento record;
  v_bloco uuid := 'ac000001-0000-4000-8000-000000000007'::uuid;
  v_secao uuid := 'ac000002-0000-4000-8000-000000000002'::uuid;
  v_ordem_secao integer;
BEGIN
  FOR v_documento IN
    SELECT id
      FROM public.tmpl_documento
     WHERE tipo = 'societario'
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM public.tmpl_documento_bloco
       WHERE documento_id = v_documento.id
         AND bloco_id = v_bloco
    ) THEN
      SELECT ordem
        INTO v_ordem_secao
        FROM public.tmpl_documento_bloco
       WHERE documento_id = v_documento.id
         AND bloco_id = v_secao;

      -- Modelo societário que ainda não recebeu a moldura da alteração: não há
      -- onde ancorar a resolução, e forçá-la para o fim do documento a colocaria
      -- depois do fecho. Fica de fora até a moldura chegar.
      IF v_ordem_secao IS NULL THEN
        CONTINUE;
      END IF;

      UPDATE public.tmpl_documento_bloco
         SET ordem = ordem + 1,
             updated_at = now()
       WHERE documento_id = v_documento.id
         AND ordem > v_ordem_secao;

      INSERT INTO public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
      VALUES (v_documento.id, v_bloco, v_ordem_secao + 1, false)
      ON CONFLICT (documento_id, bloco_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
