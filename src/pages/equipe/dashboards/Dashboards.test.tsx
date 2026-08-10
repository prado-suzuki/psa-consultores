import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Activity, BarChart3 } from 'lucide-react';
import DashboardsPage from './Dashboards';

// O registro e mockado com DOIS dashboards de proposito: com um so, nada
// prova que a pagina aguenta o segundo — que e exatamente o que ela existe
// para suportar.
vi.mock('./registro', () => {
  const primeiro = {
    id: 'primeiro-painel',
    nome: 'Primeiro painel',
    descricao: 'Descrição do primeiro',
    icone: Activity,
    componente: () => <div>CONTEÚDO PRIMEIRO</div>,
    precarregar: vi.fn(),
  };
  const segundo = {
    id: 'segundo-painel',
    nome: 'Segundo painel',
    descricao: 'Descrição do segundo',
    icone: BarChart3,
    componente: () => <div>CONTEÚDO SEGUNDO</div>,
    precarregar: vi.fn(),
  };
  const DASHBOARDS = [primeiro, segundo];
  return {
    DASHBOARDS,
    DASHBOARD_PADRAO: primeiro,
    resolverDashboard: (id: string | null) =>
      DASHBOARDS.find((dashboard) => dashboard.id === id) ?? primeiro,
  };
});

vi.mock('@/components/equipe/EquipeLayout', () => ({
  EquipeLayout: ({
    children,
    title,
    subtitle,
    headerActions,
  }: {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div data-testid="acoes">{headerActions}</div>
      {children}
    </div>
  ),
}));

const renderizar = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <DashboardsPage />
    </MemoryRouter>,
  );

describe('página Dashboards', () => {
  it('monta o dashboard indicado em ?painel=', async () => {
    renderizar('/equipe/dashboards?painel=segundo-painel');

    expect(await screen.findByText('CONTEÚDO SEGUNDO')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Segundo painel' })).toBeInTheDocument();
    expect(screen.getByText('Descrição do segundo')).toBeInTheDocument();
  });

  it('cai no padrão quando o painel da URL não existe', async () => {
    renderizar('/equipe/dashboards?painel=inexistente');

    expect(await screen.findByText('CONTEÚDO PRIMEIRO')).toBeInTheDocument();
  });

  it('sem parâmetro nenhum também abre o padrão', async () => {
    renderizar('/equipe/dashboards');

    expect(await screen.findByText('CONTEÚDO PRIMEIRO')).toBeInTheDocument();
  });

  it('publica o seletor de dashboards no cabeçalho', async () => {
    renderizar('/equipe/dashboards');

    await screen.findByText('CONTEÚDO PRIMEIRO');
    const seletor = screen.getByRole('combobox', { name: 'Selecionar dashboard' });
    expect(screen.getByTestId('acoes')).toContainElement(seletor);
    expect(seletor).toHaveTextContent('Primeiro painel');
  });
});
