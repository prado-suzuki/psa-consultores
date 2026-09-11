import type { TipoMovimento } from '@/lib/osg/movimentoQuotas';
import type { ChaveDaAjuda } from './ajudaSocietaria';

// O CATÁLOGO DE GESTOS que a porta única do quadro oferece, por empresa.
//
// Os rótulos são de cartório, não de conversa: "Cessão", "Doação com reserva de
// usufruto ou gravames", "Instituição de usufruto". É o vocabulário que o
// consultor usa com o cliente e que a peça imprime, e trocá-lo por frases
// coloquiais apagaria o termo que ele já procura. A linha curta existe para
// distinguir opções vizinhas de relance; o efeito no quadro e no contrato fica
// no ícone de informação, que é ajuda pedida, não parágrafo permanente.
//
// A Controladora e a Proprietária NÃO têm o mesmo catálogo. A PR nunca montou
// os três botões da CN, e reuni-los sob o mesmo rótulo criaria capacidade nova
// por acidente: lá os dois gestos que existem são o aumento por integralização
// dos bens e a subida das quotas, cada um com suas travas.

export interface OpcaoDeGesto<V extends string = string> {
  valor: V;
  rotulo: string;
  /** A linha curta sempre visível sob o rótulo. Pode ocupar duas linhas. */
  linha: string;
  ajuda: ChaveDaAjuda;
}

/** Os gestos da Controladora. Os quatro primeiros são tipos de movimento. */
export type GestoDaControladora =
  | TipoMovimento
  | 'doacaoComOnus'
  | 'instituicao';

export const GESTOS_DA_CONTROLADORA: OpcaoDeGesto<GestoDaControladora>[] = [
  {
    valor: 'aporte',
    rotulo: 'Aporte',
    linha: 'Emissão de quotas em moeda corrente.',
    ajuda: 'aporte',
  },
  {
    valor: 'cessao',
    rotulo: 'Cessão',
    linha: 'Transferência onerosa de quotas.',
    ajuda: 'cessao',
  },
  {
    valor: 'doacao',
    rotulo: 'Doação simples',
    linha: 'Uma transferência gratuita, sem constituir nova reserva ou gravame.',
    ajuda: 'doacao',
  },
  {
    valor: 'doacaoComOnus',
    rotulo: 'Doação com reserva de usufruto ou gravames',
    linha: 'Reserva, gravames, origem patrimonial ou vários pares no mesmo ato.',
    ajuda: 'doacaoComOnus',
  },
  {
    valor: 'instituicao',
    rotulo: 'Instituição de usufruto',
    linha: 'Constituição de usufruto sem transferência da titularidade.',
    ajuda: 'instituicao',
  },
  {
    valor: 'reducao',
    rotulo: 'Redução',
    linha: 'Cancelamento de quotas.',
    ajuda: 'reducao',
  },
];

/** Os gestos da Proprietária: os dois que a tela dela já tinha. */
export type GestoDaProprietaria = 'aumento' | 'subida';

export const GESTOS_DA_PROPRIETARIA: OpcaoDeGesto<GestoDaProprietaria>[] = [
  {
    valor: 'aumento',
    rotulo: 'Aumento de capital por integralização',
    linha: 'Entrada dos imóveis aprovados ainda fora do capital, com parcela em moeda.',
    ajuda: 'aumentoDeCapital',
  },
  {
    valor: 'subida',
    rotulo: 'Transferir quotas para a controladora',
    linha: 'Cessão na Proprietária e aporte correspondente na Controladora, num ato.',
    ajuda: 'subidaDeQuotas',
  },
];

/** Os quatro tipos de movimento avulso são gestos; os outros dois não. */
export const TIPOS_DE_MOVIMENTO_NA_PORTA = new Set<GestoDaControladora>([
  'aporte', 'cessao', 'doacao', 'reducao',
]);

export const ehTipoDeMovimento = (gesto: GestoDaControladora): gesto is TipoMovimento =>
  TIPOS_DE_MOVIMENTO_NA_PORTA.has(gesto);

/** A ajuda de cada tipo de movimento, para o cabeçalho dentro do formulário. */
export const AJUDA_DO_TIPO: Record<TipoMovimento, ChaveDaAjuda> = {
  aporte: 'aporte',
  cessao: 'cessao',
  doacao: 'doacao',
  reducao: 'reducao',
};

/** O rótulo do gesto, para o cabeçalho dentro do formulário que ele abriu. */
export const rotuloDoGesto = (gesto: GestoDaControladora): string =>
  GESTOS_DA_CONTROLADORA.find((g) => g.valor === gesto)?.rotulo ?? gesto;
