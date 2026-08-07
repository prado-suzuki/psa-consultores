import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabela, Td, Th, Tr } from './primitivos';
import { useSort } from './formatadores';

const linhas = [
  { nome: 'B', valor: 2 },
  { nome: 'A', valor: 1 },
];

function TabelaOrdenavel() {
  const estado = useSort(linhas, 'valor');
  return (
    <Tabela caption="Valores de teste">
      <thead>
        <tr>
          <Th campo="nome" estado={estado}>
            Nome
          </Th>
          <Th campo="valor" estado={estado} alinhar="right">
            Valor
          </Th>
        </tr>
      </thead>
      <tbody>
        {estado.sorted.map((linha) => (
          <Tr key={linha.nome}>
            <Td>{linha.nome}</Td>
            <Td alinhar="right">{linha.valor}</Td>
          </Tr>
        ))}
      </tbody>
    </Tabela>
  );
}

describe('Tabela ordenável do dashboard', () => {
  it('expõe caption, botão de teclado e aria-sort', () => {
    render(<TabelaOrdenavel />);

    expect(screen.getByText('Valores de teste')).toHaveClass('sr-only');
    expect(screen.getByRole('columnheader', { name: /valor/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    fireEvent.click(screen.getByRole('button', { name: /nome/i }));

    expect(screen.getByRole('columnheader', { name: /nome/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });
});
