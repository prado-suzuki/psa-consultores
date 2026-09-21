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
import { paginasDoQuadro } from '../../../../../supabase/functions/_shared/apresentacao-osg/paginacao.ts';

/**
 * Quantos slides cada deck vai ter, sem desenhar nenhum deles.
 *
 * A Biblioteca deixou de mostrar as tabelas: ela existe para GERAR, e quem abre
 * quer marcar e clicar, não ler. Mas gerar às cegas é pior que ler demais — deck
 * vazio só se descobre abrindo o .pptx. A contagem é o mínimo que responde
 * "tem o que gerar?" antes do clique, e é sobre o DECK, não sobre o cliente.
 *
 * AS REGRAS SÃO AS DA `gerar-apresentacao`, não as da tela:
 *
 *  - patrimonial: um slide por sociedade de destino, e a função descarta
 *    `participa_estruturacao = false` antes de agrupar. Bem fora da estruturação
 *    não vira slide e por isso não conta aqui.
 *  - societária: organograma (slide3), que sai sempre, mais as páginas do quadro
 *    (slide4, duplicado enquanto sobra empresa). O quadro empilha as empresas em
 *    duas colunas e abre página nova quando a altura estoura — e desde 21/09/2026
 *    PARTE a empresa que não couber, então o número de páginas não tem teto.
 *
 * ## Por que esta linha deixou de ser um chute — 21/09/2026
 *
 * Ela devolvia `2` fixo para a societária, com o comentário de que era "o piso, e
 * quem lê 2 pode receber 3 se houver muita empresa". Medido: um cliente com 41
 * sócios recebia **7**. Não era piso com folga, era promessa errada por 5 slides,
 * e quem lia marcava a peça sem saber o que vinha.
 *
 * Agora a conta vem da `paginasDoQuadro`, o mesmo módulo que o gerador usa para
 * paginar. Custa um import atravessando para `supabase/functions` e paga com a
 * impossibilidade de divergir: se o molde mudar de altura, os dois mudam juntos.
 *
 * Continua valendo a régua das outras linhas: conta SLIDE DE CONTEÚDO. Capa e
 * divisor não entram em nenhum dos três decks.
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
    const destinos = new Set(
      bens.filter(participa).map((b) => b.empresa_destino_pessoa_id ?? '__sem_destino__'),
    );

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
      patrimonial: destinos.size,
      societaria: empresas.length > 0 ? 1 + paginasDoQuadro(socios) : 0,
      carregando: carregandoBens || carregandoEmpresas,
    };
  }, [bens, empresas, carregandoBens, carregandoEmpresas]);
}
