import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SolicitacaoEncerrada } from './SolicitacaoEncerrada';
import type { ItemSolicitacao } from '@/lib/solicitacao';

const ENCERRADA_EM = new Date(2026, 8, 20, 12).toISOString();

const item = (documento: string, grupo: string): ItemSolicitacao => ({
  id: documento,
  itemPadraoId: null,
  doCatalogo: true,
  granularidade: 'cliente' as ItemSolicitacao['granularidade'],
  grupo: grupo as ItemSolicitacao['grupo'],
  ordem: 0,
  status: 'ativo',
  observacao: null,
  documento,
  entidade: '',
  nota: null,
  sobrescrito: { documento: false, entidade: false, nota: false },
  codigo: null,
  confidencial: false,
  modelo: null,
});

const ATIVOS = [
  item('RG do sócio', 'pf'),
  item('CPF do sócio', 'pf'),
  item('Matrícula do imóvel', 'bens_imoveis'),
];

describe('SolicitacaoEncerrada — finalizada', () => {
  it('a faixa é a de hoje, palavra por palavra', () => {
    render(
      <SolicitacaoEncerrada estado="finalizada" encerradaEm={ENCERRADA_EM} ativos={ATIVOS} />,
    );
    // O texto do <strong> não entra no casamento direto do getByText; por isso
    // a âncora é um fragmento solto e a frase inteira vem do textContent.
    const faixa = screen.getByText(/está só para consulta/).closest('p');
    expect(faixa?.textContent).toContain(
      'foi finalizada em 20/09/2026 e está só para consulta',
    );
    expect(screen.getByText(/O cliente continua vendo os arquivos que enviou/))
      .toBeInTheDocument();
  });

  it('resumo diz "documentos solicitados" com a contagem dos ativos', () => {
    render(
      <SolicitacaoEncerrada estado="finalizada" encerradaEm={ENCERRADA_EM} ativos={ATIVOS} />,
    );
    expect(screen.getByText('3 documentos solicitados.')).toBeInTheDocument();
  });

  it('um documento só lê no singular', () => {
    render(
      <SolicitacaoEncerrada
        estado="finalizada"
        encerradaEm={ENCERRADA_EM}
        ativos={[item('RG do sócio', 'pf')]}
      />,
    );
    expect(screen.getByText('1 documento solicitado.')).toBeInTheDocument();
  });

  it('um botão, e a lista só-consulta abre com título, contagem e nomes', async () => {
    render(
      <SolicitacaoEncerrada estado="finalizada" encerradaEm={ENCERRADA_EM} ativos={ATIVOS} />,
    );
    expect(screen.queryByText('Somente consulta')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ver documentos solicitados' }));

    expect(screen.getByText('Somente consulta')).toBeInTheDocument();
    expect(screen.getByText(/Pessoas Físicas · 2 documentos/)).toBeInTheDocument();
    expect(screen.getByText('RG do sócio, CPF do sócio')).toBeInTheDocument();
    expect(screen.getByText(/Bens e Imóveis · 1 documento/)).toBeInTheDocument();
  });

  it('sem nenhum documento, a frase de hoje mora aqui e não há botão', () => {
    render(<SolicitacaoEncerrada estado="finalizada" encerradaEm={ENCERRADA_EM} ativos={[]} />);
    expect(screen.getByText(/finalizada sem nenhum documento/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('SolicitacaoEncerrada — cancelada', () => {
  it('diz que nunca foi enviada, e nunca diz "finalizada" nem "cliente viu"', () => {
    render(
      <SolicitacaoEncerrada estado="cancelada" encerradaEm={ENCERRADA_EM} ativos={ATIVOS} />,
    );
    const faixa = screen.getByText(/nunca foi enviada/).closest('p');
    expect(faixa?.textContent).toContain(
      'foi cancelada em 20/09/2026. Ela nunca foi enviada, então o cliente não chegou a vê-la',
    );
    expect(document.body.textContent).not.toContain('finalizada');
    expect(document.body.textContent).not.toContain('O cliente continua vendo');
  });

  it('o resumo não usa "documentos solicitados" — o pedido nunca saiu', () => {
    render(
      <SolicitacaoEncerrada estado="cancelada" encerradaEm={ENCERRADA_EM} ativos={ATIVOS} />,
    );
    expect(screen.getByText('3 documentos estavam na lista.')).toBeInTheDocument();
    expect(screen.queryByText(/solicitados/)).not.toBeInTheDocument();
  });

  it('o botão é "Ver a lista"', async () => {
    render(
      <SolicitacaoEncerrada estado="cancelada" encerradaEm={ENCERRADA_EM} ativos={ATIVOS} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ver a lista' }));
    expect(screen.getByText('Somente consulta')).toBeInTheDocument();
  });

  it('sem nenhum documento, a variante cancelada da frase', () => {
    render(<SolicitacaoEncerrada estado="cancelada" encerradaEm={ENCERRADA_EM} ativos={[]} />);
    expect(screen.getByText(/cancelada sem nenhum documento/)).toBeInTheDocument();
  });
});
