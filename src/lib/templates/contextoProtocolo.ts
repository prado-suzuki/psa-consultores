import type { Campos, ItemLista } from './mapeadores';
import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

/**
 * O Protocolo de Remuneração para o motor documental (GOV-F).
 *
 * Mesmo papel que `contextoGovernanca` faz para a Matriz de Alçadas: pega os
 * dados do cadastro e devolve os campos e as listas que os blocos do documento
 * consomem.
 *
 * **Entra a grade já montada, e não as linhas cruas.** O `montarGrade` de
 * `lib/protocoloRemuneracao` já agrupa por tema, ordena e deixa a grade
 * retangular, e é a mesma função que a tela usa. Repetir esse trabalho aqui
 * criaria duas montagens da mesma grade, e o dia em que uma mudasse a tela e o
 * documento passariam a discordar em silêncio.
 *
 * **A célula vazia CONTA**, pela mesma razão que conta na Matriz: a saída é um
 * quadro, e coluna que some desalinha a leitura. Por isso a grade é retangular
 * desde a montagem, e a célula sem regra vai como string vazia e não como
 * ausência.
 */

/**
 * O texto de abertura, quando existe.
 *
 * É campo e não lista porque é um parágrafo só, acima da grade. No Potrich:
 * "Este Protocolo visa regrar os acordos e combinados da família ao atual
 * momento do negócio 10/03/26...". O modelo da casa não tem um, então o campo
 * sai vazio e o documento começa direto pela grade.
 */
export function camposDoProtocolo(preambulo: string | null): Campos {
  return { protocoloTextoDeAbertura: preambulo?.trim() ?? '' };
}

/**
 * As colunas e as linhas do protocolo, para a tabela do documento.
 *
 * **`protocoloColunas` e `protocoloLinhas`, e não `colunas` e `linhas`.** O nome
 * da lista vive num espaço compartilhado com todas as outras do documento, e
 * "linhas" é genérico demais: qualquer modelo que precise de linhas de outra
 * coisa colidiria em silêncio, e o erro apareceria como tabela com o conteúdo
 * errado. É a mesma decisão que a Matriz tomou ao chamar as dela de
 * `matrizOrgaos` e `matrizLinhas`.
 *
 * **O item vai com a CHAVE do papel por fora** (`{ linhaDoProtocolo: {...} }`) e
 * não com o campo solto, que é a forma que o resto do motor usa. Sem ela o
 * `detectarBindings` leria `tema`, `item` e `texto` como campo de topo e a tela
 * Gerar pediria que o consultor os digitasse à mão, um por um. Foi o que
 * apareceu na primeira geração de verdade da Matriz.
 *
 * **O TEMA VEM VAZIO QUANDO REPETE, e isso é a planilha e não invenção.** No
 * modelo da casa o tema ocupa a coluna C apenas na PRIMEIRA linha do grupo, e as
 * demais linhas daquele tema ficam com a coluna em branco. Mandar o tema em toda
 * linha encheria o documento de repetição que o original não tem; mandar só na
 * primeira reproduz a célula mesclada da planilha.
 */
export function gradeDoProtocolo(
  secoes: SecaoDaGrade[],
  colunas: BeneficiarioDoProtocolo[],
): Record<string, ItemLista[]> {
  const protocoloColunas: ItemLista[] = colunas.map((c) => ({
    colunaDoProtocolo: { nome: c.nome },
  }));

  const protocoloLinhas: ItemLista[] = secoes.flatMap((secao) =>
    secao.linhas.map((linha, i) => ({
      linhaDoProtocolo: {
        tema: i === 0 ? secao.tema : '',
        item: linha.item,
      },
      celulas: linha.celulas.map((c) => ({
        celula: { texto: c.texto ?? '' },
      })),
    })),
  );

  return { protocoloColunas, protocoloLinhas };
}
