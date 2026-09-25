import { describe, expect, it } from 'vitest';

import { estadoSolicitacaoColors, ROTULO_DO_ESTADO } from '@/lib/solicitacaoStatusColors';

/**
 * Catraca do mapa de estado da Solicitação: o papel de cada estado é decisão de
 * plano (decisão 2), e é aqui que ela fica travada. Um papel trocado na mão
 * reverte ao ler o teste, antes de virar cor errada na tela.
 */
describe('estadoSolicitacaoColors', () => {
  it('cobre os cinco estados derivados', () => {
    expect(Object.keys(estadoSolicitacaoColors).sort()).toEqual(
      ['cancelada', 'em_checklist', 'enviada', 'finalizada', 'rascunho'],
    );
  });

  it('rascunho é fila, enviada é espera, em checklist é andamento', () => {
    expect(estadoSolicitacaoColors.rascunho.pilula).toContain('status-fila');
    expect(estadoSolicitacaoColors.enviada.pilula).toContain('status-espera');
    expect(estadoSolicitacaoColors.em_checklist.pilula).toContain('status-andamento');
  });

  it('finalizada e cancelada compartilham o papel neutro', () => {
    expect(estadoSolicitacaoColors.finalizada.pilula).toContain('status-neutro');
    expect(estadoSolicitacaoColors.cancelada.pilula).toEqual(
      estadoSolicitacaoColors.finalizada.pilula,
    );
  });

  it('nenhum papel usa verde de âncora nem cor de estoque do Tailwind', () => {
    for (const papel of Object.values(estadoSolicitacaoColors)) {
      for (const classe of Object.values(papel)) {
        expect(classe).not.toMatch(/osg-moss|primary|emerald|green-|bg-\w+-100\b/);
      }
    }
  });
});

describe('ROTULO_DO_ESTADO', () => {
  it('dá a palavra de cada estado, e só a palavra', () => {
    expect(ROTULO_DO_ESTADO).toEqual({
      rascunho: 'Rascunho',
      enviada: 'Enviada',
      em_checklist: 'Em checklist',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada',
    });
  });
});
