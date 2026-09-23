import { letraAlinea } from './extenso';
import {
  mapearCompetenciaMatriz, mapearOrgaoGovernanca,
  type Campos, type CompetenciaParaMapear, type ItemLista, type OrgaoParaMapear,
} from './mapeadores';

/**
 * O contexto de governança para o motor: os órgãos do cliente, cada um com as
 * SUAS alíneas de competência.
 *
 * POR QUE A COMPETÊNCIA MORA DENTRO DO ÓRGÃO, e não numa lista solta.
 *
 * No contrato, a competência não existe sozinha: ela é alínea da cláusula de UM
 * órgão. No Mattei, a cláusula do Conselho tem 19 alíneas enumeradas, e a
 * Diretoria tem outra cláusula. Se `{{#competencias}}` fosse lista de topo, o
 * documento teria uma lista só, e a cláusula do Conselho receberia também as
 * alíneas da Diretoria.
 *
 * A saída é a coleção `orgaosComCompetencia`: o bloco da cláusula se repete uma
 * vez por órgão (mesmo mecanismo dos parágrafos por sócio, ver `repetidor.ts`),
 * e dentro dele a seção resolve do escopo do item. O recorte por órgão deixa de
 * ser filtro e passa a ser a própria repetição, que é o que o motor já sabe
 * fazer.
 *
 * Esta camada é PURA de propósito, no molde de `contextoRural.ts`: quem busca no
 * banco é o controller, e aqui só se arruma o que ele trouxe. É o que permite
 * testar a montagem da cláusula sem subir banco.
 */

/** Uma linha da Matriz, achatada pelo chamador: a atividade e as suas células. */
export interface LinhaParaMapear {
  id: string;
  atividade: string;
  detalhamento?: string | null;
  ordem: number;
  /** As células desta linha, uma por órgão que participa. */
  celulas: CelulaParaMapear[];
}

export interface CelulaParaMapear extends Omit<CompetenciaParaMapear, 'atividade' | 'detalhamento'> {
  orgaoId: string;
  /**
   * Órgão que não participa da atividade NÃO gera alínea. A célula continua
   * chegando aqui porque a tela grava as quatro, e é este campo que separa
   * "decidiu não participar" de "ainda não preencheu" — as duas somem do
   * contrato, mas só a primeira é resposta.
   */
  naoParticipa?: boolean;
}

export interface EntradaGovernanca {
  /** Só os órgãos que recebem cláusula. O filtro é do chamador. */
  orgaos: OrgaoParaMapear[];
  linhas: LinhaParaMapear[];
  /**
   * O que a Matriz pede e a cláusula não sabe escrever — hoje, a escada de
   * alçada cujos degraus não se comparam (ver `pisosDaLinha`). Some com a
   * pendência de campo obrigatório: aqui o dado EXISTE, e é a combinação dele
   * que não vira frase. Opcional para não obrigar chamador antigo (os testes
   * montam a entrada à mão).
   */
  pendencias?: string[];
}

/**
 * As alíneas de um órgão, na ordem da matriz, já com a letra.
 *
 * A letra é calculada DEPOIS do descarte, e não a partir da posição da linha na
 * matriz: se a atividade 3 não toca o Conselho, a alínea seguinte dele é `c)` e
 * não `d)`. Numerar pela matriz deixaria buraco na cláusula, e buraco em alínea
 * de contrato registrado é erro que a Junta devolve.
 */
function competenciasDoOrgao(orgaoId: string, linhas: LinhaParaMapear[]): ItemLista[] {
  return [...linhas]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((linha) => {
      const celula = linha.celulas.find((c) => c.orgaoId === orgaoId);
      if (!celula || celula.naoParticipa) return [];
      return [{ linha, celula }];
    })
    .map(({ linha, celula }, i) => ({
      competencia: {
        ...mapearCompetenciaMatriz({
          ...celula,
          atividade: linha.atividade,
          detalhamento: linha.detalhamento,
        }),
        // `letraAlinea` e 1-based: a alinea 1 e "a".
        alinea: letraAlinea(i + 1),
        ordem: String(i + 1),
      } as Campos,
    }));
}

/** Os órgãos com as suas competências, para o bloco da cláusula se repetir. */
export function listasDaGovernanca(entrada: EntradaGovernanca): Record<string, ItemLista[]> {
  const orgaosComCompetencia: ItemLista[] = entrada.orgaos.map((orgao) => ({
    orgao: mapearOrgaoGovernanca(orgao),
    competencias: competenciasDoOrgao(orgao.id, entrada.linhas),
  }));

  return { orgaosComCompetencia };
}

/**
 * A grade da Matriz para o documento dela, que é outro consumidor dos mesmos
 * dados. Aqui a célula vazia CONTA, porque a grade é um quadro e coluna que
 * some desalinha a leitura — ao contrário da cláusula, onde o que não existe
 * simplesmente não vira alínea.
 */
export function gradeDaMatriz(entrada: EntradaGovernanca): Record<string, ItemLista[]> {
  /*
   * `matrizOrgaos` e `matrizLinhas`, e não `orgaos` e `linhas`. O nome da lista
   * vive num espaço compartilhado com todas as outras do documento, e "linhas"
   * é genérico demais: qualquer modelo futuro que precise de linhas de outra
   * coisa colidiria em silêncio, e o erro apareceria como tabela com o conteúdo
   * errado.
   */
  /*
   * O item vai com a CHAVE do papel por fora (`{ orgaoDaGrade: {...} }`), e não
   * com o campo solto. É a forma que o resto do motor usa, e sem ela o
   * `detectarBindings` lê `nome`, `atividade` e `resumo` como campo de topo e a
   * tela Gerar pede que o consultor os digite à mão, um por um. Foi o que
   * apareceu na primeira geração de verdade.
   */
  const matrizOrgaos: ItemLista[] = entrada.orgaos.map((o) => ({
    orgaoDaGrade: { nome: o.nome },
  }));

  const matrizLinhas: ItemLista[] = [...entrada.linhas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((linha) => ({
      linhaDaGrade: { atividade: linha.atividade },
      celulas: entrada.orgaos.map((orgao) => {
        const celula = linha.celulas.find((c) => c.orgaoId === orgao.id);
        return {
          celula: { resumo: celula?.naoParticipa ? 'Não participa' : (celula?.resumo ?? '') },
        };
      }),
    }));

  return { matrizOrgaos, matrizLinhas };
}
