import { describe, expect, it } from 'vitest';

import { apenasOQueMudou } from '@/hooks/useAuditLog';

/*
 * Medido no sandbox antes da correção: 119 pares gravados com o mesmo valor dos
 * dois lados, em 53 registros. O caso típico é a edição de um cluster, que
 * gravava cinco campos e quatro deles não tinham mudado.
 */
describe('apenasOQueMudou', () => {
  it('descarta o campo cujo valor não mudou', () => {
    expect(apenasOQueMudou({
      name: { old: 'PSA AUDITORES', new: 'PSA AUDITORES' },
      cnpj: { old: '123', new: '123' },
      is_active: { old: true, new: false },
    })).toEqual({ is_active: { old: true, new: false } });
  });

  it('devolve indefinido quando nada mudou, para o log não afirmar alteração', () => {
    expect(apenasOQueMudou({ name: { old: 'a', new: 'a' } })).toBeUndefined();
  });

  it('trata null e undefined como a mesma ausência', () => {
    expect(apenasOQueMudou({ cost_center_id: { old: null, new: undefined } })).toBeUndefined();
  });

  it('compara objeto e lista por valor, não por referência', () => {
    expect(apenasOQueMudou({
      tags: { old: ['a', 'b'], new: ['a', 'b'] },
      meta: { old: { x: 1 }, new: { x: 2 } },
    })).toEqual({ meta: { old: { x: 1 }, new: { x: 2 } } });
  });

  it('não confunde tipos diferentes com o mesmo texto', () => {
    const diff = apenasOQueMudou({ quantidade: { old: '1', new: 1 } });
    expect(diff).toEqual({ quantidade: { old: '1', new: 1 } });
  });

  it('não mexe em quem não passou diff', () => {
    expect(apenasOQueMudou(undefined)).toBeUndefined();
  });
});
