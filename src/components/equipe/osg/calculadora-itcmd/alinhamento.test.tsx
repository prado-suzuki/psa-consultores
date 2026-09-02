import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SimulacaoAberta } from './SimulacaoAberta';
import { colunasDe, colunasTortas } from './alinhamentoDeTabela';
import { Ctrl, Num, NumCampo, Th, Txt } from './itcmdKit';
import { simulacaoSalva } from './simulacaoSalvaFixture';

// ALINHAMENTO DE COLUNA — o bug que já morde duas vezes.
//
// As células montavam a classe por concatenação, então `text-right` e o `text-left` do
// call site caíam os dois na lista com a mesma especificidade e quem decidia era a
// ordem da folha gerada pelo Tailwind. Resultado: cabeçalho à esquerda sobre coluna à
// direita, com a borda serrilhada.
//
// Consertar uma vez não basta: qualquer célula nova pode discordar do próprio
// cabeçalho, e nada avisa — a tela fica torta e os testes de conteúdo passam. Este
// arquivo compara as duas pontas.

describe('o kit garante o contrato por construção', () => {
  it('cabeçalho e célula do mesmo lado dão a mesma classe', () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <Th alinhar="esquerda">Texto</Th>
            <Th>Número</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Txt>nome</Txt>
            <Num>1</Num>
          </tr>
        </tbody>
      </table>,
    );
    const [texto, numero] = colunasDe(container.querySelector('table')!);
    expect(texto.cabecalho).toBe('esquerda');
    expect(texto.celula).toBe('esquerda');
    expect(numero.cabecalho).toBe('direita');
    expect(numero.celula).toBe('direita');
  });

  it('a célula de CAMPO abre mão do padding direito, e a de leitura não', () => {
    // É o desalinhamento de 12px: o dígito dentro de um input termina no padding da
    // célula MAIS o padding do input. `NumCampo` deixa o campo colar na borda para o
    // dígito cair na mesma régua da coluna de leitura ao lado.
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <Num>1</Num>
            <NumCampo><input /></NumCampo>
            <Ctrl><button type="button">x</button></Ctrl>
          </tr>
        </tbody>
      </table>,
    );
    const [leitura, campo, controle] = [...container.querySelectorAll('td')];
    expect(leitura.className).toContain('px-3');
    expect(campo.className).toContain('pr-0');
    expect(controle.className).toContain('pr-0');
  });
});

describe('as tabelas da simulação aberta não têm coluna torta', () => {
  const abrir = (aba: string) => {
    render(
      <SimulacaoAberta
        simulacao={simulacaoSalva()}
        todas={[simulacaoSalva()]}
        aoFechar={vi.fn()}
        aoAlterarStatus={vi.fn()}
        alterando={false}
        aoRenomear={vi.fn()}
        renomeando={false}
      />,
    );
    if (aba !== 'Doação') {
      // O `TabsTrigger` do Radix seleciona no `mouseDown`, não no `click`.
      screen.getByRole('tab', { name: aba }).dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
    }
  };

  const conferir = () => {
    expect(document.querySelectorAll('table').length).toBeGreaterThan(0);
    expect(colunasTortas().join(' · ')).toBe('');
  };

  it('na aba de Doação', () => {
    abrir('Doação');
    conferir();
  });

  it('na aba de Usufruto', () => {
    abrir('Usufruto');
    conferir();
  });
});
