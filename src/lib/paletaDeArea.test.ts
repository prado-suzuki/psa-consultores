import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANCORAS,
  PAPEIS_DE_STATUS,
  TEMAS,
  TONS_DE_TAG,
  blocoDoTema,
  distanciaDeMatiz,
  paletaDoTema,
  problemasDeDivergencia,
  problemasDeSeparacao,
  problemasDeSuperficie,
  problemasDoTema,
  problemasDosSemanticos,
  type Hsl,
} from '@/lib/paletaDeArea';

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

/**
 * A âncora de cada bloco de tema do `index.css`.
 *
 * A lista de temas do CSS e a lista de áreas do produto não casam uma a uma, e
 * é por isso que este mapa existe aqui e não em `ANCORAS`: o `:root` É a casa,
 * o teal da marca, e a casa cobre também as telas que não pertencem a área
 * nenhuma — o Portal do Cliente e a Rotina. Nenhuma das duas tem bloco próprio,
 * e é justamente porque a âncora delas já é a do piso. Quem sabe amarrar tema a
 * área é este arquivo.
 */
const ANCORA_DO_TEMA: Record<(typeof TEMAS)[number], Hsl> = {
  ':root': ANCORAS.casa,
  '.tax-theme': ANCORAS.tax,
  '.osg-theme': ANCORAS.osg,
};

/**
 * Dívida dos papéis semânticos. Está vazia, e a lista continua existindo para
 * que voltar a encher seja uma decisão escrita e não um descuido.
 *
 * Ela teve 12 itens. Eram valores de cor já em produção, fixados um a um porque
 * corrigi-los era decisão de identidade visual, e um teste não toma decisão de
 * identidade. `--warning` reprovava como texto nos quatro temas, entre 1,54:1 e
 * 2,13:1; `--success` reprovava em três por pouco; o `--destructive` do `:root`
 * reprovava nos dois empregos.
 *
 * Os 12 saíram de uma vez, e não um a um: `--destructive`, `--warning` e
 * `--success` passaram a ser o `ajuste`, o `alerta` e o `feito` da área. Como
 * papéis de status eles já nascem calibrados para receber texto claro, então
 * nenhum dos 12 precisou de um valor novo escolhido à mão. O `--warning` não
 * tinha outra saída: não existe luminosidade que faça o âmbar a 92% de saturação
 * servir de texto sem trocar junto o `-foreground` dele.
 *
 * A asserção é de igualdade EXATA, então a lista é catraca nos dois sentidos:
 * falha nova que não esteja aqui derruba o teste, e item daqui que seja
 * corrigido também derruba, pedindo que saia. Com a lista vazia, o segundo caso
 * não existe e sobra o primeiro — que é o que se quer guardar.
 */
const DIVIDA_SEMANTICA: string[] = [];

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

  it.each(TEMAS)('%s: o texto fecha AA sobre a superfície que a área entrega', tema => {
    // Terceiro andar do mesmo buraco. O primeiro deixou o `--warning` passar;
    // este deixou passar o texto comum — `foreground` e `muted-foreground`
    // sobre background/card/popover, e o par cheio do `--primary`. Nenhum
    // tinha teste, e foi por aí que o seletor de data ficou com o dia de outro
    // mês em cinza cru a 2,5:1: o token nunca chegou lá e nada acusou.
    const problemas = problemasDeSuperficie(css, tema);
    const relatorio = problemas.map(p => `  ${p.tema} · ${p.item}: ${p.motivo}`).join('\n');
    expect(problemas, `pares de superfície reprovados:\n${relatorio}`).toEqual([]);
  });
});
