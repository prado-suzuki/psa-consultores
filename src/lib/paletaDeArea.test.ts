import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANCORAS,
  AREAS_CONGELADAS_NA_BASE,
  PAPEIS_DE_STATUS,
  TEMAS,
  TONS_DE_TAG,
  blocoDoTema,
  distanciaDeMatiz,
  paletaDoTema,
  problemasDeDivergencia,
  problemasDeSeparacao,
  problemasDoTema,
  problemasDosSemanticos,
  type Hsl,
} from '@/lib/paletaDeArea';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

/**
 * A âncora de cada bloco de tema do `index.css`.
 *
 * A lista de temas do CSS e a lista de áreas do produto não casam uma a uma, e
 * é por isso que este mapa existe aqui e não em `ANCORAS`: o `:root` e a
 * `.rotina-theme` dividem a âncora da casa, porque a Rotina é uma das telas que
 * não pertencem a área nenhuma. Quem sabe amarrar tema a área é este arquivo.
 */
const ANCORA_DO_TEMA: Record<(typeof TEMAS)[number], Hsl> = {
  ':root': ANCORAS.casa,
  '.tax-theme': ANCORAS.tax,
  '.osg-theme': ANCORAS.osg,
  '.rotina-theme': ANCORAS.casa,
};

/**
 * Dívida dos papéis semânticos, medida hoje e fixada aqui item a item.
 *
 * Por que uma lista, e não `toEqual([])`: os três semânticos entraram no
 * contrato DEPOIS de já estarem no ar em todas as telas, e as 12 falhas abaixo
 * são valores de cor que já estão em produção. Corrigi-las é decisão de
 * identidade visual — não cabe a um teste tomá-la, e deixar o teste vermelho até
 * que ela seja tomada só ensina a equipe a ignorar o vermelho.
 *
 * O que a lista faz é o oposto de silenciar: a asserção é de igualdade EXATA,
 * então ela é uma catraca nos dois sentidos. Falha nova que não esteja aqui
 * derruba o teste; item daqui que seja CORRIGIDO também derruba, pedindo que
 * saia da lista. A dívida só pode diminuir, e nunca de fininho.
 *
 * Ler a lista: `--warning` reprova como texto em todos os quatro temas, entre
 * 1,54:1 e 2,13:1 — é o amarelo, e é a decisão que está na mesa. `--success`
 * reprova em três temas por pouco (4,18–4,21:1 contra 4,5:1). O `--destructive`
 * do `:root` reprova nos dois empregos; a Tax, a OSG e a Rotina já corrigiram o
 * deles, e é só a base que ficou atrás.
 */
const DIVIDA_SEMANTICA = [
  ':root · destructive · preenchido',
  ':root · destructive · texto',
  ':root · success · preenchido',
  ':root · success · texto',
  ':root · warning · texto',
  '.tax-theme · success · preenchido',
  '.tax-theme · success · texto',
  '.tax-theme · warning · texto',
  '.osg-theme · warning · texto',
  '.rotina-theme · success · preenchido',
  '.rotina-theme · success · texto',
  '.rotina-theme · warning · texto',
];

/**
 * Guarda das paletas de área. Vale para o `index.css` de verdade: área nova que
 * esqueça um papel, exagere a saturação ou quebre contraste falha AQUI, e não na
 * tela do usuário.
 */
