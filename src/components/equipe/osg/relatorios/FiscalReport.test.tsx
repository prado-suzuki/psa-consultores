// A tabela de "Imóveis e áreas exploradas" tem DUAS fontes: os registros de
// `exploracao_rural` e, quando o cliente não tem nenhum, um fallback derivado das
// matrículas. A armadilha que estes testes trancam é a terceira situação, que
// parecia com a segunda: quando a LEITURA FALHA, o hook devolve lista vazia, e sem
// olhar o erro o relatório trocaria de fonte calado. Um pacote que vai para a área
// Fiscal imprimiria área de matrícula como se fosse área explorada.
//
// Não é hipótese: contra o sandbox, hoje, as duas FKs que o `select` do hook embute
// (`explorador_pessoa_id` e `bem_id`) não existem mais, o PostgREST recusa a query,
// e era exatamente esse fallback silencioso que aparecia.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const exploracao = vi.hoisted(() => ({
  data: [] as unknown[],
  isLoading: false,
  isError: false,
}));

vi.mock('@/hooks/useExploracaoRural', () => ({
  useExploracaoRural: () => exploracao,
}));

vi.mock('@/hooks/useGestaoClientes', () => ({
  useClientesLista: () => ({ data: [{ id: 'cli-1', nome: 'Abacaxi Elétrico Agropecuária' }] }),
}));

vi.mock('@/hooks/useRelatorioDP', () => ({
  useRelatorioDP: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useAllMatriculas: () => ({
    data: [
      {
        id: 'mat-1',
        numero: '4321',
        bem_cliente_id: 'cli-1',
        titular_cliente_ids: [],
        bem_denominacao: 'Fazenda Banana Quântica',
        bem_referencia: null,
        municipio_imovel: 'Uberaba',
        uf_imovel: 'MG',
        tipo_exploracao_posse: 'Arrendamento',
        area_documento: 500,
        area_explorada: 400,
        area_unidade: 'ha',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('./EstruturaAtual', () => ({ EstruturaAtual: () => null }));

import { FiscalReport } from './FiscalReport';

const montar = () => render(<FiscalReport clienteId="cli-1" />);

describe('FiscalReport, a fonte da tabela de áreas exploradas', () => {
  it('sem exploração cadastrada, cai para as matrículas (o fallback legítimo)', () => {
    exploracao.data = [];
    exploracao.isError = false;

    montar();

    expect(screen.getByText('Fazenda Banana Quântica')).toBeInTheDocument();
    expect(screen.getByText(/1 matrículas/)).toBeInTheDocument();
  });

  it('leitura que FALHOU não vira fallback: avisa, e não imprime linha nenhuma', () => {
    exploracao.data = [];
    exploracao.isError = true;

    montar();

    // A matrícula não pode aparecer: os números dela viriam de outra fonte.
    expect(screen.queryByText('Fazenda Banana Quântica')).not.toBeInTheDocument();
    expect(screen.getByText(/Não foi possível ler as explorações rurais/)).toBeInTheDocument();
    expect(screen.getByText('leitura indisponível')).toBeInTheDocument();
  });

  it('enquanto a leitura corre, não decide a fonte', () => {
    exploracao.data = [];
    exploracao.isError = false;
    exploracao.isLoading = true;

    montar();

    expect(screen.getByText(/Carregando abertura de demanda/)).toBeInTheDocument();
    expect(screen.queryByText('Fazenda Banana Quântica')).not.toBeInTheDocument();
    exploracao.isLoading = false;
  });
});
