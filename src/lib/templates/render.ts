import type { Contexto } from './types';

// Resolve placeholders {{ caminho }} (com caminho pontilhado opcional) sobre um contexto.
// É a única camada que toca a string do bloco; é agnóstica de formato (texto/HTML).

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

function resolver(caminho: string, contexto: Contexto): unknown {
  return caminho.split('.').reduce<unknown>((acc, chave) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[chave];
    }
    return undefined;
  }, contexto);
}

/** Preenche os placeholders de um bloco. Lança erro se algum não for resolvido (falha cedo, evita texto incompleto no cartório). */
export function renderConteudo(conteudo: string, contexto: Contexto): string {
  return conteudo.replace(PLACEHOLDER, (_match, caminho: string) => {
    const valor = resolver(caminho, contexto);
    if (valor === undefined || valor === null) {
      throw new Error(`Placeholder não resolvido: {{${caminho}}}`);
    }
    return String(valor);
  });
}

/** Lista os campos ({{ }}) distintos usados num conteúdo, na ordem de aparição. */
export function extrairCampos(conteudo: string): string[] {
  const campos = new Set<string>();
  for (const match of conteudo.matchAll(PLACEHOLDER)) {
    campos.add(match[1]);
  }
  return [...campos];
}
