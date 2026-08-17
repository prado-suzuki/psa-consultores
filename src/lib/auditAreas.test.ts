import { describe, expect, it } from 'vitest';
import { areaDoRegistro, areasDoEscopo } from './auditAreas';

describe('areasDoEscopo', () => {
  it('devolve só a área pedida quando o escopo é de um módulo', () => {
    expect(areasDoEscopo('tax')).toEqual(['tax']);
    expect(areasDoEscopo('osg')).toEqual(['osg']);
  });

  it('devolve as duas áreas no consolidado do Board', () => {
    expect(areasDoEscopo('todas')).toEqual(['tax', 'osg']);
  });

  it('devolve cópia — quem recebe não altera a constante do módulo', () => {
    const primeira = areasDoEscopo('todas');
    primeira.push('tax');
    expect(areasDoEscopo('todas')).toEqual(['tax', 'osg']);
  });
});

describe('areaDoRegistro', () => {
  it('ignora a área do log quando o escopo já é de um módulo', () => {
    expect(areaDoRegistro('tax', 'osg')).toBe('tax');
    expect(areaDoRegistro('osg', 'tax')).toBe('osg');
  });

  it('usa a área do log no consolidado', () => {
    expect(areaDoRegistro('todas', 'osg')).toBe('osg');
    expect(areaDoRegistro('todas', 'tax')).toBe('tax');
  });

  it('cai em tax quando o log não diz a área', () => {
    expect(areaDoRegistro('todas', null)).toBe('tax');
    expect(areaDoRegistro('todas', undefined)).toBe('tax');
    expect(areaDoRegistro('todas', 'fixos')).toBe('tax');
  });
});
