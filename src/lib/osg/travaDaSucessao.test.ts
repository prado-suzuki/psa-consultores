import { describe, it, expect } from 'vitest';
import { avaliarTravaDaSucessao } from './travaDaSucessao';

describe('avaliarTravaDaSucessao', () => {
  it('libera quando ninguém sucede a peça', () => {
    expect(avaliarTravaDaSucessao(null)).toEqual({ liberado: true, motivo: null });
  });

  it('trava com sucessor em rascunho, e manda continuar naquela peça', () => {
    const trava = avaliarTravaDaSucessao({ status: 'rascunho' });
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('ainda em aberto');
    expect(trava.motivo).toContain('Continue naquela');
  });

  it('trava com sucessor registrado, e aponta para onde a próxima nasce', () => {
    const trava = avaliarTravaDaSucessao({ status: 'registrado' });
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('já foi substituída');
    expect(trava.motivo).toContain('nasce daquela');
  });

  it('versão selada conta como sucessor: a linhagem existe', () => {
    expect(avaliarTravaDaSucessao({ status: 'revisao' }).liberado).toBe(false);
  });
});
