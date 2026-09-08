import * as React from "react";

/**
 * Abaixo desta largura a barra lateral deixa de ser coluna e passa a ser
 * gaveta. Exportada porque `useSidebarRecolhimentoController` decide o estado
 * inicial da barra por ela — duas cópias do número dariam telas em que a barra
 * nasce aberta e o layout já a trata como gaveta.
 */
export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
