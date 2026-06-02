import { describe, it, expect } from 'vitest';
import { renderConteudo } from './render';
import { comporBlocos } from './composition';
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

describe('comporBlocos (AND simples de flags)', () => {
  const template: Template = {
    id: 't',
    nome: 't',
    blocos: [
      { id: 'a', conteudo: 'A', obrigatorio: true },
      { id: 'b', conteudo: 'B', flagsRequeridas: ['x'] },
      { id: 'c', conteudo: 'C', flagsRequeridas: ['x', 'y'] },
    ],
  };

  it('inclui só obrigatórios sem flags', () => {
    expect(comporBlocos(template, []).map((b) => b.id)).toEqual(['a']);
  });
  it('inclui bloco quando todas as flags estão ativas', () => {
    expect(comporBlocos(template, ['x']).map((b) => b.id)).toEqual(['a', 'b']);
    expect(comporBlocos(template, ['x', 'y']).map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });
});
