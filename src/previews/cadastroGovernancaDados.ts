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

/**
 * O que cada palavra do vocabulário significa dentro de uma decisão.
 *
 * É a parte mais opaca do documento para quem chega de fora: as catorze palavras
 * parecem sinônimos e não são. A diferença entre deliberar, aprovar e autorizar é
 * a diferença entre quem decide, quem valida e quem libera a execução.
 */
export const GLOSSARIO_PAPEIS: { papel: string; significa: string }[] = [
  { papel: 'delibera', significa: 'decide em última instância. A palavra final é dele.' },
  { papel: 'aprova', significa: 'valida o que outro propôs; sem esse sim, não segue.' },
  { papel: 'autoriza', significa: 'libera a execução dentro de um limite já definido.' },
  { papel: 'submete à aprovação', significa: 'monta o pedido e leva a quem aprova.' },
  { papel: 'sugere', significa: 'opina sem peso de decisão; pode ser ignorado.' },
  { papel: 'indica', significa: 'aponta nomes, tipicamente para cargo.' },
  { papel: 'propõe', significa: 'traz a ideia e o número para a mesa.' },
  { papel: 'analisa', significa: 'estuda e dá parecer técnico, sem decidir.' },
  { papel: 'consolida', significa: 'junta as partes num documento único, como o orçamento.' },
  { papel: 'executa', significa: 'faz o que foi decidido.' },
  { papel: 'implementa', significa: 'põe em prática de forma continuada, como uma política.' },
  { papel: 'garante', significa: 'responde por o resultado acontecer.' },
  { papel: 'fornece informações', significa: 'entrega dado para outro decidir.' },
  { papel: 'não participa', significa: 'está fora daquele assunto, e isso é decisão registrada.' },
];

/** Resposta de cada critério do Protocolo. Três valores, não é caixa de marcar. */
export const RESPOSTAS_CRITERIO = ['concedido', 'não concedido', 'condicionado'] as const;

/** Por que a resposta tem três valores e não é sim ou não. */
export const GLOSSARIO_RESPOSTAS: { resposta: string; significa: string }[] = [
  { resposta: 'concedido', significa: 'aquele grupo tem direito ao benefício.' },
  { resposta: 'não concedido', significa: 'não tem, e isso ficou decidido, não esquecido.' },
  { resposta: 'condicionado', significa: 'tem, se cumprir uma condição, como trabalhar na empresa ou ter aval do conselho.' },
];

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

/**
 * De onde o dado vem, em três estados.
 *
 * Existe para a tela não parecer que são 99 campos para digitar: boa parte já
 * está no sistema ou é calculada na hora de gerar o documento.
 */
export type Origem = 'existe' | 'derivado' | 'novo';

export const ORIGEM_ROTULO: Record<Origem, string> = {
  existe: 'já no sistema',
  derivado: 'calculado',
  novo: 'novo',
};

export type Campo = {
  rotulo: string;
  valor: string;
  /** O que o campo quer dizer, para quem nunca viu governança. Uma frase. */
  explicacao: string;
  /** Ausente = `novo`. */
  origem?: Origem;
  /** Tabela do banco, quando a origem não é `novo`. */
  tabela?: string;
  vazio?: boolean;
};

