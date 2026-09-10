import { describe, expect, it } from 'vitest';

import { PROPRIEDADES_DE_COR, familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca da tela `/equipe/dev`. **Nasce VAZIA**, como a do slate e a do alerta.
 *
 * A DIFERENÇA DAS OUTRAS DUAS, e é de propósito: elas guardam uma FAMÍLIA de cor no
 * repositório inteiro; esta guarda uma TELA, com todas as famílias. As duas formas
 * existem porque os defeitos que elas pegam são diferentes — família crescendo em
 * silêncio por todo lado, contra uma tela que foi zerada e pode ser repintada na
 * próxima passada por alguém que só olhou aquele arquivo.
 *
 * **O que ela guarda, e por que precisou existir.** Em 10/09/2026 a tela foi conferida
 * e tinha 28 classes de cor crua mais duas sombras em `rgba(5,150,105,…)`. O `bunx
 * eslint` nos mesmos arquivos voltava **limpo**, e isso não era falha de configuração:
 * as regras de hoje cobrem `cor-inexistente`, `cor-de-estoque` (só nos três nomes que o
 * projeto também define — `teal`, `lime`, `gray`) e `token-nao-sobrescrito`. `emerald`,
 * `white` e `red` crus não estão em nenhuma delas. O cartão do Drive era emerald puro,
 * verde no meio de uma tela teal, e atravessou assim porque nada tinha o que dizer.
 *
 * **Por que uma lista de arquivos e não uma pasta.** `src/components/equipe/dev/` tem
 * dezenas de arquivos das telas de `uso-envio`, e aquelas ainda estão cheias de cor
 * crua — são a fase 3 do `docs/geral/cor-o-que-falta.md`, que não começou. Cobrar a
 * pasta faria a catraca nascer com uma fila enorme, e catraca que nasce cheia é
 * inventário, não guarda. Quando uma tela de lá fechar, ela entra nesta lista.
 */
const ARQUIVOS_DA_TELA = [
  'src/pages/equipe/dev/DevDashboard.tsx',
  'src/components/equipe/dev/DevLayout.tsx',
  // O sino não é do Dev, é compartilhado — mas RENDERIZA aqui, no cabeçalho de toda
  // rota da área, e o roxo de "Revisão pendente" era o mapa de `revisao` que o
  // `task-modal` já usa sobre o mesmo dado. Guardar a tela sem guardar a casca dela
  // deixaria metade do que se vê fora do contrato.
  'src/components/notifications/NotificationPopover.tsx',
] as const;

function soDaTela(medido: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(medido).filter(([caminho]) =>
      (ARQUIVOS_DA_TELA as readonly string[]).includes(caminho),
    ),
  );
}

/**
 * As famílias do estoque do Tailwind, MENOS `teal`, `lime` e `gray`.
 *
 * Os três ficam de fora porque o projeto também os define no `tailwind.config.ts`:
 * `bg-teal-600` não é cor crua, é a escala institucional, e o tom que falta nela já
 * cai em `escala/cor-de-estoque`, que é `error`. Cobrá-los aqui seria a segunda
 * opinião sobre um caso que o lint já decide — e uma que discordaria dele.
 */
const FAMILIAS_DO_ESTOQUE = familiaCrua(
  'slate', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'green', 'emerald', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
  'fuchsia', 'pink', 'rose',
);

/**
 * `white` e `black` precisam de padrão próprio: `familiaCrua` exige `-\d{2,3}` no fim,
 * e estes dois não têm degrau. Foram 17 numa tela só, e o motivo de ninguém ver é que
 * no `.base-theme` o `--card` é `0 0% 100%` — `bg-white` e `bg-card` pintam o MESMO
 * pixel aqui. A diferença aparece quando o componente é reusado na OSG, cujo card é
 * `170 18% 99.6%`. Defeito que não se vê na tela onde mora é o que mais dura.
 */
const BRANCO_E_PRETO = new RegExp(
  String.raw`\b(?:[a-z-]+:)*(?:${PROPRIEDADES_DE_COR})-(?:white|black)\b`,
  'g',
);

/** Hex e `rgba()` escritos à mão. As duas sombras do cartão do Drive eram isto. */
const VALOR_NA_MAO = /rgba?\([\d,.\s]+\)|#[0-9a-fA-F]{3,8}\b/g;

describe('cor crua na tela do Dev', () => {
  it('não tem classe de família do estoque do Tailwind', () => {
    expect(
      soDaTela(medirCorCrua(FAMILIAS_DO_ESTOQUE)),
      'Voltou cor crua à tela /equipe/dev.\n'
        + 'A rota é área `sistema` no areaTheme.ts e aponta para `null`: ela veste o PISO,\n'
        + 'o teal da casa. Classe crua aqui não acompanha tema nenhum, e o lint não a vê.\n'
        + 'Os destinos desta tela, quando as 28 foram convertidas:\n'
        + '  decoração grande (cartão, azulejo, círculo) -> primary, que é a ÂNCORA\n'
        + '  letra pequena sobre superfície clara        -> text-[var(--bd-accent-d)]\n'
        + '  ponto, anel, barra                          -> primary / ring\n'
        + '  papel de status (revisão, ajuste…)          -> status-<papel> e -soft\n'
        + 'Âncora nunca pinta papel de status, e papel de status nunca pinta decoração.\n'
        + 'O contrato está em docs/geral/paleta-por-area.md.',
    ).toEqual({});
  });

  it('não tem `white` nem `black`', () => {
    expect(
      soDaTela(medirCorCrua(BRANCO_E_PRETO)),
      'Voltou `white`/`black` à tela /equipe/dev.\n'
        + 'No .base-theme isto pinta igual ao token e por isso passa em qualquer revisão\n'
        + 'visual. Os pares: superfície de card -> bg-card; texto sobre superfície escura\n'
        + 'ou sobre bg-primary -> text-primary-foreground (e /10, /15, /90 no alfa).',
    ).toEqual({});
  });

  it('não tem hex nem `rgba()` escrito à mão', () => {
    expect(
      soDaTela(medirCorCrua(VALOR_NA_MAO)),
      'Voltou valor de cor na mão à tela /equipe/dev.\n'
        + 'As duas sombras do cartão do Drive eram `rgba(5,150,105,…)` — o emerald-600 em\n'
        + 'número, que nenhuma regra de classe enxerga. Sombra sai da escala\n'
        + '(shadow-sm/md/lg/xl); cor sai de token.',
    ).toEqual({});
  });
});
