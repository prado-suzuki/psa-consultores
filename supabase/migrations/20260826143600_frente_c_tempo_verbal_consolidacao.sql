-- 20260826143600_frente_c_tempo_verbal_consolidacao.sql
--
-- Constituição e consolidação descrevem momentos diferentes da sociedade. A
-- constituição conserva o futuro já usado pelo catálogo; a consolidação precisa
-- afirmar, no presente, o estado que passou a vigorar após as alterações.
--
-- Os blocos são gêmeos, em vez de versões substitutas, porque as duas redações
-- continuam vigentes ao mesmo tempo. As flags mutuamente exclusivas criadas pela
-- Frente A escolhem uma delas sem mudar o motor de composição nem os snapshots
-- dos documentos já validados.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

-- ---------------------------------------------------------------------------
-- 1. Os seis gêmeos no presente
-- ---------------------------------------------------------------------------
-- IDs próprios mantêm as duas redações empilhadas no catálogo. O conteúdo longo
-- da administração é repetido de propósito: somente o caput muda de tempo verbal,
-- enquanto as doze alíneas permanecem integralmente iguais ao original.
INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES
  (
    'fc000001-0000-4000-8000-000000000001'::uuid,
    'Cláusula — Denominação da sociedade (consolidação)',
    'contrato-social',
    'Redação no presente usada exclusivamente no contrato social consolidado de uma alteração.',
    'clausula',
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000002'::uuid,
    'Cláusula — Sede (consolidação)',
    'contrato-social',
    'Redação no presente usada exclusivamente no contrato social consolidado de uma alteração.',
    'clausula',
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000003'::uuid,
    'Cláusula — Prazo de duração (consolidação)',
    'contrato-social',
    'Redação no presente usada exclusivamente no contrato social consolidado de uma alteração.',
    'clausula',
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000004'::uuid,
    'Cláusula — Objeto social (consolidação)',
    'contrato-social',
    'Redação no presente usada exclusivamente no contrato social consolidado de uma alteração.',
    'clausula',
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000005'::uuid,
    'Cláusula — Capital social integralizado em moeda corrente (consolidação)',
    'contrato-social',
    'Redação no presente usada exclusivamente no contrato social consolidado de uma alteração.',
    'clausula',
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000006'::uuid,
    'Cláusula — Administração e poderes (consolidação)',
    'contrato-social',
    'Redação no presente usada exclusivamente no contrato social consolidado de uma alteração.',
    'clausula',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Versões iniciais dos gêmeos
-- ---------------------------------------------------------------------------
-- Versões não são sobrescritas: a guarda permite reaplicar a migration sem
-- empilhar outra versão e preserva o histórico caso o catálogo já tenha seguido
-- adiante. Na duração, toda a oração da data é condicional; sem cadastro da data
-- de constituição, a frase segue de "indeterminado" diretamente para o fecho.
INSERT INTO public.tmpl_bloco_versao (
  bloco_id,
  numero_versao,
  atual,
  conteudo,
  changelog
)
SELECT r.bloco_id, 1, true, r.conteudo, r.changelog
  FROM (VALUES
    (
      'fc000001-0000-4000-8000-000000000001'::uuid,
      $txt$A sociedade gira sob o nome {{ sociedade.razaoSocial }}, regendo-se por este contrato social, pela Lei nº 10.406, de 10 de janeiro de 2.002, supletivamente pela Lei nº 6.404, de 15 de dezembro de 1.976 e, quando for o caso e nos limites do que for pactuado, por eventuais Acordos de Quotistas.$txt$,
      'Gêmeo no presente para a consolidação: a sociedade já gira sob a denominação informada.'
    ),
    (
      'fc000001-0000-4000-8000-000000000002'::uuid,
      $txt$A sociedade tem sede estabelecida na {{ sociedade.sedeEndereco }}, no município de {{sociedade.sedeMunicipio }}, no Estado de {{ sociedade.sedeUf }}, CEP {{ sociedade.sedeCep }}.$txt$,
      'Gêmeo no presente para a consolidação: a sociedade já tem a sede informada.'
    ),
    (
      'fc000001-0000-4000-8000-000000000003'::uuid,
      $txt$O prazo de duração desta sociedade é indeterminado{{#sociedade.dataConstituicao}}, iniciando suas atividades em {{ sociedade.dataConstituicao }}{{/sociedade.dataConstituicao}}, findando-se na forma da lei.$txt$,
      'Gêmeo da consolidação com a data real de início, sem deixar lacuna quando ela não estiver cadastrada.'
    ),
    (
      'fc000001-0000-4000-8000-000000000004'::uuid,
      $txt$A sociedade tem por objeto as seguintes atividades:
{{ sociedade.objeto }}$txt$,
      'Gêmeo no presente para a consolidação: a sociedade já tem o objeto informado.'
    ),
    (
      'fc000001-0000-4000-8000-000000000005'::uuid,
      $txt$O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, sendo subscrito e integralizado da forma que segue: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalizando R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), integralizadas {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}* em moeda corrente nacional{{/socios}}; estando o capital social da empresa totalmente subscrito e integralizado pelos sócios e assim distribuído:$txt$,
      'Gêmeo no presente para a consolidação, sem afirmar que a integralização ocorre neste ato.'
    ),
    (
      'fc000001-0000-4000-8000-000000000006'::uuid,
      $txt$A sociedade é administrada isoladamente por {{#administradores sep="; " fim="; e "}}{{ administrador.nome }}, {{ administrador.brasileiro }}, {{ administrador.casado }}, {{ administrador.profissao }}, {{ administrador.portador }} da Cédula de Identidade RG nº {{ administrador.rg }} - {{ administrador.orgaoExpedidor }}, {{ administrador.inscrito }} no CPF/MF sob o nº {{ administrador.cpfCnpj }}, {{ administrador.residente }} no endereço {{ administrador.endereco }}{{/administradores}}, a quem compete representar a sociedade ativa e passivamente, em juízo ou fora dele, inclusive perante o sistema financeiro nacional, entidades oficiais, repartições públicas, autarquias e sociedades de economia mista, repartições federais, estaduais e municipais, observando sempre os eventuais limites e condições impostas pelo presente Contrato Social, podendo, para tanto:
    a) Celebrar instrumentos e negócios jurídicos relacionados a operações financeiras, empréstimos, financiamentos e respectivos instrumentos de constituição de garantias;
    b) Comprar, adquirir, emprestar e permutar bens móveis de toda e qualquer natureza, incluindo fertilizantes, defensivos, sementes, mudas, insumos, peças, implementos, equipamentos, máquinas, suplementos etc.;
    c) Celebrar contratos de "leasing", aluguel e contratar serviços de terceiros;
    d) Alienar bens móveis da sociedade e produtos decorrentes da exploração das atividades econômicas exercidas pela sociedade;
    e) Realizar investimentos, construções, edificações e realização de benfeitorias, contratando, comprando e adquirindo bens em nome da sociedade;
    f) Celebrar contratos, instrumentos jurídicos e negócios de qualquer natureza não elencados anteriormente e que obriguem e/ou onerem a sociedade e seu patrimônio;
    g) Abrir, encerrar, movimentar contas bancárias, assinar cheques, recibos e depósitos bancários;
    h) Autorizar a sociedade a iniciar e firmar acordos em processos judiciais;
    i) Convocar Reunião de Sócios, ressalvadas as demais hipóteses previstas neste contrato social e em lei;
    j) Elaborar o balanço patrimonial e as demonstrações financeiras e contábeis a serem submetidas à Reunião de Sócios para aprovação;
    k) Encaminhar à Reunião de Sócios proposta de compra, alienação e/ou oneração de bens imóveis a favor da sociedade ou de propriedade dela;
    l) Aprovar o uso de qualquer marca, nome ou símbolo que represente o nome, denominação social, razão social ou nome fantasia da sociedade por terceiros.$txt$,
      'Gêmeo no presente para a consolidação; alíneas e poderes permanecem idênticos ao original.'
    )
  ) AS r(bloco_id, conteudo, changelog)
 WHERE NOT EXISTS (
   SELECT 1
     FROM public.tmpl_bloco_versao AS bv
    WHERE bv.bloco_id = r.bloco_id
 );

