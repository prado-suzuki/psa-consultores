import { describe, it, expect } from 'vitest';
import { avaliarTravaDoConstitutivo, type SociedadeDoConstitutivo } from './travaDoConstitutivo';

const PR: SociedadeDoConstitutivo = { pessoaId: 'empresa-pr', denominacao: 'Boa Vista Agro Ltda' };

const registrados = (...ids: string[]) => new Set(ids);

describe('avaliarTravaDoConstitutivo', () => {
  it('libera enquanto a sociedade não tem contrato social registrado', () => {
    expect(avaliarTravaDoConstitutivo(PR, registrados())).toEqual({ liberado: true, motivo: null });
  });

  it('trava quando o constitutivo dela já foi à junta, e nomeia a sociedade', () => {
    const trava = avaliarTravaDoConstitutivo(PR, registrados('empresa-pr'));
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('Boa Vista Agro Ltda já foi constituída');
    // A frase diz o caminho adiante, e não só que o gesto está barrado.
    expect(trava.motivo).toContain('alteração contratual');
  });

  it('não confunde sociedades: constitutivo de OUTRA empresa não trava esta', () => {
    expect(avaliarTravaDoConstitutivo(PR, registrados('empresa-cn')).liberado).toBe(true);
  });

  it('peça sem empresa passa direto: não há sociedade a constituir', () => {
    const semEmpresa: SociedadeDoConstitutivo = { pessoaId: null, denominacao: null };
    expect(avaliarTravaDoConstitutivo(semEmpresa, registrados('empresa-pr')).liberado).toBe(true);
  });

  it('não quebra a frase quando a empresa está sem denominação', () => {
    const semNome: SociedadeDoConstitutivo = { pessoaId: 'empresa-x', denominacao: '  ' };
    const trava = avaliarTravaDoConstitutivo(semNome, registrados('empresa-x'));
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('Esta sociedade já foi constituída');
  });
});
