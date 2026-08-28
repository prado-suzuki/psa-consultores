import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SimulacaoAberta } from './SimulacaoAberta';
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

  it('o APORTE gravado volta no quadro, com o valor e a origem das quotas', () => {
    montar();
    // A coluna existe porque HOUVE aporte: R$ 3.000.000 do Avelino.
    expect(screen.getByText('Aporte (R$)')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 3.000.000,00').length).toBeGreaterThan(0);

    // E o quadro sabe dizer QUANTAS quotas vieram de dinheiro — que é a razão de a
    // coluna `quotas_do_aporte` existir: o preço da quota de antes não é recuperável.
    expect(screen.getByTitle(/Inclui 3\.000\.000 quotas compradas pelo aporte/))
      .toBeInTheDocument();
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
});
