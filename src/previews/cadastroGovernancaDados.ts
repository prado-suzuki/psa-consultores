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
  'avalia',
  'valida',
  'consolida',
  'define',
  'expressa',
  'elege',
  'outorga',
  'executa',
  'realiza',
  'implementa',
  'implanta',
  'dirige',
  'elabora',
  'solicita',
  'participa',
  'garante',
  'fornece informações',
  'representa',
  'não participa',
] as const;

/**
 * Quais órgãos têm CLÁUSULA DE COMPETÊNCIA no contrato social.
 *
 * Medido no modelo `VF_Contrato Social - Governança com conselho.docx`: existe
 * "Compete à Reunião de Sócios", "Compete ao Conselho de Administração" e
 * "Compete à Diretoria". Os gerentes aparecem no contrato apenas como OBJETO
 * ("aprovar a contratação dos gerentes da sociedade"), nunca como órgão com
 * competência própria.
 *
 * Consequência para o gerador, e é o motivo desta lista existir: o que a Matriz
 * atribui a gerente NÃO vira alínea nenhuma. Fica só no documento interno. Sem
 * isso a prévia escreveria cláusula para um órgão que o contrato não conhece.
 */
export const ORGAOS_COM_CLAUSULA = [
  'Reunião de Sócios',
  'Conselho de Administração (CAD)',
  'Conselho de Administração',
  'Diretor Executivo',
];

/**
 * A regência de cada palavra da célula: como ela vira o verbo da alínea.
 *
 * Não é mecânico, e é por isso que precisa ser tabela. "aprova" vira "Aprovar",
 * mas "submete à aprovação" vira "Encaminhar à Reunião de Sócios propostas de", e
 * "sugere" já traz o destinatário embutido. Sem esta tabela o gerador não escreve
 * a alínea; com ela, trocar a palavra na célula troca o verbo no contrato.
 *
 * `null` = não gera alínea. "não participa" é decisão registrada, e o efeito dela
 * no contrato é a AUSÊNCIA da alínea naquele órgão.
 */
export const REGENCIA: Record<string, string | null> = {
  delibera: 'Deliberar acerca de',
  aprova: 'Aprovar',
  autoriza: 'Autorizar',
  'submete à aprovação': 'Encaminhar à Reunião de Sócios propostas de',
  sugere: 'Sugerir à Reunião de Sócios',
  indica: 'Indicar',
  propõe: 'Propor',
  analisa: 'Analisar',
  avalia: 'Avaliar',
  valida: 'Validar',
  consolida: 'Consolidar',
  define: 'Definir',
  expressa: 'Expressar a expectativa dos sócios quanto a',
  elege: 'Eleger',
  outorga: 'Outorgar',
  executa: 'Executar',
  realiza: 'Realizar',
  implementa: 'Implementar',
  implanta: 'Implantar',
  dirige: 'Dirigir',
  elabora: 'Elaborar',
  solicita: 'Solicitar',
  participa: 'Participar de',
  garante: 'Garantir',
  'fornece informações': 'Fornecer informações sobre',
  representa: 'Representar a sociedade em',
  'não participa': null,
};

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
  { nome: 'Gerentes corporativos', existe: true },
  { nome: 'Gerente de Unidade', existe: true },
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
  { assunto: 'Distribuição de Lucros', papeis: ['delibera', 'analisa', 'consolida', 'fornece informações', ''] },
  { assunto: 'Alienação de participações societárias da própria sociedade e de sociedades ligadas', papeis: ['delibera', 'submete à aprovação', 'executa', 'executa', ''] },
  { assunto: 'Limites para realização de atos jurídicos estranhos às atividades da sociedade', papeis: ['autoriza', 'propõe', 'executa', 'implementa', ''] },
  { assunto: 'Expansão e/ou constituição de novos negócios relacionados à aquisição e/ou locação de imóveis rurais (inlcuindo arrendamento e/ou parceria rural)', papeis: ['avalia', 'sugere', 'sugere', 'executa', ''] },
  { assunto: 'Cessão de imóveis próprios para terceiros e/ou acionistas (comodato, arrendamento, parceria rural etc.)', papeis: ['avalia', 'sugere', 'sugere', 'executa', ''] },
  { assunto: 'Alienação e oneração (Hipoteca) de Bens Imóveis', papeis: ['autoriza', 'sugere', 'executa', 'executa', ''] },
  { assunto: 'Emissão de garantias, incluindo aval e fiança, garantias sobre frutos da produção (penhores, CPR, cessão de contratos, etc…)', papeis: ['autoriza', 'autoriza', 'garante', 'executa', ''], alcada: 'R$ 2.000.000,00', acima: 'Conselho de Administração' },
  { assunto: 'Salário de Admissão e Promoções', papeis: ['aprova', 'aprova', 'sugere', 'sugere', ''] },
  { assunto: 'Contratação e Desligamento', papeis: ['elege', 'elege', 'sugere', 'sugere', ''] },
  { assunto: 'Remuneração Variável (Bônus/ PPR)', papeis: ['aprova', 'delibera', 'submete à aprovação', 'participa', ''] },
  { assunto: 'Contratação de prestadores de serviços', papeis: ['não participa', 'autoriza', 'executa', 'executa', 'solicita'], alcada: 'R$ 200.000,00', acima: 'Conselho de Administração' },
  { assunto: 'Contratação de Operações de Crédito junto à instituições financeiras', papeis: ['não participa', 'autoriza', 'executa', 'indica', 'não participa'], alcada: 'R$ 5.000.000,00', acima: 'Reunião de Sócios' },
  { assunto: 'Aquisição de insumos', papeis: ['não participa', 'delibera', 'autoriza', 'define', 'define'], alcada: 'R$ 500.000,00', acima: 'Conselho de Administração' },
  { assunto: 'Limites para aprovação de investimento fixo (equipamentos, máquinas, veículos, obras e benfeitorias, abertura de áreas)', papeis: ['não participa', 'autoriza', 'realiza', 'avalia', 'avalia'], alcada: 'R$ 1.000.000,00', acima: 'Reunião de Sócios' },
  { assunto: 'Orçamento de Custos e Investimentos', papeis: ['expressa', 'avalia', 'avalia', 'valida', 'sugere'] },
  { assunto: 'Eleger Administradores e Representantes em Empresas Controladas e/ou Associações', papeis: ['não participa', 'delibera', 'indica', 'não participa', 'não participa'] },
  { assunto: 'Planejamento Estratégico', papeis: ['define', 'define', 'implanta', 'dirige', 'elabora'] },
  { assunto: 'Políticas e normas', papeis: ['não participa', 'delibera', 'submete à aprovação', 'sugere', 'implementa'] },
  { assunto: 'Processos, procedimentos e controles', papeis: ['não participa', 'não participa', 'aprova', 'consolida', 'sugere'] },
  { assunto: 'Representação Legal', papeis: ['não participa', 'aprova', 'representa', 'não participa', 'não participa'], alcada: 'R$ 2.000.000,00', acima: 'Duas assinaturas: Diretor mais Conselheiro Procurador' },
  { assunto: 'Procuração', papeis: ['não participa', 'não participa', 'outorga', 'não participa', 'não participa'] },
  { assunto: 'Alçadas de pagamento da tesouraria', papeis: ['não participa', 'não participa', 'aprova', 'participa', 'não participa'] },
  { assunto: 'Comercialização de commodities', papeis: ['não participa', 'aprova', 'executa', 'garante', 'garante'] },
  { assunto: 'Cessão onerosa de ativos não circulantes, exceto bens imóveis e quotas de sociedades, e doações de qualquer natureza', papeis: ['não participa', 'autoriza', 'executa', 'garante', 'não participa'] },
];

