// ProjetosPage virou um placeholder ("Projetos em breve") — o nível de projetos
// só entra após a migração; por ora os processos aparecem agrupados em Etapas.
// Este teste cobre apenas que o placeholder renderiza sem crash.

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import ProjetosPage from './ProjetosPage';

describe('ProjetosPage', () => {
  it('smoke: renderiza o placeholder de "Projetos em breve"', () => {
    render(
      <TestProviders>
        <ProjetosPage />
      </TestProviders>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Projetos' })).toBeInTheDocument();
    expect(screen.getByText(/Projetos em breve/i)).toBeInTheDocument();
  });
});
