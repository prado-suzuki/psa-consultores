/**
 * Dados fixos do mockup do cadastro de governança (EDU-14).
 *
 * Vive separado do componente por causa do teto de 600 linhas do AGENTS.md: as
 * listas completas (21 assuntos da Matriz, 15 famílias do Protocolo) estouram o
 * limite se ficarem no meio do JSX.
 *
 * Tudo aqui é conteúdo levantado dos documentos reais, e a origem de cada campo
 * está em `docs/osg/campos-governanca.md`. Os NOMES de pessoa e os VALORES são de
 * um cliente fictício: os documentos de exemplo têm cláusula de sigilo, e para
 * conferir rótulo e completude a ficção serve igual.
 */

/** Vocabulário fechado do papel de um órgão numa decisão. Catorze valores. */
export const PAPEIS_NA_DECISAO = [
  'delibera',
  'aprova',
  'autoriza',
  'submete à aprovação',
  'sugere',
  'indica',
  'propõe',
  'analisa',
  'consolida',
  'executa',
  'implementa',
  'garante',
  'fornece informações',
  'não participa',
] as const;

/** Resposta de cada critério do Protocolo. Três valores, não é caixa de marcar. */
export const RESPOSTAS_CRITERIO = ['concedido', 'não concedido', 'condicionado'] as const;

export type Orgao = { nome: string; existe: boolean };

/**
 * Os quatro órgãos do modelo da PSA. Quais existem é por cliente, e a leitura
 * mais provável é que saiam da estrutura dele, seguindo a cascata conselho →
 * diretoria → administradores do contrato social. Pendente de confirmação.
 */
export const ORGAOS: Orgao[] = [
  { nome: 'Reunião de Sócios', existe: true },
  { nome: 'Conselho de Administração', existe: true },
  { nome: 'Diretor Executivo', existe: true },
  { nome: 'Gerentes corporativos', existe: false },
];

/** Os 21 assuntos das linhas da Matriz, na ordem do modelo VF. */
export const ASSUNTOS_MATRIZ: { assunto: string; papeis: string[]; alcada?: string }[] = [
  { assunto: 'Distribuição de lucros', papeis: ['delibera', 'aprova', 'propõe'] },
  { assunto: 'Alienação de participações', papeis: ['delibera', 'aprova', 'submete à aprovação'] },
  { assunto: 'Aumento de capital, fusão, cisão e incorporação', papeis: ['delibera', 'analisa', 'submete à aprovação'] },
  { assunto: 'Atos estranhos à atividade', papeis: ['delibera', 'aprova', 'não participa'] },
  { assunto: 'Expansão com imóveis rurais', papeis: ['delibera', 'aprova', 'propõe'] },
  { assunto: 'Alienação e oneração de imóveis', papeis: ['delibera', 'aprova', 'submete à aprovação'] },
  { assunto: 'Emissão de garantias (aval, fiança, penhor, CPR)', papeis: ['delibera', 'aprova', 'submete à aprovação'], alcada: 'R$ 2.000.000,00' },
  { assunto: 'Salário de admissão e promoções', papeis: ['não participa', 'analisa', 'autoriza'] },
  { assunto: 'Contratação e desligamento', papeis: ['não participa', 'não participa', 'autoriza'] },
  { assunto: 'Remuneração variável (bônus e PPR)', papeis: ['delibera', 'aprova', 'propõe'] },
  { assunto: 'Prestadores de serviço', papeis: ['não participa', 'analisa', 'autoriza'], alcada: 'R$ 200.000,00' },
  { assunto: 'Operações de crédito', papeis: ['delibera', 'aprova', 'submete à aprovação'], alcada: 'R$ 5.000.000,00' },
  { assunto: 'Aquisição de insumos', papeis: ['não participa', 'analisa', 'autoriza'], alcada: 'R$ 500.000,00' },
  { assunto: 'Limites de investimento fixo', papeis: ['delibera', 'aprova', 'propõe'], alcada: 'R$ 1.000.000,00' },
  { assunto: 'Orçamento anual', papeis: ['aprova', 'analisa', 'consolida'] },
  { assunto: 'Eleger administradores em controladas', papeis: ['delibera', 'indica', 'sugere'] },
  { assunto: 'Planejamento estratégico', papeis: ['aprova', 'analisa', 'propõe'] },
  { assunto: 'Políticas e normas', papeis: ['aprova', 'analisa', 'implementa'] },
  { assunto: 'Representação legal', papeis: ['delibera', 'não participa', 'executa'] },
  { assunto: 'Outorga de procuração', papeis: ['delibera', 'aprova', 'executa'] },
  { assunto: 'Plano safra', papeis: ['aprova', 'analisa', 'propõe'] },
];

