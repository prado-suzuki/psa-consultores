import { describe, it, expect } from 'vitest';
import { nadaMudouNoCadastro } from './useSaveClientTransaction';

/**
 * Um caso por fonte de mudança.
 *
 * O aviso "Nenhuma alteração detectada" já foi ao ar errado três vezes, sempre
 * porque uma fonte nova não entrava na conta e a regra estava inline, sem teste.
 * Cada `it` abaixo trava uma dessas fontes.
 */

/** Editando, e nada tocado. É o único caso em que o aviso é verdade. */
const PARADO = {
  isEditing: true,
  clientHasChange: false,
  contribDiffs: 0,
  partDiffs: 0,
  osDiffs: 0,
  filhosDeOsAlterados: false,
  houveRemocao: false,
};

describe('nadaMudouNoCadastro', () => {
  it('editar e salvar sem tocar em nada é a única vez que o aviso é verdade', () => {
    expect(nadaMudouNoCadastro(PARADO)).toBe(true);
  });

  it('cadastro novo nunca é "nada mudou"', () => {
    expect(nadaMudouNoCadastro({ ...PARADO, isEditing: false })).toBe(false);
  });

  it.each([
    ['campo do cliente', { clientHasChange: true }],
    ['contribuinte editado', { contribDiffs: 1 }],
    ['representante editado', { partDiffs: 1 }],
    ['OS editada', { osDiffs: 1 }],
    ['rateio ou produto da OS', { filhosDeOsAlterados: true }],
    ['item removido da lista', { houveRemocao: true }],
  ])('%s conta como mudança', (_rotulo, mudanca) => {
    expect(nadaMudouNoCadastro({ ...PARADO, ...mudanca })).toBe(false);
  });

  it('remoção conta mesmo sem nenhum campo alterado — foi este o defeito', () => {
    // Medido em 11/09/2026: um contribuinte ficou marcado como excluído no
    // mesmo instante em que a tela dizia que nada tinha mudado. Remover não
    // altera campo, então nenhum diff enxergava a operação.
    expect(nadaMudouNoCadastro({ ...PARADO, houveRemocao: true })).toBe(false);
  });
});
