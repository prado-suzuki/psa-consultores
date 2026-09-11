import { describe, expect, it } from 'vitest';

import { PROPRIEDADES_DE_COR, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do `osg-red`. **Ela nasce VAZIA**, e é esse o ponto.
 *
 * O `osg-red` não é cor crua do estoque do Tailwind — é o contrário disso: é uma das
 * três ÂNCORAS da OSG (`--osg-moss`, `--osg-red`, `--osg-highlighter`), token nosso,
 * declarado no `tailwind.config.ts`. Por isso nenhuma regra de lint tinha o que dizer,
 * e por isso ele passou por certo em toda revisão: quem escreve `text-osg-red` está
 * usando um token da área, corretamente, num lugar errado.
 *
 * **A regra que ele quebrava** é a do modelo de cor por camada: âncora pinta só o que
 * é GRANDE — cabeçalho, botão, primeira série de gráfico — e **nunca papel de status**.
 * O `osg-red` estava fazendo as duas coisas, e o efeito era a OSG ter dois vermelhos:
 * um para "recusado" e outro para "erro", nenhum dos dois igual ao `--destructive` que
 * o resto do produto usa.
 *
 * Saiu em duas rodadas de 03/09/2026. Primeiro do checklist, quando o estado de
 * documento virou mapa (`estadoDocumentoColors`); depois das cinco telas que sobraram,
 * e cada uma foi a mesma pergunta — se o vermelho ali significa estado, é papel; se é
 * decoração da área, fica. Nenhuma das sete era decoração:
 *
 *   ModalAvisarCliente, nº de recusados  -> status-ajuste  (o comentário do arquivo já
 *                                                           dizia "documento devolvido")
 *   ModalAvisarCliente, histórico falhou -> destructive
 *   Onboarding, banner de erro           -> destructive
 *   FiscalReport, seção vazia por erro   -> destructive
 *   DocumentGroups, hover da lixeira     -> destructive
 *   HistoricoFlutuante, ACTION_LABELS    -> feito/andamento/ajuste (é mapa: as três
 *                                           entradas andaram juntas)
 *
 * A asserção é de igualdade EXATA contra um objeto vazio: qualquer `osg-red` novo em
 * `src/components` ou `src/pages` derruba o teste, dizendo o arquivo e quantos.
 *
 * ⚠️ **Se um dia precisar entrar exceção aqui** — uma tela onde o carmim seja mesmo
 * decoração da área, e não estado —, ela entra como o `FILA_DO_ALERTA` faz: agrupada
 * pelo MOTIVO de ter ficado, não como lista solta de arquivos. É o motivo que faz a
 * lista servir para a conversão seguinte em vez de só contar.
 */
const FILA_DO_OSG_RED: Record<string, number> = {};

/**
 * Diferente das outras catracas, esta não usa `familiaCrua`: aquele molde exige tom
 * numérico (`-slate-400`), e a âncora não tem tom — é `text-osg-red`, `bg-osg-red/10`,
 * `border-osg-red/30`.
 *
 * O prefixo de propriedade continua sendo o que separa código de prosa: os dois
 * comentários que hoje contam por que a cor saiu (`ModalAvisarCliente` e
 * `HistoricoFlutuante`) citam `osg-red` sem prefixo e por isso não casam. Comentário
 * que explica a saída de uma cor é para ficar.
 *
 * As outras duas âncoras da OSG ficam de fora de propósito: `osg-moss` e
 * `osg-highlighter` pintam o que é grande, que é o trabalho delas.
 */
const ANCORA_VERMELHA_DA_OSG = new RegExp(
  String.raw`\b(?:[a-z-]+:)*(?:${PROPRIEDADES_DE_COR})-osg-red\b`,
  'g',
);

describe('fila do osg-red', () => {
  it('a âncora vermelha da OSG não pinta nada nas pastas de tela', () => {
    expect(
      medirCorCrua(ANCORA_VERMELHA_DA_OSG),
      'Voltou `osg-red` ao código de tela.\n'
        + 'Ele é ÂNCORA da OSG, e âncora pinta o que é grande — cabeçalho, botão,\n'
        + 'primeira série de gráfico. Papel de status, nunca. Os destinos:\n'
        + '  estado de um documento     -> estadoDocumentoColors (recusado = ajuste)\n'
        + '  erro, falha de carregamento -> text-destructive\n'
        + '  ação destrutiva (excluir)   -> hover:bg-destructive/10 hover:text-destructive\n'
        + '  entrada de um mapa de domínio -> o papel do mapa, e o mapa INTEIRO junto\n'
        + 'O contrato está em docs/geral/paleta-por-area.md.',
    ).toEqual(FILA_DO_OSG_RED);
  });
});