-- ---------------------------------------------------------------------------
-- 3. Um lado para constituição, o outro para alteração
-- ---------------------------------------------------------------------------
-- As flags são adicionadas, não substituídas, para não apagar condições de
-- catálogo que algum bloco venha a receber por outra frente.
INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT p.bloco_id, f.id
  FROM (VALUES
    ('1e8e17fe-2dd0-4848-ae24-870525353993'::uuid, 'e_constituicao'),
    ('e8b3a472-6965-40e1-a548-90968566d367'::uuid, 'e_constituicao'),
    ('06c53014-23bd-4071-9b7a-991f2c9b1822'::uuid, 'e_constituicao'),
    ('7c76709d-4c31-4b28-ade3-4fde5dc9311f'::uuid, 'e_constituicao'),
    ('579e688d-9e52-4f57-af95-68548c4c1135'::uuid, 'e_constituicao'),
    ('4f869b8e-ccaf-40e2-9f04-fba0c47181b2'::uuid, 'e_constituicao'),
    ('fc000001-0000-4000-8000-000000000001'::uuid, 'e_alteracao'),
    ('fc000001-0000-4000-8000-000000000002'::uuid, 'e_alteracao'),
    ('fc000001-0000-4000-8000-000000000003'::uuid, 'e_alteracao'),
    ('fc000001-0000-4000-8000-000000000004'::uuid, 'e_alteracao'),
    ('fc000001-0000-4000-8000-000000000005'::uuid, 'e_alteracao'),
    ('fc000001-0000-4000-8000-000000000006'::uuid, 'e_alteracao')
  ) AS p(bloco_id, flag_nome)
  JOIN public.tmpl_flag AS f ON f.nome = p.flag_nome
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Cada gêmeo imediatamente depois do original em todos os modelos
-- ---------------------------------------------------------------------------
-- A posição é aberta um par por vez porque Agro e Participações não têm o mesmo
-- conjunto de cláusulas. Consultar a ordem corrente em cada passo também torna a
-- operação independente dos deslocamentos feitos pelos pares anteriores.
--
-- A presença do gêmeo no modelo é a guarda de idempotência: uma segunda execução
-- não desloca nenhum bloco novamente. `obrigatorio = false` reflete que a entrada
-- depende da flag, embora o compositor já dê precedência a ela.
DO $$
DECLARE
  m record;
  p record;
  v_ordem integer;