describe('paletas de área declaradas no index.css', () => {
  it.each(TEMAS)('%s declara a paleta inteira, com contraste e dentro da faixa', tema => {
    expect(blocoDoTema(css, tema), `bloco ${tema} não existe no index.css`).not.toBe('');
    const problemas = problemasDoTema(css, tema);
    const relatorio = problemas.map(p => `  ${p.tema} · ${p.item}: ${p.motivo}`).join('\n');
    expect(problemas, `paleta fora do contrato:\n${relatorio}`).toEqual([]);
  });

  it('toda área declara os mesmos papéis e tons da base — nada de herança silenciosa', () => {
    const esperado = [
      ...PAPEIS_DE_STATUS.flatMap(papel => [`status-${papel}`, `status-${papel}-soft`]),
      ...TONS_DE_TAG.map(tom => `tag-${tom}`),
    ].sort();
    for (const tema of TEMAS) {
      expect(Object.keys(paletaDoTema(css, tema)).sort(), `${tema} divergiu da base`).toEqual(esperado);
    }
  });

  it.each(TEMAS)('%s: dois papéis nunca viram a mesma bolinha de 8px', tema => {
    // Substitui a antiga asserção "a rampa fila → andamento → revisão escurece".
    // Aquela regra APROVAVA o defeito que motivou este teste: os três papéis no
    // mesmo teal, separados só por 6 pontos de luminosidade, passavam na rampa e
    // saíam indistinguíveis na legenda do Gantt (bolinha de 8px, sem rótulo
    // colado). O que importa não é a ordem da rampa: é a distância entre CADA
    // par de tons cheios. Critério e calibragem em `SEPARACAO`.
    const problemas = problemasDeSeparacao(css, tema);
    const relatorio = problemas.map(p => `  ${p.tema} · ${p.item}: ${p.motivo}`).join('\n');
    expect(problemas, `papéis que colidem como bolinha:\n${relatorio}`).toEqual([]);
  });

  it('todo papel é o significado do sistema, com a saturação da área', () => {
    // Substitui a asserção "o mesmo papel muda de cara ao trocar de área", e
    // afirma o CONTRÁRIO dela — as duas não convivem, e a troca é o coração da
    // mudança para cor por camada.
    //
    // A asserção antiga nasceu de um defeito real: a Tax e a OSG tinham
    // declarado paletas quase idênticas (o `alerta` das duas a 1° de matiz e
    // ZERO ponto de luminosidade), e a legenda do Gantt de uma lia como a da
    // outra. A correção dela foi exigir que cada área escolhesse os oito
    // DIFERENTES — o que resolveu a colisão e criou outro problema: "alerta"
    // deixou de ser um conceito do sistema e virou uma cor por tela. Quem
    // aprendia a bolinha na Tax reaprendia na OSG.
    //
    // O modelo novo separa as duas coisas. O significado (matiz e luminosidade)
    // é do sistema e não muda de área para área; a identidade da área mora na
    // âncora, que pinta cabeçalho, botão e primeira série do gráfico. O único
    // canal que a área move nos papéis é a saturação, pela fórmula de
    // `harmonizar`.
    //
    // O que este teste faz de novo: ele não OLHA os valores, ele os RECALCULA e
    // compara. O `index.css` deixa de ser lugar de escolha e passa a ser lugar
    // de resultado — editar um valor à mão vira erro com o nome do papel dentro.
    const problemas = TEMAS.flatMap(tema => problemasDeDivergencia(css, tema, ANCORA_DO_TEMA[tema]));
    const relatorio = problemas.map(p => `  ${p.tema} · ${p.item}: ${p.motivo}`).join('\n');
    expect(
      problemas,
      `valores que não saem da fórmula. Se a intenção era mudar a cor, mude o\n` +
        `SIGNIFICADO ou a ÂNCORA em paletaDeArea.ts e regenere — não edite o CSS:\n${relatorio}`,
    ).toEqual([]);
  });

  it('o soft acompanha o tom cheio do próprio papel, em toda área', () => {
    // O par (soft, cheio) tem que ler como a MESMA cor em duas profundidades. É o
    // que sobrou da regra da rampa: a leitura de avanço agora vem da separação
    // entre papéis, mas a pílula continua sendo um papel só, e um soft que fugisse
    // da família do seu cheio faria a pílula parecer dois papéis empilhados.
    for (const tema of TEMAS) {
      const paleta = paletaDoTema(css, tema);
      for (const papel of PAPEIS_DE_STATUS) {
        const distancia = distanciaDeMatiz(paleta[`status-${papel}`], paleta[`status-${papel}-soft`]);
        expect(distancia, `${tema}: soft de ${papel} a ${distancia.toFixed(0)}° do tom cheio, longe demais`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('papéis de significado oposto não se confundem na mesma área', () => {
    // "Concluído" e "devolvido para ajuste" precisam ser distinguíveis lado a lado:
    // é o par que mais dói errar numa lista. Os dois são tons escuros, então quem
    // decide é a matiz — a razão de contraste entre eles é ~1:1 por construção.
    for (const tema of TEMAS) {
      const paleta = paletaDoTema(css, tema);
      const distancia = distanciaDeMatiz(paleta['status-feito'], paleta['status-ajuste']);
      expect(distancia, `${tema}: feito e ajuste a ${distancia.toFixed(0)}° de matiz, perto demais`).toBeGreaterThan(60);
    }
  });

  it.each(AREAS_CONGELADAS_NA_BASE)('%s ainda é cópia da base — quando deixar de ser, a exceção sai', tema => {
    // Contrapeso de `AREAS_CONGELADAS_NA_BASE`. A exceção existe porque a paleta
    // desta área é, hoje, a da base — decisão registrada no `index.css`, não
    // esquecimento. No dia em que ela ganhar cor própria, a exceção passa a
    // esconder uma checagem de verdade, e é este teste que avisa.
    const chaves = PAPEIS_DE_STATUS.flatMap(papel => [`status-${papel}`, `status-${papel}-soft`]);
    const recorte = (seletor: string) => {
      const paleta = paletaDoTema(css, seletor);
      return Object.fromEntries(chaves.map(chave => [chave, paleta[chave]]));
    };
    expect(
      recorte(tema),
      `${tema} não é mais cópia da base: tire o nome de AREAS_CONGELADAS_NA_BASE ` +
        `(em paletaDeArea.ts) para que a separação entre áreas volte a valer para ela.`,
    ).toEqual(recorte(':root'));
  });

  it('os papéis semânticos cumprem o contrato, tirando a dívida registrada', () => {
    // O buraco que deixou o `--warning` passar: este arquivo checava os oito
    // papéis de status e mais nada, e o vermelho/verde/amarelo do sistema —
    // usados em botão, toast e `text-warning` — não tinham teste nenhum.
    //
    // A comparação é de igualdade exata contra `DIVIDA_SEMANTICA` de propósito:
    // ela falha tanto quando aparece falha nova quanto quando uma das listadas é
    // corrigida. Ver o comentário da lista para o porquê.
    const problemas = TEMAS.flatMap(tema => problemasDosSemanticos(css, tema));
    const relatorio = problemas.map(p => `  ${p.tema} · ${p.item}: ${p.motivo}`).join('\n');
    expect(
      problemas.map(p => `${p.tema} · ${p.item}`).sort(),
      `a dívida semântica mudou. Se um item NOVO apareceu, é regressão — conserte a cor.\n` +
        `Se um item da lista foi CORRIGIDO, tire-o de DIVIDA_SEMANTICA (neste arquivo).\n` +
        `Medido agora:\n${relatorio}`,
    ).toEqual([...DIVIDA_SEMANTICA].sort());
  });
});
