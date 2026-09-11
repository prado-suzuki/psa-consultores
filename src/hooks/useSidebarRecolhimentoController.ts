import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';

import { MOBILE_BREAKPOINT, telaEstreita } from './use-mobile';

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
 *
 * ## Tela estreita: a barra troca de papel
 *
 * Abaixo de `MOBILE_BREAKPOINT` a barra não é coluna, é gaveta — e é ESTE hook
 * que decide, porque é o único ponto por onde as nove áreas passam. Duas coisas
 * saem daqui, e as duas vinham quebradas no celular:
 *
 * - a barra nasce FECHADA. Nascia aberta, e como quem monta o layout é a página,
 *   cada navegação remontava o layout e devolvia uma coluna de 256px por cima de
 *   um aparelho de 390px, sobrando ~130px para o conteúdo (texto quebrando uma
 *   letra por linha). Da tela parecia que o menu não fechava; ele fechava e
 *   voltava a abrir;
 * - `emGaveta` sai no retorno, para o layout saber que `collapsed` ali quer dizer
 *   "gaveta fechada" e não "trilho de 80px".
 *
 * A geometria (sair do fluxo, deslizar, o fundo escuro) é do layout, com
 * `classesGavetaBarra()` de `@/lib/sidebarMedidas` e `<SidebarFundoGaveta />`.
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
  /**
   * A barra está no papel de GAVETA (tela estreita), não de coluna.
   *
   * O layout precisa disso porque `collapsed` passa a querer dizer duas coisas
   * diferentes: no desktop é "vira trilho de 80px", no celular é "gaveta
   * fechada". A gaveta ABERTA mostra os rótulos inteiros — trilho de ícones num
   * celular é o pior dos dois mundos, ocupa espaço e não diz o nome de nada. Daí
   * o padrão nos layouts: `const trilho = collapsed && !emGaveta`.
   */
  emGaveta: boolean;
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
  const [emGaveta, definirEmGaveta] = useState(telaEstreita);
  // Em tela estreita a barra NASCE fechada, e a preferência gravada não vota:
  // ela foi dada no desktop, sobre um trilho de 80px que no celular não existe.
  const [collapsed, definirCollapsed] = useState(
    () => telaEstreita() || lerPreferencia(persistKey),
  );

  // Respeito ao usuário: uma vez que ELE mexeu na barra nesta tela, nada mais
  // recolhe por cima. O timer de 450ms consulta este ref antes de disparar, e
  // não só na montagem — expandir durante a janela precisa valer.
  const escolhaManual = useRef(false);
  // Só devolvemos a barra aberta ao sair da tela larga se quem a recolheu
  // fomos nós; se o usuário a recolheu, a escolha dele continua valendo.
  const recolhidoAutomaticamente = useRef(false);
  // Idem para o fechamento por tela estreita: ao voltar para o desktop a barra
  // reabre, mas sem apagar uma escolha que o usuário tenha feito no caminho.
  const fechadoPorTelaEstreita = useRef(telaEstreita());

  const setCollapsed = useCallback<SidebarRecolhimento['setCollapsed']>((valor) => {
    escolhaManual.current = true;
    recolhidoAutomaticamente.current = false;
    definirCollapsed((atual) => (typeof valor === 'function' ? valor(atual) : valor));
  }, []);

  useEffect(() => {
    if (!escolhaManual.current) return;
    // Abrir e fechar a gaveta no celular é navegação, não preferência de barra:
    // gravar isso deixaria a barra do desktop recolhida na próxima sessão.
    if (emGaveta) return;
    gravarPreferencia(persistKey, collapsed);
  }, [collapsed, emGaveta, persistKey]);

  // Atravessar o breakpoint (girar o aparelho, redimensionar a janela) troca o
  // PAPEL da barra, então troca o estado dela: virando gaveta, fecha; voltando a
  // ser coluna, reabre — mas só se fomos nós que a fechamos.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const consulta = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    // Nem toda MediaQueryList tem `addEventListener`: Safari antigo só tem o
    // `addListener` depreciado, e o teste que dubla `matchMedia` para o
    // `prefers-reduced-motion` devolve só `{ matches }`. Sem esta guarda a
    // barra derrubava o layout inteiro em vez de simplesmente não reagir ao
    // resize — que é o pior que pode acontecer aqui.
    if (typeof consulta.addEventListener !== 'function') return;
    const aoMudar = () => {
      const estreita = consulta.matches;
      definirEmGaveta(estreita);
      if (estreita) {
        fechadoPorTelaEstreita.current = true;
        definirCollapsed(true);
        return;
      }
      if (!fechadoPorTelaEstreita.current) return;
      fechadoPorTelaEstreita.current = false;
      escolhaManual.current = false;
      definirCollapsed(lerPreferencia(persistKey));
    };
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, [persistKey]);

  useEffect(() => {
    // Nada disso vale para a gaveta. O recolhimento automático existe para dar
    // largura a uma tela de trabalho largo; no celular a barra já está fora do
    // caminho, e o ramo de baixo a REABRIRIA ao sair da tela larga.
    if (emGaveta) return;

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
  }, [emGaveta, pedeRecolhimento]);

  return { collapsed, setCollapsed, emGaveta };
}

/**
 * Fecha a gaveta a cada navegação. Uma linha no layout, e só vale no celular.
 *
 * Na maior parte do sistema quem monta o layout é a página, então trocar de rota
 * já remonta o layout e a gaveta volta ao estado inicial (fechada). Isto existe
 * pelos dois casos em que aquilo não acontece: o layout que sobrevive à troca de
 * rota porque a página entra por `<Outlet />` (Mapeamento), e o toque num item
 * que aponta para a rota em que já se está. Nos dois, sem isto, a gaveta fica
 * aberta cobrindo a tela que o usuário acabou de pedir.
 *
 * Depende de `useLocation`, e é por isso que mora numa função separada de
 * `useSidebarRecolhimentoController`: aquele hook é usado em teste sem Router.
 */
export function useFecharGavetaAoNavegar({
  emGaveta,
  setCollapsed,
}: SidebarRecolhimento): void {
  const { pathname } = useLocation();

  useEffect(() => {
    // No desktop a barra aberta é o estado normal da tela; fechá-la a cada
    // navegação seria o layout desfazendo a escolha do usuário.
    if (!emGaveta) return;
    setCollapsed(true);
  }, [emGaveta, pathname, setCollapsed]);
}
