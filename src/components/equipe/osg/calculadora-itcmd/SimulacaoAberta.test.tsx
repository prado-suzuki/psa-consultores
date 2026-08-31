import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SimulacaoAberta } from './SimulacaoAberta';
import { colunasSemDica } from './alinhamentoDeTabela';
import { simulacaoSalva } from './simulacaoSalvaFixture';

// O que esta tela prende: as três abas mostram o retrato GRAVADO e o nome se edita.
// As abas são acionadas de verdade — diferente do `Select` do Radix, que em jsdom
// depende de pointer events e quebra por motivo de biblioteca. O status, por isso,
// só é verificado como campo presente.
//
// ABRIR É LER: nenhum número aqui sai de cálculo.

/**
 * TROCAR DE ABA. O `TabsTrigger` do Radix seleciona no `mouseDown`, nao no `click`:
 * disparar so o click deixa a aba anterior montada e o teste falha dizendo que o
 * conteudo nao existe.
 */
const irPara = (aba: string) =>
  fireEvent.mouseDown(screen.getByRole('tab', { name: aba }));

const montar = (props: Partial<Parameters<typeof SimulacaoAberta>[0]> = {}) => render(
  <SimulacaoAberta
    simulacao={simulacaoSalva()}
    todas={[simulacaoSalva()]}
    aoFechar={vi.fn()}
    aoAlterarStatus={vi.fn()}
    alterando={false}
    aoRenomear={vi.fn()}
    renomeando={false}
    {...props}
  />,
);