BEGIN
  FOR m IN
    SELECT id
      FROM public.tmpl_documento
     WHERE tipo = 'societario'
  LOOP
    FOR p IN
      SELECT *
        FROM (VALUES
          (1, '1e8e17fe-2dd0-4848-ae24-870525353993'::uuid, 'fc000001-0000-4000-8000-000000000001'::uuid),
          (2, 'e8b3a472-6965-40e1-a548-90968566d367'::uuid, 'fc000001-0000-4000-8000-000000000002'::uuid),
          (3, '06c53014-23bd-4071-9b7a-991f2c9b1822'::uuid, 'fc000001-0000-4000-8000-000000000003'::uuid),
          (4, '7c76709d-4c31-4b28-ade3-4fde5dc9311f'::uuid, 'fc000001-0000-4000-8000-000000000004'::uuid),
          (5, '579e688d-9e52-4f57-af95-68548c4c1135'::uuid, 'fc000001-0000-4000-8000-000000000005'::uuid),
          (6, '4f869b8e-ccaf-40e2-9f04-fba0c47181b2'::uuid, 'fc000001-0000-4000-8000-000000000006'::uuid)
        ) AS pares(sequencia, original_id, gemeo_id)
       ORDER BY sequencia
    LOOP
      SELECT ordem
        INTO v_ordem
        FROM public.tmpl_documento_bloco
       WHERE documento_id = m.id
         AND bloco_id = p.original_id;

      IF v_ordem IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM public.tmpl_documento_bloco
         WHERE documento_id = m.id
           AND bloco_id = p.gemeo_id
      ) THEN
        UPDATE public.tmpl_documento_bloco
           SET ordem = ordem + 1,
               updated_at = now()
         WHERE documento_id = m.id
           AND ordem > v_ordem;

        INSERT INTO public.tmpl_documento_bloco (
          documento_id,
          bloco_id,
          ordem,
          obrigatorio
        )
        VALUES (m.id, p.gemeo_id, v_ordem + 1, false);
      END IF;

      v_ordem := NULL;
    END LOOP;
  END LOOP;
END $$;
