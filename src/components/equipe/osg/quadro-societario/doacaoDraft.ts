// O rascunho dos pares da doação, fora do componente para o fast refresh
// continuar valendo em `ParesDaDoacao.tsx` (mesma razão de `quadroFmt.ts`).

/** Uma linha doador → donatário como a tela a mantém: texto, não número. */
export interface ParDraft {
  /**
   * Identidade da LINHA, não do par: é a `key` do React. Não pode ser o índice
   * nem `doadorId+donatarioId`, porque a linha existe vazia e dois pares do
   * mesmo doador para o mesmo donatário são legítimos (origens diferentes).
   */
  chave: string;
  doadorId: string;
  donatarioId: string;
  quotas: string;
}

let proximaChave = 0;

/**
 * Uma linha nova, opcionalmente já com o doador escolhido: adicionar par
 * repete o doador da linha anterior, que é o caso comum (o mesmo doador
 * distribuindo entre vários filhos).
 */
export const novoPar = (doadorId = ''): ParDraft => ({
  chave: `par-${++proximaChave}`,
  doadorId,
  donatarioId: '',
  quotas: '',
});