export type GrupoBeneficiario = { rotulo: string; pessoas: string };

/**
 * Os grupos variam por cliente: três documentos entregues trazem três conjuntos
 * diferentes. Por isso é cadastro com rótulo livre, e não conjunto fechado.
 */
export const GRUPOS_BENEFICIARIO: GrupoBeneficiario[] = [
  { rotulo: 'Fundadores', pessoas: 'Aurélio Campos, Marta Campos' },
  { rotulo: 'Sócios Gestores', pessoas: 'Rafael Campos, Eduardo Campos' },
  { rotulo: 'Familiares', pessoas: 'Beatriz Campos, Tomás Campos' },
];

/** As 15 famílias do Protocolo, com os critérios de cada uma. */
export const FAMILIAS_PROTOCOLO: {
  familia: string;
  criterios: { criterio: string; respostas: string[]; valor?: string }[];
}[] = [
  {
    familia: 'Remuneração pelo trabalho',
    criterios: [
      { criterio: 'Remuneração mensal fixa', respostas: ['concedido', 'concedido', 'condicionado'], valor: 'R$ 25.000,00' },
      { criterio: 'Bônus e comissões', respostas: ['não concedido', 'condicionado', 'condicionado'] },
      { criterio: 'Distribuição de lucros', respostas: ['concedido', 'concedido', 'não concedido'] },
    ],
  },
  {
    familia: 'Jornada e férias',
    criterios: [
      { criterio: 'Jornada de trabalho', respostas: ['não concedido', 'condicionado', 'condicionado'] },
      { criterio: 'Férias anuais', respostas: ['não concedido', 'concedido', 'condicionado'], valor: '30 dias' },
      { criterio: 'Folgas e ausências', respostas: ['não concedido', 'condicionado', 'condicionado'] },
    ],
  },
  {
    familia: 'Veículos',
    criterios: [
      { criterio: 'Veículo da empresa', respostas: ['concedido', 'concedido', 'não concedido'], valor: 'troca a cada 5 anos' },
      { criterio: 'Manutenção, impostos e seguro', respostas: ['concedido', 'concedido', 'não concedido'] },
      { criterio: 'Abastecimento', respostas: ['concedido', 'concedido', 'não concedido'] },
      { criterio: 'Multas e acidentes', respostas: ['condicionado', 'condicionado', 'não concedido'] },
    ],
  },
  {
    familia: 'Benefícios de fornecedores',
    criterios: [
      { criterio: 'Brindes e presentes de terceiros', respostas: ['concedido', 'concedido', 'não concedido'] },
      { criterio: 'Programas de pontos', respostas: ['não concedido', 'não concedido', 'não concedido'] },
    ],
  },
  {
    familia: 'Despesas corporativas',
    criterios: [
      { criterio: 'Cartão corporativo', respostas: ['não concedido', 'não concedido', 'não concedido'] },
      { criterio: 'Despesas com viagem a trabalho', respostas: ['concedido', 'concedido', 'não concedido'] },
      { criterio: 'Viagem de representação', respostas: ['condicionado', 'condicionado', 'não concedido'] },
    ],
  },
  {
    familia: 'Aeronave',
    criterios: [{ criterio: 'Uso de aeronave do grupo', respostas: ['não concedido', 'não concedido', 'não concedido'] }],
  },
  {
    familia: 'Telefonia',
    criterios: [
      { criterio: 'Linha e aparelho celular', respostas: ['não concedido', 'não concedido', 'não concedido'] },
      { criterio: 'Computador e outros eletrônicos', respostas: ['concedido', 'concedido', 'não concedido'] },
    ],
  },
  {
    familia: 'Saúde',
    criterios: [
      { criterio: 'Plano ou seguro de saúde', respostas: ['condicionado', 'condicionado', 'condicionado'] },
      { criterio: 'Tratamento não coberto pelo plano', respostas: ['condicionado', 'condicionado', 'condicionado'] },
      { criterio: 'Odontológico, oftalmológico e estético', respostas: ['não concedido', 'não concedido', 'não concedido'] },
    ],
  },
  {
    familia: 'Seguro de vida',
    criterios: [{ criterio: 'Seguro de vida custeado pela empresa', respostas: ['não concedido', 'não concedido', 'não concedido'] }],
  },
  {
    familia: 'Auxílio educação',
    criterios: [
      { criterio: 'Formação ligada ao negócio', respostas: ['não concedido', 'não concedido', 'não concedido'] },
      { criterio: 'Formação de interesse pessoal', respostas: ['não concedido', 'não concedido', 'não concedido'] },
    ],
  },
  {
    familia: 'Moradia',
    criterios: [
      { criterio: 'Imóvel particular fora do grupo', respostas: ['não concedido', 'não concedido', 'não concedido'] },
      { criterio: 'Água, energia e impostos na sede', respostas: ['concedido', 'concedido', 'concedido'] },
    ],
  },
  {
    familia: 'Investimentos em unidades do grupo',
    criterios: [
      { criterio: 'Construção de moradia em unidade do grupo', respostas: ['concedido', 'concedido', 'não concedido'], valor: 'até R$ 1.000.000,00' },
      { criterio: 'Fundo para aquisição de moradia', respostas: ['não concedido', 'não concedido', 'não concedido'] },
    ],
  },
  {
    familia: 'Recursos humanos e materiais',
    criterios: [{ criterio: 'Uso esporádico para fins pessoais', respostas: ['condicionado', 'condicionado', 'não concedido'] }],
  },
  {
    familia: 'Adiantamentos e empréstimos',
    criterios: [
      { criterio: 'Saldos anteriores (fichas)', respostas: ['condicionado', 'condicionado', 'não concedido'] },
      { criterio: 'Empréstimo para saúde ou emergência', respostas: ['condicionado', 'condicionado', 'condicionado'] },
    ],
  },
  {
    familia: 'Outros',
    criterios: [{ criterio: 'Benefício não previsto neste protocolo', respostas: ['não concedido', 'não concedido', 'não concedido'] }],
  },
];

