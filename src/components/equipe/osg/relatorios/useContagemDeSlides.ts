import { useMemo } from 'react';
import { useRelatorioDP, type DPBem } from '@/hooks/useRelatorioDP';
import { useRelatorioSocietario } from '@/hooks/useRelatorioSocietario';

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
 *  - societária: dois blocos fixos — organograma (slide3) e quadro (slide4). O
 *    quadro empilha as empresas em duas colunas e só abre página nova quando a
 *    altura estoura, cálculo que vive em EMU dentro da função. Reproduzi-lo aqui
 *    seria copiar a diagramação do .pptx para a tela; então o número é o piso, e
 *    quem lê "2" pode receber 3 se houver muita empresa.
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

    return {
      patrimonial: destinos.size,
      societaria: empresas.length > 0 ? 2 : 0,
      carregando: carregandoBens || carregandoEmpresas,
    };
  }, [bens, empresas, carregandoBens, carregandoEmpresas]);
}
