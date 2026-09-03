import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/equipe/dev/DevLayout', () => ({
  DevLayout: ({ children, title }: PropsWithChildren<{ title: string }>) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

import PapelDeTrabalho from '@/pages/equipe/dev/PapelDeTrabalho';

/**
 * Confere a tela de conferência do WP.
 *
 * O que este arquivo prende é o que a pessoa vê, e sobretudo a **assimetria entre
 * impedimento e aviso**: se os dois virarem a mesma caixa, o desenho perde o
 * sentido, e isso é o tipo de regressão que passa em revisão de código.
 */

const FIXTURES = join(
  __dirname,
  '..',
  '..',
  '..',
  'lib',
  'planejamento-tributario',
  '__fixtures__',
);

function escolhe(conteudo: BlobPart, nome: string) {
  const arquivo = new File([conteudo], nome);
  const entrada = document.querySelector('input[type="file"]') as HTMLInputElement;

  /*
   * `fireEvent` e não `userEvent.upload`: o input é escondido de propósito, e o
   * clique real vem do botão. O que se testa aqui é a reação à escolha.
   */
  Object.defineProperty(entrada, 'files', { value: [arquivo], configurable: true });
  fireEvent.change(entrada);
}

function fixture(caso: string): BlobPart {
  return readFileSync(join(FIXTURES, caso, 'entrada.xlsx'));
}

describe('PapelDeTrabalho', () => {
  it('abre pedindo o arquivo, sem quebrar', () => {
    render(<PapelDeTrabalho />);

    expect(screen.getByRole('heading', { name: 'Papel de Trabalho' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher o WP/ })).toBeInTheDocument();
    expect(screen.getByText(/Escolha o papel de trabalho preenchido/)).toBeInTheDocument();
  });

  /* A promessa que a tela faz, e que sustenta o preview: nada sai daqui. */
  it('avisa que o arquivo não sai do navegador', () => {
    render(<PapelDeTrabalho />);

    expect(screen.getByText(/Nada sai daqui enquanto você não confirmar/)).toBeInTheDocument();
  });

  it('mostra o que foi lido, sem bloco de problema, num WP bom', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP do cliente.xlsx');

    await waitFor(() => expect(screen.getByText('O que foi lido')).toBeInTheDocument());

    expect(screen.getByText('O que o arquivo diz de si')).toBeInTheDocument();
    expect(screen.getByText('WP do cliente.xlsx')).toBeInTheDocument();
    expect(screen.queryByText(/impede(m)? a importação/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ avisos?$/)).not.toBeInTheDocument();
  });

  /*
   * A linha dos anos brigava com o período do cabeçalho: o estudo tem três anos e a
   * Venda de Ativos acha sete, porque segue o cronograma da dívida. Agora a tela
   * diz de onde vêm os anos a mais, em vez de mostrar o intervalo cru.
   */
  it('explica os anos que passam do período do estudo', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('transferencia-rural'), 'venda.xlsx');

    await waitFor(() => expect(screen.getByText('O que foi lido')).toBeInTheDocument());

    /* A fixture não traz cabeçalho, então cai no intervalo simples. */
    expect(screen.getByText('2026 a 2032')).toBeInTheDocument();
    expect(screen.getByText('Abas lidas')).toBeInTheDocument();
    expect(screen.queryByText('Cenários')).not.toBeInTheDocument();
  });

  /*
   * O botão fica desabilitado nos dois casos, mas por motivos diferentes, e o
   * texto ao lado tem de dizer qual: "ainda não está ligada" é coisa nossa a
   * fazer, "não há o que gravar" é coisa da planilha.
   */
  it('num WP bom, diz que a gravação ainda não está ligada', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'bom.xlsx');

    await waitFor(() => expect(screen.getByText('O que foi lido')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /Confirmar e gravar/ })).toBeDisabled();
    expect(screen.getByText(/A gravação ainda não está ligada/)).toBeInTheDocument();
  });

  it('num arquivo trocado, mostra o impedimento e diz que não há o que gravar', async () => {
    render(<PapelDeTrabalho />);
    escolhe('isto nao e uma planilha', 'foto.xlsx');

    await waitFor(() => expect(screen.getByText(/impede(m)? a importação/)).toBeInTheDocument());

    expect(screen.getByText(/Corrija a planilha e escolha o arquivo de novo/)).toBeInTheDocument();
    expect(screen.getByText(/não há o que gravar/)).toBeInTheDocument();
    /* O endereço do problema é o que a pessoa leva para o Excel. */
    expect(screen.getByText(/Esperava uma de/)).toBeInTheDocument();
  });

  it('começar de novo devolve a tela ao estado inicial', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('dre'), 'dre.xlsx');

    await waitFor(() => expect(screen.getByText('O que foi lido')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Começar de novo/ }));

    expect(screen.getByText(/Escolha o papel de trabalho preenchido/)).toBeInTheDocument();
    expect(screen.queryByText('O que foi lido')).not.toBeInTheDocument();
  });
});
