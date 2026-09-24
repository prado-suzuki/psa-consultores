import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { OsgWorkProvider, useOsgWork } from './OsgWorkContext';

/** Sonda: expõe o cliente do contexto, a query da URL e as ações de teste. */
const Sonda = () => {
  const { clienteId, setClienteId } = useOsgWork();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div>
      <span data-testid="cliente">{clienteId || 'vazio'}</span>
      <span data-testid="url">{location.search}</span>
      <button onClick={() => setClienteId('C1')}>selecionar</button>
      <button onClick={() => navigate('/outra')}>navegar</button>
      <button onClick={() => navigate(-1)}>voltar</button>
    </div>
  );
};

const montar = (initialEntries: string[], initialIndex?: number) =>
  render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route element={<OsgWorkProvider><Sonda /></OsgWorkProvider>}>
          <Route path="/" element={null} />
          <Route path="/tela" element={null} />
          <Route path="/outra" element={null} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const cliente = () => screen.getByTestId('cliente').textContent;
const url = () => screen.getByTestId('url').textContent;

describe('OsgWorkContext — cliente na URL (EX-07/CD-11)', () => {
  it('abre com o cliente da URL — o caso do F5 e do link compartilhado', () => {
    montar(['/tela?cliente=C1']);
    expect(cliente()).toBe('C1');
    expect(url()).toBe('?cliente=C1');
  });

  it('sem ?cliente= na URL, começa sem cliente — a URL é a única memória', () => {
    montar(['/tela']);
    expect(cliente()).toBe('vazio');
  });

  it('selecionar escreve o cliente na URL, sem criar entrada nova no histórico', async () => {
    montar(['/tela']);
    fireEvent.click(screen.getByText('selecionar'));
    await waitFor(() => expect(url()).toBe('?cliente=C1'));
    expect(cliente()).toBe('C1');
  });

  it('navegação interna por pathname não perde o cliente: a query volta à URL', async () => {
    montar(['/tela?cliente=C1']);
    fireEvent.click(screen.getByText('navegar'));
    // No render seguinte ao PUSH o pathname novo ainda não tem a query — a
    // ponte em ref segura o cliente por esse único render e o regrava.
    await waitFor(() => expect(url()).toBe('?cliente=C1'));
    expect(cliente()).toBe('C1');
  });

  it('voltar (POP) obedece à URL histórica e não ressuscita o cliente', async () => {
    // Histórico: /tela (sem cliente) → /outra (com cliente). Voltar tem de
    // cair na URL sem ?cliente=, mesmo com o ref ainda quente.
    montar(['/tela', '/outra'], 1);
    fireEvent.click(screen.getByText('selecionar'));
    await waitFor(() => expect(url()).toBe('?cliente=C1'));
    fireEvent.click(screen.getByText('voltar'));
    await waitFor(() => expect(cliente()).toBe('vazio'));
    expect(url()).toBe('');
  });
});
