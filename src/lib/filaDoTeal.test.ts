import { describe, expect, it } from 'vitest';

import { PROPRIEDADES_DE_COR, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do teal institucional. **Ela nasce VAZIA**, e é esse o ponto.
 *
 * `teal-500`, `teal-600` e `teal-700` foram de 115 ocorrências em 35 arquivos a zero em
 * 11/09/2026. Esta catraca existe para que não voltem.
 *
 * **Por que este caso é o oposto do slate.** O slate escapava por não estar no
 * `tailwind.config.ts`: nenhuma regra o enxergava. O teal escapava pelo motivo
 * contrário — ele ESTÁ lá, remapeado para `hsl(var(--teal-N))`, então `bg-teal-600` não
 * é cor crua, não pinta o `#0D9488` do Tailwind, e quem procurava hex ou paleta de
 * estoque passava batido. Pintava o `#0A756C` da escala institucional, que é a cor
 * certa — no tema base.
 *
 * O defeito era de CAMADA, não de cor: a escala `--teal-*` mora no `:root` e nenhum
 * tema a sobrescreve. Componente que a usasse ficava teal na Tax (petróleo) e na OSG
 * (musgo), e foi assim que `/equipe/acessos` virou grafite com os botões teal.
 *
 * **Por que só 500/600/700, e não a família inteira.** Os outros degraus do teal já têm
 * dono: `escala/cor-de-estoque` dispara em `bg-teal-100` e afins, porque tom que o
 * projeto não define cai no estoque do Tailwind sem avisar. Estes três são os que o
 * projeto DEFINE, e por isso passavam por aquela regra. Perseguir a família toda aqui
 * duplicaria uma vigilância que já existe.
 *
 * A asserção é de igualdade EXATA contra objeto vazio: qualquer classe nova derruba o
 * teste dizendo o arquivo e quantas.
 *
 * ⚠️ **Se um dia precisar entrar exceção aqui**, ela entra como o `FILA_DO_ALERTA` faz:
 * agrupada pelo MOTIVO de ter ficado, não como lista solta de arquivos.
 */
const FILA_DO_TEAL: Record<string, number> = {};

/**
 * O que esta catraca NÃO persegue, e não é esquecimento:
 *
 * - `hsl(var(--teal-600))` e `--teal-500` citados em comentário — a escala institucional
 *   do `index.css` continua existindo e é ela que ALIMENTA o `--primary`. O alvo aqui é
 *   a classe, não a primitiva;
 * - prosa de comentário que conte por que o teal saiu — `PageLoader`,
 *   `SidebarCartaoUsuario`, `MetricsCards`, `DeliverableDialogs` e os três do
 *   `pis-cofins` fazem isso, e comentário que explica uma decisão é para ficar.
 *
 * Os dois ficam de fora pelo mesmo mecanismo, sem exceção escrita: o padrão exige o
 * prefixo de propriedade (`bg-`, `text-`…), e nenhum dos dois tem. Quem for escrever
 * comentário citando o teal: escreva `` `teal-700` ``, não `` `bg-teal-700` ``, ou a
 * catraca conta a sua prosa.
 */
const CLASSE_TEAL_INSTITUCIONAL = new RegExp(
  String.raw`\b(?:[a-z-]+:)*(?:${PROPRIEDADES_DE_COR})-teal-(?:500|600|700)\b`,
  'g',
);

describe('fila do teal', () => {
  it('não existe classe teal-500/600/700 nas pastas de tela', () => {
    expect(
      medirCorCrua(CLASSE_TEAL_INSTITUCIONAL),
      'Voltou classe do teal institucional ao código.\n'
        + 'Ela PARECE cor crua do Tailwind e não é: o tailwind.config.ts a remapeia para\n'
        + 'hsl(var(--teal-N)). O problema é outro — a escala mora no :root e NENHUM tema a\n'
        + 'sobrescreve, então a cor não acompanha a área: fica teal na Tax e na OSG.\n'
        + 'Os destinos, com o delta medido sobre o cartão no tema base:\n'
        + '  bg|text|border-teal-600      -> ...-primary          (0%: --primary É o teal-600)\n'
        + '  bg|text|border-teal-500      -> ...-primary          (escurece; 4,42:1 -> 5,54:1)\n'
        + '  bg|text|border-teal-700      -> ...-primary          (clareia;  7,55:1 -> 5,54:1)\n'
        + '  botão primário               -> variante `default` do ui/button, SEM classe de cor\n'
        + 'Atenção ao par que colapsa: `bg-teal-600 hover:bg-teal-700` vira hover morto.\n'
        + 'A variante `default` já traz hover:bg-primary/90 — use ela em vez de converter.\n'
        + 'O contrato está em docs/geral/paleta-por-area.md.',
    ).toEqual(FILA_DO_TEAL);
  });
});
