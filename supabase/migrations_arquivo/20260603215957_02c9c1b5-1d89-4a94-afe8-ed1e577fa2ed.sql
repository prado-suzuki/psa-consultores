do $$
declare
  bloco record;
  v_bloco_id uuid;
  v_proxima int;
begin
  for bloco in
    select * from (values

      ('Preâmbulo — qualificação dos sócios',
$blk${{#socios sep="; " fim="; e "}}{{#sePF}}{{ socio.nome }}, {{ socio.brasileiro }}, {{ socio.casado }}, {{ socio.profissao }}, {{ socio.portador }} da Cédula de Identidade RG nº {{ socio.rg }} - {{ socio.orgaoExpedidor }}, {{ socio.inscrito }} no CPF/MF sob o nº {{ socio.cpfCnpj }}, {{ socio.residente }} no endereço {{ socio.endereco }}{{/sePF}}{{#sePJ}}{{ socio.nome }}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº {{ socio.cpfCnpj }}, com sede no endereço {{ socio.endereco }}, neste ato representada por {{ socio.representante }}{{/sePJ}}{{/socios}}.

Contrataram, entre si, a constituição de uma sociedade limitada que se regerá pela Lei nº. 10.406, de 10 de janeiro de 2002 e supletivamente pela Lei nº 6.404, de 15 de dezembro de 1976; sendo que, nos casos omissos, desde que não sejam conflitantes com as legislações retro, será aplicado o que estiver disposto em eventual Acordo de Quotistas, conforme cláusulas e condições doravante expostas:$blk$),

      ('Cláusula — Capital social',
$blk$O capital social da empresa será de R$ {{ capitalValor }} ({{ capitalExtenso }}), dividido em {{ totalQuotas }} ({{ totalQuotasExtenso }}) quotas, no valor nominal de R$ 1,00 (um real) cada uma, estando o capital social totalmente subscrito e integralizado pelos sócios, distribuído da seguinte forma:
{{#socios sep=";\n" fim="; e\n"}}{{ socio.nome }}: {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}.$blk$),

      ('Cláusula — Administração e poderes',
$blk$A sociedade será administrada isoladamente por {{#administradores sep="; " fim="; e "}}{{ administrador.nome }}, {{ administrador.brasileiro }}, {{ administrador.casado }}, {{ administrador.profissao }}, {{ administrador.portador }} da Cédula de Identidade RG nº {{ administrador.rg }} - {{ administrador.orgaoExpedidor }}, {{ administrador.inscrito }} no CPF/MF sob o nº {{ administrador.cpfCnpj }}, {{ administrador.residente }} no endereço {{ administrador.endereco }}{{/administradores}}, a quem competirá representar a sociedade ativa e passivamente, em juízo ou fora dele, inclusive perante o sistema financeiro nacional, entidades oficiais, repartições públicas, autarquias e sociedades de economia mista, repartições federais, estaduais e municipais, observando sempre os eventuais limites e condições impostas pelo presente Contrato Social, podendo, para tanto:
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
    l) Aprovar o uso de qualquer marca, nome ou símbolo que represente o nome, denominação social, razão social ou nome fantasia da sociedade por terceiros.
Parágrafo Primeiro: É vedado ao(s) administrador(es) empregar(em) o nome da sociedade em operações ou negócios estranhos ao objeto social.
Parágrafo Segundo: O(s) administrador(es) qualificado(s) no caput declara(m) sob as penas da lei que não está(ão) impedido(s) de exercer(em) a administração da sociedade, por lei especial, ou em virtude de condenação criminal, ou por se encontrar(em) sob os efeitos dela, a pena que vede, ainda que temporariamente, o acesso a cargos públicos, ou por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, ou contra a economia popular, contra o sistema financeiro nacional, contra normas de defesa da concorrência, contra as relações de consumo, fé pública ou a propriedade (art. 1.011, § 1º, CC/2002).$blk$),

      ('Fecho e assinaturas',
$blk$E, por estarem assim justos, certos e contratados, declaram de inteiro acordo, conforme cláusulas e condições prescritas, e assinam o presente instrumento na presença das testemunhas abaixo nomeadas.

{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.


{{#socios sep="\n\n"}}_______________________________________
{{ socio.nome }}{{/socios}}


Visto do Advogado

Testemunhas:
1. _______________________________  Nome:                         RG:                  CPF/MF:
2. _______________________________  Nome:                         RG:                  CPF/MF:$blk$)

    ) as t(nome, conteudo)
  loop
    select id into v_bloco_id
      from tmpl_bloco
      where nome = bloco.nome and categoria = 'contrato-social';

    if v_bloco_id is null then
      raise notice 'Bloco "%" não encontrado — pulado.', bloco.nome;
      continue;
    end if;

    select coalesce(max(numero_versao), 0) + 1 into v_proxima
      from tmpl_bloco_versao where bloco_id = v_bloco_id;

    update tmpl_bloco_versao set atual = false
      where bloco_id = v_bloco_id and atual;

    insert into tmpl_bloco_versao (id, bloco_id, numero_versao, atual, conteudo, changelog)
      values (gen_random_uuid(), v_bloco_id, v_proxima, true, bloco.conteudo,
              'Loops dinâmicos: sócios/administradores iterados das fontes relacionais (quadro_societario/administracao), com qualificação PF/PJ condicional.');
  end loop;
end $$;