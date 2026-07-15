// Helpers PUROS do editor de etapas (Mapear processo) — extraídos p/ serem
// testáveis. Cobrem os pontos do feedback da Patrícia que tinham/poderiam ter
// bug: cadastro inline que entra selecionado (B1), nome obrigatório (B3) e o
// cluster inicial certo no cadastro inline (B2).

import type { DocRef, ResponsavelEtapa } from '@/types';

/** Remove o prefixo "Etapa N:" que às vezes vem no nome (ruído de import). */
export function cleanEtapaName(nome: string): string {
  const match = nome.match(/^Etapa\s*\d+\s*:\s*/i);
  return match ? nome.slice(match[0].length).trim() : nome;
}

/** B3: índice da 1ª etapa SEM nome (após limpar o prefixo) — ou -1 se todas têm
 * nome. Usado p/ bloquear o "Salvar todas" e apontar a etapa faltante. */
export function primeiraEtapaSemNome(etapas: Array<{ name?: string | null }>): number {
  return etapas.findIndex(e => !cleanEtapaName(e.name || '').trim());
}

export type CampoVinculo = 'docsEntrada' | 'docsSaida' | 'sistemas' | 'executadoPor';
type Vinculo = DocRef | ResponsavelEtapa | string;

const nomeDoVinculo = (it: Vinculo): string => (typeof it === 'string' ? it : it.nome) || '';

/** B1: insere um vínculo recém-cadastrado inline no campo da etapa — PREENCHE a
 * 1ª entrada vazia (a que o "Adicionar" criou) ou ANEXA, se não houver vazia.
 * Puro: recebe e devolve o array do campo. Preserva volume/horas da entrada vazia. */
export function inserirVinculoCriado(
  atual: Vinculo[],
  campo: CampoVinculo,
  nome: string,
  itemId: string,
): Vinculo[] {
  const arr = [...atual];
  const vazioIdx = arr.findIndex(it => !nomeDoVinculo(it).trim());
  const base = (vazioIdx >= 0 && typeof arr[vazioIdx] === 'object' ? arr[vazioIdx] : {}) as Partial<DocRef & ResponsavelEtapa>;

  let novo: Vinculo;
  if (campo === 'sistemas') {
    novo = nome;
  } else if (campo === 'executadoPor') {
    novo = { horas: 0, ...base, nome, responsavelId: itemId } as ResponsavelEtapa;
  } else {
    novo = { volume: 0, ...base, nome, documentoId: itemId } as DocRef;
  }

  if (vazioIdx >= 0) arr[vazioIdx] = novo;
  else arr.push(novo);
  return arr;
}

/** B2: cluster inicial sugerido no cadastro inline. O cluster DO PROCESSO tem
 * precedência sobre o filtro global — evita criar o item no cluster errado. */
export function clusterInicial(clusterDoProcesso?: string | null, clusterGlobal?: string | null): string {
  return clusterDoProcesso || clusterGlobal || '';
}
