import * as React from "react";

/**
 * Abaixo desta largura a barra lateral deixa de ser coluna e passa a ser
 * gaveta. Exportada porque `useSidebarRecolhimentoController` decide o estado
 * inicial da barra por ela — duas cópias do número dariam telas em que a barra
 * nasce aberta e o layout já a trata como gaveta.
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * A tela é estreita AGORA, de forma síncrona.
 *
 * Existe ao lado do `useIsMobile` porque aquele só sabe a largura depois do
 * primeiro efeito, e há decisões que precisam da resposta no estado INICIAL:
 * a barra lateral nasce fechada ou aberta, o painel de tarefas abre numa visão
 * que cabe ou numa que não cabe. Nos dois casos o primeiro quadro é o que o
 * usuário vê a cada navegação, então "descobrir depois" é tarde.
 */
export function telaEstreita(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  // Nasce com a resposta CERTA, e não `undefined`. O valor inicial virava
  // `false` no primeiro render, então quem decide layout por ele desenhava um
  // quadro de desktop antes de corrigir — e num celular esse quadro pisca. O
  // efeito abaixo continua sendo quem acompanha o resize.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(telaEstreita);

  React.useEffect(() => {
    // Nem todo ambiente tem `matchMedia`: o jsdom não implementa, e Safari
    // antigo devolve MediaQueryList sem `addEventListener`. Sem esta guarda o
    // hook DERRUBA quem o usa em vez de simplesmente não acompanhar o resize —
    // e agora ele decide layout no Gantt, então derrubava a tela da sprint em
    // teste. Mesma guarda que `useSidebarRecolhimentoController` já tem.
    const mql = window.matchMedia?.(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(telaEstreita());
    if (typeof mql?.addEventListener !== "function") return;

    const onChange = () => {
      setIsMobile(telaEstreita());
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
