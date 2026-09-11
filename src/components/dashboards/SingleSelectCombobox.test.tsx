import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SingleSelectCombobox } from './SingleSelectCombobox';

// jsdom não tem ResizeObserver e o cmdk instancia um ao montar. Stub por arquivo,
// como já fazem TaskFilters.test.tsx e OrgCommentsPanel.test.tsx.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

/**
 * O que este arquivo prova, e por que ele existe separado.
 *
 * A busca deste combobox é a UNIÃO de dois filtros (ver o comentário no
 * componente). Os dois lados dessa união precisam ser exercitados de verdade
 * contra o cmdk — teste de função pura não alcança o caminho em que a
 * palavra-chave sai da opção, entra no `CommandItem` e volta no `filter`.
 *
 * Por isso a tela da Consulta XMLs dubla este componente e a prova mora aqui:
 * lá o assunto é query key e payload, e montar cmdk em todo teste daquele
 * arquivo só o deixaria lento.
 */

const opcoes = [
  { value: 'c1', label: 'São Paulo Comércio', hint: '12.345.678/0001-99', keywords: ['12.345.678/0001-99', '12345678000199'] },
  { value: 'c2', label: 'Cliente PSA', hint: '2 CNPJs', keywords: ['98765432000100', '11222333000181'] },
  { value: 'c3', label: 'Outra Empresa' },
];

function abrir(props: Partial<Parameters<typeof SingleSelectCombobox>[0]> = {}) {
  const onChange = vi.fn();
  render(<SingleSelectCombobox options={opcoes} value={null} onChange={onChange} {...props} />);
  fireEvent.click(screen.getByRole('combobox'));
  return { onChange };
}

function digitar(termo: string) {
  fireEvent.change(screen.getByPlaceholderText('Buscar…'), { target: { value: termo } });
}

describe('SingleSelectCombobox', () => {
  it('acha nome acentuado sem que se digite o acento', () => {
    abrir();
    digitar('sao paulo');
    expect(screen.getByText('São Paulo Comércio')).toBeInTheDocument();
    expect(screen.queryByText('Cliente PSA')).not.toBeInTheDocument();
  });

  it('acha pelo CNPJ, com e sem pontuação, mesmo com a lista mostrando só o nome', () => {
    abrir();
    digitar('98765432000100');
    expect(screen.getByText('Cliente PSA')).toBeInTheDocument();
    expect(screen.queryByText('São Paulo Comércio')).not.toBeInTheDocument();

    digitar('12.345.678');
    expect(screen.getByText('São Paulo Comércio')).toBeInTheDocument();
    expect(screen.queryByText('Cliente PSA')).not.toBeInTheDocument();
  });

  it('NÃO perde a letra salteada que o filtro do cmdk já dava — é o lado da união que a busca sem acento não cobre', () => {
    abrir();
    digitar('clpsa');
    expect(screen.getByText('Cliente PSA')).toBeInTheDocument();
  });

  it('mostra o texto secundário da opção ao lado do rótulo', () => {
    abrir();
    expect(screen.getByText('12.345.678/0001-99')).toBeInTheDocument();
    expect(screen.getByText('2 CNPJs')).toBeInTheDocument();
  });

  it('sem resultado, mostra o texto de lista vazia', () => {
    abrir({ emptyText: 'Nenhum cliente encontrado.' });
    digitar('zzzzz');
    expect(screen.getByText('Nenhum cliente encontrado.')).toBeInTheDocument();
  });

  it('o id da opção não entra na busca — digitar o id não traz a opção', () => {
    abrir();
    digitar('c3');
    expect(screen.queryByText('Outra Empresa')).not.toBeInTheDocument();
  });

  it('escolher devolve o value da opção', () => {
    const { onChange } = abrir();
    fireEvent.click(screen.getByText('Outra Empresa'));
    expect(onChange).toHaveBeenCalledWith('c3');
  });

  it('escolher o que já estava escolhido limpa o campo', () => {
    const { onChange } = abrir({ value: 'c3' });
    // Pelo `role`, e não pelo texto: com a opção escolhida, o rótulo dela
    // aparece DUAS vezes na tela — no gatilho e na lista.
    fireEvent.click(screen.getByRole('option', { name: /Outra Empresa/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
