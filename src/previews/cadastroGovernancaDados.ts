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

/**
 * Os 21 assuntos das linhas da Matriz, na ordem do modelo.
 *
 * A ALÇADA VIROU DUAS COLUNAS, e isso saiu da leitura do contrato social. A
 * cláusula do Perci Smaniotto diz: "para atos e negócios cujo valor não exceda
 * R$ 2.000.000,00 [representação pelos Diretores]. Já os atos cujo objeto seja
 * superior a R$ 2.000.000,00 ou que não expressem valores deverão ser previamente
 * autorizados pelo Conselho".
 *
 * Ou seja, o limite não pertence ao assunto: ele é a FRONTEIRA ENTRE DOIS ÓRGÃOS.
 * Com uma coluna só, o gerador não teria como redigir a cláusula, porque não sabe
 * quem decide abaixo e quem autoriza acima. E o "ou que não expressem valores"
 * revela um terceiro caso que o cadastro precisa admitir: ato sem valor sobe
 * sempre.
 */
export const ASSUNTOS_MATRIZ: {
  assunto: string;
  papeis: string[];
  /** Teto em reais. Ausente = o assunto não é decisão de valor. */
  alcada?: string;
  /** Quem autoriza acima do teto. Sem isso a cláusula não pode ser redigida. */
  acima?: string;
}[] = [
  { assunto: 'Distribuição de lucros', papeis: ['delibera', 'aprova', 'propõe'] },
  { assunto: 'Alienação de participações', papeis: ['delibera', 'aprova', 'submete à aprovação'] },
  { assunto: 'Aumento de capital, fusão, cisão e incorporação', papeis: ['delibera', 'analisa', 'submete à aprovação'] },
  { assunto: 'Atos estranhos à atividade', papeis: ['delibera', 'aprova', 'não participa'] },
  { assunto: 'Expansão com imóveis rurais', papeis: ['delibera', 'aprova', 'propõe'] },
  { assunto: 'Alienação e oneração de imóveis', papeis: ['delibera', 'aprova', 'submete à aprovação'] },
  { assunto: 'Emissão de garantias (aval, fiança, penhor, CPR)', papeis: ['delibera', 'aprova', 'submete à aprovação'], alcada: 'R$ 2.000.000,00', acima: 'Conselho de Administração' },
  { assunto: 'Salário de admissão e promoções', papeis: ['não participa', 'analisa', 'autoriza'] },
  { assunto: 'Contratação e desligamento', papeis: ['não participa', 'não participa', 'autoriza'] },
  { assunto: 'Remuneração variável (bônus e PPR)', papeis: ['delibera', 'aprova', 'propõe'] },
  { assunto: 'Prestadores de serviço', papeis: ['não participa', 'analisa', 'autoriza'], alcada: 'R$ 200.000,00', acima: 'Conselho de Administração' },
  { assunto: 'Operações de crédito', papeis: ['delibera', 'aprova', 'submete à aprovação'], alcada: 'R$ 5.000.000,00', acima: 'Reunião de Sócios' },
  { assunto: 'Aquisição de insumos', papeis: ['não participa', 'analisa', 'autoriza'], alcada: 'R$ 500.000,00', acima: 'Conselho de Administração' },
  { assunto: 'Limites de investimento fixo', papeis: ['delibera', 'aprova', 'propõe'], alcada: 'R$ 1.000.000,00', acima: 'Reunião de Sócios' },
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

/**
 * Tipo do campo, no MESMO vocabulário do gerador de documentos que já existe.
 *
 * Não é enfeite de mockup: `src/lib/templates/vocabulario.ts` só aceita estes
 * tipos, e é deles que saem os derivados por extenso (`cardinalExtenso`,
 * `valorExtenso`, `percentualExtenso`) e a concordância de gênero. A cláusula do
 * contrato escreve "R$ 2.000.000,00 (dois milhões de reais)" e "02 (dois)
 * Diretores", então o cadastro tem de guardar NÚMERO, nunca a forma escrita.
 *
 * Campo guardado como texto onde deveria ser número é o defeito que só aparece
 * na geração, quando já não há de onde tirar o extenso.
 */
export type TipoCampo = 'texto' | 'inteiro' | 'valor' | 'percentual' | 'data' | 'enum' | 'booleano';

/**
 * Para onde o dado vai depois de cadastrado.
 *
 * Descoberto lendo a 5ª Alteração do Perci Smaniotto, que é o contrato social
 * consolidado com a governança dentro: quase todo parâmetro do Regimento aparece
 * lá como cláusula, MENOS a periodicidade das reuniões, que tem zero ocorrência.
 * Ou seja, existe um corte real entre o que vira cláusula registrada na Junta e o
 * que fica em documento interno, e o cadastro precisa saber disso para o gerador
 * não levar para o contrato o que não é dele.
 */
export type Destino = 'contrato' | 'interno';

export const DESTINO_ROTULO: Record<Destino, string> = {
  contrato: 'vira cláusula',
  interno: 'só interno',
};

export type Campo = {
  rotulo: string;
  valor: string;
  /** O que o campo quer dizer, para quem nunca viu governança. Uma frase. */
  explicacao: string;
  /** Tipo no vocabulário do gerador. Ausente = `texto`. */
  tipo?: TipoCampo;
  /** Ausente = `interno`: só o que foi visto em cláusula é marcado `contrato`. */
  destino?: Destino;
  /** Ausente = `novo`. */
  origem?: Origem;
  /** Tabela do banco, quando a origem não é `novo`. */
  tabela?: string;
  vazio?: boolean;
  /**
   * A lista fechada, quando o `tipo` é `enum`.
   *
   * Ausente de propósito onde não temos base para propor: a tela renderiza a
   * lista com o valor atual e diz que ela ainda precisa ser definida com a
   * consultoria. Enum sem lista é pergunta, não campo pronto.
   */
  opcoes?: string[];
  /** Enum que aceita mais de uma marcação ao mesmo tempo. */
  multiplo?: boolean;
  /**
   * Bloco do formulário a que o campo pertence.
   *
   * É o que permite o modal usar o `FieldSection` do kit da OSG, como as abas de
   * matrícula, bem e pessoa: quinze campos numa grade só leem como lista corrida,
   * e o agrupamento é o que os formulários da casa fazem. Os nomes de bloco são
   * proposta nossa, não estão nos documentos.
   */
  grupo?: string;
  /**
   * O trecho da cláusula onde este campo aterrissa, copiado do contrato real.
   *
   * Não é enfeite: é a prova de que o campo existe. Foi lendo a 5ª Alteração do
   * Perci Smaniotto que ficou claro, por exemplo, que mínimo, máximo, mandato e
   * reeleição não são quatro cláusulas, são quatro lacunas de UMA frase. E que o
   * contrato escreve "03 (três)", com número e extenso, que é o motivo de o
   * cadastro guardar o inteiro e nunca a palavra.
   */
  clausula?: string;
};

/**
 * As alterações contratuais já registradas do cliente.
 *
 * A AC Reflexo é o ÚNICO item da governança que se repete no tempo, e não é
 * suposição: no Drive o mesmo cliente tem a 5ª Alteração e a 6ª (18.03.25). Logo
 * o cadastro dela não é "um registro por cliente" como os outros, é uma PILHA:
 * uma linha por alteração, com número, data e o que ela mudou. Os campos do
 * formulário são sempre os da alteração em edição.
 */
export const ALTERACOES_CONTRATUAIS: {
  numero: string;
  data: string;
  objeto: string;
  situacao: string;
  /** Alteração que reescreve o contrato inteiro, em vez de só emendar. */
  consolida: boolean;
  emEdicao?: boolean;
}[] = [
  {
    numero: '4ª',
    data: '12/08/2021',
    objeto: 'Aumento de capital e ingresso dos herdeiros',
    situacao: 'Registrada na Junta',
    consolida: false,
  },
  {
    numero: '5ª',
    data: '18/03/2025',
    objeto: 'Cria o Conselho de Administração e traz a Matriz de Alçadas',
    situacao: 'Registrada na Junta',
    consolida: true,
  },
  {
    numero: '6ª',
    data: 'sem data',
    objeto: 'Ajusta o mandato dos conselheiros e a distribuição mínima de lucros',
    situacao: 'Em elaboração',
    consolida: true,
    emEdicao: true,
  },
];

/** Parâmetros do Acordo de Quotistas. Pasta 02. */
export const CAMPOS_ACORDO: Campo[] = [
  {
    rotulo: 'Quórum de deliberação ordinária',
    grupo: 'Quórum e deliberação',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Maioria simples', 'Maioria absoluta do capital', 'Dois terços', 'Unanimidade'],
    valor: 'Maioria simples',
    explicacao: 'Quantos votos o assunto do dia a dia precisa para passar. Maioria simples é mais da metade de quem está na reunião.',
  },
  {
    rotulo: 'Quórum de maioria absoluta do capital',
    grupo: 'Quórum e deliberação',
    tipo: 'percentual', destino: 'contrato',
    valor: '50% + 1',
    explicacao: 'Para assunto grave, exige mais da metade de TODO o capital da empresa, e não só de quem apareceu na reunião.',
  },
  {
    rotulo: 'Quórum de destituição de administrador',
    grupo: 'Quórum e deliberação',
    tipo: 'percentual', destino: 'contrato',
    valor: 'Dois terços',
    explicacao: 'Quantos votos são necessários para tirar um administrador do cargo.',
  },
  {
    rotulo: 'Ordem do direito de preferência',
    grupo: 'Saída de sócio e preferência',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['1º mesmo ramo · 2º outro ramo', '1º todos os sócios em igualdade', '1º a sociedade · 2º os sócios'],
    valor: '1º mesmo ramo · 2º outro ramo',
    explicacao: 'Quem tem a primeira chance de comprar a parte de um sócio que quer sair. Aqui os primos do mesmo ramo da família vêm antes dos outros ramos, e ninguém de fora entra antes deles.',
  },
  {
    rotulo: 'Objetos sujeitos à preferência',
    grupo: 'Saída de sócio e preferência',
    tipo: 'texto', destino: 'contrato',
    valor: 'Quotas, imóveis, máquinas, oportunidades',
    explicacao: 'O que mais, além da parte na empresa, tem de ser oferecido aos sócios antes de ser vendido para fora.',
  },
  {
    rotulo: 'Institutos de venda presentes',
    grupo: 'Saída de sócio e preferência',
    tipo: 'enum',
    opcoes: ['Lock-up', 'Drag Along', 'Tag Along', 'Direito de preferência', 'Opção de compra'],
    multiplo: true,
    valor: 'Lock-up, Drag Along',
    explicacao: 'Regras de venda com nome próprio. Lock-up proíbe vender durante um prazo. Drag Along obriga o sócio pequeno a vender junto quando o grande vende.',
  },
  {
    rotulo: 'Metodologia de valor da quota',
    grupo: 'Saída de sócio e preferência',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Dupla avaliação', 'Balanço especial', 'Valor patrimonial contábil', 'Múltiplo de EBITDA'],
    valor: 'Dupla avaliação',
    explicacao: 'Como se calcula quanto vale a parte de quem sai. Dupla avaliação significa dois laudos independentes, para nenhum lado escolher o número sozinho.',
  },
  {
    rotulo: 'Consolida composse na avaliação',
    grupo: 'Saída de sócio e preferência',
    tipo: 'booleano',
    valor: 'Sim',
    explicacao: 'Se os bens que a família tem em condomínio entram na conta do valor da parte, ou se ficam de fora.',
  },
  {
    rotulo: 'Limite de aval e fiança',
    grupo: 'Garantias e representação',
    tipo: 'percentual', destino: 'contrato',
    valor: '10% do faturamento',
    explicacao: 'Até quanto a empresa pode se comprometer garantindo dívida de outra pessoa ou empresa.',
  },
  {
    rotulo: 'Solução de litígios',
    grupo: 'Solução de conflitos',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Arbitragem', 'Mediação prévia e arbitragem', 'Justiça comum'],
    valor: 'Arbitragem',
    explicacao: 'Onde a briga entre sócios é resolvida. Arbitragem é um julgamento privado, mais rápido e sigiloso que a Justiça comum.',
  },
  {
    rotulo: 'Câmara arbitral',
    grupo: 'Solução de conflitos',
    tipo: 'texto', destino: 'contrato',
    valor: 'CAM-CCBC',
    explicacao: 'Qual instituição conduz essa arbitragem. Precisa estar nomeada, senão a cláusula não funciona na prática.',
  },
  {
    rotulo: 'Prazo para indicação de árbitros',
    grupo: 'Solução de conflitos',
    tipo: 'inteiro',
    valor: '15 dias',
    explicacao: 'Quantos dias cada lado tem para escolher o seu árbitro depois que a briga começa.',
  },
  {
    rotulo: 'Representante dos quotistas',
    grupo: 'Garantias e representação',
    valor: 'Rafael Campos',
    explicacao: 'A pessoa que fala em nome do grupo de sócios quando é preciso uma voz só.',
    origem: 'existe',
    tabela: 'pessoa',
  },
  {
    rotulo: 'Quotas gravadas com usufruto',
    grupo: 'Usufruto e voto',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    explicacao: 'Se a parte na empresa foi doada aos filhos mantendo os rendimentos com quem doou. É o arranjo mais comum de sucessão em vida.',
  },
  {
    rotulo: 'Quem exerce o voto da quota',
    grupo: 'Usufruto e voto',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Usufrutuário', 'Nu-proprietário', 'Em conjunto'],
    valor: 'Usufrutuário',
    explicacao: 'Nessa doação, quem vota nas decisões: o filho que recebeu a parte, ou o pai que ficou com os rendimentos. Sem definir isso, a reunião trava.',
  },
];

/** Os 17 parâmetros do Regimento Interno. Pasta 05. */
export const CAMPOS_REGIMENTO: Campo[] = [
  {
    rotulo: 'Mínimo de membros',
    clausula:
      'CLÁUSULA QUINTA: O Conselho de Administração será composto por no mínimo 03 (três) e no máximo 06 (seis) membros. O contrato escreve número e extenso, então o campo guarda o inteiro.',
    grupo: 'Composição do conselho',
    tipo: 'inteiro', destino: 'contrato',
    valor: '3',
    explicacao: 'Menos que isso e o conselho não pode funcionar. Serve para não sobrar uma pessoa decidindo sozinha.',
  },
  {
    rotulo: 'Máximo de membros',
    clausula:
      '…no mínimo 03 (três) e no máximo 06 (seis) membros. Mesma frase do mínimo.',
    grupo: 'Composição do conselho',
    tipo: 'inteiro', destino: 'contrato',
    valor: '5',
    explicacao: 'Teto de cadeiras. Número ímpar é proposital, para votação não empatar.',
  },
  {
    rotulo: 'Remuneração dos conselheiros',
    grupo: 'Composição do conselho',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Nenhuma', 'Jeton por reunião', 'Mensal fixa', 'Mensal fixa e jeton'],
    valor: 'Nenhuma',
    explicacao: 'Se a cadeira é paga ou honorária. Em empresa familiar costuma começar sem remuneração.',
  },
  {
    rotulo: 'Mandato do presidente',
    grupo: 'Composição do conselho',
    tipo: 'inteiro', destino: 'contrato',
    valor: '5 anos',
    explicacao: 'Quanto tempo o presidente do conselho fica no cargo antes de nova eleição.',
  },
  {
    rotulo: 'Quórum de deliberação',
    grupo: 'Reuniões',
    tipo: 'percentual', destino: 'contrato',
    valor: '51%',
    explicacao: 'Quantos conselheiros precisam concordar para a decisão valer.',
  },
  {
    rotulo: 'Duração máxima da reunião',
    grupo: 'Reuniões',
    tipo: 'inteiro',
    valor: '2 horas',
    explicacao: 'Limite de tempo por reunião. Existe para a pauta ser preparada e a reunião não virar conversa aberta.',
  },
  {
    rotulo: 'Periodicidade das reuniões',
    grupo: 'Reuniões',
    tipo: 'enum',
    opcoes: ['Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Sob convocação'],
    valor: 'Mensal',
    explicacao: 'De quanto em quanto tempo o conselho se reúne por obrigação.',
  },
  {
    rotulo: 'Convocação ordinária',
    grupo: 'Reuniões',
    tipo: 'inteiro', destino: 'contrato',
    valor: '5 dias',
    explicacao: 'Com quanta antecedência a reunião normal precisa ser avisada.',
  },
  {
    rotulo: 'Convocação extraordinária',
    grupo: 'Reuniões',
    tipo: 'inteiro', destino: 'contrato',
    valor: '24 horas',
    explicacao: 'A antecedência mínima quando é urgente. Prazo curto demais permitiria convocar sem alguém conseguir chegar.',
  },
  {
    rotulo: 'Local das reuniões',
    grupo: 'Reuniões',
    tipo: 'texto', destino: 'contrato',
    valor: 'Sede da sociedade',
    explicacao: 'Onde a reunião acontece por padrão, para ninguém ser convocado longe de propósito.',
  },
  {
    rotulo: 'Diária do conselheiro',
    grupo: 'Composição do conselho',
    tipo: 'valor',
    valor: 'R$ 200,00',
    explicacao: 'Valor pago por dia de reunião para cobrir deslocamento e alimentação. Não é salário.',
  },
  {
    rotulo: 'Período de formação de novo membro',
    grupo: 'Composição do conselho',
    tipo: 'inteiro',
    valor: '6 meses sem voto',
    explicacao: 'Tempo em que o conselheiro novo participa e aprende, mas ainda não vota.',
  },
  {
    rotulo: 'Quórum de exclusão de membro',
    grupo: 'Perda do cargo e substituição',
    tipo: 'percentual', destino: 'contrato',
    valor: '51%',
    explicacao: 'Quantos votos são necessários para tirar um conselheiro do conselho.',
  },
  {
    rotulo: 'Hipóteses de vacância',
    clausula:
      'Parágrafo Único: Ocorrerá a vacância de um cargo quando ocorrer a destituição, renúncia, morte, impedimento comprovado, declaração de incapacidade civil ou a perda do mandato de um de seus membros.',
    grupo: 'Perda do cargo e substituição',
    tipo: 'texto', destino: 'contrato',
    valor: 'Renúncia, destituição, falecimento',
    explicacao: 'Os casos em que a cadeira fica vazia. Precisa estar listado, senão não se sabe quando abrir vaga.',
  },
  {
    rotulo: 'Ausências que causam perda do cargo',
    grupo: 'Perda do cargo e substituição',
    tipo: 'inteiro', destino: 'contrato',
    valor: '3',
    explicacao: 'Quantas faltas seguidas fazem o conselheiro perder a cadeira.',
  },
  {
    rotulo: 'Prazo para eleger substituto',
    clausula:
      'CLÁUSULA DÉCIMA: Ocorrendo vacância definitiva, um novo membro será eleito na primeira Reunião de Sócios após a ocorrência, a qual deverá ser realizada em um prazo máximo de 90 (noventa) dias.',
    grupo: 'Perda do cargo e substituição',
    tipo: 'inteiro', destino: 'contrato',
    valor: '30 dias',
    explicacao: 'Quanto tempo o grupo tem para preencher a cadeira vazia.',
  },
  {
    rotulo: 'Alçada da diretoria votada anualmente',
    grupo: 'Alçada',
    tipo: 'booleano',
    valor: 'Sim',
    explicacao: 'Se os limites de valor do diretor são revistos todo ano. É o elo entre este documento e a Matriz de Alçadas.',
  },
];

/** Campos da AC Reflexo. Pasta 06. Quase tudo é reuso de outras seções. */
export const CAMPOS_AC_REFLEXO: Campo[] = [
  {
    rotulo: 'Situação',
    grupo: 'Identificação da alteração',
    tipo: 'enum',
    valor: 'não iniciada',
    vazio: true,
    explicacao: 'Em que ponto está a alteração do contrato social: não iniciada, em redação, assinada ou registrada na Junta Comercial.',
  },
  {
    rotulo: 'Mandato dos conselheiros',
    clausula:
      'CLÁUSULA QUINTA: O Conselho de Administração será composto por no mínimo 03 (três) e no máximo 06 (seis) membros, com mandato de 03 (três) anos, sendo admitida a reeleição.',
    grupo: 'Conselho no contrato',
    tipo: 'inteiro', destino: 'contrato',
    valor: '2 anos',
    explicacao: 'Duração da cadeira, agora escrita no contrato social. É o mesmo prazo que a ata de eleição usou.',
    origem: 'derivado',
  },
  {
    rotulo: 'Reeleição admitida',
    clausula:
      '…com mandato de 03 (três) anos, sendo admitida a reeleição, assegurado a cada membro direito a um voto nas suas reuniões. Mesma frase do mandato.',
    grupo: 'Conselho no contrato',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    explicacao: 'Se o conselheiro pode ser eleito de novo ao fim do mandato.',
  },
  {
    rotulo: 'Vice-presidente eleito pelos membros',
    clausula:
      'Parágrafo Primeiro: O Presidente e o Vice-Presidente do Conselho de Administração serão eleitos pelos próprios membros do Conselho de Administração, sendo permitida a reeleição de ambos.',
    grupo: 'Conselho no contrato',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    explicacao: 'Se o vice é escolhido pelo próprio conselho ou vem indicado pelos sócios.',
  },
  {
    rotulo: 'Voto de desempate do presidente',
    clausula:
      'CLÁUSULA SEXTA: As deliberações dependerão de aprovação da maioria de seus membros presentes, competindo ao Presidente do Conselho de Administração o voto de desempate.',
    grupo: 'Conselho no contrato',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    explicacao: 'Se o presidente decide quando a votação empata. Sem isso, empate paralisa a decisão.',
  },
  {
    rotulo: 'Regra de distribuição de lucros',
    grupo: 'Lucros',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Deliberada em Reunião de Sócios', 'Percentual mínimo anual'],
    valor: 'Deliberada em Reunião de Sócios',
    clausula:
      'CLÁUSULA VIGÉSIMA QUARTA: …cabendo aos sócios, na proporção de suas quotas e de acordo com deliberação que na oportunidade entre os mesmos for adotada, a distribuição dos lucros.',
    explicacao: 'Como o lucro é distribuído. ATENÇÃO: o levantamento trazia "distribuição mínima de 25%", e no contrato real lido não existe percentual nenhum, a distribuição é deliberada a cada ano. Se algum cliente tem percentual fixo, precisamos ver qual.',
  },
  {
    rotulo: 'Distribuição antecipada permitida',
    grupo: 'Lucros',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    clausula:
      'Parágrafo Segundo: Fica a sociedade autorizada a distribuir antecipadamente lucros do exercício, com base em levantamento de balanço intermediário, observada a reposição de lucros quando a distribuição afetar o capital social.',
    explicacao: 'Se a empresa pode adiantar lucro no meio do ano, com balanço intermediário, em vez de esperar o fechamento.',
  },
  {
    rotulo: 'Distribuição desproporcional e seu quórum',
    grupo: 'Lucros',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Não permitida', 'Unanimidade dos presentes', 'Maioria do capital'],
    valor: 'Unanimidade dos presentes',
    clausula:
      '…bem como distribuí-los desproporcionalmente a participação societária dos sócios no capital social, desde que assim deliberem em Reunião de Sócios, por unanimidade dos presentes.',
    explicacao: 'Se um sócio pode receber mais que a sua fatia, e quantos votos isso exige. É o que permite premiar quem trabalha na empresa sem mexer na participação.',
  },
  {
    rotulo: 'Número da alteração',
    clausula:
      'QUINTA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL. É o título do documento, e o número vira ordinal escrito, não algarismo.',
    grupo: 'Identificação da alteração',
    valor: '6',
    explicacao: 'Qual alteração contratual é esta na vida da empresa. O cadastro guarda o inteiro (6) e o gerador escreve "SEXTA ALTERAÇÃO" no título, do mesmo jeito que o contrato real escreve "QUINTA".',
    tipo: 'inteiro',
    destino: 'contrato',
  },
  {
    rotulo: 'Altera e consolida',
    clausula:
      '…resolvem de pleno e comum acordo, alterar e consolidar o contrato social de acordo com as cláusulas e condições seguintes. Marcado como não, a frase perde "e consolidar" e o título perde "E CONSOLIDAÇÃO".',
    grupo: 'Identificação da alteração',
    valor: 'Sim',
    explicacao: 'Se o documento reescreve o contrato inteiro ou só muda as cláusulas afetadas. Muda o texto de abertura e o tamanho do ato.',
    tipo: 'booleano',
    destino: 'contrato',
  },
  {
    rotulo: 'Acordo de quotistas arquivado na sede',
    clausula:
      '…nos casos omissos, será aplicado o que estiver disposto em eventual Acordo de Quotistas. E na competência do conselho: "Dar cumprimento ao acordo de quotistas arquivado na sede da sociedade naquilo que lhe couber".',
    grupo: 'Identificação da alteração',
    valor: 'Sim',
    explicacao: 'A cláusula do conselho manda "dar cumprimento ao acordo de quotistas arquivado na sede". Sem saber se existe acordo arquivado, o gerador não sabe se escreve essa obrigação.',
    tipo: 'booleano',
    destino: 'contrato',
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
    grupo: 'Órgãos e mandato',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Só Diretoria', 'Conselho e Diretoria', 'Conselho, Diretoria e Reunião de Sócios'],
    valor: 'Conselho e Diretoria',
    explicacao: 'Quais instâncias o contrato social já autoriza a existir. Não se pode instalar um órgão que o contrato não prevê.',
    origem: 'existe',
    tabela: 'administracao',
  },
  {
    rotulo: 'Quórum de instalação da reunião',
    grupo: 'A reunião que aprova',
    tipo: 'enum', destino: 'contrato',
    valor: 'Totalidade do capital votante',
    explicacao: 'Quanto do capital precisa estar presente para a reunião poder começar. Diferente do quórum para decidir.',
  },
  {
    rotulo: 'Tipo de convocação',
    grupo: 'A reunião que aprova',
    tipo: 'enum',
    valor: 'Primeira',
    explicacao: 'Se é a primeira chamada ou a segunda. A segunda costuma exigir menos gente presente.',
  },
  {
    rotulo: 'Deliberação unânime',
    grupo: 'A reunião que aprova',
    tipo: 'booleano',
    valor: 'Sim',
    explicacao: 'Se todos votaram a favor. Registrar unanimidade evita contestação futura da eleição.',
  },
  {
    rotulo: 'Marco de contagem do mandato',
    clausula:
      'Parágrafo Primeiro: Os Membros serão investidos no cargo mediante termo de posse no livro de atas da administração e com o registro deste termo e da respectiva ata que os elegeram na Junta Comercial.',
    grupo: 'Órgãos e mandato',
    tipo: 'enum', destino: 'contrato',
    valor: 'Assinatura do termo de posse',
    explicacao: 'De que data o mandato começa a contar: da eleição ou da posse. Muda quando ele termina.',
  },
  {
    rotulo: 'Mesa diretora · presidente',
    grupo: 'A reunião que aprova',
    tipo: 'texto',
    valor: 'Marta Campos',
    explicacao: 'Quem conduz a reunião de eleição. Não é o presidente do conselho: é só quem preside aquele encontro.',
    origem: 'existe',
    tabela: 'pessoa',
  },
  {
    rotulo: 'Mesa diretora · secretário',
    grupo: 'A reunião que aprova',
    tipo: 'texto',
    valor: 'Helena Braga',
    explicacao: 'Quem redige a ata daquela reunião.',
    origem: 'existe',
    tabela: 'pessoa',
  },
  {
    rotulo: 'Cargos da diretoria',
    grupo: 'Diretoria',
    valor: 'Diretor Presidente e Diretor Executivo',
    explicacao: 'Os nomes dos cargos deste cliente. A cláusula escreve "administrada por 02 (dois) Diretores, um Diretor Presidente e um Diretor Executivo", então os cargos são texto por cliente e o número deles é contado.',
    tipo: 'texto',
    destino: 'contrato',
    origem: 'existe',
    tabela: 'administracao',
  },
  {
    rotulo: 'Representação isolada ou conjunta',
    grupo: 'Diretoria',
    valor: 'Isolada',
    explicacao: 'Se um diretor assina sozinho pela sociedade ou se precisa de dois. É o que a cláusula de representação diz, e o banco já guarda em administracao.pode_isoladamente.',
    tipo: 'enum',
    destino: 'contrato',
    origem: 'existe',
    tabela: 'administracao',
  },
  {
    rotulo: 'Regra de término do mandato',
    clausula:
      '…sendo que os seus mandatos se findam na investidura dos novos membros eleitos para o mandato seguinte. No contrato é condição, não data.',
    grupo: 'Órgãos e mandato',
    valor: 'Até a investidura dos novos eleitos',
    explicacao: 'O contrato diz que "os mandatos se findam na investidura dos novos membros eleitos". Ou seja, o fim do mandato pode ser uma REGRA e não uma data, e o gerador precisa saber qual dos dois para não escrever data onde a cláusula pede condição.',
    tipo: 'enum',
    destino: 'contrato',
  },
];

/** Campos do Protocolo que valem para o documento inteiro, não por critério. */
export const CAMPOS_PROTOCOLO_GERAIS: Campo[] = [
  {
    rotulo: 'Índice de atualização',
    grupo: 'Regras gerais',
    tipo: 'enum',
    opcoes: ['INPC', 'IPCA', 'IGP-M', 'Nenhum'],
    valor: 'INPC',
    explicacao: 'Qual índice corrige os valores do protocolo com o tempo, para não perderem valor com a inflação.',
  },
  {
    rotulo: 'Dia de pagamento',
    grupo: 'Regras gerais',
    tipo: 'inteiro',
    valor: '5º dia útil',
    explicacao: 'Quando o valor combinado é pago a cada mês.',
  },
  {
    rotulo: 'Revisão dos valores',
    grupo: 'Regras gerais',
    tipo: 'enum',
    opcoes: ['Anual, em Reunião de Sócios', 'Anual, pelo Conselho', 'A cada dois anos', 'Sob demanda'],
    valor: 'Anual, em Reunião de Sócios',
    explicacao: 'De quanto em quanto tempo os valores são revistos, e em que instância.',
  },
  {
    rotulo: 'Órgão que aprova ou revisa',
    grupo: 'Regras gerais',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Reunião de Sócios', 'Conselho de Administração', 'Diretoria'],
    valor: 'Reunião de Sócios',
    explicacao: 'Quem tem poder de mudar o protocolo. É o elo com a seção de órgãos.',
    origem: 'derivado',
  },
  {
    rotulo: 'Prazo de sigilo',
    grupo: 'Regras gerais',
    tipo: 'inteiro',
    valor: '10 anos',
    explicacao: 'Por quanto tempo o conteúdo do protocolo não pode ser divulgado, inclusive entre parentes fora do grupo.',
  },
];
