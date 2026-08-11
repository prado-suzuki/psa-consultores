// Arrumação de nome próprio e razão social digitados no cadastro.
//
// Existe por causa do B20: o banco rodava `initcap()` num gatilho ANTES de
// gravar, e "[TESTE E2E] Grupo MMS" virava "[Teste E2e] Grupo Mms". Sigla é
// significado — "S/A", "LTDA", "J.E.", "MMS" e o marcador entre colchetes dizem
// coisas diferentes de "S/a", "Ltda", "J.e." e "Mms". O gatilho saiu (migração
// 20260813103000) e a arrumação passou a ser aqui, na escrita, no blur do campo,
// onde o usuário vê o que ficou gravado antes de salvar.
//
// A regra é deliberadamente pobre: mexer em caixa é o defeito que estamos
// consertando. Só sai o que ninguém digitou de propósito — espaço na borda,
// espaço repetido no meio, quebra de linha colada de outro sistema.

/**
 * Apara espaços de borda e colapsa espaços internos. **Não toca na caixa.**
 *
 * @example normalizarNomeDigitado('  AGRO MMS   S/A ') === 'AGRO MMS S/A'
 */
export function normalizarNomeDigitado(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\s+/g, ' ').trim();
}
