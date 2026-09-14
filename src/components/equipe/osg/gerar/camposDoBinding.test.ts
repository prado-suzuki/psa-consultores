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

describe('campo interno some do formulário sem parar de valer', () => {
  it('o gênero do órgão não é oferecido nem quando o modelo o cita direto', () => {
    const out = camposEditaveisPorBinding(
      ['conselhoAdministracao.genero'],
      [binding('conselhoAdministracao', 'orgaoGovernanca')],
    );
    expect(out.conselhoAdministracao).toEqual([]);
  });

  it('nem entra pela porta dos fundos, como base de um derivado que concorda', () => {
    // `artigoMaiusculo` e `composto` derivam de `genero`. A regra do derivado é
    // trocá-lo pela base; a do interno é não oferecer a base. A segunda vence.
    const out = camposEditaveisPorBinding(
      ['conselhoAdministracao.artigoMaiusculo', 'conselhoAdministracao.composto'],
      [binding('conselhoAdministracao', 'orgaoGovernanca')],
    );
    expect(out.conselhoAdministracao).toEqual([]);
  });

  it('o bloco de composição oferece só o que é dado do órgão', () => {
    // Os placeholders são os do bloco de composição, na ordem em que ele os
    // escreve: artigo, nome, concordância, mínimo, máximo e mandato.
    const out = camposEditaveisPorBinding(
      [
        'conselhoAdministracao.artigoMaiusculo',
        'conselhoAdministracao.nome',
        'conselhoAdministracao.composto',
        'conselhoAdministracao.membrosMinimoNumeral',
        'conselhoAdministracao.membrosMinimoExtenso',
        'conselhoAdministracao.membrosMaximoNumeral',
        'conselhoAdministracao.membrosMaximoExtenso',
        'conselhoAdministracao.mandatoAnosNumeral',
        'conselhoAdministracao.mandatoAnosExtenso',
      ],
      [binding('conselhoAdministracao', 'orgaoGovernanca')],
    );
    expect(out.conselhoAdministracao.map((c) => c.id)).toEqual([
      'nome',
      'membrosMinimo',
      'membrosMaximo',
      'mandatoAnos',
    ]);
  });

  it('CONTROLE: o gênero da PESSOA continua editável, porque é dado dela', () => {
    const out = camposEditaveisPorBinding(['socio.genero'], [binding('socio', 'pessoa')]);
    expect(out.socio.map((c) => c.id)).toEqual(['genero']);
  });
});