/** Parâmetros do Acordo de Quotistas. Pasta 02. */
export const CAMPOS_ACORDO: Campo[] = [
  {
    rotulo: 'Quórum de deliberação ordinária',
    valor: 'Maioria simples',
    explicacao: 'Quantos votos o assunto do dia a dia precisa para passar. Maioria simples é mais da metade de quem está na reunião.',
  },
  {
    rotulo: 'Quórum de maioria absoluta do capital',
    valor: '50% + 1',
    explicacao: 'Para assunto grave, exige mais da metade de TODO o capital da empresa, e não só de quem apareceu na reunião.',
  },
  {
    rotulo: 'Quórum de destituição de administrador',
    valor: 'Dois terços',
    explicacao: 'Quantos votos são necessários para tirar um administrador do cargo.',
  },
  {
    rotulo: 'Ordem do direito de preferência',
    valor: '1º mesmo ramo · 2º outro ramo',
    explicacao: 'Quem tem a primeira chance de comprar a parte de um sócio que quer sair. Aqui os primos do mesmo ramo da família vêm antes dos outros ramos, e ninguém de fora entra antes deles.',
  },
  {
    rotulo: 'Objetos sujeitos à preferência',
    valor: 'Quotas, imóveis, máquinas, oportunidades',
    explicacao: 'O que mais, além da parte na empresa, tem de ser oferecido aos sócios antes de ser vendido para fora.',
  },
  {
    rotulo: 'Institutos de venda presentes',
    valor: 'Lock-up, Drag Along',
    explicacao: 'Regras de venda com nome próprio. Lock-up proíbe vender durante um prazo. Drag Along obriga o sócio pequeno a vender junto quando o grande vende.',
  },
  {
    rotulo: 'Metodologia de valor da quota',
    valor: 'Dupla avaliação',
    explicacao: 'Como se calcula quanto vale a parte de quem sai. Dupla avaliação significa dois laudos independentes, para nenhum lado escolher o número sozinho.',
  },
  {
    rotulo: 'Consolida composse na avaliação',
    valor: 'Sim',
    explicacao: 'Se os bens que a família tem em condomínio entram na conta do valor da parte, ou se ficam de fora.',
  },
  {
    rotulo: 'Limite de aval e fiança',
    valor: '10% do faturamento',
    explicacao: 'Até quanto a empresa pode se comprometer garantindo dívida de outra pessoa ou empresa.',
  },
  {
    rotulo: 'Solução de litígios',
    valor: 'Arbitragem',
    explicacao: 'Onde a briga entre sócios é resolvida. Arbitragem é um julgamento privado, mais rápido e sigiloso que a Justiça comum.',
  },
  {
    rotulo: 'Câmara arbitral',
    valor: 'CAM-CCBC',
    explicacao: 'Qual instituição conduz essa arbitragem. Precisa estar nomeada, senão a cláusula não funciona na prática.',
  },
  {
    rotulo: 'Prazo para indicação de árbitros',
    valor: '15 dias',
    explicacao: 'Quantos dias cada lado tem para escolher o seu árbitro depois que a briga começa.',
  },
  {
    rotulo: 'Representante dos quotistas',
    valor: 'Rafael Campos',
    explicacao: 'A pessoa que fala em nome do grupo de sócios quando é preciso uma voz só.',
    origem: 'existe',
    tabela: 'pessoa',
  },
  {
    rotulo: 'Quotas gravadas com usufruto',
    valor: 'Sim',
    explicacao: 'Se a parte na empresa foi doada aos filhos mantendo os rendimentos com quem doou. É o arranjo mais comum de sucessão em vida.',
  },
  {
    rotulo: 'Quem exerce o voto da quota',
    valor: 'Usufrutuário',
    explicacao: 'Nessa doação, quem vota nas decisões: o filho que recebeu a parte, ou o pai que ficou com os rendimentos. Sem definir isso, a reunião trava.',
  },
];

/** Os 17 parâmetros do Regimento Interno. Pasta 05. */
export const CAMPOS_REGIMENTO: Campo[] = [
  {
    rotulo: 'Mínimo de membros',
    valor: '3',
    explicacao: 'Menos que isso e o conselho não pode funcionar. Serve para não sobrar uma pessoa decidindo sozinha.',
  },
  {
    rotulo: 'Máximo de membros',
    valor: '5',
    explicacao: 'Teto de cadeiras. Número ímpar é proposital, para votação não empatar.',
  },
  {
    rotulo: 'Remuneração dos conselheiros',
    valor: 'Nenhuma',
    explicacao: 'Se a cadeira é paga ou honorária. Em empresa familiar costuma começar sem remuneração.',
  },
  {
    rotulo: 'Mandato do presidente',
    valor: '5 anos',
    explicacao: 'Quanto tempo o presidente do conselho fica no cargo antes de nova eleição.',
  },
  {
    rotulo: 'Quórum de deliberação',
    valor: '51%',
    explicacao: 'Quantos conselheiros precisam concordar para a decisão valer.',
  },
  {
    rotulo: 'Duração máxima da reunião',
    valor: '2 horas',
    explicacao: 'Limite de tempo por reunião. Existe para a pauta ser preparada e a reunião não virar conversa aberta.',
  },
  {
    rotulo: 'Periodicidade das reuniões',
    valor: 'Mensal',
    explicacao: 'De quanto em quanto tempo o conselho se reúne por obrigação.',
  },
  {
    rotulo: 'Convocação ordinária',
    valor: '5 dias',
    explicacao: 'Com quanta antecedência a reunião normal precisa ser avisada.',
  },
  {
    rotulo: 'Convocação extraordinária',
    valor: '24 horas',
    explicacao: 'A antecedência mínima quando é urgente. Prazo curto demais permitiria convocar sem alguém conseguir chegar.',
  },
  {
    rotulo: 'Local das reuniões',
    valor: 'Sede da sociedade',
    explicacao: 'Onde a reunião acontece por padrão, para ninguém ser convocado longe de propósito.',
  },
  {
    rotulo: 'Diária do conselheiro',
    valor: 'R$ 200,00',
    explicacao: 'Valor pago por dia de reunião para cobrir deslocamento e alimentação. Não é salário.',
  },
  {
    rotulo: 'Período de formação de novo membro',
    valor: '6 meses sem voto',
    explicacao: 'Tempo em que o conselheiro novo participa e aprende, mas ainda não vota.',
  },
  {
    rotulo: 'Quórum de exclusão de membro',
    valor: '51%',
    explicacao: 'Quantos votos são necessários para tirar um conselheiro do conselho.',
  },
  {
    rotulo: 'Hipóteses de vacância',
    valor: 'Renúncia, destituição, falecimento',
    explicacao: 'Os casos em que a cadeira fica vazia. Precisa estar listado, senão não se sabe quando abrir vaga.',
  },
  {
    rotulo: 'Ausências que causam perda do cargo',
    valor: '3',
    explicacao: 'Quantas faltas seguidas fazem o conselheiro perder a cadeira.',
  },
  {
    rotulo: 'Prazo para eleger substituto',
    valor: '30 dias',
    explicacao: 'Quanto tempo o grupo tem para preencher a cadeira vazia.',
  },
  {
    rotulo: 'Alçada da diretoria votada anualmente',
    valor: 'Sim',
    explicacao: 'Se os limites de valor do diretor são revistos todo ano. É o elo entre este documento e a Matriz de Alçadas.',
  },
];

