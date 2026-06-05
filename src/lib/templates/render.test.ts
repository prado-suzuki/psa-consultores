import { describe, it, expect } from 'vitest';
import { extrairCampos, extrairEstrutura, renderConteudo } from './render';
import { comporBlocos } from './composition';
import { avaliarFlags } from './flags';
import type { Template } from './types';

describe('renderConteudo', () => {
  it('substitui placeholders simples', () => {
    expect(renderConteudo('Olá {{nome}}', { nome: 'PSA' })).toBe('Olá PSA');
  });
  it('aceita espaços dentro das chaves', () => {
    expect(renderConteudo('{{ a }}-{{b}}', { a: '1', b: '2' })).toBe('1-2');
  });
  it('resolve caminho pontilhado', () => {
    expect(renderConteudo('{{pj.nome}}', { pj: { nome: 'Agro' } })).toBe('Agro');
  });
  it('lança erro em placeholder não resolvido', () => {
    expect(() => renderConteudo('{{x}}', {})).toThrow(/não resolvido/);
  });
});

describe('renderConteudo — seções de repetição', () => {
  const socios = [
    { socio: { nome: 'Ana', quotas: '100' }, sePF: true, sePJ: false },
    { socio: { nome: 'Beto', quotas: '50' }, sePF: true, sePJ: false },
    { socio: { nome: 'Holding Ltda', quotas: '25', representante: 'Ana' }, sePF: false, sePJ: true },
  ];

  it('repete o corpo por item com separador padrão (quebra de linha)', () => {
    expect(renderConteudo('{{#socios}}{{ socio.nome }}{{/socios}}', { socios }))
      .toBe('Ana\nBeto\nHolding Ltda');
  });

  it('usa sep e fim para prosa jurídica ("A; B; e C")', () => {
    expect(renderConteudo('{{#socios sep="; " fim="; e "}}{{ socio.nome }}{{/socios}}.', { socios }))
      .toBe('Ana; Beto; e Holding Ltda.');
  });

  it('com 2 itens o fim liga direto ("A; e B")', () => {
    expect(
      renderConteudo('{{#s sep="; " fim="; e "}}{{ x }}{{/s}}', {
        s: [{ x: 'A' }, { x: 'B' }],
      }),
    ).toBe('A; e B');
  });

  it('com 1 item não há separadores', () => {
    expect(renderConteudo('{{#s sep="; " fim="; e "}}{{ x }}{{/s}}', { s: [{ x: 'A' }] })).toBe('A');
  });

  it('lista vazia rende vazio', () => {
    expect(renderConteudo('[{{#s}}{{ x }}{{/s}}]', { s: [] })).toBe('[]');
  });

  it('desescapa \\n nos atributos (assinaturas em linhas)', () => {
    expect(
      renderConteudo('{{#s sep="\\n\\n"}}__________\n{{ x }}{{/s}}', { s: [{ x: 'A' }, { x: 'B' }] }),
    ).toBe('__________\nA\n\n__________\nB');
  });

  it('condicionais sePF/sePJ escolhem o trecho por item', () => {
    const tpl = '{{#socios sep="; " fim="; e "}}{{#sePF}}{{ socio.nome }} (PF){{/sePF}}{{#sePJ}}{{ socio.nome }}, rep. por {{ socio.representante }}{{/sePJ}}{{/socios}}';
    expect(renderConteudo(tpl, { socios })).toBe('Ana (PF); Beto (PF); e Holding Ltda, rep. por Ana');
  });

  it('placeholder de fora do item resolve pelo escopo externo', () => {
    expect(
      renderConteudo('{{#s}}{{ x }} de {{ empresa }}{{/s}}', {
        s: [{ x: 'A' }],
        empresa: 'Agro',
      }),
    ).toBe('A de Agro');
  });

  it('valor string truthy/falsy age como condicional', () => {
    expect(renderConteudo('{{#ok}}sim{{/ok}}', { ok: 'true' })).toBe('sim');
    expect(renderConteudo('{{#ok}}sim{{/ok}}', { ok: '' })).toBe('');
    expect(renderConteudo('{{#ok}}sim{{/ok}}', { ok: 'false' })).toBe('');
  });

  it('lança erro em seção não resolvida', () => {
    expect(() => renderConteudo('{{#x}}a{{/x}}', {})).toThrow(/Seção não resolvida/);
  });

  it('lança erro em seção desbalanceada', () => {
    expect(() => renderConteudo('{{#a}}x', { a: true })).toThrow(/não fechada/);
    expect(() => renderConteudo('x{{/a}}', {})).toThrow(/desbalanceada/);
    expect(() => renderConteudo('{{#a}}{{/b}}', { a: true })).toThrow(/desbalanceada/);
  });
});

