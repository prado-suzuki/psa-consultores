// Persistência do "já viu este tour", em localStorage, por MÓDULO e por tour.
//
// O prefixo é parâmetro (e não constante) porque cada módulo tem a sua régua do
// que já foi visto: o tour de Clientes da Tax não é o tour de Processos do MAPA,
// e zerar um não pode zerar o outro. A chave é VERSIONADA: quando a tela muda de
// forma relevante, bumpe o sufixo para reexibir o tour a todo mundo.

const VERSAO = 'v1';

const chave = (prefixo: string, id: string) => `${prefixo}:${id}:${VERSAO}`;

export function tourVisto(prefixo: string, id: string): boolean {
  try {
    return localStorage.getItem(chave(prefixo, id)) === '1';
  } catch {
    return false;
  }
}

export function marcarTourVisto(prefixo: string, id: string): void {
  try {
    localStorage.setItem(chave(prefixo, id), '1');
  } catch {
    /* localStorage indisponível (modo privado/SSR) — silencioso por design */
  }
}
