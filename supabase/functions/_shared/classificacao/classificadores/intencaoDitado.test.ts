import { describe, expect, it } from 'vitest';

import { classificacaoPedeTarefa, classificadorIntencaoDitado } from './intencaoDitado';

describe('classificador de intenção do ditado', () => {
  it('expõe as ações do primeiro fluxo e mantém comentário como saída segura', () => {
    expect(Object.keys(classificadorIntencaoDitado.classes)).toEqual([
      'registrar_comentario',
      'criar_tarefa',
      'indeterminado',
    ]);
    expect(classificadorIntencaoDitado.classeSegura).toBe('registrar_comentario');
  });

  it('só abre tarefa com decisão alta e sem fallback', () => {
    expect(
      classificacaoPedeTarefa({ classe: 'criar_tarefa', certeza: 'alta', fallback: false }),
    ).toBe(true);
    expect(
      classificacaoPedeTarefa({ classe: 'criar_tarefa', certeza: 'media', fallback: false }),
    ).toBe(false);
    expect(
      classificacaoPedeTarefa({ classe: 'criar_tarefa', certeza: 'alta', fallback: true }),
    ).toBe(false);
    expect(
      classificacaoPedeTarefa({
        classe: 'registrar_comentario',
        certeza: 'alta',
        fallback: false,
      }),
    ).toBe(false);
  });
});
