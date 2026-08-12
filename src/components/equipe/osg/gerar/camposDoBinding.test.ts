import { describe, expect, it } from 'vitest';
import type { Binding } from '@/lib/templates/binding';
import { camposDaEntidade } from '@/lib/templates/vocabulario';
import { camposEditaveisPorBinding } from '@/components/equipe/osg/gerar/camposDoBinding';

const binding = (nome: string, tipo: Binding['tipo']): Binding => ({ nome, tipo, cardinalidade: 'um' });

describe('camposEditaveisPorBinding', () => {
  it('troca o campo DERIVADO pelos campos-base de que ele deriva', () => {
    const derivado = camposDaEntidade('pessoa').find((c) => c.derivadoDe);
    expect(derivado, 'o vocabulário precisa ter ao menos um campo derivado').toBeDefined();
    const bases = Array.isArray(derivado!.derivadoDe) ? derivado!.derivadoDe : [derivado!.derivadoDe!];

    const out = camposEditaveisPorBinding([`socio.${derivado!.id}`], [binding('socio', 'pessoa')]);

    expect(out.socio.map((c) => c.id)).not.toContain(derivado!.id);
    for (const base of bases) expect(out.socio.map((c) => c.id)).toContain(base);
  });

  it('campo fora do catálogo vira texto livre sob o binding, em vez de sumir', () => {
    const out = camposEditaveisPorBinding(['sociedade.inventado'], [binding('sociedade', 'sociedade')]);
    expect(out.sociedade).toEqual([{ id: 'inventado', label: 'inventado', tipo: 'texto' }]);
  });

  it('ordena pelo catálogo da entidade, não pela ordem do texto do bloco', () => {
    const ordem = camposDaEntidade('sociedade').map((c) => c.id);
    const [primeiro, segundo] = [ordem[0], ordem[3]];

    const out = camposEditaveisPorBinding(
      [`sociedade.${segundo}`, `sociedade.${primeiro}`],
      [binding('sociedade', 'sociedade')],
    );

    expect(out.sociedade.map((c) => c.id)).toEqual([primeiro, segundo]);
  });

  it('ignora placeholder de outro binding e sempre publica uma entrada por binding', () => {
    const out = camposEditaveisPorBinding(['fantasma.nome', 'imovel.numero'], [
      binding('imovel', 'matricula'),
      binding('sociedade', 'sociedade'),
    ]);
    expect(out.imovel.map((c) => c.id)).toEqual(['numero']);
    expect(out.sociedade).toEqual([]);
  });
});