/** Campos da AC Reflexo. Pasta 06. Quase tudo é reuso de outras seções. */
export const CAMPOS_AC_REFLEXO: Campo[] = [
  {
    rotulo: 'Situação',
    valor: 'não iniciada',
    vazio: true,
    explicacao: 'Em que ponto está a alteração do contrato social: não iniciada, em redação, assinada ou registrada na Junta Comercial.',
  },
  {
    rotulo: 'Mandato dos conselheiros',
    valor: '2 anos',
    explicacao: 'Duração da cadeira, agora escrita no contrato social. É o mesmo prazo que a ata de eleição usou.',
    origem: 'derivado',
  },
  {
    rotulo: 'Reeleição admitida',
    valor: 'Sim',
    explicacao: 'Se o conselheiro pode ser eleito de novo ao fim do mandato.',
  },
  {
    rotulo: 'Vice-presidente eleito pelos membros',
    valor: 'Sim',
    explicacao: 'Se o vice é escolhido pelo próprio conselho ou vem indicado pelos sócios.',
  },
  {
    rotulo: 'Voto de desempate do presidente',
    valor: 'Sim',
    explicacao: 'Se o presidente decide quando a votação empata. Sem isso, empate paralisa a decisão.',
  },
  {
    rotulo: 'Distribuição mínima de lucros',
    valor: '25%',
    explicacao: 'Quanto do lucro tem de ser distribuído aos sócios todo ano, no mínimo. Protege quem não trabalha na empresa e vive da participação.',
  },
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
  {
    rotulo: 'Órgãos previstos no contrato social',
    valor: 'Conselho e Diretoria',
    explicacao: 'Quais instâncias o contrato social já autoriza a existir. Não se pode instalar um órgão que o contrato não prevê.',
    origem: 'existe',
    tabela: 'administracao',
  },
  {
    rotulo: 'Quórum de instalação da reunião',
    valor: 'Totalidade do capital votante',
    explicacao: 'Quanto do capital precisa estar presente para a reunião poder começar. Diferente do quórum para decidir.',
  },
  {
    rotulo: 'Tipo de convocação',
    valor: 'Primeira',
    explicacao: 'Se é a primeira chamada ou a segunda. A segunda costuma exigir menos gente presente.',
  },
  {
    rotulo: 'Deliberação unânime',
    valor: 'Sim',
    explicacao: 'Se todos votaram a favor. Registrar unanimidade evita contestação futura da eleição.',
  },
  {
    rotulo: 'Marco de contagem do mandato',
    valor: 'Assinatura do termo de posse',
    explicacao: 'De que data o mandato começa a contar: da eleição ou da posse. Muda quando ele termina.',
  },
  {
    rotulo: 'Mesa diretora · presidente',
    valor: 'Marta Campos',
    explicacao: 'Quem conduz a reunião de eleição. Não é o presidente do conselho: é só quem preside aquele encontro.',
    origem: 'existe',
    tabela: 'pessoa',
  },
  {
    rotulo: 'Mesa diretora · secretário',
    valor: 'Helena Braga',
    explicacao: 'Quem redige a ata daquela reunião.',
    origem: 'existe',
    tabela: 'pessoa',
  },
];

/** Campos do Protocolo que valem para o documento inteiro, não por critério. */
export const CAMPOS_PROTOCOLO_GERAIS: Campo[] = [
  {
    rotulo: 'Índice de atualização',
    valor: 'INPC',
    explicacao: 'Qual índice corrige os valores do protocolo com o tempo, para não perderem valor com a inflação.',
  },
  {
    rotulo: 'Dia de pagamento',
    valor: '5º dia útil',
    explicacao: 'Quando o valor combinado é pago a cada mês.',
  },
  {
    rotulo: 'Revisão dos valores',
    valor: 'Anual, em Reunião de Sócios',
    explicacao: 'De quanto em quanto tempo os valores são revistos, e em que instância.',
  },
  {
    rotulo: 'Órgão que aprova ou revisa',
    valor: 'Reunião de Sócios',
    explicacao: 'Quem tem poder de mudar o protocolo. É o elo com a seção de órgãos.',
    origem: 'derivado',
  },
  {
    rotulo: 'Prazo de sigilo',
    valor: '10 anos',
    explicacao: 'Por quanto tempo o conteúdo do protocolo não pode ser divulgado, inclusive entre parentes fora do grupo.',
  },
];
