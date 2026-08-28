import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoricoDeSimulacoes } from './HistoricoDeSimulacoes';
import { simulacaoSalva } from './simulacaoSalvaFixture';

// O que este componente prende: a lista mostra o que está gravado, CLICAR ABRE (não
// expande) e o filtro de status recorta. O `Select` do Radix não é acionado — em jsdom
// ele depende de pointer events e quebra por motivo de biblioteca —, então o filtro
// entra pela prop, que é como a página o controla.
//
// ABRIR É LER: nenhum número aqui sai de cálculo, todos vêm da linha gravada.

const montar = (props: Partial<Parameters<typeof HistoricoDeSimulacoes>[0]> = {}) => render(
  <HistoricoDeSimulacoes
    simulacoes={[simulacaoSalva()]}
    carregando={false}
    statusFiltrado={null}
    aoFiltrarStatus={vi.fn()}
    aoAbrir={vi.fn()}
    {...props}
  />,
);

describe('HistoricoDeSimulacoes', () => {
  it('lista o TOTAL DO ATO nos três cenários, não só o imposto da doação', () => {
    montar();
    // Nome CURTO: o cadastro guarda o nome inteiro em caixa alta, e dois deles em
    // Doa/Recebe comiam a largura das colunas de dinheiro.
    expect(screen.getByText('Avelino')).toBeInTheDocument();
    expect(screen.getByText('Cristina')).toBeInTheDocument();
    expect(screen.getByText('2026-02')).toBeInTheDocument();

    // Os três TOTAIS — doação + instituição de usufruto —, e não o imposto da doação
    // sozinho (que é 186.864,00 e não aparece mais na lista).
    expect(screen.getByText('Total do ato')).toBeInTheDocument();
    expect(screen.getByText('R$ 195.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 93.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 258.000,00')).toBeInTheDocument();
    expect(screen.queryByText('R$ 186.864,00')).not.toBeInTheDocument();
    // Sem nome dado, a simulação se chama pela versão — que é o rótulo que ela
    // sempre teve na coluna.
    expect(screen.getByText('Versão 1')).toBeInTheDocument();
  });

  it('o NOME dado substitui o rótulo da versão', () => {
    montar({ simulacoes: [simulacaoSalva({ nome: '51% pelo Avelino' })] });
    expect(screen.getByText('51% pelo Avelino')).toBeInTheDocument();
    expect(screen.queryByText('Versão 1')).not.toBeInTheDocument();
  });

  it('CLICAR ABRE a simulação, e não expande a linha', () => {
    const aoAbrir = vi.fn();
    montar({ aoAbrir });

    fireEvent.click(screen.getByText('Avelino'));
    expect(aoAbrir).toHaveBeenCalledWith('S1');

    // Nada do conteúdo da simulação entra na lista: quem mostra é a tela aberta.
    expect(screen.queryByText('Valor contábil')).not.toBeInTheDocument();
    expect(screen.queryByText('Transmitido')).not.toBeInTheDocument();
  });

  it('o status é ETIQUETA, não seletor: quem troca é a tela aberta', () => {
    montar({ simulacoes: [simulacaoSalva({ status: 'aprovada' })] });
    expect(screen.getByText('Aprovada')).toBeInTheDocument();
    // Um combobox só na tela: o filtro do cabeçalho.
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('o FILTRO de status recorta a lista, e diz quando não sobra nada', () => {
    const aprovada = simulacaoSalva({ id: 'S2', versao: 2, status: 'aprovada' });
    const { unmount } = montar({
      simulacoes: [aprovada, simulacaoSalva()],
      statusFiltrado: 'aprovada',
    });
    // Duas gravadas, uma visível: a contagem diz as duas coisas.
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    unmount();

    montar({ simulacoes: [simulacaoSalva()], statusFiltrado: 'aprovada' });
    expect(screen.getByText(/Nenhuma simulação com status Aprovada/)).toBeInTheDocument();
  });

  it('sem nada gravado, diz isso — e não "nenhuma com este status"', () => {
    montar({ simulacoes: [] });
    expect(screen.getByText(/Nenhuma simulação gravada/)).toBeInTheDocument();
  });

  it('carregando não finge lista vazia', () => {
    montar({ simulacoes: [], carregando: true });
    expect(screen.getByText(/Carregando o histórico/)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma simulação gravada/)).not.toBeInTheDocument();
  });
});
