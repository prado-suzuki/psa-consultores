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

/**
 * Forma canônica de um nome de cliente, só para COMPARAR. Nunca para gravar.
 *
 * Gêmea da função SQL `nome_cliente_normalizado(text)` (migração
 * 20260813103000). Mudou uma, muda a outra.
 *
 * Ela existe porque o gatilho `initcap()` sustentava, sem dizer, uma invariante
 * da qual duas coisas dependiam: comparar `cliente.nome` por igualdade exata
 * funcionava porque todo mundo tinha sido achatado para a mesma grafia. Com o
 * gatilho fora, "AGRO MMS" e "Agro Mms" passam a ser strings diferentes, e quem
 * compara nome precisa dizer explicitamente que caixa e espaço não contam: o
 * pareamento dev/prod do mesmo cliente (do lado do banco) e o aviso de cliente
 * duplicado no cadastro (deste lado).
 *
 * @example chaveDeNomeCliente('  AGRO MMS   S/A ') === 'agro mms s/a'
 */
export function chaveDeNomeCliente(valor: string | null | undefined): string {
  return normalizarNomeDigitado(valor).toLowerCase();
}
