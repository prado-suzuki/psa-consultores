import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { CLASSES_DE_TEMA, resolverTemaDaRota } from '@/lib/areaTheme';

/**
 * Mantém as classes de tema do `<html>` em dia com a rota.
 *
 * Fica em volta de `<Routes>`, no `App.tsx`, e é o ÚNICO lugar do sistema que
 * escreve classe de tema. Antes cada layout fazia isso por conta própria, com
 * dois defeitos: layout que não fazia deixava a tela sem tema, e o layout nasce
 * DENTRO dos gates de acesso — enquanto `LiderRoute` devolve `null` esperando o
 * papel do usuário, não há layout e não havia classe. Aqui em cima o tema já
 * está aplicado antes de qualquer gate decidir o que renderizar.
 *
 * No `<html>` e não numa `<div>` porque modal, select e tooltip nascem em
 * portal, pendurados no `<body>` — fora da árvore de qualquer layout.
 *
 * `useLayoutEffect` e não `useEffect`: a troca precisa acontecer ANTES da
 * pintura, senão a primeira rota de cada navegação pisca com a paleta anterior.
 * Não há SSR neste projeto (Vite puro), então o aviso de hidratação não se
 * aplica.
 */
export function AreaThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const desejadas = resolverTemaDaRota(pathname);
    const html = document.documentElement;
    // Remove só o que sobrou da rota anterior; `classList` não é reescrita
    // inteira para não derrubar classe de terceiro (ex.: `dark`).
    html.classList.remove(...CLASSES_DE_TEMA.filter((c) => !desejadas.includes(c)));
    html.classList.add(...desejadas);
  }, [pathname]);

  return <>{children}</>;
}