export type Campo = { rotulo: string; valor: string; existe?: boolean; vazio?: boolean };

/** Parâmetros do Acordo de Quotistas. Pasta 02. */
export const CAMPOS_ACORDO: Campo[] = [
  { rotulo: 'Quórum de deliberação ordinária', valor: 'Maioria simples' },
  { rotulo: 'Quórum de maioria absoluta do capital', valor: '50% + 1' },
  { rotulo: 'Quórum de destituição de administrador', valor: 'Dois terços' },
  { rotulo: 'Ordem do direito de preferência', valor: '1º mesmo ramo · 2º outro ramo' },
  { rotulo: 'Objetos sujeitos à preferência', valor: 'Quotas, imóveis, máquinas, oportunidades' },
  { rotulo: 'Institutos de venda presentes', valor: 'Lock-up, Drag Along' },
  { rotulo: 'Metodologia de valor da quota', valor: 'Dupla avaliação' },
  { rotulo: 'Consolida composse na avaliação', valor: 'Sim' },
  { rotulo: 'Limite de aval e fiança', valor: '10% do faturamento' },
  { rotulo: 'Solução de litígios', valor: 'Arbitragem' },
  { rotulo: 'Câmara arbitral', valor: 'CAM-CCBC' },
  { rotulo: 'Prazo para indicação de árbitros', valor: '15 dias' },
  { rotulo: 'Representante dos quotistas', valor: 'Rafael Campos', existe: true },
  { rotulo: 'Quotas gravadas com usufruto', valor: 'Sim' },
  { rotulo: 'Quem exerce o voto da quota', valor: 'Usufrutuário' },
];

