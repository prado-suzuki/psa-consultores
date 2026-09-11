import { describe, expect, it } from 'vitest';

import { medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do **alfa colado no fim do hex** — o padrão `${cor}NN`.
 *
 * ```tsx
 * style={{ background: `${cor}20` }}
 * ```
 *
 * ## Por que ela precisa existir, e por que nenhuma regra pegava
 *
 * Este padrão atravessou **quatro** lotes de conversão de cor. Não por descuido:
 * nenhuma regra de `eslint` tem o que dizer sobre o conteúdo de uma template
 * string, e o TypeScript vê uma `string` válida. O `escala/cor-de-estoque` e o
 * `escala/cor-inexistente` olham CLASSE do Tailwind, e aqui não há classe.
 *
 * É o mesmo mecanismo do slate: forma válida, nenhuma regra aplicável — e o
 * slate chegou a **1529** ocorrências assim.
 *
 * ## O que ele produz, medido no DOM em 11/09/2026
 *
 * Funciona enquanto `cor` for hex. Quando `cor` já é `var(--token)` — que é para
 * onde a frente de cor leva tudo — o navegador recebe `var(--agente-go)26` e a
 * declaração **cai**. Cai virando `unset`, e `unset` é diferente por propriedade:
 *
 * - `background` → transparente. O fundo **desaparece**;
 * - `border-color` → `currentColor`. A borda fica **100% opaca**.
 *
 * Por isso "o fundo sumiu" **não** é a assinatura do defeito, e foi assim que
 * três casos ficaram no ar sem ninguém ver:
 *
 * - `ui/ai-prompt-box.tsx` — o fundo do modo **ativo** do compositor do agente
 *   computava `rgba(0, 0, 0, 0)`. O modo ativo ficava com MENOS preenchimento
 *   que um modo inativo sob o mouse, que ganha `rgba(255,255,255,.08)` pela
 *   folha de estilo;
 * - `DesempenhoMetas.tsx` — as três trilhas da régua do PPR idem, então a barra
 *   que existe para mostrar **proporção** perdia a referência: em "Abaixo" via-se
 *   20% de barra e nada marcando os 80% que faltavam;
 * - `DesempenhoMetas.tsx` — e a borda da etiqueta da mesma linha ia para o outro
 *   lado: computava `rgb(155, 39, 52)`, 100% opaca em vez dos 18,8% pedidos.
 *
 * Os três foram para `comAlfa` (`src/lib/corComAlfa.ts`), que é `color-mix` e
 * aceita hex, `hsl()` e `var()`.
 *
 * ## ⚠️ O sufixo é HEX, não porcentagem
 *
 * `${cor}26` é `0x26 = 38`, ou seja **15%** — não 26%. Quem converter os que
 * faltam tem a tabela no docstring de `corComAlfa.ts`. Ler como porcentagem
 * quase dobra o alfa em metade dos casos.
 */
/**
 * ## O recorte do padrao, e as duas vezes que ele saiu estreito
 *
 * A primeira versao desta busca listava os caracteres aceitos dentro das chaves
 * (`[A-Za-z_.()]`) e achou 14 ocorrencias. Faltava `[` e `]`, e com eles
 * apareceram mais duas em `UfDrillDown` (`${CORES_NATUREZA[dados.natureza]}15`).
 * Corrigido isso, ainda faltava **espaco e sinal**, e com eles apareceram as
 * duas de `DesempenhoReunioes1a1` (`${sentimentColors[r.sentimento - 1]}20`) —
 * que eram as duas ultimas QUEBRADAS no ar, justamente as que o recorte estreito
 * escondia. Eram 18, nao 14.
 *
 * Dai a forma final: **qualquer coisa dentro das chaves**, e os dois digitos hex
 * encostados na CRASE de fechamento. A crase e o que separa alfa colado de
 * interpolacao legitima que so por acaso termina em dois digitos — `${pct}10%`
 * nao casa porque tem `%` antes da crase.
 *
 * E a mesma licao que o `medirCorCrua.ts` ja carrega sobre `PROPRIEDADES_DE_COR`:
 * lista escrita de cabeca conta menos do que existe, e o que falta e sempre o
 * caso que ninguem imaginou.
 */
const ALFA_COLADO = /\$\{[^}]*\}[0-9a-fA-F]{2}`/g;

/**
 * A fila do que sobrou, **agrupada pelo motivo** — a forma da `filaDoAlerta`, e
 * não uma lista solta de arquivos. É o motivo que faz a lista servir para a
 * conversão seguinte em vez de só contar.
 *
 * ### motivo: `chip-de-categoria-na-calculadora` (9)
 *
 * A calculadora IBS/CBS pinta chip, badge e quadrado de ícone com **letra na cor
 * X sobre a cor X a 12,5%–25%**. Elas PINTAM (o valor que chega ainda é hex),
 * então não estão quebradas — mas o padrão dá **2,18 a 3,40:1** e não tem como
 * passar em AA: quando o fundo é a própria cor diluída, subir o alfa escurece o
 * fundo e não muda a letra. Escada precisa de dois degraus.
 *
 * **Correção de rota registrada em 11/09/2026:** o `fase-3a-cor-crua-na-mao.md`
 * punha a calculadora atrás da **decisão 4** (cor de gráfico que sai para PNG).
 * Medido, ela nunca esteve: `html-to-image` é importado em UM arquivo do produto
 * (`lib/roiVisualExport.ts`), com UM consumidor (`DashboardRoiPage`), e a
 * calculadora exporta CSV. O que sobra ali é mecânica e não decisão — chip e
 * badge convertem hoje porque são CSS e `var()` resolve; **série do Recharts
 * não**, porque recebe a cor em ATRIBUTO (`<Cell fill={…}>`), onde `var()` não
 * resolve. Nenhuma das ocorrências desta fila é série de gráfico.
 *
 * ### motivo: `cor-vem-de-dado-do-banco` (2)
 *
 * `procedimentos/theme.ts` e `processos/ProcessList.tsx` pintam com hex que é
 * **identidade** (qual processo, qual cliente), e no segundo caso o valor vem da
 * coluna `color` do catálogo de clientes. Não é papel de status e não há token
 * para isso hoje. A saída é `comAlfa`, que aceita qualquer valor — mas a
 * conversão precisa saber o que o banco pode devolver, e isso é uma medição que
 * ainda não foi feita.
 */
const FILA_DO_ALFA_COLADO: Record<string, number> = {
  // motivo: chip-de-categoria-na-calculadora
  'src/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto.tsx': 2,
  'src/components/equipe/dev/calculadora-ibs-cbs/AbaResumo.tsx': 1,
  'src/components/equipe/dev/calculadora-ibs-cbs/UfDrillDown.tsx': 3,
  'src/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoTopClientes.tsx': 1,
  'src/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoUfs.tsx': 2,
  'src/components/equipe/dev/calculadora-ibs-cbs/por-estado/Primitives.tsx': 2,
  // motivo: cor-vem-de-dado-do-banco
  'src/components/equipe/dev/procedimentos/theme.ts': 1,
  'src/components/equipe/processos/ProcessList.tsx': 1,
};

describe('alfa colado no fim do hex', () => {
  it('não cresce: o inventário por arquivo é exatamente a fila com motivo', () => {
    expect(medirCorCrua(ALFA_COLADO)).toEqual(FILA_DO_ALFA_COLADO);
  });

  it('as cinco que estavam quebradas no ar não voltam', () => {
    const medido = medirCorCrua(ALFA_COLADO);
    // O fundo do modo ativo do compositor do agente.
    expect(medido['src/components/ui/ai-prompt-box.tsx']).toBeUndefined();
    // A trilha da régua do PPR e a borda da etiqueta da mesma linha.
    expect(medido['src/pages/gerencial/desempenho/DesempenhoMetas.tsx']).toBeUndefined();
    // A pílula de sentimento na lista e os cinco botões do seletor no formulário.
    expect(medido['src/pages/gerencial/desempenho/DesempenhoReunioes1a1.tsx']).toBeUndefined();
  });

  /**
   * A prova no sentido contrário. Sem ela, o teste acima fica verde tanto com o
   * padrão consertado quanto com um regex que não casa com nada — e aí a catraca
   * não guarda porta nenhuma.
   */
  it('o padrão realmente casa com a forma do defeito, e não com a da correção', () => {
    const defeito = 'style={{ background: `${m.cor}26` }}';
    const correcao = 'style={{ background: comAlfa(m.cor, 15) }}';
    expect(defeito.match(ALFA_COLADO)).toHaveLength(1);
    expect(correcao.match(ALFA_COLADO)).toBeNull();

    // TODAS as formas que existiam no produto, uma a uma. As duas últimas são as
    // que os dois recortes estreitos anteriores deixaram passar — índice de array,
    // e índice com espaço e sinal —, e eram justamente as quebradas no ar.
    expect('`${c.text}15`'.match(ALFA_COLADO)).toHaveLength(1);
    expect('`${corDoAnexo(p.anexo)}20`'.match(ALFA_COLADO)).toHaveLength(1);
    expect('`${client.color}20`'.match(ALFA_COLADO)).toHaveLength(1);
    expect('`${CORES_NATUREZA[dados.natureza]}15`'.match(ALFA_COLADO)).toHaveLength(1);
    expect('`${sentimentColors[r.sentimento - 1]}20`'.match(ALFA_COLADO)).toHaveLength(1);

    // Não confundir com interpolação legítima que não é alfa: a largura de barra
    // e o gradiente de porcentagem terminam em `%`, a borda com token válido não
    // tem sufixo nenhum, e nome de arquivo com data não encosta na crase.
    expect('`${Math.min(100, pct * 4)}%`'.match(ALFA_COLADO)).toBeNull();
    expect('`3px solid ${cor}`'.match(ALFA_COLADO)).toBeNull();
    expect('`ibs-cbs-${iso}.csv`'.match(ALFA_COLADO)).toBeNull();
  });
});
