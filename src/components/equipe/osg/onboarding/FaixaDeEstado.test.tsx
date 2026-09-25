import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FaixaDeEstado,
  SeloEstadoSolicitacao,
} from './FaixaDeEstado';

const ENVIADA_EM = new Date(2026, 8, 10, 12).toISOString();
const ENCERRADA_EM = new Date(2026, 8, 20, 14, 35).toISOString();

describe('FaixaDeEstado', () => {
  it('enviada: a frase de hoje, palavra por palavra', () => {
    render(<FaixaDeEstado estado="enviada" enviadaEm={ENVIADA_EM} />);
    expect(screen.getByText(/aberta desde/)).toHaveTextContent('10/09/2026');
    expect(screen.getByText(/permanecerá aberta até ser finalizada\./)).toBeInTheDocument();
  });

  it('em checklist: a frase de hoje, palavra por palavra', () => {
    render(<FaixaDeEstado estado="em_checklist" enviadaEm={ENVIADA_EM} />);
    expect(screen.getByText(/em fase de/)).toHaveTextContent('checklist');
    expect(screen.getByText(/permanecerá aberta até ser finalizada\./)).toBeInTheDocument();
  });

  it('rascunho e encerrada não têm faixa aqui', () => {
    const { container: rascunho } = render(
      <FaixaDeEstado estado="rascunho" enviadaEm={null} />,
    );
    expect(rascunho).toBeEmptyDOMElement();
    const { container: encerrada } = render(
      <FaixaDeEstado estado="finalizada" enviadaEm={null} />,
    );
    expect(encerrada).toBeEmptyDOMElement();
  });
});

describe('SeloEstadoSolicitacao', () => {
  it('cada estado derivado com o rótulo e o papel do mapa', () => {
    const casos: Array<[Parameters<typeof SeloEstadoSolicitacao>[0]['estado'], string, string]> = [
      ['rascunho', 'Rascunho', 'status-fila'],
      ['enviada', `Enviada em 10/09/2026`, 'status-espera'],
      ['em_checklist', 'Em checklist', 'status-andamento'],
      ['finalizada', 'Finalizada em 20/09/2026', 'status-neutro'],
      ['cancelada', 'Cancelada em 20/09/2026', 'status-neutro'],
    ];
    for (const [estado, rotulo, papel] of casos) {
      const { unmount } = render(
        <SeloEstadoSolicitacao
          estado={estado}
          enviadaEm={ENVIADA_EM}
          encerradaEm={ENCERRADA_EM}
        />,
      );
      const selo = screen.getByText(rotulo);
      expect(selo.className).toContain(papel);
      unmount();
    }
  });

  it('só os dois estados que encerram levam tooltip, com a hora', () => {
    const { rerender } = render(
      <SeloEstadoSolicitacao
        estado="finalizada"
        enviadaEm={ENVIADA_EM}
        encerradaEm={ENCERRADA_EM}
      />,
    );
    expect(screen.getByText(/Finalizada em/)).toHaveAttribute(
      'title',
      'Finalizada em 20/09/2026 às 14h35',
    );

    rerender(
      <SeloEstadoSolicitacao
        estado="enviada"
        enviadaEm={ENVIADA_EM}
        encerradaEm={ENCERRADA_EM}
      />,
    );
    expect(screen.getByText(/Enviada em/)).not.toHaveAttribute('title');
  });

  it('sem solicitação, nenhum selo', () => {
    const { container } = render(
      <SeloEstadoSolicitacao estado={null} enviadaEm={null} encerradaEm={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
