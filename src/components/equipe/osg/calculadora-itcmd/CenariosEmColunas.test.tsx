import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CenariosEmColunas } from './CenariosEmColunas';
import type { SaidaSimulacao } from '@/lib/osg/itcmd/simulacao';

// Os três quadros de saída. O que este teste prende é a LEITURA: total no pé, base
// e imposto por donatário, e cenário sem valor no cadastro aparecendo como ausente
// em vez de R$ 0,00 — que é a pior saída possível numa ferramenta de decisão.

const donatario = (id: string, nome: string) => ({
  donatarioId: id,
  nome,
  quotasRecebidas: '3324700',
  percentual: '50.0000',
  percentualDoAto: '50.0000',
  numeroDeGias: 1,
  doacaoAnterior: null,
  porCenario: {
    contabil: { base: '3324700.00', imposto: '186864.00' },
    itr: null,
    mercado: null,
  },
});

const saida: SaidaSimulacao = {
  competencia: '2026-02',
  upf: '255.20',
  totalDeQuotas: '6649400',
  gias: [],
  linhas: [donatario('gabriel', 'Gabriel'), donatario('rafael', 'Rafael')],
  acervoPorCenario: { contabil: '6649400.00', itr: null, mercado: null },
  basesPorCenario: { contabil: '6649400.00', itr: null, mercado: null },
  totaisPorCenario: { contabil: '373728.00', itr: null, mercado: null },
  cenariosIndisponiveis: ['itr', 'mercado'],
};

describe('CenariosEmColunas', () => {
  it('um quadro por cenário, com o total no pé', () => {
    render(<CenariosEmColunas saida={saida} />);

    expect(screen.getByText('Valor contábil')).toBeInTheDocument();
    expect(screen.getByText('Valor de ITR')).toBeInTheDocument();
    expect(screen.getByText('Valor de mercado')).toBeInTheDocument();

    // Acervo, imposto por donatário e o total — cada um uma vez.
    expect(screen.getAllByText('R$ 6.649.400,00')).toHaveLength(1);
    expect(screen.getAllByText('R$ 186.864,00')).toHaveLength(2);
    expect(screen.getAllByText('R$ 373.728,00')).toHaveLength(1);
  });

  it('cenário sem valor no cadastro diz o motivo e NUNCA mostra zero', () => {
    // A FRASE VEM DE FORA, do controlador, e é a mesma do aviso do topo. Havia texto
    // fixo aqui — "não há valor de ITR nas matrículas deste cliente" — e ele passou a
    // mentir quando o cenário virou indisponível por bem faltando: no Agro Aliança o
    // aviso dizia "3 de 13 bens sem valor de ITR" e este parágrafo, ao lado, dizia que
    // não havia nenhum, com 9 das 12 matrículas preenchidas.
    render(
      <CenariosEmColunas
        saida={saida}
        falta={{
          contabil: null,
          itr: '3 de 13 bens sem valor de ITR',
          mercado: 'nenhum dos 13 bens tem valor de mercado',
        }}
      />,
    );

    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    expect(screen.getByText(/3 de 13 bens sem valor de ITR/)).toBeInTheDocument();
    expect(screen.getByText(/nenhum dos 13 bens tem valor de mercado/)).toBeInTheDocument();
    // E o texto antigo não volta: ele afirmava sobre as matrículas do cliente sem ter
    // como saber.
    expect(screen.queryByText(/Não há valor de ITR nas matrículas/)).not.toBeInTheDocument();
  });

  it('sem a frase de fora, o quadro nao inventa a causa', () => {
    // Fallback: diz que o cadastro está incompleto, que é o que se sabe sem os números.
    render(<CenariosEmColunas saida={saida} />);
    expect(screen.getAllByText(/Cadastro incompleto neste cenário/)).toHaveLength(2);
  });

  it('doação anterior declarada aparece ao lado do imposto', () => {
    const comAnterior: SaidaSimulacao = {
      ...saida,
      linhas: [{ ...saida.linhas[0], doacaoAnterior: '831175.00' }],
    };
    render(<CenariosEmColunas saida={comAnterior} />);
    expect(screen.getByText(/já recebeu R\$ 831\.175,00/)).toBeInTheDocument();
  });
});
