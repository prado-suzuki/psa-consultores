import { describe, expect, it } from 'vitest';

import { PROPRIEDADES_DE_COR, familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca das telas do Dev que já fecharam. **Nasce VAZIA**, como a do slate e a do
 * alerta, e a lista de arquivos abaixo é o que ela cobre — ela cresce por tela, não
 * por arquivo solto.
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

  // ─── As seis rotas de hub, fechadas em 10/09/2026 ───────────────────────────
  //
  // Elas entram como UM lote porque são uma tela só, montada seis vezes: as seis
  // páginas abaixo não têm marcação própria, só entregam a definição do hub para o
  // `DevHubPage`. Medidas antes de entrar, as seis já estavam em zero — o que
  // faltava era a casca. Por isso o alcance desta rodada não se mede em arquivos:
  // dois componentes fecharam seis rotas.
  'src/pages/equipe/dev/AnaliseIcmsHub.tsx',
  'src/pages/equipe/dev/ConsultaSpedHub.tsx',
  'src/pages/equipe/dev/GerenciarDadosHub.tsx',
  'src/pages/equipe/dev/LevantamentoPisCofinsHub.tsx',
  'src/pages/equipe/dev/PerdcompHub.tsx',
  'src/pages/equipe/dev/PlanejamentoTributarioHub.tsx',
  'src/components/equipe/dev/DevHubPage.tsx',

  // O `DevPageHeader` é a caixa "Visão Geral", e está em VINTE telas do Dev — a
  // maioria delas ainda não fechada. Ele entra aqui de qualquer forma: guardar o
  // arquivo é guardar a caixa nas vinte, e o hex que ele tinha cravado era o
  // `--accent-soft` do tema escrito à unha, num componente cujo docstring diz que
  // ele existe justamente para dar o tom do módulo.
  'src/components/equipe/dev/DevPageHeader.tsx',

  // ─── Correções SPED, fechada PARCIALMENTE em 10/09/2026 ─────────────────────
  //
  // Ela entra com `white`, `black`, hex, emerald e red em zero, e com o âmbar em
  // fila (ver `FILA_A_DECIDIR`). Entrar parcial é melhor que esperar: o que já
  // fechou passa a ter guarda hoje, e o que falta fica escrito com o motivo em
  // vez de virar dívida invisível.
  'src/pages/equipe/dev/CorrecoesSped.tsx',
  'src/components/equipe/dev/correcoes-sped/TabA170.tsx',
  'src/components/equipe/dev/correcoes-sped/TabC170.tsx',
  'src/components/equipe/dev/correcoes-sped/TabD100.tsx',
  'src/components/equipe/dev/correcoes-sped/TabF100.tsx',
  'src/components/equipe/dev/correcoes-sped/TabF120.tsx',
  'src/components/equipe/dev/correcoes-sped/TabF130.tsx',
  'src/components/equipe/dev/correcoes-sped/CorrecoesActionButtons.tsx',
  'src/components/equipe/dev/correcoes-sped/classesDeBotao.ts',
] as const;

/**
 * O âmbar das Correções SPED, que ficou **de propósito** e espera uma decisão dela.
 *
 * Agrupado pelo MOTIVO, como o `FILA_DO_ALERTA` faz, porque é o motivo que faz a
 * lista servir para a conversão seguinte em vez de só contar. São dois sinais
 * diferentes, ambos âmbar hoje, e é justamente por serem diferentes que nenhum dos
 * dois pode ser convertido por varredura:
 *
 * · **"este valor foi alterado"** (`isChanged`, `valueDivergent`, `amberClass`) — o
 *   marcador de célula editada, nas seis abas. Não é nenhum dos oito papéis de forma
 *   óbvia: não é `espera` (nada está parado), não é `alerta` (nada é urgente) e
 *   `ajuste` pintaria de VERMELHO o que hoje é âmbar, afirmando problema sobre uma
 *   edição normal — o mesmo erro que a rodada da pasta `audit` desfez na coluna
 *   "Exclusões";
 * · **o selo "Consolidado"** (`tipo_relacao === 'CONSOLIDADO'`) — este não é status
 *   nenhum, é CATEGORIA, e o irmão dele no mesmo `ternário` usa `success`, que é
 *   semântico. Ou os dois viram `--tag-*` (a fatia categórica do contrato, e são
 *   quatro de propósito), ou os dois ficam. Converter um só troca a inconsistência
 *   de lugar.
 *
 * Quando a decisão vier, estes números vão a zero e esta constante sai.
 */
const FILA_A_DECIDIR: Record<string, number> = {
  'src/components/equipe/dev/correcoes-sped/TabA170.tsx': 3,
  'src/components/equipe/dev/correcoes-sped/TabC170.tsx': 7,
  'src/components/equipe/dev/correcoes-sped/TabD100.tsx': 1,
  'src/components/equipe/dev/correcoes-sped/TabF100.tsx': 1,
  'src/components/equipe/dev/correcoes-sped/TabF120.tsx': 2,
  'src/components/equipe/dev/correcoes-sped/TabF130.tsx': 2,
};

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
  it('só tem a cor crua de família que espera decisão', () => {
    expect(
      soDaTela(medirCorCrua(FAMILIAS_DO_ESTOQUE)),
      'Mudou a cor crua de família nas telas do Dev.\n'
        + 'Se SUBIU: voltou classe crua. A rota é área `sistema` no areaTheme.ts e aponta\n'
        + 'para `null`, ou seja veste o PISO, o teal da casa — classe crua aqui não\n'
        + 'acompanha tema nenhum, e o lint não a vê. Os destinos já usados nesta tela:\n'
        + '  decoração grande (cartão, azulejo, círculo) -> primary, que é a ÂNCORA\n'
        + '  letra pequena, link, chip cheio             -> accent-d (primary é fino)\n'
        + '  ponto, anel, barra                         -> primary / ring\n'
        + '  papel de status (revisão, ajuste…)         -> status-<papel> e -soft\n'
        + '  ação primária / destrutiva em botão        -> ver classesDeBotao.ts\n'
        + 'Âncora nunca pinta papel de status, e papel de status nunca pinta decoração.\n'
        + 'Se DESCEU: a decisão do âmbar saiu. Baixe o número em FILA_A_DECIDIR, e quando\n'
        + 'chegar a zero apague a constante e volte a asserção para {}.\n'
        + 'O contrato está em docs/geral/paleta-por-area.md.',
    ).toEqual(FILA_A_DECIDIR);
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
