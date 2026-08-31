// Cor de acento do cadastro de cliente, conforme a área que abriu o modal.
//
// O modal é o mesmo para Tax e OSG, mas as duas áreas têm paleta própria no
// tema. Com o acento fixo em teal, a tela da OSG saía com a cor da Tax, que foi
// o que a reforma da OS acabou espalhando.
//
// Vai por contexto e não por propriedade: os elementos que precisam do acento
// estão a três ou quatro níveis de distância (seção, lista, rateio, diálogos), e
// atravessar tudo isso com prop tornaria cada componente refém do assunto.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AreaKey } from '@/config/areaCategories';

export interface AcentoArea {
  /** Número da seção e rótulos de destaque. */
  texto: string;
  /** Barra vertical à esquerda das seções. */
  barra: string;
  /** Botão principal (Confirmar, Salvar). */
  botao: string;
  /**
   * Botão de ação dentro de uma seção (Produtos, Centro de custo, Pronto).
   *
   * Existe porque `variant="outline"` deixa esses três quase invisíveis: fundo
   * transparente sobre a folha clara do modal, e só uma borda cinza. Preenchido
   * com o tom claro do acento eles aparecem, e continuam sem competir com o botão
   * principal, que é o acento sólido.
   */
  botaoSuave: string;
  /** Linha selecionada da lista mestre. */
  selecionado: string;
  /** Preenchimento da barra de rateio e estados "fechou certo". */
  positivoFundo: string;
  positivoTexto: string;
  positivoBarra: string;
  /**
   * Fundo do modal: a folha sobre a qual tudo é desenhado.
   *
   * A OSG Work não usa branco-puro, e sim um branco quente (`--osg-canvas`).
   * Vem por classe explícita, e não pelo token do tema, porque o modal é
   * renderizado em portal e nem sempre nasce dentro do elemento com `osg-theme`.
   */
  fundoModal: string;
}

const TEAL: AcentoArea = {
  texto: 'text-teal-600',
  barra: 'border-l-teal-600/70',
  botao: 'bg-teal-600 hover:bg-teal-700 text-white',
  botaoSuave: 'border-teal-600/40 bg-accent/5 text-teal-700 hover:border-teal-600 hover:bg-accent/10 hover:text-teal-800',
  selecionado: 'bg-accent/5 border-l-teal-600',
  positivoFundo: 'bg-accent/5',
  positivoTexto: 'text-teal-700',
  positivoBarra: 'bg-teal-600',
  fundoModal: 'bg-white',
};

/**
 * O verde da OSG é o `--osg-moss` (#125837), e não a escala `osg-500..700`, que
 * é taupe/marrom. Foi o engano da primeira versão: trocar teal por `osg-600`
 * não mudava nada visível porque os dois são escuros e dessaturados.
 */
const OSG: AcentoArea = {
  texto: 'text-osg-moss',
  barra: 'border-l-osg-moss/70',
  botao: 'bg-osg-moss hover:bg-osg-moss/90 text-white',
  botaoSuave: 'border-osg-moss/40 bg-osg-50 text-osg-moss hover:border-osg-moss hover:bg-osg-100 hover:text-osg-moss',
  selecionado: 'bg-osg-50 border-l-osg-moss',
  positivoFundo: 'bg-osg-50',
  positivoTexto: 'text-osg-moss',
  positivoBarra: 'bg-osg-moss',
  fundoModal: 'bg-osg-canvas',
};

/** Acento de uma área, para quem não está sob o provedor (o próprio modal). */
export function acentoDaArea(area?: AreaKey): AcentoArea {
  return area === 'osg' ? OSG : TEAL;
}

const AcentoContext = createContext<AcentoArea>(TEAL);

export function AcentoAreaProvider({ area, children }: { area?: AreaKey; children: ReactNode }) {
  const valor = useMemo(() => acentoDaArea(area), [area]);
  return <AcentoContext.Provider value={valor}>{children}</AcentoContext.Provider>;
}

/** Classes de acento da área em curso. Fora do provedor, cai no teal. */
export function useAcentoArea(): AcentoArea {
  return useContext(AcentoContext);
}
