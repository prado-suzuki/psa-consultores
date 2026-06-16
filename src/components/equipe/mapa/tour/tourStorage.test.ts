import { describe, it, expect, beforeEach } from 'vitest';
import { isTourSeen, markTourSeen } from './tourStorage';

describe('tourStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna false quando o tour nunca foi visto', () => {
    expect(isTourSeen('welcome')).toBe(false);
  });

  it('marca e persiste um tour como visto (chave versionada por id)', () => {
    markTourSeen('processos');
    expect(isTourSeen('processos')).toBe(true);
    expect(localStorage.getItem('mapaTourSeen:processos:v1')).toBe('1');
  });

  it('flags são independentes por tour', () => {
    markTourSeen('welcome');
    expect(isTourSeen('welcome')).toBe(true);
    expect(isTourSeen('cascata')).toBe(false);
  });
});
