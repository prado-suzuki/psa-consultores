import { describe, expect, it } from 'vitest';

import { familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do slate. **Ela nasce VAZIA**, e é esse o ponto.
 *
 * O slate foi de 1529 ocorrências a zero em 01/09/2026, em cinco lotes. Esta catraca
 * existe para que ele não volte — e "voltar" não é hipótese, é o histórico: o slate
 * chegou a 1529 sem ninguém ver, e o motivo está medido.
 *
 * **Por que nenhuma regra de lint pegava.** As cores do projeto ficam em
 * `theme.extend.colors`, e `extend` SOMA com a paleta do Tailwind. A regra
 * `escala/cor-de-estoque` aproveita isso: ela só dispara em nome que o projeto TAMBÉM
 * define (`teal`, `lime`, `gray`), porque aí o tom faltante cai no estoque sem avisar.
 * `slate` não está no `tailwind.config.ts`. Nunca esteve. Então `bg-slate-50` sempre
 * foi classe válida, sempre pintou, e nenhuma regra teve o que dizer.
 *
 * Era a maior família crua do repositório e a única grande sem vigilância nenhuma.
 *
 * A asserção é de igualdade EXATA contra um objeto vazio, o que é a forma mais simples
 * desta catraca: qualquer classe slate nova em `src/components` ou `src/pages` derruba
 * o teste, dizendo o arquivo e quantas.
 *
 * ⚠️ **Se um dia precisar entrar exceção aqui**, ela entra como o `FILA_DO_ALERTA` faz:
 * agrupada pelo MOTIVO de ter ficado, não como uma lista solta de arquivos. É o motivo
 * que faz a lista servir para a conversão seguinte em vez de só contar.
 */
const FILA_DO_SLATE: Record<string, number> = {};

/**
 * O que esta catraca NÃO persegue, e não é esquecimento:
 *
 * - `hsl(var(--slate-500))` — é a escala institucional do `index.css`, resultado da
 *   fase 3a, e o Mapa está cheio dela. Aquela fase tirou o valor da mão DE PROPÓSITO
 *   sem escolher papel; escolher papel é a fase 4. Perseguir isso aqui seria cobrar
 *   uma fase que ainda não começou;
 * - prosa de comentário que cite um tom de slate ao contar história — `PageLoader`
 *   (`slate-50`), `formKit` e `DashboardUsoEnvioGerencial` (`slate-600`) fazem isso, e
 *   comentário que explica por que uma cor saiu é para ficar.
 *
 * Os dois ficam de fora pelo mesmo mecanismo, sem exceção escrita: `familiaCrua` exige
 * o prefixo de propriedade (`bg-`, `text-`…), e nenhum dos dois tem.
 */
const COR_CRUA_SLATE = familiaCrua('slate');

describe('fila do slate', () => {
  it('não existe classe slate crua nas pastas de tela', () => {
    expect(
      medirCorCrua(COR_CRUA_SLATE),
      'Voltou cor crua slate ao código.\n'
        + 'O slate é o cinza FRIO do estoque do Tailwind: ele não está no tailwind.config.ts,\n'
        + 'então nenhuma regra de lint o enxerga e ele não acompanha o tema da área.\n'
        + 'Os destinos, com o delta que cada um custou quando os 1529 foram convertidos:\n'
        + '  bg-slate-50/100/200/300      -> bg-muted            (3% a 11%)\n'
        + '  border|divide-slate-*        -> border|divide-border (4% a 10%)\n'
        + '  text-slate-500/600           -> text-muted-foreground (9% a 13%)\n'
        + '  text-slate-700/800/900       -> text-foreground     (5% a 22%)\n'
        + '  text-slate-300/400           -> text-muted-foreground, com alfa quando for\n'
        + '                                  decoração: /40 em ícone grande, /50 em separador\n'
        + 'O contrato está em docs/geral/paleta-por-area.md.',
    ).toEqual(FILA_DO_SLATE);
  });
});
