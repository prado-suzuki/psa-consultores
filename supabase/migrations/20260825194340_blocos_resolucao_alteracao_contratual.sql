-- 20260825194340_blocos_resolucao_alteracao_contratual.sql
--
-- Os blocos de RESOLUÇÃO da alteração contratual: um por evento, cada um
-- vinculado à SUA flag, e o desfazimento do vínculo improvisado que o ensaio
-- deixou no catálogo.
--
-- Por que uma flag por bloco, e não seis flags num bloco só
-- ------------------------------------------------------------------
-- `src/lib/templates/composition.ts` compõe com AND simples:
--
--     if (flags.length > 0) return flags.every((flag) => ativas.has(flag));
--
-- O ensaio pendurou as seis flags `evento_*` no bloco `Capítulo — Questões
-- Diversas` só para ter algo que reagisse aos interruptores. Isso está errado
-- por dois motivos independentes, e os dois se corrigem aqui:
--
--   1. o AND exigiria que TODOS os seis eventos tivessem acontecido na mesma
--      alteração para o capítulo entrar, o que é cenário raríssimo. A alteração
--      real registra UM evento, ou dois;
--   2. aquele capítulo não é condicional coisa nenhuma: ele abriga a cláusula de
--      foro e pertence a todo contrato. Preso a flags de evento, ele sumia de
--      todo contrato de constituição, que não responde essas perguntas.
--
-- O vínculo correto é um por bloco: cada evento marcado no assistente puxa a sua
-- própria resolução, e as resoluções se somam no documento na ordem do modelo.
-- Nenhum bloco fica dependendo do que os outros eventos responderam.
--
-- Onde os blocos entram no documento
-- ------------------------------------------------------------------
-- No desenho fechado em 20260825143000, a alteração contratual não tem modelo
-- próprio: ela é gerada a partir do MESMO modelo de contrato social, com as
-- respostas de evento ancoradas no documento registrado que ela substitui
-- (`projeto_flag_valor.documento_base_id`). O documento sai então como
-- "alteração e consolidação": as resoluções primeiro, o contrato consolidado
-- (todo o resto do modelo) depois. Daí a posição escolhida, logo após o
-- preâmbulo de qualificação dos sócios e antes do primeiro capítulo.
--
-- Tipo `livre`, e não `clausula`: cláusula tem numeração automática CONTÍNUA
-- (numeracao.ts não reseta por capítulo), então uma resolução numerada empurraria
-- a numeração do contrato consolidado inteiro, e "CLÁUSULA PRIMEIRA" passaria a
-- ser a resolução em vez da denominação da sociedade. Bloco livre sai como
-- escrito e não consome número; a rubrica em negrito faz o papel do rótulo.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

-- ---------------------------------------------------------------------------
-- 1. Desfazer o vínculo improvisado do ensaio
-- ---------------------------------------------------------------------------
-- Só as flags de EVENTO saem daquele capítulo. `empresa-proprietaria` e as
-- demais derivadas, onde quer que estejam vinculadas, ficam intactas.
DELETE FROM public.tmpl_bloco_flag bf
 USING public.tmpl_flag f
 WHERE bf.flag_id = f.id
   AND bf.bloco_id = '00e9675c-4dfe-4b75-9ab2-d49cb44d3824'::uuid
   AND f.nome LIKE 'evento\_%';

