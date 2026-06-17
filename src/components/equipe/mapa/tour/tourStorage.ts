// Persistência do "já viu o tour" por tour (cada página/modal tem o seu),
// em localStorage. Mesma convenção de prefs de UI já usada no Layout do MAPA
// (sidebarCollapsed, mapaCadastrosOpen). A chave é VERSIONADA: ao mudar a UI de
// forma relevante, bumpe o sufixo (`:v2`) para reexibir os tours a todos.

const seenKey = (id: string) => `mapaTourSeen:${id}:v1`;

export function isTourSeen(id: string): boolean {
  try {
    return localStorage.getItem(seenKey(id)) === '1';
  } catch {
    return false;
  }
}

export function markTourSeen(id: string): void {
  try {
    localStorage.setItem(seenKey(id), '1');
  } catch {
    /* localStorage indisponível (modo privado/SSR) — silencioso por design */
  }
}