/** Os 16 parâmetros do Regimento Interno. Pasta 05. */
export const CAMPOS_REGIMENTO: Campo[] = [
  { rotulo: 'Mínimo de membros', valor: '3' },
  { rotulo: 'Máximo de membros', valor: '5' },
  { rotulo: 'Remuneração dos conselheiros', valor: 'Nenhuma' },
  { rotulo: 'Mandato do presidente', valor: '5 anos' },
  { rotulo: 'Quórum de deliberação', valor: '51%' },
  { rotulo: 'Duração máxima da reunião', valor: '2 horas' },
  { rotulo: 'Periodicidade das reuniões', valor: 'Mensal' },
  { rotulo: 'Convocação ordinária', valor: '5 dias' },
  { rotulo: 'Convocação extraordinária', valor: '24 horas' },
  { rotulo: 'Local das reuniões', valor: 'Sede da sociedade' },
  { rotulo: 'Diária do conselheiro', valor: 'R$ 200,00' },
  { rotulo: 'Período de formação de novo membro', valor: '6 meses sem voto' },
  { rotulo: 'Quórum de exclusão de membro', valor: '51%' },
  { rotulo: 'Hipóteses de vacância', valor: 'Renúncia, destituição, falecimento' },
  { rotulo: 'Ausências que causam perda do cargo', valor: '3' },
  { rotulo: 'Prazo para eleger substituto', valor: '30 dias' },
  { rotulo: 'Alçada da diretoria votada anualmente', valor: 'Sim' },
];

/** Campos da AC Reflexo. Pasta 06. Quase tudo é reuso de outras seções. */
export const CAMPOS_AC_REFLEXO: Campo[] = [
  { rotulo: 'Situação', valor: 'não iniciada', vazio: true },
  { rotulo: 'Mandato dos conselheiros', valor: '2 anos' },
  { rotulo: 'Reeleição admitida', valor: 'Sim' },
  { rotulo: 'Vice-presidente eleito pelos membros', valor: 'Sim' },
  { rotulo: 'Voto de desempate do presidente', valor: 'Sim' },
  { rotulo: 'Distribuição mínima de lucros', valor: '25%' },
];

/** Eleitos na instalação. Pasta 07. */
export const ELEITOS: { pessoa: string; cargo: string; socio: string; inicio: string; fim: string }[] = [
  { pessoa: 'Aurélio Campos', cargo: 'Presidente do Conselho', socio: 'Sim', inicio: '10/03/2026', fim: '10/03/2028' },
  { pessoa: 'Helena Braga', cargo: 'Conselheira', socio: 'Não', inicio: '10/03/2026', fim: '10/03/2028' },
  { pessoa: 'Ivo Rezende', cargo: 'Conselheiro', socio: 'Não', inicio: '10/03/2026', fim: '10/03/2028' },
  { pessoa: 'Rafael Campos', cargo: 'Diretor Executivo', socio: 'Sim', inicio: '10/03/2026', fim: '10/03/2029' },
];

/** Campos da instalação que não são a lista de eleitos. */
export const CAMPOS_INSTALACAO: Campo[] = [
  { rotulo: 'Órgãos previstos no contrato social', valor: 'Conselho e Diretoria' },
  { rotulo: 'Quórum de instalação da reunião', valor: 'Totalidade do capital votante' },
  { rotulo: 'Tipo de convocação', valor: 'Primeira' },
  { rotulo: 'Deliberação unânime', valor: 'Sim' },
  { rotulo: 'Marco de contagem do mandato', valor: 'Assinatura do termo de posse' },
  { rotulo: 'Mesa diretora · presidente', valor: 'Marta Campos', existe: true },
  { rotulo: 'Mesa diretora · secretário', valor: 'Helena Braga', existe: true },
];

/** Campos do Protocolo que valem para o documento inteiro, não por critério. */
export const CAMPOS_PROTOCOLO_GERAIS: Campo[] = [
  { rotulo: 'Índice de atualização', valor: 'INPC' },
  { rotulo: 'Dia de pagamento', valor: '5º dia útil' },
  { rotulo: 'Revisão dos valores', valor: 'Anual, em Reunião de Sócios' },
  { rotulo: 'Órgão que aprova ou revisa', valor: 'Reunião de Sócios' },
  { rotulo: 'Prazo de sigilo', valor: '10 anos' },
];