describe('extrairCampos / extrairEstrutura', () => {
  it('extrairCampos inclui campos internos a seções e tolera seção aberta', () => {
    expect(extrairCampos('{{ a }} {{#s}}{{ b.c }}{{/s}} {{#aberta}}{{ d }}')).toEqual(['a', 'b.c', 'd']);
  });

  it('extrairEstrutura separa topo de seções e lista condicionais internas', () => {
    const e = extrairEstrutura('{{ topo }}{{#socios}}{{ socio.nome }}{{#sePJ}}{{ socio.representante }}{{/sePJ}}{{/socios}}');
    expect(e.camposTopo).toEqual(['topo']);
    expect(e.secoes).toHaveLength(1);
    expect(e.secoes[0].nome).toBe('socios');
    expect(e.secoes[0].campos).toEqual(['socio.nome', 'socio.representante']);
    expect(e.secoes[0].secoesInternas).toEqual(['sePJ']);
  });
});

describe('comporBlocos (AND simples de flags)', () => {
  const template: Template = {
    id: 't',
    nome: 't',
    blocos: [
      { id: 'a', conteudo: 'A', obrigatorio: true },
      { id: 'b', conteudo: 'B', flagsRequeridas: ['x'] },
      { id: 'c', conteudo: 'C', flagsRequeridas: ['x', 'y'] },
      { id: 'd', conteudo: 'D', obrigatorio: true, flagsRequeridas: ['x'] },
    ],
  };

  it('inclui só obrigatórios sem flags', () => {
    expect(comporBlocos(template, []).map((b) => b.id)).toEqual(['a']);
  });
  it('inclui bloco quando todas as flags estão ativas', () => {
    expect(comporBlocos(template, ['x']).map((b) => b.id)).toEqual(['a', 'b', 'd']);
    expect(comporBlocos(template, ['x', 'y']).map((b) => b.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('flags têm precedência sobre obrigatorio (bloco obrigatório com flag inativa sai)', () => {
    expect(comporBlocos(template, ['y']).map((b) => b.id)).toEqual(['a']);
  });
});

describe('avaliarFlags (flags derivadas declarativas)', () => {
  const catalogo = [
    { nome: 'empresa-proprietaria', entidade: 'empresa', campo: 'tipo_empresa', valor: 'PR' },
    { nome: 'empresa-controladora', entidade: 'empresa', campo: 'tipo_empresa', valor: 'CN' },
    { nome: 'cliente-vip', entidade: 'cliente', campo: 'segmento', valor: 'vip' },
  ];

  it('ativa a flag cujo campo da fonte bate com o valor', () => {
    expect(avaliarFlags(catalogo, { empresa: { tipo_empresa: 'PR' } })).toEqual(['empresa-proprietaria']);
    expect(avaliarFlags(catalogo, { empresa: { tipo_empresa: 'CN' } })).toEqual(['empresa-controladora']);
  });
  it('fonte ausente ou campo nulo desativam a flag', () => {
    expect(avaliarFlags(catalogo, {})).toEqual([]);
    expect(avaliarFlags(catalogo, { empresa: { tipo_empresa: null } })).toEqual([]);
  });
  it('avalia entidades diferentes de forma independente', () => {
    expect(
      avaliarFlags(catalogo, { empresa: { tipo_empresa: 'PR' }, cliente: { segmento: 'vip' } }),
    ).toEqual(['empresa-proprietaria', 'cliente-vip']);
  });
});
