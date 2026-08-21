/**
 * Leitura do bloco de alertas do snapshot que a tela publicou para o agente.
 *
 * Por que ler do SNAPSHOT em vez de o painel receber os alertas por props: o
 * painel tem que mostrar exatamente o que o agente recebeu. Se as duas coisas
 * viessem de caminhos diferentes, o usuário poderia ler um alerta na tela e
 * ouvir do agente que ele não conhece aquele alerta — e nenhum dos dois estaria
 * errado, o que é a pior forma de estar errado.
 */
import type { BlocoContexto } from '@/hooks/useAgenteContexto';

export interface ItemDecisao {
  severidade: string;
  alerta: string;
  evidencia: string;
  valor: string | null;
}

/** Id do bloco combinado com as telas (ver `agenteContextoBoard`). */
export const BLOCO_ALERTAS = 'alertas';

export function itensDeDecisao(blocos: BlocoContexto[] | undefined): ItemDecisao[] {
  const bloco = blocos?.find((b) => b.id === BLOCO_ALERTAS);
  if (!bloco?.itens) return [];
  return bloco.itens
    .map((i) => ({
      severidade: String(i.severidade ?? 'atencao'),
      alerta: String(i.alerta ?? ''),
      evidencia: String(i.evidencia ?? ''),
      // `null` continua `null`: "não apurado" não pode virar a string "null"
      // no meio de uma linha de decisão.
      valor: i.valor == null ? null : String(i.valor),
    }))
    // Item sem título não é alerta, é lixo de serialização: não desenha linha.
    .filter((i) => i.alerta);
}

/** Quantos riscos (severidade máxima) — decide a cor do ponto no ícone. */
export function contarRiscos(itens: ItemDecisao[]): number {
  return itens.filter((i) => i.severidade === 'risco').length;
}
