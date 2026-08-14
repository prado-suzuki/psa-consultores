// Levar o cursor até o primeiro campo obrigatório em falta.
//
// A correção de 13/08 prometia isto ("além de recusar, leva o foco ao primeiro
// campo faltante") e entregou só metade: `irParaPendencia` trocava de aba e
// abria o item certo, mas ninguém chamava `.focus()`. Medido no produto, o
// cursor ficava parado no botão Salvar e a pessoa tinha de caçar a moldura
// vermelha na mão.
//
// O alvo é procurado pela marca que a própria tela já pinta
// (`SELETOR_CAMPO_PENDENTE`), e não por um nome de campo repetido em cada aba.
// Assim campo novo entra marcado e focável de graça, sem lista para atualizar.
import { useEffect, type RefObject } from 'react';
import { SELETOR_CAMPO_PENDENTE } from './MarcaPendencia';

/** Quadros de espera antes de desistir de achar o campo. */
const QUADROS_MAX = 12;

/**
 * @param pedido muda a cada clique em Salvar ou no aviso do rodapé; `null` não faz nada.
 * @param containerRef raiz onde procurar — normalmente o corpo do modal.
 */
export function useFocoPendencia(pedido: unknown, containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!pedido) return;

    let quadro = 0;
    let id = 0;
    const tentar = () => {
      const alvo = containerRef.current?.querySelector<HTMLElement>(SELETOR_CAMPO_PENDENTE);
      if (alvo) {
        // `preventScroll` porque quem decide o enquadramento é o scrollIntoView:
        // o scroll do foco encosta o campo na borda, e o rótulo fica cortado.
        alvo.scrollIntoView({ block: 'center' });
        alvo.focus({ preventScroll: true });
        return;
      }
      // A aba e a linha da lista montam depois deste efeito. Tentar por alguns
      // quadros é mais confiável do que adivinhar um atraso em milissegundos —
      // foi o atraso fixo de 100ms que produziu o falso "dados não salvos".
      if (quadro++ < QUADROS_MAX) id = requestAnimationFrame(tentar);
    };
    id = requestAnimationFrame(tentar);
    return () => cancelAnimationFrame(id);
  }, [pedido, containerRef]);
}
