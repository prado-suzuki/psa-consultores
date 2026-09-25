import { classificadorIntencaoDitado } from './intencaoDitado.ts';

export const CLASSIFICADORES = {
  'intencao-ditado': classificadorIntencaoDitado,
} as const;

export type NomeClassificador = keyof typeof CLASSIFICADORES;

export function obterClassificador(nome: NomeClassificador) {
  return CLASSIFICADORES[nome];
}
