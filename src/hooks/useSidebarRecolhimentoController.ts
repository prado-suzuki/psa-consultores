import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Recolhimento automático da barra lateral em telas de trabalho largo.
 *
 * A barra ENTRA ABERTA e recolhe ~450ms depois, na frente do usuário: é o
 * movimento que comunica que o menu foi recolhido — nascer estreita parecia
 * menu quebrado. Foi assim que o primeiro caso (o cadastro por documento do
 * onboarding OSG) foi escrito e aprovado; este arquivo existe para que o
 * comportamento não precise ser reescrito à mão em cada layout.
 *
 * São duas metades que se encontram por um registro global minúsculo:
 *
 * - a TELA declara com `useTelaDeTrabalhoLargo()` — uma linha, no arquivo dela;
 * - o LAYOUT troca o `useState(collapsed)` por `useSidebarRecolhimentoController()`.
 *
 * Por que registro global e não React Context: tela e layout não têm relação de
 * parentesco estável. Na maior parte do sistema é a PÁGINA que monta o layout
 * (`<OsgLayout>…</OsgLayout>`), logo ela é o pai; no mapeamento o layout é o pai
 * e a página entra por `<Outlet />`. Um contexto teria que ser provido acima dos
 * dois (App.tsx) e ainda assim quebraria todo teste de página que renderiza um
 * layout sem provider. O registro não depende da árvore nem de provider algum.
 *
 * Por que não um cadastro central de rotas: funcionaria, mas obrigaria quem cria
 * a tela a lembrar de um segundo arquivo e a mantê-lo em dia quando a rota muda
 * de caminho — exatamente o trabalho manual que se pediu para eliminar.
 * Declarado na própria tela, não tem como ficar desatualizado.
 *
 * Por que não detecção automática (largura do conteúdo, nº de colunas): decidir
 * pelo usuário a partir de um palpite erraria em telas de fronteira e daria um
 * comportamento que ninguém consegue prever lendo o código da página.
 */

/** Tempo aberto antes de recolher. É o movimento que explica o recolhimento. */
export const ATRASO_RECOLHIMENTO_MS = 450;

type Ouvinte = () => void;

// Quantas telas largas estão montadas. É contador, não booleano, porque a troca
// entre duas telas largas monta a nova antes (ou junto) de desmontar a antiga.
let telasLargasMontadas = 0;
const ouvintes = new Set<Ouvinte>();

const lerPedido = () => telasLargasMontadas > 0;

function assinarPedido(ouvinte: Ouvinte) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

/**
 * Declara que ESTA tela é de trabalho largo e quer a barra lateral recolhida.
 *
 * Uma linha no componente da página, e nada mais — nenhum layout precisa saber
 * que a tela existe:
 *
 * ```tsx
 * export default function MinhaTelaLarga() {
 *   useTelaDeTrabalhoLargo();
 *   return <OsgLayout title="…">…</OsgLayout>;
 * }
 * ```
 *
 * `ativo` permite condicionar ao estado da tela (ex.: só na aba de edição).
 */
export function useTelaDeTrabalhoLargo(ativo = true): void {
  useEffect(() => {
    if (!ativo) return;
    telasLargasMontadas += 1;
    notificar();
    return () => {
      telasLargasMontadas -= 1;
      notificar();
    };
  }, [ativo]);
}

function prefereMenosMovimento(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function lerPreferencia(chave: string | undefined): boolean {
  if (!chave) return false;
  try {
    const bruto = localStorage.getItem(chave);
    // '1'/'0' é o formato legado do mapeamento, 'true'/'false' o do Board —
    // aceitar os dois evita zerar a preferência de quem já usava o sistema.
    return bruto === 'true' || bruto === '1';
  } catch {
    return false;
  }
}

function gravarPreferencia(chave: string | undefined, valor: boolean): void {
  if (!chave) return;
  try {
    localStorage.setItem(chave, String(valor));
  } catch {
    /* cota cheia ou navegação privada: a barra funciona, só não lembra */
  }
}

export interface OpcoesSidebarRecolhimento {
  /**
   * Chave de `localStorage` para lembrar a barra recolhida entre sessões.
   * Só a escolha MANUAL é gravada: o recolhimento automático é uma decisão
   * daquela tela, não uma preferência do usuário — persisti-lo deixaria a barra
   * estreita para sempre em todas as outras telas da área.
   */
  persistKey?: string;
}

export interface SidebarRecolhimento {
  collapsed: boolean;
  /** Setter do usuário: marca escolha manual, cancela o recolhimento automático e persiste. */
  setCollapsed: (valor: boolean | ((atual: boolean) => boolean)) => void;
}

/**
 * Estado da barra lateral de um layout, já com o recolhimento automático.
 *
 * Substitui o `const [collapsed, setCollapsed] = useState(false)` de cada
 * layout. Sem nenhuma tela larga montada o comportamento é idêntico ao de antes.
 */
export function useSidebarRecolhimentoController(
  opcoes: OpcoesSidebarRecolhimento = {},
): SidebarRecolhimento {
  const { persistKey } = opcoes;
  const pedeRecolhimento = useSyncExternalStore(assinarPedido, lerPedido, lerPedido);
  const [collapsed, definirCollapsed] = useState(() => lerPreferencia(persistKey));

  // Respeito ao usuário: uma vez que ELE mexeu na barra nesta tela, nada mais
  // recolhe por cima. O timer de 450ms consulta este ref antes de disparar, e
  // não só na montagem — expandir durante a janela precisa valer.
  const escolhaManual = useRef(false);
  // Só devolvemos a barra aberta ao sair da tela larga se quem a recolheu
  // fomos nós; se o usuário a recolheu, a escolha dele continua valendo.
  const recolhidoAutomaticamente = useRef(false);

  const setCollapsed = useCallback<SidebarRecolhimento['setCollapsed']>((valor) => {
    escolhaManual.current = true;
    recolhidoAutomaticamente.current = false;
    definirCollapsed((atual) => (typeof valor === 'function' ? valor(atual) : valor));
  }, []);

  useEffect(() => {
    if (!escolhaManual.current) return;
    gravarPreferencia(persistKey, collapsed);
  }, [collapsed, persistKey]);

  useEffect(() => {
    if (!pedeRecolhimento) {
      if (recolhidoAutomaticamente.current) {
        recolhidoAutomaticamente.current = false;
        definirCollapsed(false);
      }
      return;
    }

    // Entrou numa tela larga: a escolha feita na tela anterior era sobre aquela
    // tela, não sobre esta. (Só faz diferença em layout que sobrevive à troca de
    // rota, como o do mapeamento; os demais remontam a cada página.)
    escolhaManual.current = false;

    if (prefereMenosMovimento()) {
      // Sem animação, esperar 450ms para saltar seria o pior dos mundos: o
      // pulo continua acontecendo e não há movimento que o explique. Quem pediu
      // menos movimento recebe a tela já assentada, com o espaço que ela pede.
      recolhidoAutomaticamente.current = true;
      definirCollapsed(true);
      return;
    }

    const id = setTimeout(() => {
      if (escolhaManual.current) return;
      recolhidoAutomaticamente.current = true;
      definirCollapsed(true);
    }, ATRASO_RECOLHIMENTO_MS);
    return () => clearTimeout(id);
  }, [pedeRecolhimento]);

  return { collapsed, setCollapsed };
}
