/**
 * Dilui uma cor que vem de DADO, sem depender de ela ser hex.
 *
 * ## O defeito que esta função existe para matar
 *
 * O repositório tinha o padrão de concatenar dois dígitos de alfa no fim do hex:
 *
 * ```tsx
 * style={{ background: `${cor}26` }}
 * ```
 *
 * Isso funciona **enquanto** `cor` for hex. No dia em que ela virar
 * `var(--token)` — que é para onde a frente de cor está levando tudo — o
 * navegador recebe `var(--agente-go)26`, não entende, e a declaração **cai**.
 *
 * E cai de formas diferentes, o que é o pior desta armadilha. Declaração que
 * contém `var()` e fica inválida depois da substituição não é ignorada: ela
 * vira `unset`. Medido no DOM em 11/09/2026:
 *
 * | propriedade    | `unset` computa | o que se vê                          |
 * |----------------|-----------------|--------------------------------------|
 * | `background`   | transparente    | o fundo **desaparece**               |
 * | `border-color` | `currentColor`  | a borda fica **100% opaca**          |
 *
 * Por isso "o fundo sumiu" NÃO é a assinatura do defeito: em `border-color`,
 * `fill`, `stroke` e `outline-color` ele aparece como cor **reforçada**, e
 * ninguém nota. Foram 14 ocorrências em 10 arquivos, três já quebradas no ar
 * (o modo ativo do compositor do agente e as trilhas da régua do PPR).
 *
 * ## Por que `color-mix` e não hex
 *
 * `color-mix` recebe qualquer valor de cor — hex, `hsl()`, `var()` — e resolve
 * no navegador. É o que os dois casos do Mapa já usaram
 * (`ProcessoDetalheModal`, `ProjetoDetalhe`), e já estava no `index.css` e no
 * `BoardStatStrip`.
 *
 * ## Atenção ao converter o padrão antigo: o sufixo era HEX
 *
 * `${cor}26` **não** é 26% — é `0x26 = 38`, ou seja **15%**. A tabela dos
 * valores que existiam no produto, para quem for converter os que faltam:
 *
 * | sufixo | alfa real |
 * |--------|-----------|
 * | `15`   | 8,2%      |
 * | `20`   | 12,5%     |
 * | `25`   | 14,5%     |
 * | `26`   | 14,9%     |
 * | `30`   | 18,8%     |
 * | `40`   | 25,1%     |
 *
 * Ler o sufixo como porcentagem quase dobra o alfa em metade dos casos.
 *
 * @param cor        Qualquer valor de cor CSS: hex, `hsl(...)`, `var(--token)`.
 * @param porcentoDeCor Quanto da cor fica, de 0 a 100. O resto é transparente.
 */
export function comAlfa(cor: string, porcentoDeCor: number): string {
  return `color-mix(in srgb, ${cor} ${porcentoDeCor}%, transparent)`;
}

/**
 * O mesmo, para quem ainda tem o sufixo hex escrito no código e quer converter
 * sem recalcular à mão. `alfaHex('#0D9488', '26')` dá os 14,9% corretos.
 */
export function comAlfaHex(cor: string, sufixoHex: string): string {
  const bruto = Number.parseInt(sufixoHex, 16);
  if (!Number.isFinite(bruto)) return cor;
  return comAlfa(cor, Number(((bruto / 255) * 100).toFixed(2)));
}
