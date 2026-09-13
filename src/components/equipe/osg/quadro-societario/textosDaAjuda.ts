// A AJUDA DE CADA GESTO SOCIETÁRIO, em duas frentes: o que ele faz no QUADRO e o
// que ele alimenta no CONTRATO.
//
// Existe separada dos componentes porque é conteúdo jurídico revisado, não
// decoração: o mesmo texto serve o seletor de movimento, o cabeçalho dentro do
// formulário e as colunas da tabela de usufruto, e uma redação por tela faria
// três versões divergirem em silêncio.
//
// A linha de contrato NÃO promete geração: registrar o movimento alimenta o
// evento que a peça vai descrever, e a peça nasce depois, na tela Gerar. Onde o
// fluxo ainda não deriva a resolução (redução de capital, instituição avulsa),
// o texto reconhece a lacuna em vez de prometer o que `eventosDaAlteracao.ts`
// não faz.

export interface AjudaDoGesto {
  /** Efeito no saldo de quotas, no capital e no voto. */
  quadro: string;
  /** O que o gesto alimenta na alteração contratual, e o que ele não alimenta. */
  contrato: string;
}

export const AJUDA_SOCIETARIA = {
  aporte: {
    quadro:
      'Emite quotas para quem aporta e aumenta o capital social ao valor nominal. A participação e o percentual de voto são recalculados, respeitados os usufrutos existentes.',
    contrato:
      'Alimenta a integralização em moeda corrente e, havendo aumento em relação ao capital anteriormente publicado, a resolução de aumento. A cláusula de capital e a distribuição de quotas passam a refletir o novo saldo na peça gerada.',
  },
  cessao: {
    quadro:
      'Transfere quotas a título oneroso do cedente ao adquirente, sem mudar o capital social. O voto acompanha os direitos sobre as quotas, respeitados os ônus existentes e os impedimentos informados no formulário.',
    contrato:
      'Alimenta a resolução de cessão e a nova distribuição de quotas. Pode repercutir no ingresso ou retirada de sócios e na administração por não sócios. Os ônus vigentes continuam descritos no consolidado.',
  },
  doacao: {
    quadro:
      'Registra uma transferência gratuita, sem aumentar ou reduzir o capital e sem constituir nova reserva de usufruto ou gravame. Ônus existentes podem acompanhar as quotas e influenciar quem vota.',
    contrato:
      'Alimenta o evento de doação e a distribuição resultante, com eventual ingresso ou retirada. Este formulário não declara origem legítima/disponível nem data de instrumento. O consolidado continua descrevendo os ônus que permanecerem vigentes.',
  },
  doacaoComOnus: {
    quadro:
      'Transfere quotas gratuitamente, em um ou mais pares, sem mudar o capital. Com reserva, o donatário recebe a nua propriedade e o doador conserva o usufruto. O voto só acompanha a reserva quando essa opção está marcada.',
    contrato:
      'Alimenta a resolução de doação, a reserva e os gravames escolhidos, com origem e data do instrumento quando informadas. A peça também compõe anuência e renúncia à preferência e o quadro de usufruto e voto conforme o caso. O consolidado republica os ônus vigentes.',
  },
  instituicao: {
    quadro:
      'Constitui usufruto sobre quotas que continuam com o mesmo titular, sem mudar o capital. O usufrutuário recebe uso e gozo. Recebe também o voto se a extensão ao voto estiver marcada.',
    contrato:
      'O ônus vigente já aparece no contrato consolidado. A resolução própria da instituição ainda não é incluída automaticamente na alteração contratual por este fluxo.',
  },
  reducao: {
    quadro:
      'Cancela quotas do titular indicado e reduz o capital ao valor nominal. Recalcula as participações e o voto. O ônus incidente nas quotas canceladas é encerrado na proporção atingida.',
    contrato:
      'O capital e o quadro resultantes alimentam a peça. Este fluxo ainda não deriva uma resolução específica de redução de capital. Registrar a redução aqui não garante sua descrição completa na alteração contratual.',
  },
  nuaPropriedade: {
    quadro:
      'É a titularidade da quota sujeita a usufruto de outra pessoa. Não representa quotas adicionais. O nu-proprietário conserva o voto quando o usufruto não o abrange.',
    contrato:
      'É discriminada no quadro de usufruto do consolidado. A quota aparece sob direitos distintos, sem duplicar o capital social.',
  },
  usufrutoComVoto: {
    quadro:
      'Quando marcado, o usufrutuário exerce o voto das quotas abrangidas. Quando desmarcado, recebe uso e gozo, mas o voto permanece com o titular. O capital não muda por essa escolha.',
    contrato:
      'Define a previsão de voto na reserva e a distribuição de voz e voto no consolidado, com referência ao art. 114 da Lei 6.404/76 e ao art. 1.053 do Código Civil. Na instituição avulsa, permanece a limitação de inclusão da resolução própria.',
  },
  inalienabilidade: {
    quadro:
      'Grava as quotas sem mudar sua quantidade, capital ou voto por si só. O sistema impede cessão onerosa que alcance quotas inalienáveis. A transmissão gratuita tem tratamento próprio de sub-rogação.',
    contrato:
      'A restrição integra os gravames da doação e é republicada no capital e nas disposições de alienação do consolidado. A redação contratual restringe a transferência e deve ser conferida, mesmo quando o sistema admite registrar uma transmissão gratuita.',
  },
  impenhorabilidade: {
    quadro:
      'Registra a proteção das quotas contra dívidas do donatário, sem alterar capital, titularidade ou voto por si só. A marcação não executa medidas judiciais.',
    contrato:
      'Inclui a impenhorabilidade entre os gravames da doação e nas menções aos gravames vigentes do consolidado, conforme a redação do instrumento.',
  },
  incomunicabilidade: {
    quadro:
      'Registra que as quotas doadas não se comunicam ao cônjuge do donatário. A marcação não muda capital, quantidade de quotas ou voto por si só.',
    contrato:
      'Inclui a incomunicabilidade entre os gravames da doação e nas menções aos gravames vigentes do consolidado, conforme a redação do instrumento.',
  },
  reversibilidade: {
    quadro:
      'Registra a condição de retorno das quotas ao doador se ele sobreviver ao donatário. Não transfere quotas agora nem executa o retorno automaticamente por falecimento.',
    contrato:
      'Inclui a reversibilidade entre os gravames da doação e nas menções aos gravames vigentes do consolidado. A condição deve constar da redação do instrumento.',
  },
  origemDaDoacao: {
    quadro:
      'Declara a origem patrimonial das quotas doadas, sem mudar o total, capital ou voto. O formulário reparte metade para a legítima e metade para a disponível, deixando a quota ímpar na legítima. Não calcula a suficiência do patrimônio do doador.',
    contrato:
      'Informa, em cada par de doação, quantas quotas saem da legítima e da parte disponível. Desmarcada a declaração, a cláusula omite essa divisão.',
  },
  valorNominal: {
    quadro:
      'É o valor de capital atribuído à quota, não o preço de cessão. Os novos movimentos deste formulário usam R$ 1,00 por quota. Na Controladora, o indicador do quadro é calculado pelo capital dividido pelo total de quotas.',
    contrato:
      'Compõe os valores de capital e integralização e a distribuição de quotas. Não declara o preço pago em uma cessão nem altera sozinho o capital já registrado.',
  },
  aumentoDeCapital: {
    quadro:
      'Acrescenta os aportes dos imóveis aprovados ainda fora do capital e a parcela em moeda corrente informada por sócio. Aumenta capital e quotas e recalcula a participação.',
    contrato:
      'Alimenta aumento e integralização, com alíneas próprias para os bens e para a moeda corrente. O consolidado publica o novo capital e o quadro resultante.',
  },
  subidaDeQuotas: {
    quadro:
      'Registra cessões na Proprietária e aportes correspondentes na Controladora, em um ato. O capital da Proprietária permanece e o da Controladora aumenta pelo valor aportado. Confira a participação resultante nas duas sociedades.',
    contrato:
      'Alimenta a cessão na peça da Proprietária e a integralização com quotas de outra sociedade na peça da Controladora, com aumento quando aplicável. O gesto não gera nem registra as peças automaticamente.',
  },
} as const satisfies Record<string, AjudaDoGesto>;

export type ChaveDaAjuda = keyof typeof AJUDA_SOCIETARIA;
