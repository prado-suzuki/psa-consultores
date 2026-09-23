/**
 * O caminho antigo do Digital Dev não pode quebrar, e isso é critério de aceite
 * da tarefa, não zelo: eram 30 rotas em `/equipe/dev`, com link salvo, favorito
 * e notificação apontando para elas desde antes de 22/09/2026.
 *
 * O que estes testes travam é o que um `Navigate` fixo perderia: o SUFIXO, que
 * diz qual ferramenta a pessoa queria, e a BUSCA, que nas telas do Dev carrega o
 * estado da tela (cliente, período, painel). Cair na ferramenta certa com os
 * filtros zerados é quebra silenciosa, pior que um 404.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RedirecionaDevParaTaxWork } from '@/components/auth/RedirecionaDevParaTaxWork';

function OndeParei() {
  const { pathname, search, hash } = useLocation();
  return <span data-testid="destino">{`${pathname}${search}${hash}`}</span>;
}

function abrir(endereco: string) {
  render(
    <MemoryRouter initialEntries={[endereco]}>
      <Routes>
        <Route path="/equipe/dev" element={<RedirecionaDevParaTaxWork />} />
        <Route path="/equipe/dev/*" element={<RedirecionaDevParaTaxWork />} />
        <Route path="*" element={<OndeParei />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByTestId('destino').textContent;
}

describe('o caminho antigo do Digital Dev', () => {
  it('leva a raiz para a raiz do Tax Work', () => {
    expect(abrir('/equipe/dev')).toBe('/equipe/tax/work');
  });

  it('preserva a ferramenta', () => {
    expect(abrir('/equipe/dev/consulta-sped')).toBe('/equipe/tax/work/consulta-sped');
  });

  it('preserva caminho de dois níveis', () => {
    expect(abrir('/equipe/dev/planejamento-tributario/gerador-de-slides')).toBe(
      '/equipe/tax/work/planejamento-tributario/gerador-de-slides',
    );
  });

  it('preserva a busca, que é o estado da tela', () => {
    expect(abrir('/equipe/dev/perdcomp/dashboard?cliente=42&periodo=2026-01')).toBe(
      '/equipe/tax/work/perdcomp/dashboard?cliente=42&periodo=2026-01',
    );
  });

  it('preserva a âncora', () => {
    expect(abrir('/equipe/dev/procedimentos#bloco-c170')).toBe(
      '/equipe/tax/work/procedimentos#bloco-c170',
    );
  });

  it('não recorta no meio de um segmento', () => {
    // A troca é ancorada no começo, e as rotas que montam o componente são só
    // `/equipe/dev` e `/equipe/dev/*`. Um `/equipe/development` nunca chega aqui,
    // e se chegasse não viraria `/equipe/tax/workelopment`.
    expect(abrir('/equipe/developer')).toBe('/equipe/developer');
  });
});