/**
 * Os campos da Matriz que não são célula da grade.
 *
 * A regra do ato sem valor é UMA para toda a representação, não uma por assunto:
 * a cláusula do contrato diz "os atos cujo objeto seja superior a R$ 2.000.000,00
 * OU QUE NÃO EXPRESSEM VALORES deverão ser previamente autorizados pelo
 * Conselho". Uma frase, um campo. Por linha seriam 21 campos repetindo o mesmo.
 */
export const CAMPOS_MATRIZ: Campo[] = [
  {
    rotulo: 'Ato sem valor declarado',
    grupo: 'Regra geral da alçada',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['Sobe sempre ao órgão de escalada', 'Segue a competência normal da linha'],
    valor: 'Sobe sempre ao órgão de escalada',
    fonteClausula: 'contrato',
    clausula:
      '…os atos cujo objeto seja superior a R$ 2.000.000,00 ou que não expressem valores deverão ser previamente autorizados pelo Conselho.',
    explicacao: 'Procuração ampla, comodato, anuência: atos que não têm valor em reais. Sem esta regra o gerador não sabe o que fazer com eles, e na prática eles passariam sem autorização nenhuma.',
  },
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
  criterios: {
    criterio: string;
    respostas: string[];
    valor?: string;
    /**
     * Marcado quando ESTA linha desce ao contrato social.
     *
     * É a exceção, não a regra: o Protocolo é documento interno da família, e
     * levar o valor de cada benefício à Junta Comercial é o que ninguém quer. O
     * que sobe é a remuneração da administração, porque o contrato social trata
     * de pró-labore em cláusula própria.
     */
    destino?: 'contrato';
  }[];
}[] = [
  {
    familia: 'Remuneração pelo trabalho',
    criterios: [
      { criterio: 'Remuneração mensal fixa', respostas: ['concedido', 'concedido', 'condicionado'], valor: 'R$ 25.000,00'  },
      { criterio: 'Bônus e comissões', respostas: ['não concedido', 'condicionado', 'condicionado']  },
      { criterio: 'Distribuição de lucros', respostas: ['concedido', 'concedido', 'não concedido']  },
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
  /**
   * De QUAL documento o trecho da `clausula` foi tirado.
   *
   * Foi a confusão que o usuário pegou: eu usava a etiqueta "vira cláusula" tanto
   * para "este campo é registrado no contrato social" como para "achei este campo
   * escrito em algum documento". São coisas diferentes. Um quórum do Acordo estar
   * escrito no modelo do Acordo prova que o CAMPO existe; não prova que ele desce
   * ao contrato social.
   *
   * A regra passou a ser: `destino: 'contrato'` só onde a fonte é contrato social
   * de verdade. Nos outros casos o trecho continua na tooltip, dizendo de onde é.
   */
  fonteClausula?: 'contrato' | 'acordo' | 'ata';
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
    tipo: 'enum',
    opcoes: ['Maioria simples', 'Maioria absoluta do capital', 'Dois terços', 'Unanimidade'],
    valor: 'Maioria simples',
    explicacao: 'Quantos votos o assunto do dia a dia precisa para passar. Maioria simples é mais da metade de quem está na reunião.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo: "Conforme decidam a maioria dos VOTOS dos QUOTISTAS presentes na REUNIÃO PRÉVIA, REUNIÃO DE QUOTISTAS e/ou REUNIÃO DE SÓCIOS com relação aos seguintes assuntos: a designação de administradores; a destituição de administradores; o modo e valor da remuneração dos administradores…".',
  },
  {
    rotulo: 'Quórum de maioria absoluta do capital',
    grupo: 'Quórum e deliberação',
    tipo: 'percentual',
    valor: '50% + 1',
    explicacao: 'Para assunto grave, exige mais da metade de TODO o capital da empresa, e não só de quem apareceu na reunião.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo: "…o cancelamento desta solenidade se não estiverem presentes QUOTISTAS que possuam a maioria absoluta do direito de voto das QUOTAS, ou, não sendo possível o seu cancelamento, ao menos a suspensão até que…".',
  },
  {
    rotulo: 'Quórum de destituição de administrador',
    grupo: 'Quórum e deliberação',
    tipo: 'percentual',
    valor: 'Dois terços',
    explicacao: 'Quantos votos são necessários para tirar um administrador do cargo.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo, na lista de assuntos que exigem quórum próprio: "a designação de administradores, quando feita em ato separado; a destituição de administradores; o modo e valor da remuneração dos administradores, quando não estabelecido no contrato".',
  },
  {
    rotulo: 'Ordem do direito de preferência',
    grupo: 'Saída de sócio e preferência',
    tipo: 'enum',
    opcoes: [
      '1º a holding · 2º os demais quotistas',
      '1º os descendentes dos signatários originais · 2º os demais',
      '1º os quotistas em igualdade de condições',
    ],
    valor: '1º a holding · 2º os demais quotistas',
    fonteClausula: 'acordo',
    clausula:
      'Duas ordens medidas. Nos acordos assinados: "assegurado o DIREITO DE PREFERÊNCIA para aquisição das QUOTAS à PAIOL PARTICIPAÇÕES para depois ser exercido o mesmo direito pelos demais QUOTISTAS remanescentes". E no modelo: "o DIREITO DE PREFERÊNCIA deverá ser assegurado entre os descendentes dos QUOTISTAS signatários da primeira versão deste ACORDO antes de ser exercido por outros QUOTISTAS".',
    explicacao: 'Quem tem a primeira chance de comprar a parte de quem sai. As duas opções de cima estão escritas em documento; "ramo familiar" não estava em nenhum, e foi retirada.',
  },
  {
    rotulo: 'Quotistas signatários originais',
    grupo: 'Saída de sócio e preferência',
    valor: 'Carla Almeida, Diego Almeida',
    origem: 'existe',
    tabela: 'pessoa',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo: "o DIREITO DE PREFERÊNCIA deverá ser assegurado entre os descendentes dos QUOTISTAS signatários da primeira versão deste ACORDO antes de ser exercido por outros QUOTISTAS ou descendentes destes últimos". E na lista de termos: "PARTES RELACIONADAS: os descendentes e ascendentes de cada um dos QUOTISTAS em linha vertical".',
    explicacao: 'Quem assinou a primeira versão do acordo. Sem isso o gerador não sabe de quem são os descendentes que têm preferência.',
  },
  {
    rotulo: 'Objetos sujeitos à preferência',
    grupo: 'Saída de sócio e preferência',
    tipo: 'texto',
    valor: 'Quotas, imóveis, máquinas, oportunidades',
    explicacao: 'O que mais, além da parte na empresa, tem de ser oferecido aos sócios antes de ser vendido para fora.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo, capítulo "Do direito de preferência caso ocorra venda de SOCIEDADES RELACIONADAS, de imóveis ou oportunidades de negócios": "será assegurado aos QUOTISTAS adquirirem as ações ou quotas daquelas sociedades".',
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
    rotulo: 'Métodos de avaliação da quota',
    grupo: 'Saída de sócio e preferência',
    tipo: 'enum', destino: 'contrato',
    multiplo: true,
    opcoes: ['Patrimônio líquido em balanço (IFRS)', 'Fluxo de caixa descontado', 'Valor patrimonial contábil'],
    valor: 'Patrimônio líquido em balanço (IFRS), Fluxo de caixa descontado',
    fonteClausula: 'contrato',
    clausula:
      '…será mensurado através do maior valor atingido por uma das seguintes metodologias: (i) o valor do patrimônio líquido apurado em balanço, no padrão IFRS; e (ii) fluxo de caixa projetado para 05 (cinco) anos, acrescido de perpetuidade e descontado a valor presente.',
    explicacao: 'CORREÇÃO: eu tinha "Dupla avaliação", e a expressão não aparece em nenhum dos três acordos assinados. O que existe são DOIS métodos aplicados juntos, mais uma regra dizendo qual resultado vale.',
  },
  {
    rotulo: 'Regra de combinação dos métodos',
    grupo: 'Saída de sócio e preferência',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['O maior valor entre os métodos', 'A média dos métodos', 'O menor valor entre os métodos'],
    valor: 'O maior valor entre os métodos',
    fonteClausula: 'contrato',
    clausula: '…será mensurado através do MAIOR VALOR atingido por uma das seguintes metodologias…',
    explicacao: 'Com dois métodos, alguém tem de dizer qual número vale. Sem este campo o gerador não escreve a cláusula, e é aqui que o interesse de quem sai contra quem fica se resolve no papel.',
  },
  {
    rotulo: 'Prazo máximo do balanço antes do evento',
    grupo: 'Saída de sócio e preferência',
    tipo: 'inteiro', destino: 'contrato',
    valor: '60 dias',
    fonteClausula: 'contrato',
    clausula: '…apurado em balanço, levantado, no máximo, 60 (sessenta) dias antes do evento, especificadamente para este fim…',
    explicacao: 'Quão recente o balanço tem de ser para servir de base. Balanço velho distorce o valor da quota.',
  },
  {
    rotulo: 'Horizonte do fluxo de caixa',
    grupo: 'Saída de sócio e preferência',
    tipo: 'inteiro', destino: 'contrato',
    valor: '5 anos',
    fonteClausula: 'contrato',
    clausula: '…fluxo de caixa projetado para um período de 05 (cinco) anos (fluxo de caixa descontado)…',
    explicacao: 'Quantos anos o fluxo projeta. Só existe se o método de fluxo de caixa estiver marcado acima.',
  },
  {
    rotulo: 'Taxa mínima de crescimento do fluxo',
    grupo: 'Saída de sócio e preferência',
    tipo: 'enum', destino: 'contrato',
    opcoes: ['IPCA projetado', 'INPC projetado', 'Sem piso definido'],
    valor: 'IPCA projetado',
    fonteClausula: 'contrato',
    clausula: '…observadas as seguintes premissas: (a) a taxa de crescimento não inferior ao índice projetado pelo IPCA…',
    explicacao: 'O piso da projeção, para o laudo não subestimar a empresa de propósito.',
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
    fonteClausula: 'contrato',
    clausula:
      'A autorização existe como alínea: "Autorizar a emissão de garantias, incluindo aval, fiança, garantias sobre frutos da produção (penhores, CPR, cessão de contratos) a favor de sociedades não controladas". O LIMITE em percentual do faturamento não foi localizado: confirmar.',
  },
  {
    rotulo: 'Solução de litígios',
    grupo: 'Solução de conflitos',
    tipo: 'enum',
    opcoes: ['Arbitragem', 'Mediação prévia e arbitragem', 'Justiça comum'],
    valor: 'Arbitragem',
    explicacao: 'Onde a briga entre sócios é resolvida. Arbitragem é um julgamento privado, mais rápido e sigiloso que a Justiça comum.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo, citada por nome em sete pontos: "…serão realizados nos termos da Cláusula de Solução de Litígios prevista neste ACORDO".',
  },
  {
    rotulo: 'Câmara arbitral',
    grupo: 'Solução de conflitos',
    tipo: 'texto',
    valor: 'CAM-CCBC',
    explicacao: 'Qual instituição conduz essa arbitragem. Precisa estar nomeada, senão a cláusula não funciona na prática.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo: "…resolvidas por arbitragem, a ser instituída e realizada de acordo com as Regras de Arbitragem da Câmara de Comércio Brasil Canadá, cuja decisão arbitral será definitiva e vinculará os QUOTISTAS".',
  },
  {
    rotulo: 'Prazo para indicação de árbitros',
    grupo: 'Solução de conflitos',
    tipo: 'inteiro',
    valor: '15 dias',
    explicacao: 'Quantos dias cada lado tem para escolher o seu árbitro depois que a briga começa.',
  },
  {
    rotulo: 'Cláusula de não concorrência',
    grupo: 'Saída de sócio e preferência',
    tipo: 'booleano',
    valor: 'Sim',
    fonteClausula: 'acordo',
    clausula:
      '…não se aplica aos herdeiros dos QUOTISTAS a CLÁUSULA DE NÃO CONCORRÊNCIA caso ocorra o falecimento de um destes…',
    explicacao: 'Se quem sai fica impedido de montar negócio concorrente. Aparece nos três acordos lidos e o mockup não tinha o campo. A exceção do herdeiro é o detalhe que a cláusula faz questão de registrar.',
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
    tipo: 'booleano',
    valor: 'Sim',
    explicacao: 'Se a parte na empresa foi doada aos filhos mantendo os rendimentos com quem doou. É o arranjo mais comum de sucessão em vida.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo: "…bem como de seus respectivos direitos (incluindo usufruto), direito este que, quando for utilizado como referência para este ACORDO, sempre observará os seguintes princípios".',
  },
  {
    rotulo: 'Quem exerce o voto da quota',
    grupo: 'Usufruto e voto',
    tipo: 'enum',
    opcoes: ['Usufrutuário', 'Nu-proprietário', 'Em conjunto'],
    valor: 'Usufrutuário',
    explicacao: 'Nessa doação, quem vota nas decisões: o filho que recebeu a parte, ou o pai que ficou com os rendimentos. Sem definir isso, a reunião trava.',
    fonteClausula: 'acordo',
    clausula:
      'Modelo do Acordo, na definição de VOTO(S): "o direito de voto do titular e/ou usufrutuário das QUOTAS em REUNIÕES DE SÓCIOS, REUNIÃO DE QUOTISTAS e/ou REUNIÕES PRÉVIAS".',
  },
  {
    rotulo: 'Sociedades relacionadas abrangidas',
    grupo: 'Alcance do acordo',
    valor: 'Holding, Agropecuária Campos, Transportadora Campos',
    origem: 'existe',
    tabela: 'cliente',
    fonteClausula: 'acordo',
    clausula:
      'O modelo define SOCIEDADE(S) RELACIONADA(S) como "qualquer pessoa jurídica que direta ou indiretamente" se ligue ao grupo, e o termo aparece 66 vezes. É o campo que diz até onde o acordo alcança.',
    explicacao: 'O acordo não vale só para a holding: ele alcança as empresas do grupo que a família decidir incluir. Sem essa lista, metade das cláusulas não sabe sobre quem fala.',
  },
  {
    rotulo: 'Reunião prévia obrigatória',
    grupo: 'Reunião prévia e voto em bloco',
    tipo: 'booleano',
    valor: 'Sim',
    fonteClausula: 'acordo',
    clausula:
      'As decisões tomadas nas REUNIÕES PRÉVIAS serão transcritas em Atas e constituirão Acordos de Voto, de forma a definir e vincular o voto dos QUOTISTAS a serem proferidos, sempre em bloco e de modo uniforme, nas respectivas REUNIÕES DE SÓCIOS.',
    explicacao: 'O mecanismo central do acordo, e o mockup não tinha: antes da reunião oficial os sócios se reúnem entre si, decidem, e o que sai dali AMARRA o voto de todos na reunião oficial. É isso que faz o voto em bloco existir na prática.',
  },
  {
    rotulo: 'Quórum da reunião prévia',
    grupo: 'Reunião prévia e voto em bloco',
    tipo: 'enum',
    opcoes: ['Maioria das quotas presentes', 'Maioria do capital total', 'Unanimidade'],
    valor: 'Maioria das quotas presentes',
    fonteClausula: 'acordo',
    clausula:
      'Os assuntos levados à REUNIÃO PRÉVIA serão aprovados conforme decisão dos QUOTISTAS que sejam titulares do direito de voto da maioria das QUOTAS presentes na ocasião, salvo se este ACORDO previr quórum específico.',
    explicacao: 'Quantos votos a reunião prévia precisa. Repare no "salvo se este ACORDO previr quórum específico": alguns assuntos têm quórum próprio, então este é o padrão e não a regra única.',
  },
  {
    rotulo: 'Opção de compra prevista',
    grupo: 'Opções de compra e venda',
    tipo: 'booleano',
    valor: 'Sim',
    fonteClausula: 'acordo',
    clausula:
      'O direito de OPÇÃO DE COMPRA poderá ser exercido pelo QUOTISTA que este ACORDO prever como o detentor de tal direito, mas deverá ser assegurado o DIREITO DE PREFERÊNCIA no que se refere a esses direitos.',
    explicacao: 'O direito de obrigar outro sócio a VENDER em certas situações. É o segundo conceito mais citado do modelo, 44 vezes, e faltava no mockup.',
  },
  {
    rotulo: 'Quem detém a opção de compra',
    grupo: 'Opções de compra e venda',
    valor: 'Rafael Campos',
    origem: 'existe',
    tabela: 'pessoa',
    explicacao: 'O modelo diz que o detentor é "o QUOTISTA que este ACORDO prever", ou seja, é escolha de cada cliente e precisa ser nomeada.',
  },
  {
    rotulo: 'Preço na opção de compra',
    grupo: 'Opções de compra e venda',
    tipo: 'enum',
    opcoes: ['O maior entre valor da quota e valor subscrito com juros', 'Valor da quota', 'Valor subscrito corrigido'],
    valor: 'O maior entre valor da quota e valor subscrito com juros',
    fonteClausula: 'acordo',
    clausula:
      'O preço de cada QUOTA objeto da OPÇÃO DE COMPRA será o maior dentre os valores adquiridos através das seguintes metodologias: (i) o VALOR DAS QUOTAS na data da OPÇÃO DE COMPRA; ou (ii) o valor subscrito e integralizado pelos SUBSCRITORES SUBSTITUTOS para cada QUOTA na época da subscrição, acrescido de juros.',
    explicacao: 'A opção de compra tem preço PRÓPRIO, diferente da avaliação de haveres. É outra conta, com outra regra de maior valor.',
  },
  {
    rotulo: 'Juros sobre o valor subscrito',
    grupo: 'Opções de compra e venda',
    tipo: 'percentual',
    valor: '1% ao mês',
    fonteClausula: 'acordo',
    clausula: '…acrescido de juros de 1% (um por cento)…',
    explicacao: 'A correção do valor que o sócio pôs na empresa, usada quando esse for o maior dos dois números.',
  },
  {
    rotulo: 'Opção de venda prevista',
    grupo: 'Opções de compra e venda',
    tipo: 'booleano',
    valor: 'Sim',
    explicacao: 'O espelho da opção de compra: o direito de obrigar os outros a COMPRAR a sua parte. Citada 23 vezes no modelo, e costuma ser a saída de quem quer sair sem comprador.',
  },
  {
    rotulo: 'Prazo da não concorrência',
    grupo: 'Saída de sócio e preferência',
    tipo: 'inteiro',
    valor: '5 anos',
    vazio: true,
    explicacao: 'Por quanto tempo quem sai não pode concorrer. O modelo tem a cláusula, mas o prazo é lacuna a preencher por cliente.',
  },
  {
    rotulo: 'Área protegida pela não concorrência',
    grupo: 'Saída de sócio e preferência',
    valor: 'Área de atuação e carteira de clientes',
    fonteClausula: 'acordo',
    clausula:
      'O modelo protege expressamente a CARTEIRA DE CLIENTES e define ÁREA DE ATUAÇÃO e ATIVIDADES CONCORRENTES como termos próprios.',
    explicacao: 'O que exatamente fica protegido: a região, o ramo, e a carteira de clientes. Sem delimitar, a cláusula não se sustenta.',
  },
  {
    rotulo: 'Multa por descumprimento da não concorrência',
    grupo: 'Saída de sócio e preferência',
    tipo: 'valor',
    valor: '',
    vazio: true,
    fonteClausula: 'acordo',
    clausula:
      'MULTA POR DESCUMPRIMENTO DA CLÁUSULA DE NÃO CONCORRÊNCIA: multa meramente punitiva a ser exigida de quem descumpriu a CLÁUSULA DE NÃO CONCORRÊNCIA.',
    explicacao: 'O valor da punição, que o modelo chama de "meramente punitiva", ou seja, ela se soma a perdas e danos em vez de substituí-los.',
  },
  {
    rotulo: 'A não concorrência alcança parentes e sócios',
    grupo: 'Saída de sócio e preferência',
    tipo: 'booleano',
    valor: 'Sim',
    fonteClausula: 'acordo',
    clausula:
      'Esta obrigação poderá ser exigida de qualquer QUOTISTA caso alguma PARTE RELACIONADA, seu cônjuge ou companheiro(a), sócio e/ou acionista de qualquer QUOTISTA (bem como descendentes, cônjuge e/ou companheira destes) descumpra a cláusula.',
    explicacao: 'Se o cônjuge, o filho ou um sócio do sócio abrir o concorrente, a responsabilidade recai sobre o quotista. É o que impede a burla óbvia.',
  },
];

/** Os 17 parâmetros do Regimento Interno. Pasta 05. */
export const CAMPOS_REGIMENTO: Campo[] = [
  {
    rotulo: 'Mínimo de membros',
    fonteClausula: 'contrato',
    clausula:
      'CLÁUSULA QUINTA: O Conselho de Administração será composto por no mínimo 03 (três) e no máximo 06 (seis) membros. O contrato escreve número e extenso, então o campo guarda o inteiro.',
    grupo: 'Composição do conselho',
    tipo: 'inteiro', destino: 'contrato',
    valor: '3',
    explicacao: 'Menos que isso e o conselho não pode funcionar. Serve para não sobrar uma pessoa decidindo sozinha.',
  },
  {
    rotulo: 'Máximo de membros',
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
    clausula:
      'Modelo de contrato com conselho, alínea da competência: "Aprovar a remuneração individual dos membros do Conselho de Administração e da Diretoria, com base na remuneração global aprovada em Reunião de Sócios".',
  },
  {
    rotulo: 'Mandato do presidente',
    grupo: 'Composição do conselho',
    tipo: 'inteiro',
    valor: '5 anos',
    explicacao: 'Quanto tempo o presidente do conselho fica no cargo antes de nova eleição. Perdeu a etiqueta de cláusula: é o ÚNICO campo do levantamento que não apareceu em contrato nenhum dos que lemos, nem no modelo com conselho. Os documentos falam do mandato dos conselheiros, não de um mandato próprio do presidente.',
  },
  {
    rotulo: 'Quórum de deliberação',
    grupo: 'Reuniões',
    tipo: 'percentual', destino: 'contrato',
    valor: '51%',
    explicacao: 'Quantos conselheiros precisam concordar para a decisão valer.',
    fonteClausula: 'contrato',
    clausula:
      'CLÁUSULA SEXTA: As matérias e deliberações tomadas nas reuniões do Conselho de Administração dependerão de aprovação da maioria de seus membros presentes nas reuniões deste órgão, competindo ao Presidente o voto de desempate.',
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
    fonteClausula: 'contrato',
    clausula:
      'Parágrafo Segundo: A cada início de ano será aprovado pelos conselheiros o calendário corporativo anual do Conselho de Administração, constando as datas previstas para as reuniões.',
  },
  {
    rotulo: 'Convocação extraordinária',
    grupo: 'Reuniões',
    tipo: 'inteiro', destino: 'contrato',
    valor: '24 horas',
    explicacao: 'A antecedência mínima quando é urgente. Prazo curto demais permitiria convocar sem alguém conseguir chegar.',
    fonteClausula: 'contrato',
    clausula:
      '…em caráter extraordinário, quando necessário aos interesses sociais, sempre que convocado por escrito através de notificação encaminhada ao endereço informado no termo de posse do conselheiro, inclusive eletrônico (e-mail), podendo a convocação ser emitida pelo Presidente do Conselho ou por outros 02 (dois) conselheiros.',
  },
  {
    rotulo: 'Local das reuniões',
    grupo: 'Reuniões',
    tipo: 'texto', destino: 'contrato',
    valor: 'Sede da sociedade',
    explicacao: 'Onde a reunião acontece por padrão, para ninguém ser convocado longe de propósito.',
    fonteClausula: 'contrato',
    clausula:
      'Modelo de contrato com conselho, CLÁUSULA NONA: "O Conselho de Administração reunir-se-á na sede ou filiais da sociedade em caráter ordinário, de acordo com o calendário aprovado…".',
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
    fonteClausula: 'contrato',
    clausula:
      'Modelo de contrato com conselho, CLÁUSULA DÉCIMA PRIMEIRA: "Perderá o cargo, ensejando a sua vacância definitiva, o membro que deixar de participar de 03 (três) reuniões ordinárias consecutivas, sem motivo justificado ou licença concedida pelo Conselho".',
  },
  {
    rotulo: 'Hipóteses de vacância',
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
    clausula:
      'Mesma CLÁUSULA DÉCIMA PRIMEIRA do modelo: a perda do cargo se dá por "deixar de participar de 03 (três) reuniões ordinárias consecutivas, sem motivo justificado ou licença concedida pelo Conselho de Administração".',
  },
  {
    rotulo: 'Prazo para eleger substituto',
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
    clausula:
      '…com mandato de 03 (três) anos, sendo admitida a reeleição, assegurado a cada membro direito a um voto nas suas reuniões. Mesma frase do mandato.',
    grupo: 'Conselho no contrato',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    explicacao: 'Se o conselheiro pode ser eleito de novo ao fim do mandato.',
  },
  {
    rotulo: 'Vice-presidente eleito pelos membros',
    fonteClausula: 'contrato',
    clausula:
      'Parágrafo Primeiro: O Presidente e o Vice-Presidente do Conselho de Administração serão eleitos pelos próprios membros do Conselho de Administração, sendo permitida a reeleição de ambos.',
    grupo: 'Conselho no contrato',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    explicacao: 'Se o vice é escolhido pelo próprio conselho ou vem indicado pelos sócios.',
  },
  {
    rotulo: 'Voto de desempate do presidente',
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
    clausula:
      'CLÁUSULA VIGÉSIMA QUARTA: …cabendo aos sócios, na proporção de suas quotas e de acordo com deliberação que na oportunidade entre os mesmos for adotada, a distribuição dos lucros.',
    explicacao: 'Como o lucro é distribuído. ATENÇÃO: o levantamento trazia "distribuição mínima de 25%", e no contrato real lido não existe percentual nenhum, a distribuição é deliberada a cada ano. Se algum cliente tem percentual fixo, precisamos ver qual.',
  },
  {
    rotulo: 'Distribuição antecipada permitida',
    grupo: 'Lucros',
    tipo: 'booleano', destino: 'contrato',
    valor: 'Sim',
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
    clausula:
      '…bem como distribuí-los desproporcionalmente a participação societária dos sócios no capital social, desde que assim deliberem em Reunião de Sócios, por unanimidade dos presentes.',
    explicacao: 'Se um sócio pode receber mais que a sua fatia, e quantos votos isso exige. É o que permite premiar quem trabalha na empresa sem mexer na participação.',
  },
  {
    rotulo: 'Número da alteração',
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
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
    fonteClausula: 'contrato',
    clausula:
      'CLÁUSULA SEXTA: A sociedade será administrada por um Conselho de Administração e uma Diretoria, cuja composição e eleição competem à Reunião de Sócios, sendo que a representação da sociedade competirá exclusivamente aos Diretores.',
  },
  {
    rotulo: 'Quórum de instalação da reunião',
    grupo: 'A reunião que aprova',
    tipo: 'enum',
    valor: 'Totalidade do capital votante',
    explicacao: 'Quanto do capital precisa estar presente para a reunião poder começar. Diferente do quórum para decidir.',
    fonteClausula: 'ata',
    clausula:
      'Da ata real: "às 13h30min, em primeira convocação com a presença da totalidade dos sócios" e "PRESENÇA: A totalidade do capital votante".',
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
    fonteClausula: 'contrato',
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
        origem: 'existe',
    tabela: 'administracao',
    fonteClausula: 'ata',
    clausula:
      'Em outro cliente a ata detalha: "uma Diretoria formada por 03 (três) Diretores, sendo um Diretor de Mercado e Finanças, um Diretor de Operações e um Diretor de Sistema de Irrigação". Os cargos são a identidade da diretoria daquele grupo, e não uma lista fechada.',
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
    fonteClausula: 'contrato',
    clausula:
      'CLÁUSULA DÉCIMA QUARTA: Compete aos diretores, isoladamente, a representação da sociedade em juízo ou fora dele, ativa e passivamente, inclusive perante o sistema financeiro nacional, entidades oficiais e repartições públicas.',
  },
  {
    rotulo: 'Regra de término do mandato',
    fonteClausula: 'contrato',
    clausula:
      '…sendo que os seus mandatos se findam na investidura dos novos membros eleitos para o mandato seguinte. No contrato é condição, não data.',
    grupo: 'Órgãos e mandato',
    valor: 'Até a investidura dos novos eleitos',
    explicacao: 'O contrato diz que "os mandatos se findam na investidura dos novos membros eleitos". Ou seja, o fim do mandato pode ser uma REGRA e não uma data, e o gerador precisa saber qual dos dois para não escrever data onde a cláusula pede condição.',
    tipo: 'enum',
    destino: 'contrato',
  },
  {
    rotulo: 'Hora da posse',
    grupo: 'A reunião que aprova',
    valor: '16h30',
    fonteClausula: 'contrato',
    clausula:
      'Aos 27 dias do mês de março de 2.026, às 16h30min, na sede social da empresa […] comparece o senhor SÉRGIO PITT […] para ser, neste ato, investido para o cargo de Presidente do Conselho de Administração.',
    explicacao: 'O termo de posse tem hora PRÓPRIA, depois da reunião: no exemplo a reunião foi às 13h30 e a posse às 16h30. É um termo por eleito, e é a assinatura dele que faz o mandato começar a contar.',
  },
  {
    rotulo: 'Hora da reunião',
    grupo: 'A reunião que aprova',
    valor: '13h30',
    explicacao: 'A hora consta na abertura da ata, junto da data. Sem ela a ata não fecha.',
  },
  {
    rotulo: 'Local da reunião',
    grupo: 'A reunião que aprova',
    tipo: 'enum',
    opcoes: ['Na sede da sociedade', 'Outro endereço'],
    valor: 'Na sede da sociedade',
    explicacao: 'Onde a reunião aconteceu. Escolhendo a sede, o endereço sai do cadastro do cliente e ninguém redigita.',
    origem: 'derivado',
    tabela: 'cliente',
  },
  {
    rotulo: 'Ordem do dia',
    grupo: 'A reunião que aprova',
    valor: 'Composição e eleição dos membros do Conselho de Administração e Diretoria',
    explicacao: 'O assunto único da reunião. A ata numera isso como item 6 e as deliberações respondem a ele na mesma ordem.',
  },
  {
    rotulo: 'Cidade e data de assinatura da ata',
    grupo: 'A reunião que aprova',
    valor: 'Luís Eduardo Magalhães/BA, 27 de março de 2026',
    explicacao: 'O fecho da ata. A cidade vem da sede e a data é a da reunião, então os dois são derivados e não digitados.',
    origem: 'derivado',
  },
  {
    rotulo: 'Membros efetivamente eleitos',
    grupo: 'Órgãos e mandato',
    tipo: 'inteiro',
    valor: '3',
    explicacao: 'Quantos membros a reunião decidiu eleger DENTRO do intervalo que o contrato permite. No exemplo o contrato admite de 3 a 4 e a reunião elegeu 3: o intervalo é cláusula, o número efetivo é da ata.',
    fonteClausula: 'contrato',
    clausula:
      '…decidiram que o Conselho de Administração será composto por 03 (três) membros, sendo 01 (um) Presidente do Conselho e 02 (dois) Conselheiros.',
  },
  {
    rotulo: 'Mandato da diretoria',
    grupo: 'Órgãos e mandato',
    tipo: 'inteiro',
    valor: '3 anos',
    explicacao: 'ATENÇÃO: o mandato da diretoria NÃO é o mesmo do conselho. No exemplo o conselho tem 2 anos e a diretoria 3, e a ata declara os dois na mesma frase. Um campo só produziria cláusula errada.',
    fonteClausula: 'contrato',
    clausula:
      'O mandato no Conselho de Administração vigorará por 02 (dois) anos e da Diretoria por 03 (três) anos, ambos iniciando na data da assinatura do Termo de Posse.',
  },
  {
    rotulo: 'Fim do mandato do conselho',
    grupo: 'Órgãos e mandato',
    tipo: 'data',
    valor: '27/03/2028',
    explicacao: 'Sai da conta início mais anos de mandato, e a ata escreve a data fechada. É cálculo do sistema, não digitação.',
    origem: 'derivado',
  },
  {
    rotulo: 'Fim do mandato da diretoria',
    grupo: 'Órgãos e mandato',
    tipo: 'data',
    valor: '27/03/2029',
    explicacao: 'Mesma conta do conselho, com o prazo da diretoria. No exemplo dá 2029 contra 2028 do conselho.',
    origem: 'derivado',
  },
  {
    rotulo: 'Declaração de desimpedimento',
    grupo: 'Diretoria',
    tipo: 'booleano',
    valor: 'Sim',
    explicacao: 'Todo eleito declara na ata que não está impedido por lei ou condenação de administrar. É texto padrão longo, e o cadastro só liga ou desliga.',
    fonteClausula: 'contrato',
    clausula:
      '…todos os membros eleitos declararam sob as penas da lei que não estão impedidos de exercerem a administração da sociedade por lei especial, ou em virtude de condenação criminal…',
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
    tipo: 'enum',
    opcoes: ['Reunião de Sócios', 'Conselho de Administração', 'Diretoria'],
    valor: 'Reunião de Sócios',
    explicacao: 'A consultoria confirmou que o Protocolo NÃO reflete em ato societário, apenas formaliza. A cláusula do contrato que fala de remuneração vem da Matriz, não daqui. Quem tem poder de mudar o protocolo. É o elo com a seção de órgãos.',
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