describe('SimulacaoAberta', () => {
  it('sem simulação, não abre nada', () => {
    montar({ simulacao: null });
    expect(screen.queryByText('Versão 1')).not.toBeInTheDocument();
  });

  it('abre na DOAÇÃO, com o quadro congelado', () => {
    montar();
    // O quadro preenchido, com o que cada um levou de cada parte.
    expect(screen.getByText('Transmitido')).toBeInTheDocument();
    // A EMISSÃO GIA congelada, com o cônjuge nomeado.
    expect(screen.getByText('Em conjunto · Iracema')).toBeInTheDocument();
    // As quotas atuais e a final do donatário.
    expect(screen.getAllByText('1.483.000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4.778.972').length).toBeGreaterThan(0);
    // Com uma donatária só, a linha dela e o TOTAL leem o mesmo número.
    expect(screen.getAllByText('1.112.125')).toHaveLength(2);
    expect(screen.getAllByText('2.183.847')).toHaveLength(2);
    // O transmitido do doador vem gravado — não é rateio na exibição.
    expect(screen.getAllByText('3.295.972').length).toBeGreaterThan(0);

    // O cálculo NÃO está na tela ainda: cada aba mostra a sua pergunta.
    expect(screen.queryByText('Valor contábil')).not.toBeInTheDocument();
  });

  it('o APORTE gravado volta no quadro, com o valor e a origem das quotas', async () => {
    montar();
    // A coluna existe porque HOUVE aporte: R$ 3.000.000 do Avelino.
    expect(screen.getByText('Aporte (R$)')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 3.000.000,00').length).toBeGreaterThan(0);

    // E o quadro sabe dizer QUANTAS quotas vieram de dinheiro — que é a razão de a
    // coluna `quotas_do_aporte` existir: o preço da quota de antes não é recuperável.
    //
    // A explicação é TOOLTIP e não `title`, então ela só existe no DOM quando abre. O
    // caminho do teste é o do TECLADO — tabulação e depois foco —, e a tabulação não é
    // enfeite: a dica ignora foco que não foi pedido, porque o `Dialog` foca ao abrir e
    // o `Select` devolve o foco ao gatilho, e nos dois casos ela subia sozinha.
    // (`itcmdKit.test.tsx` prende as três situações.)
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.focus(screen.getByText('4.448.500'));
    // `findAll` porque o Radix duplica o conteúdo: o balão visível e uma cópia
    // escondida para leitor de tela. As duas são o comportamento correto.
    expect((await screen.findAllByText(/Inclui 3\.000\.000 quotas compradas pelo aporte/))
      .length).toBeGreaterThan(0);
  });

  it('SEM APORTE a coluna não existe: zeros em toda simulação seriam ruído', () => {
    montar({
      simulacao: simulacaoSalva({
        doadores: [{
          pessoaId: 'p1', nome: 'Avelino',
          quotas: '4448500', quotasTransmitidas: '3295972', quotasFinal: '1152528',
          emissaoConjunta: false, conjugeNome: null,
          vlrAporteMoeda: '0.00', quotasDoAporte: '0',
        }],
      }),
    });
    expect(screen.queryByText('Aporte (R$)')).not.toBeInTheDocument();
  });

  it('a aba do CÁLCULO traz os três cenários com base e imposto gravados', () => {
    montar();
    irPara('Cálculo do ITCD');

    expect(screen.getByText('Valor contábil')).toBeInTheDocument();
    expect(screen.getByText('Valor de ITR')).toBeInTheDocument();
    expect(screen.getByText('Valor de mercado')).toBeInTheDocument();

    // A ALÍQUOTA e a BASE de cada donatário, um quadro por cenário.
    expect(screen.getAllByText('2% a 8%')).toHaveLength(3);
    expect(screen.getAllByText('Base de cálculo')).toHaveLength(3);
    expect(screen.getByText('R$ 1.700.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.100.000,00')).toBeInTheDocument();
    // E os impostos gravados, um por cenário — nada recalculado.
    expect(screen.getByText('R$ 45.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 125.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 186.864,00')).toBeInTheDocument();
  });

  it('COM DOIS DOADORES o cálculo sai POR GUIA, que é o que se preenche', () => {
    // O caso que motivou a tabela de GIA: pai e mãe doam ao mesmo filho, cada um na
    // sua guia. Somar as duas dá base 3.324.700 ao lado de imposto 167.953,44 — e
    // imposto(3.324.700) é 186.864,00. O resumo por donatário guardava a base de uma
    // leitura e o imposto de outra.
    montar({
      simulacao: simulacaoSalva({
        donatarios: [{
          pessoaId: 'g', nome: 'Gabriel',
          quotasAtuais: '0', quotasLegitima: '3324700', quotasDisponivel: '0',
          quotasFinal: '3324700', vlrAporteMoeda: '0.00', quotasDoAporte: '0',
          percentual: '50.0000',
        }],
        gias: [
          {
            doadorId: 'pai', doadorNome: 'Cristiano',
            donatarioId: 'g', donatarioNome: 'Gabriel',
            quotasRecebidas: '3043336', pctDaGia: '100.0000', doacaoAnterior: null,
            basePorCenario: { contabil: '3043336.00', itr: null, mercado: null },
            impostoPorCenario: { contabil: '164354.88', itr: null, mercado: null },
          },
          {
            doadorId: 'mae', doadorNome: 'Fabiane',
            donatarioId: 'g', donatarioNome: 'Gabriel',
            quotasRecebidas: '281364', pctDaGia: '100.0000', doacaoAnterior: null,
            basePorCenario: { contabil: '281364.00', itr: null, mercado: null },
            impostoPorCenario: { contabil: '3598.56', itr: null, mercado: null },
          },
        ],
      }),
    });
    irPara('Cálculo do ITCD');

    // A seção muda de nome: o leitor precisa saber que a régua virou a guia. Três
    // cabeçalhos, um por cenário.
    expect(screen.getAllByText('Base de cálculo, por guia')).toHaveLength(3);
    expect(screen.getAllByText('Simulação do ITCD, por guia')).toHaveLength(3);

    // Cada guia com o par na frente: 3 cenários × 2 seções (base e imposto).
    expect(screen.getAllByText('Cristiano → Gabriel')).toHaveLength(6);
    expect(screen.getAllByText('Fabiane → Gabriel')).toHaveLength(6);
    expect(screen.getByText('R$ 3.043.336,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 164.354,88')).toBeInTheDocument();
    expect(screen.getByText('R$ 281.364,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 3.598,56')).toBeInTheDocument();

    // E a base somada, que era o que o resumo antigo gravava, NÃO aparece em lugar
    // nenhum: ela não corresponde a guia nenhuma.
    expect(screen.queryByText('R$ 3.324.700,00')).not.toBeInTheDocument();
  });

  it('COM UM DOADOR a seção segue por donatário: a guia é ele', () => {
    montar();
    irPara('Cálculo do ITCD');
    expect(screen.getAllByText('Base de cálculo')).toHaveLength(3);
    expect(screen.queryByText('Base de cálculo, por guia')).not.toBeInTheDocument();
    // O par não aparece: com um doador, dizer "Avelino → Cristina" em toda linha é
    // repetir o mesmo nome à esquerda de tudo.
    expect(screen.queryByText('Avelino → Cristina')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cristina').length).toBeGreaterThan(0);
  });

  it('a aba do USUFRUTO traz o quadro gravado e DIZ o que o ato gerou', () => {
    montar();
    irPara('Usufruto');

    // O DESFECHO vem primeiro: é a pergunta de quem abre uma simulação antiga.
    expect(screen.getByText(/Reserva de usufruto na doação/)).toBeInTheDocument();
    expect(screen.getByText(/Instituição de usufruto/)).toBeInTheDocument();

    // O quadro, com o papel em português e a nua propriedade somando as duas origens.
    expect(screen.getByText('Usufrutuário')).toBeInTheDocument();
    expect(screen.getByText('Nu-proprietário')).toBeInTheDocument();
    expect(screen.getAllByText('3.508.972').length).toBeGreaterThan(0);

    // A guia da instituição, em quotas — o dinheiro dela mora na aba de Cálculo.
    expect(screen.getAllByText('213.000').length).toBeGreaterThan(0);
    expect(screen.getByText('1 guia')).toBeInTheDocument();
  });

  it('SEM ATO DE USUFRUTO, a aba diz isso em vez de deixar o quadro no ar', () => {
    montar({
      simulacao: simulacaoSalva({
        comReserva: false,
        concessoes: [],
        usufruto: [{
          pessoaId: 'p2', nome: 'Cristina', papel: 'concede',
          quotas: '4778972', quotasPlena: '4778972',
          quotasNuaReserva: '0', quotasNuaInstituicao: '0', quotasUsufruto: '0',
        }],
      }),
    });
    irPara('Usufruto');
    expect(screen.getByText(/Nenhum ato de usufruto neste cenário/)).toBeInTheDocument();
    expect(screen.getByText(/não há instrumento de usufruto nem guia a recolher/))
      .toBeInTheDocument();
  });

  it('simulação gravada ANTES do usufruto não finge um quadro', () => {
    montar({ simulacao: simulacaoSalva({ usufruto: [], concessoes: [] }) });
    irPara('Usufruto');
    expect(screen.getByText(/antes de o quadro de usufruto passar a ser/))
      .toBeInTheDocument();
  });

  it('A CADEIA aparece com o consolidado quando o ato PARTE de outro', () => {
    // Ato 1: a doação entre os herdeiros. Ato 2: a do fundador, partindo dele.
    const ato1 = simulacaoSalva({
      id: 'S0', versao: 1, nome: 'Entre os herdeiros',
      totalPorCenario: { contabil: '50000.00', itr: '20000.00', mercado: '60000.00' },
    });
    const ato2 = simulacaoSalva({
      id: 'S1', versao: 2, nome: 'Do fundador', origemSimulacaoId: 'S0',
      totalPorCenario: { contabil: '195000.00', itr: '93000.00', mercado: '258000.00' },
    });

    montar({ simulacao: ato2, todas: [ato1, ato2] });
    irPara('Cálculo do ITCD');

    // Os dois atos, em ordem CRONOLÓGICA — é a ordem em que aconteceram. O ato
    // aberto aparece duas vezes, no título e na linha dele da cadeia, e é o certo:
    // é ele que se está lendo, dentro do fluxo a que pertence.
    expect(screen.getByText('Entre os herdeiros')).toBeInTheDocument();
    expect(screen.getAllByText('Do fundador')).toHaveLength(2);
    expect(screen.getByText('Total dos 2 atos')).toBeInTheDocument();

    // E o consolidado: soma simples dos totais de cada ato.
    expect(screen.getByText('R$ 245.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 113.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 318.000,00')).toBeInTheDocument();
  });

  it('LAÇO na cadeia não travа a tela: a leitura para ao repetir', () => {
    // `origem_simulacao_id` é FK livre: A→B→A é possível por SQL, e sem guarda a
    // remontagem da cadeia entraria em laço infinito. É a única guarda de ciclo que
    // existe de verdade — a lista de origens não filtra nada, porque o modal sempre
    // monta uma simulação nova, que não pode ser ancestral de si mesma.
    const a = simulacaoSalva({ id: 'A', versao: 1, nome: 'Ato A', origemSimulacaoId: 'B' });
    const b = simulacaoSalva({ id: 'B', versao: 2, nome: 'Ato B', origemSimulacaoId: 'A' });

    montar({ simulacao: a, todas: [a, b] });
    irPara('Cálculo do ITCD');

    // Parou, e mostrou os dois uma vez cada.
    expect(screen.getByText('Total dos 2 atos')).toBeInTheDocument();
    expect(screen.getAllByText('Ato A')).toHaveLength(2);
    expect(screen.getAllByText('Ato B')).toHaveLength(1);
  });

  it('ATO ÚNICO não mostra cadeia: uma linha só não é fluxo', () => {
    montar();
    irPara('Cálculo do ITCD');
    expect(screen.queryByText(/Total dos .* atos/)).not.toBeInTheDocument();
  });

  it('o LÁPIS renomeia, e o campo abre vazio com a versão como placeholder', () => {
    const aoRenomear = vi.fn();
    montar({ aoRenomear });

    expect(screen.getAllByText('Versão 1').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Renomear a simulação' }));

    const campo = screen.getByRole('textbox', { name: 'Nome da simulação' });
    // Vazio, não "Versão 1": o rótulo da versão é falta de nome, não um nome a apagar.
    expect(campo).toHaveValue('');
    expect(campo).toHaveAttribute('placeholder', 'Versão 1');

    fireEvent.change(campo, { target: { value: 'Sem reserva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar o nome' }));
    expect(aoRenomear).toHaveBeenCalledWith('S1', 'Sem reserva');
  });

  it('Enter salva, Esc desiste sem gravar', () => {
    const aoRenomear = vi.fn();
    montar({ aoRenomear });

    const abrir = () => fireEvent.click(
      screen.getByRole('button', { name: 'Renomear a simulação' }),
    );

    abrir();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Nome da simulação' }),
      { target: { value: 'Cenário II' } },
    );
    fireEvent.keyDown(
      screen.getByRole('textbox', { name: 'Nome da simulação' }),
      { key: 'Enter' },
    );
    expect(aoRenomear).toHaveBeenCalledWith('S1', 'Cenário II');

    aoRenomear.mockClear();
    abrir();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Nome da simulação' }),
      { target: { value: 'jogado fora' } },
    );
    fireEvent.keyDown(
      screen.getByRole('textbox', { name: 'Nome da simulação' }),
      { key: 'Escape' },
    );
    expect(aoRenomear).not.toHaveBeenCalled();
  });

  it('quem tem nome mostra o nome, e o lápis edita o nome existente', () => {
    montar({ simulacao: simulacaoSalva({ nome: '51% pelo Avelino' }) });
    expect(screen.getByText('51% pelo Avelino')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Renomear a simulação' }));
    expect(screen.getByRole('textbox', { name: 'Nome da simulação' }))
      .toHaveValue('51% pelo Avelino');
  });

  it('o cabeçalho mostra o que o retrato congelou', () => {
    montar();
    expect(screen.getByText('R$ 255,20')).toBeInTheDocument();
    expect(screen.getByText('2026-02')).toBeInTheDocument();
    expect(screen.getByText('9.557.944')).toBeInTheDocument();
  });

  /**
   * TODA TABELA TEM NOME, E A ORDEM DIZ O QUE VEIO PRIMEIRO.
   *
   * Duas tabelas empilhadas sem título obrigam a decifrar pelo cabeçalho das colunas o
   * que cada uma é — e na aba de usufruto elas respondem coisas diferentes: uma é o ATO
   * (quem instituiu para quem) e a outra é o RESULTADO (como o voto ficou).
   *
   * O título vem do quadro que ENVOLVE a tabela, então a lista sai na ordem do
   * documento: ela prende o nome e a posição de uma vez, e uma tabela sem título
   * aparece como `(sem título)` em vez de passar batido.
   */
  const titulosDosQuadros = () => [...document.querySelectorAll('table')]
    .map((t) => t.closest('section')?.querySelector('h4')?.textContent
      ?? '(sem título)');

  /**
   * NENHUMA COLUNA SEM EXPLICAÇÃO. Os rótulos desta tela são jargão fiscal — legítima,
   * disponível, transmitido, nua propriedade, voz e voto — e a tela é usada por quem
   * está aprendendo o ato, não só por quem o desenha. A falha nomeia a coluna esquecida.
   */
  it('toda coluna das três abas explica o que é', () => {
    montar();
    expect(colunasSemDica()).toEqual([]);
    irPara('Usufruto');
    expect(colunasSemDica()).toEqual([]);
    irPara('Cálculo do ITCD');
    expect(colunasSemDica()).toEqual([]);
  });

  it('a aba de DOAÇÃO tem um quadro, com nome', () => {
    montar();
    expect(titulosDosQuadros()).toEqual(['Quadro da doação']);
  });

  it('na aba de USUFRUTO o ato vem ANTES do resultado, e os dois têm nome', () => {
    montar();
    irPara('Usufruto');
    expect(titulosDosQuadros()).toEqual([
      'Quadro da instituição',
      'Quadro do usufruto',
    ]);
  });

  it('na aba de CÁLCULO, a cadeia também tem nome', () => {
    // A cadeia só existe com mais de um ato: a segunda simulação parte da primeira.
    const primeira = simulacaoSalva();
    const segunda = simulacaoSalva({
      id: 'S2',
      versao: 2,
      origemSimulacaoId: primeira.id,
    });
    montar({ simulacao: segunda, todas: [primeira, segunda] });
    irPara('Cálculo do ITCD');
    expect(titulosDosQuadros()).toEqual(['Cadeia de atos']);
  });
});
