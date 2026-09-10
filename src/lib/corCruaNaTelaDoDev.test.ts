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

  // O `DevPageHeader` é a caixa "Visão Geral", e ele é montado por muito mais
  // telas do que fecharam — a maioria delas ainda tem cor crua própria. Ele entra
  // aqui de qualquer forma: guardar o arquivo é guardar a caixa em todas elas, e o
  // hex que ele tinha cravado era o `--accent-soft` do tema escrito à unha, num
  // componente cujo docstring diz que existe justamente para dar o tom do módulo.
  //
  // Quantas são, agora:
  //   grep -rl '<DevPageHeader' src/pages src/components --include=*.tsx | grep -v test
  //
  // ⚠️ Não escreva o número aqui. Ele já esteve errado: `grep -rl DevPageHeader`
  // devolve 20, e isso conta o próprio componente, quatro arquivos de teste e um
  // comentário do `BaseLegalCard` que só CITA o nome. Quem monta de fato são 14
  // páginas — e "vinte telas" atravessou uma tarde inteira de conversa e dois
  // commits antes de alguém contar direito.
  'src/components/equipe/dev/DevPageHeader.tsx',
  'src/components/equipe/dev/classesDoAviso.ts',

  // A QUARTA CÓPIA da caixa de abertura, e ela entra sozinha, sem a tela dela.
  // O `icms-saidas` não fechou — mas este arquivo tinha um comentário dizendo
  // "igual ao DevPageHeader" e um `Alert` refeito à mão em emerald cru, e agora
  // importa a faixa do mesmo lugar que o componente. Guardar só ele é o que
  // impede a divergência de voltar: se a caixa é faixa em quinze telas e emerald
  // numa, o resultado é pior que antes de mexer.
  'src/components/equipe/dev/icms-saidas/familias/BaseLegalCard.tsx',

  // ─── ICMS Saídas, fechada em 10/09/2026 ─────────────────────────────────────
  //
  // A pasta inteira entra, porque a tela inteira fechou. O que ela ensinou: o que
  // parecia UMA escada de três degraus eram QUATRO coisas — a escada de
  // conferência (`checkColor.ts`), a versão binária dela repetida quatro vezes no
  // `T01ApuracaoTab`, a linha com correção aplicada (mesmo mapa de "valor
  // alterado" que as Correções SPED ganharam hoje) e dois botões de excluir. A
  // varredura por família via "12 red, 6 emerald, 4 amber" e chamaria de escada.
  //
  // O `UploadBalanceteModal` NÃO entra, de propósito: o asterisco de campo
  // obrigatório dele foi convertido junto — era a segunda das duas sobras cruas
  // daquele mapa no produto —, mas a tela dele (`controle-balancetes`) não fechou.
  'src/pages/equipe/dev/IcmsSaidas.tsx',
  'src/components/equipe/dev/icms-saidas/T01ApuracaoTab.tsx',
  'src/components/equipe/dev/icms-saidas/familias/checkColor.ts',
  'src/components/equipe/dev/icms-saidas/familias/FamiliaSaidaTab.tsx',
  'src/components/equipe/dev/icms-saidas/familias/NovaCorrecaoDialog.tsx',

  // ─── Correções SPED, fechada em 10/09/2026 ──────────────────────────────────
  //
  // Ela entrou PARCIAL primeiro, com o âmbar numa fila declarada, porque o âmbar
  // dependia de uma decisão de papel que não é do código. Entrar parcial foi
  // melhor que esperar: o que já tinha fechado ganhou guarda no mesmo dia, e o
  // que faltava ficou escrito com o motivo em vez de virar dívida invisível. A
  // decisão saiu no mesmo dia e a fila foi a zero — ver a nota logo abaixo, que é
  // o que sobrou dela.
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
 * A fila do âmbar das Correções SPED **fechou em 10/09/2026**, no mesmo dia em que
 * nasceu, e o registro de que ela existiu fica aqui porque explica as duas escolhas.
 *
 * Eram dois sinais diferentes, ambos âmbar, e é por serem diferentes que nenhum dos
 * dois podia ser convertido por varredura — foi por isso que a fila existiu:
 *
 * · **"este valor foi alterado"** (`isChanged`, `valueDivergent`, `classeDeAlterado`),
 *   nas seis abas, foi para `status-alerta`. Decisão dela, com a medição na frente:
 *   `espera` tem a matiz mais parecida (12° de um lado contra 12° do outro), mas quer
 *   dizer "parado por alguém de fora", e uma célula editada não está parada. `alerta`
 *   quer dizer "olhe isto", que é o que um valor divergente a ser enviado pede.
 *   `ajuste` foi recusado por pintar de VERMELHO uma edição normal — o mesmo erro que
 *   a rodada da pasta `audit` desfez na coluna "Exclusões";
 * · **o par de selos de `tipo_relacao`** foi para `tag-a`/`tag-b`. "Consolidado" e
 *   "XML vinculado" são CATEGORIA, não estado, e a fatia categórica do contrato é
 *   `--tag-*`. O irmão usava `success`, um semântico fazendo papel de categoria;
 *   converter só o âmbar mudaria a inconsistência de lugar em vez de resolvê-la.
 *
 * O `text-amber-600` dava **3,19:1** no branco — reprovando o AA, em doze valores em
 * negrito — e `status-alerta` dá **7,46:1**. Ninguém tinha medido porque cor crua não
 * entra em contrato nenhum: é o mesmo silêncio dos outros dois achados desta sessão.
 */

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
      'Voltou cor crua de família às telas do Dev.\n'
        + 'Estas rotas são área `sistema` no areaTheme.ts, que aponta para `null`: elas\n'
        + 'vestem o PISO, o teal da casa. Classe crua aqui não acompanha tema nenhum, e\n'
        + 'o lint não a vê. Os destinos já usados nestas telas:\n'
        + '  decoração grande (cartão, azulejo, círculo) -> primary, que é a ÂNCORA\n'
        + '  letra pequena, link, chip cheio             -> accent-d (primary é fino)\n'
        + '  ponto, anel, barra                         -> primary / ring\n'
        + '  estado do registro                         -> status-<papel> e -soft\n'
        + '  CATEGORIA (não é estado)                   -> tag-a..d, em /15 no fundo\n'
        + '  ação primária / destrutiva em botão        -> ver classesDeBotao.ts\n'
        + 'Âncora nunca pinta papel de status, e papel de status nunca pinta decoração\n'
        + 'nem categoria. O contrato está em docs/geral/paleta-por-area.md.',
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
