import { useEffect, useRef, useState } from 'react';

// Os dois utilitários de movimento do Quadro Societário. Ficam num arquivo só de
// funções para o fast refresh não reclamar de módulo misto.

/** `prefers-reduced-motion: reduce`, lido na hora (não é estado reativo). */
export function prefereMenosMovimento(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

/**
 * Liga `true` um quadro depois da montagem, para uma transição CSS ter de onde
 * sair. Com `prefers-reduced-motion` já nasce ligado: o elemento aparece pronto
 * em vez de aparecer e então se mover.
 */
export function useEntrouEmCena(): boolean {
  const [entrou, setEntrou] = useState(() => prefereMenosMovimento());

  useEffect(() => {
    if (entrou) return;
    const id = requestAnimationFrame(() => setEntrou(true));
    return () => cancelAnimationFrame(id);
    // Só na montagem: religar a cada render reiniciaria a animação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return entrou;
}

/**
 * Conta de 0 (ou do valor anterior) até o alvo, com desaceleração. Os números do
 * resumo são grandes — capital social na casa dos milhões — e a contagem dá a
 * eles o mesmo tempo de entrada que a rosca e as linhas da tabela têm.
 *
 * Devolve o alvo imediatamente quando ele é nulo, quando muda durante uma
 * contagem em curso (o salto é preferível a acelerar no meio) ou com
 * `prefers-reduced-motion`.
 */
export function useContagemAnimada(alvo: number | null, duracao = 900): number | null {
  const [valor, setValor] = useState<number | null>(alvo);
  const anterior = useRef<number>(0);

  useEffect(() => {
    if (alvo == null || prefereMenosMovimento()) {
      setValor(alvo);
      anterior.current = alvo ?? 0;
      return;
    }
    const partida = anterior.current;
    const inicio = performance.now();
    let id = 0;

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      // ease-out-expo: quase tudo no começo, assentando no fim.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValor(partida + (alvo - partida) * eased);
      if (t < 1) id = requestAnimationFrame(passo);
      else anterior.current = alvo;
    };

    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo, duracao]);

  return valor;
}
