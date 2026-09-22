import { useCallback, useEffect, useRef } from 'react';

/**
 * "Visto" é o que ficou na tela, não o que o mouse tocou.
 *
 * Hover foi descartado: o cursor atravessa a tela a caminho da caixa de
 * escrever, não existe no toque, e é sobre uma fala enquanto o carimbo é do
 * cliente. O elemento se inscreve pelo `registrar` e diz o que carimbar pelo
 * `data-leitura`, uma chave opaca para este hook.
 */

/** Quanto do bloco precisa estar à vista. */
const FRACAO_VISIVEL = 0.6;

/** Quanto tempo ele precisa ficar lá. Abaixo disso é rolagem, não leitura. */
const PERMANENCIA_MS = 1000;

/**
 * Tem degrau baixo de propósito: bloco mais alto que a janela nunca alcança 60%
 * de si mesmo, e sem ele a conversa comprida jamais seria dada por lida.
 */
const DEGRAUS = [0, 0.1, 0.25, 0.5, 0.6, 0.75, 1];

export function useLeituraPorVisibilidade({
  ativo,
  aoLer,
}: {
  /** Desligado, nada é observado nem carimbado (busca e período ligados). */
  ativo: boolean;
  aoLer: (chave: string) => void;
}) {
  const aoLerRef = useRef(aoLer);
  aoLerRef.current = aoLer;

  const observador = useRef<IntersectionObserver | null>(null);
  /** Quem já está inscrito — o observador nasce depois dos blocos montarem. */
  const inscritos = useRef(new Set<Element>());
  /** Relógio de permanência por elemento. */
  const relogios = useRef(new Map<Element, number>());
  /** Chaves já carimbadas nesta sessão, para não repetir a chamada. */
  const lidos = useRef(new Set<string>());

  useEffect(() => {
    const cancelarTudo = () => {
      for (const relogio of relogios.current.values()) window.clearTimeout(relogio);
      relogios.current.clear();
    };

    if (!ativo || typeof IntersectionObserver === 'undefined') {
      cancelarTudo();
      return;
    }

    const observe = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const alvo = entrada.target as HTMLElement;
          const chave = alvo.dataset.leitura;
          if (!chave) continue;

          // Bloco mais alto que a janela: o que vale é quanto da JANELA ele
          // ocupa, e não quanto dele está à vista.
          const alturaDaJanela = entrada.rootBounds?.height ?? 0;
          const bastante =
            entrada.intersectionRatio >= FRACAO_VISIVEL ||
            (alturaDaJanela > 0 &&
              entrada.intersectionRect.height >= alturaDaJanela * FRACAO_VISIVEL);

          if (entrada.isIntersecting && bastante) {
            if (relogios.current.has(alvo) || lidos.current.has(chave)) continue;
            const relogio = window.setTimeout(() => {
              relogios.current.delete(alvo);
              if (lidos.current.has(chave)) return;
              lidos.current.add(chave);
              aoLerRef.current(chave);
            }, PERMANENCIA_MS);
            relogios.current.set(alvo, relogio);
            continue;
          }

          const relogio = relogios.current.get(alvo);
          if (relogio !== undefined) {
            window.clearTimeout(relogio);
            relogios.current.delete(alvo);
          }
        }
      },
      { threshold: DEGRAUS },
    );

    observador.current = observe;
    for (const elemento of inscritos.current) observe.observe(elemento);

    return () => {
      observe.disconnect();
      observador.current = null;
      cancelarTudo();
    };
  }, [ativo]);

  /**
   * Guarda a inscrição mesmo sem observador de pé: os blocos montam antes do
   * efeito rodar, e a primeira tela de conversa ficaria de fora.
   */
  const registrar = useCallback((elemento: HTMLElement | null) => {
    if (elemento) {
      inscritos.current.add(elemento);
      observador.current?.observe(elemento);
      return;
    }
    // Desmontou: sai da lista e leva o relógio junto.
    for (const inscrito of inscritos.current) {
      if (inscrito.isConnected) continue;
      inscritos.current.delete(inscrito);
      observador.current?.unobserve(inscrito);
      const relogio = relogios.current.get(inscrito);
      if (relogio !== undefined) {
        window.clearTimeout(relogio);
        relogios.current.delete(inscrito);
      }
    }
  }, []);

  return registrar;
}