-- ---------------------------------------------------------------------------
-- 2. Os seis blocos
-- ---------------------------------------------------------------------------
INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES
  ('ac000001-0000-4000-8000-000000000001'::uuid,
   'Resolução: alteração do endereço da sede',
   'alteracao-contratual',
   'Entra quando o evento "Houve mudança do endereço da sede" é marcado no assistente de alteração contratual.',
   'livre', true),
  ('ac000001-0000-4000-8000-000000000002'::uuid,
   'Resolução: aumento do capital social',
   'alteracao-contratual',
   'Entra quando o evento "Houve aumento do capital social" é marcado no assistente de alteração contratual.',
   'livre', true),
  ('ac000001-0000-4000-8000-000000000003'::uuid,
   'Resolução: cessão de quotas',
   'alteracao-contratual',
   'Entra quando o evento "Houve cessão de quotas entre sócios ou para terceiro" é marcado no assistente de alteração contratual.',
   'livre', true),
  ('ac000001-0000-4000-8000-000000000004'::uuid,
   'Resolução: integralização de capital',
   'alteracao-contratual',
   'Entra quando o evento "Houve integralização de capital" é marcado no assistente de alteração contratual.',
   'livre', true),
  ('ac000001-0000-4000-8000-000000000005'::uuid,
   'Resolução: mudança na administração',
   'alteracao-contratual',
   'Entra quando o evento "Houve mudança na administração da sociedade" é marcado no assistente de alteração contratual.',
   'livre', true),
  ('ac000001-0000-4000-8000-000000000006'::uuid,
   'Resolução: entrada ou retirada de sócio',
   'alteracao-contratual',
   'Entra quando o evento "Houve entrada ou retirada de sócio" é marcado no assistente de alteração contratual.',
   'livre', true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. A redação de cada um (versão 1, vigente)
-- ---------------------------------------------------------------------------
-- Todo placeholder abaixo já existe no vocabulário (src/lib/templates/
-- vocabulario.ts) e é preenchido pelos mapeadores da tela Gerar. Nenhum campo
-- novo foi inventado: o consolidado da alteração é escrito do cadastro ATUAL,
-- que é o que o assistente avisa ter de estar atualizado antes de gerar.
--
-- O que o cadastro NÃO tem, e por isso nenhuma resolução escreve: o valor
-- ANTERIOR (capital antes do aumento, sede antiga, quadro societário antes da
-- cessão). O caminho B não guarda a história da sociedade, então as resoluções
-- afirmam o estado NOVO ("passa a ser de R$ …") em vez de "de X para Y".
INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
SELECT r.bloco_id, 1, true, r.conteudo, 'Redação inicial das resoluções da alteração contratual.'
  FROM (VALUES
    ('ac000001-0000-4000-8000-000000000001'::uuid,
$txt$*Da alteração do endereço da sede.* Os sócios resolvem, por unanimidade, transferir a sede da sociedade, que passa a estar estabelecida na {{ sociedade.sedeEndereco }}, no município de {{ sociedade.sedeMunicipio }}, no Estado de {{ sociedade.sedeUf }}, CEP {{ sociedade.sedeCep }}, ficando alterada, em consequência, a cláusula do contrato social que dispõe sobre a sede, cuja nova redação consta da consolidação adiante.$txt$),

    ('ac000001-0000-4000-8000-000000000002'::uuid,
$txt$*Do aumento do capital social.* Os sócios resolvem, por unanimidade, aumentar o capital social da sociedade, que passa a ser de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas subscritas e integralizadas {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}*, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}, ficando alterada a cláusula que dispõe sobre o capital social, cuja nova redação consta da consolidação adiante.$txt$),

    ('ac000001-0000-4000-8000-000000000003'::uuid,
$txt$*Da cessão de quotas.* Os sócios resolvem, por unanimidade, formalizar a cessão e transferência de quotas ajustada entre as partes, em caráter irrevogável e irretratável, dando-se cedentes e cessionários mútua, plena, geral e irrevogável quitação. Os demais sócios, cientes da cessão, renunciam expressamente ao direito de preferência assegurado neste contrato social e admitem os cessionários na sociedade, que sucedem os cedentes em todos os direitos e obrigações das quotas cedidas. Em razão da cessão, o capital social, no valor de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, passa a estar assim distribuído: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}.$txt$),

    ('ac000001-0000-4000-8000-000000000004'::uuid,
$txt$*Da integralização de capital.* Os sócios resolvem, por unanimidade, integralizar as quotas subscritas mediante a transferência à sociedade, em caráter definitivo e para todos os fins de direito, dos bens e valores adiante indicados, que passam a integrar o patrimônio social pelos valores atribuídos, na seguinte proporção: {{#integralizacoes sep="; " fim="; e "}}{{ socio.ordemRomana }}) o valor de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), integralizado {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}*{{/integralizacoes}}. A descrição individualizada dos bens integralizados e a respectiva titularidade constam da cláusula de capital social da consolidação adiante.$txt$),

    ('ac000001-0000-4000-8000-000000000005'::uuid,
$txt$*Da administração da sociedade.* Os sócios resolvem, por unanimidade, alterar a administração da sociedade, que passa a ser exercida, com os poderes e nos limites estabelecidos na consolidação adiante, por {{#administradores sep="; " fim="; e "}}*{{ administrador.nomeMaiusculo }}*, {{ administrador.brasileiro }}, {{ administrador.casado }}, {{ administrador.profissao }}, {{ administrador.portador }} da Cédula de Identidade RG nº {{ administrador.rg }} - {{ administrador.orgaoExpedidor }}, {{ administrador.inscrito }} no CPF/MF sob o nº {{ administrador.cpfCnpj }}, {{ administrador.residente }} no endereço {{ administrador.endereco }}{{/administradores}}. Ficam ratificados todos os atos de gestão praticados pela administração anterior até a presente data.$txt$),

    ('ac000001-0000-4000-8000-000000000006'::uuid,
$txt$*Da entrada e da retirada de sócio.* Os sócios resolvem, por unanimidade, alterar a composição do quadro societário, admitindo os sócios ingressantes, que declaram conhecer e aceitar integralmente o contrato social, e homologando a retirada dos sócios que se desligam, aos quais foram apurados e pagos os haveres na forma prevista neste contrato social, dando-se as partes mútua, plena, geral e irrevogável quitação, nada mais tendo a reclamar uma da outra a qualquer título. Em consequência, o quadro societário passa a ser composto por: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, representativas de {{ socio.percentual }}% do capital social{{/socios}}.$txt$)
  ) AS r(bloco_id, conteudo)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.tmpl_bloco_versao bv WHERE bv.bloco_id = r.bloco_id
 );

-- ---------------------------------------------------------------------------
-- 4. Uma flag por bloco
-- ---------------------------------------------------------------------------
INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT p.bloco_id, f.id
  FROM (VALUES
    ('ac000001-0000-4000-8000-000000000001'::uuid, 'evento_alteracao_endereco'),
    ('ac000001-0000-4000-8000-000000000002'::uuid, 'evento_aumento_capital'),
    ('ac000001-0000-4000-8000-000000000003'::uuid, 'evento_cessao_quotas'),
    ('ac000001-0000-4000-8000-000000000004'::uuid, 'evento_integralizacao'),
    ('ac000001-0000-4000-8000-000000000005'::uuid, 'evento_mudanca_administracao'),
    ('ac000001-0000-4000-8000-000000000006'::uuid, 'evento_mudanca_socios')
  ) AS p(bloco_id, flag_nome)
  JOIN public.tmpl_flag f ON f.nome = p.flag_nome
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Posição nos modelos de contrato social
-- ---------------------------------------------------------------------------
-- Entre o preâmbulo de qualificação (ordem 2) e o primeiro capítulo (ordem 3).
-- `ordem` não tem índice único, mas a leitura da tela é `order by ordem`: empate
-- daria ordem indefinida, então abrimos espaço de verdade empurrando o resto.
--
-- O DO inteiro é guardado pela presença do primeiro bloco no modelo: rodar a
-- migration de novo não empurra a numeração uma segunda vez.
--
-- `obrigatorio = false` porque o campo só governa bloco SEM flag (ver
-- comporBlocos): num bloco com flag ele é ignorado, e marcá-lo mentiria.
DO $$
DECLARE
  m record;
BEGIN
  FOR m IN
    SELECT id FROM public.tmpl_documento WHERE tipo = 'societario'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.tmpl_documento_bloco
       WHERE documento_id = m.id
         AND bloco_id = 'ac000001-0000-4000-8000-000000000001'::uuid
    ) THEN
      UPDATE public.tmpl_documento_bloco
         SET ordem = ordem + 10, updated_at = now()
       WHERE documento_id = m.id
         AND ordem >= 3;

      INSERT INTO public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
      VALUES
        (m.id, 'ac000001-0000-4000-8000-000000000001'::uuid, 3, false),
        (m.id, 'ac000001-0000-4000-8000-000000000002'::uuid, 4, false),
        (m.id, 'ac000001-0000-4000-8000-000000000003'::uuid, 5, false),
        (m.id, 'ac000001-0000-4000-8000-000000000004'::uuid, 6, false),
        (m.id, 'ac000001-0000-4000-8000-000000000005'::uuid, 7, false),
        (m.id, 'ac000001-0000-4000-8000-000000000006'::uuid, 8, false);
    END IF;
  END LOOP;
END $$;
