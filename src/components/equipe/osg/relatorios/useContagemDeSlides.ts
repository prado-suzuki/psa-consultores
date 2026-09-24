import { useMemo } from 'react';
import { useRelatorioDP, type DPBem } from '@/hooks/useRelatorioDP';
import { useRelatorioSocietario } from '@/hooks/useRelatorioSocietario';
/*
 * O ÚNICO import que a tela faz de dentro de uma Edge Function, e é de propósito.
 *
 * `paginacao.ts` é a aritmética que o `gerar-apresentacao` usa para paginar o
 * quadro. Uma cópia aqui divergiria no primeiro ajuste do molde — e divergiria em
 * silêncio, que é justamente como esta contagem passou a mentir. O módulo é conta
 * pura, sem import nenhum, para poder entrar no bundle do Vite.
 */
import {
  paginasDeOutrosBens, paginasDoQuadro,
} from '../../../../../supabase/functions/_shared/apresentacao-osg/paginacao.ts';

/**
 * Quantos slides de conteúdo cada deck vai ter, pelas regras da `gerar-apresentacao` (capa e divisor não
 * contam): o patrimonial por sociedade com imóvel mais outros bens; a societária pela `paginasDoQuadro`.
 */
export interface ContagemDeSlides {
  patrimonial: number;
  societaria: number;
  carregando: boolean;
}

/**
 * Os slides que a `gerar-slides-tributarios` entrega com a revisão escolhida.
 *
 * **Passou de 5 para 6 em 21/09/2026**, com o padrão visual novo. Os cinco
 * antigos eram DRE, farol, transferência, resumo e comentários; o capítulo novo
 * tem Premissas, Cenários avaliados, Diferenças nos modelos, Quadro comparativo
 * da carga, Transferência e Resumo. Sumiram o slide de comentários por tributo e
 * o Farol como estava; nasceram três editoriais.
 *
 * Diferente dos outros dois decks, o número não varia com o cadastro: o molde
 * tributário é fixo e o que muda é o conteúdo.
 *
 * A régua é a mesma das outras linhas: conta SLIDE DE CONTEÚDO, o que vem dos
 * dados. Capa e divisor não entram em nenhum dos três, e por isso a capa do
 * capítulo, que é o slide 1 do molde, fica fora da conta.
 */
export const SLIDES_DO_TRIBUTARIO = 6;

export function useContagemDeSlides(clienteId: string | null): ContagemDeSlides {
  const { data: bens = [], isLoading: carregandoBens } = useRelatorioDP(clienteId);
  const { data: empresas = [], isLoading: carregandoEmpresas } = useRelatorioSocietario(clienteId);

  return useMemo(() => {
    const participa = (b: DPBem) => b.participa_estruturacao !== false;
    /* Imóvel vai para a página da sociedade e o resto para a de outros bens, como o `ehImovel` do gerador. */
    const imovel = (b: DPBem) => b.tipo_bem === 'IR' || b.tipo_bem === 'IB';
    const naEstrutura = bens.filter(participa);
    const destinos = new Set(
      naEstrutura.filter(imovel).map((b) => b.empresa_destino_pessoa_id ?? '__sem_destino__'),
    );
    const outrosBens = naEstrutura.filter((b) => !imovel(b)).length;

    /*
     * Zero empresa continua devolvendo zero, e não 1 pelo organograma.
     *
     * O gerador desenha o organograma mesmo sem quadro, então o deck teria um
     * slide. Mas esta contagem existe para responder "tem o que gerar?", e a tela
     * usa o zero para dizer que não tem — mudar isso passaria a oferecer geração
     * onde hoje ela avisa, e é outra decisão, de produto.
     */
    const socios = empresas.map((e) => e.socios.length);

    return {
      patrimonial: destinos.size + paginasDeOutrosBens(outrosBens),
      societaria: empresas.length > 0 ? 1 + paginasDoQuadro(socios) : 0,
      carregando: carregandoBens || carregandoEmpresas,
    };
  }, [bens, empresas, carregandoBens, carregandoEmpresas]);
}
