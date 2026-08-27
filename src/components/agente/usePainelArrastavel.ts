import { useCallback, useEffect, useRef, useState } from 'react';

/** Margem mínima entre o painel e a borda da janela, em px. */
const MARGEM = 8;

interface Posicao {
  x: number;
  y: number;
}

/**
 * Arraste do painel do Agente PSA pelo cabeçalho.
 *
 * ── POR QUE `left/top` E NÃO `transform` ──────────────────────────────
 * O painel é um `motion.div`: o framer-motion escreve `transform` inline nele
 * durante a animação de entrada e saída. Duas fontes na MESMA propriedade
 * brigam — o arraste ficaria travado ou piscaria a cada re-render. Então o
 * arraste zera o `right/bottom` do CSS e passa a escrever `left/top`.
 *
 * ── POR QUE A POSIÇÃO SALVA É SEMPRE RECORTADA ────────────────────────
 * A posição vai para o `localStorage`, mas nunca é usada crua: monitor de
 * 2560px e notebook de 1366px têm áreas úteis diferentes, e uma posição salva
 * no monitor deixaria o painel FORA da tela no notebook — com o cabeçalho
 * inalcançável, ou seja, sem como trazê-lo de volta. Por isso `recortar()`
 * roda na leitura, a cada arraste e a cada `resize` da janela.
 *
 * O tamanho do painel entra no cálculo pelo `rect` do próprio elemento, e não
 * por constante: ele muda com o breakpoint e com o botão de expandir.
 */
export function usePainelArrastavel(chave: string, ativo: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<Posicao | null>(null);
  const [arrastando, setArrastando] = useState(false);
  /** Deslocamento do ponteiro dentro do cabeçalho, no início do arraste. */
  const pega = useRef<Posicao>({ x: 0, y: 0 });

  const recortar = useCallback((p: Posicao): Posicao => {
    const el = ref.current;
    const largura = el?.offsetWidth ?? 420;
    const altura = el?.offsetHeight ?? 640;
    return {
      x: Math.min(Math.max(MARGEM, p.x), Math.max(MARGEM, window.innerWidth - largura - MARGEM)),
      y: Math.min(Math.max(MARGEM, p.y), Math.max(MARGEM, window.innerHeight - altura - MARGEM)),
    };
  }, []);

  // Lê a posição salva quando o painel abre. Só então: com o painel fechado o
  // `rect` não existe e o recorte usaria o tamanho de palpite.
  useEffect(() => {
    if (!ativo) return;
    try {
      const cru = localStorage.getItem(chave);
      if (!cru) return;
      const salvo = JSON.parse(cru) as Posicao;
      if (typeof salvo?.x !== 'number' || typeof salvo?.y !== 'number') return;
      // No frame seguinte: o elemento precisa estar medido para o recorte valer.
      requestAnimationFrame(() => setPos(recortar(salvo)));
    } catch {
      // localStorage indisponível ou JSON corrompido: o painel abre na âncora
      // padrão do CSS. Posição de janela não é dado que justifique alarme.
    }
  }, [ativo, chave, recortar]);

  // Janela redimensionada (ou monitor trocado) traz o painel de volta para dentro.
  useEffect(() => {
    if (!ativo || !pos) return;
    const aoRedimensionar = () => setPos((p) => (p ? recortar(p) : p));
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, [ativo, pos, recortar]);

  const aoPressionar = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // Clique que nasce em botão é clique de botão, não arraste: sem isto,
    // "expandir" e "fechar" arrastariam o painel um pixel e engoliriam o clique.
    if ((e.target as HTMLElement).closest('button')) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pega.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    setPos({ x: r.left, y: r.top });
    setArrastando(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const aoMover = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!arrastando) return;
    setPos(recortar({ x: e.clientX - pega.current.x, y: e.clientY - pega.current.y }));
  }, [arrastando, recortar]);

  const aoSoltar = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!arrastando) return;
    setArrastando(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (pos) {
      try {
        localStorage.setItem(chave, JSON.stringify(pos));
      } catch { /* modo privado: a posição vale só para esta sessão. */ }
    }
  }, [arrastando, chave, pos]);

  /** Volta para a âncora do CSS (canto inferior direito). */
  const reancorar = useCallback(() => {
    setPos(null);
    try {
      localStorage.removeItem(chave);
    } catch { /* nada a limpar */ }
  }, [chave]);

  return {
    ref,
    arrastando,
    /** `{}` enquanto ninguém arrastou: quem posiciona é o CSS. */
    estilo: pos ? { left: pos.x, top: pos.y, right: 'auto' as const, bottom: 'auto' as const } : undefined,
    /** Vai no cabeçalho, que é a alça. */
    handlers: {
      onPointerDown: aoPressionar,
      onPointerMove: aoMover,
      onPointerUp: aoSoltar,
      onPointerCancel: aoSoltar,
    },
    deslocado: pos !== null,
    reancorar,
  };
}
