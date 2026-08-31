import { describe, it, expect } from 'vitest';
import { avaliarTravaDaSubida, type EmpresaDaSubida } from './travaDaSubida';

const PR: EmpresaDaSubida = { pessoaId: 'empresa-pr', denominacao: 'Boa Vista Agro Ltda' };
const CN: EmpresaDaSubida = { pessoaId: 'empresa-cn', denominacao: 'Ipê Participações Ltda' };

const registrados = (...ids: string[]) => new Set(ids);

describe('avaliarTravaDaSubida', () => {
  it('libera quando as duas pontas têm constitutivo registrado', () => {
    const trava = avaliarTravaDaSubida([PR, CN], registrados('empresa-pr', 'empresa-cn'));
    expect(trava).toEqual({ liberado: true, faltando: [], motivo: null });
  });

  it('trava e nomeia as duas quando nenhuma foi à junta', () => {
    const trava = avaliarTravaDaSubida([PR, CN], registrados());
    expect(trava.liberado).toBe(false);
    expect(trava.faltando).toEqual(['Boa Vista Agro Ltda', 'Ipê Participações Ltda']);
    expect(trava.motivo).toContain('Boa Vista Agro Ltda e Ipê Participações Ltda');
  });

  it('trava nomeando só quem falta, quando uma das duas já está registrada', () => {
    const trava = avaliarTravaDaSubida([PR, CN], registrados('empresa-pr'));
    expect(trava.faltando).toEqual(['Ipê Participações Ltda']);
    expect(trava.motivo).toContain('contrato social de Ipê Participações Ltda.');
    expect(trava.motivo).not.toContain('Boa Vista');
  });

  it('vale com uma empresa só: o card da Proprietária trava antes de escolher a controladora', () => {
    expect(avaliarTravaDaSubida([PR], registrados()).liberado).toBe(false);
    expect(avaliarTravaDaSubida([PR], registrados('empresa-pr')).liberado).toBe(true);
  });

  it('não confunde empresas: registro de OUTRA sociedade não libera esta', () => {
    const trava = avaliarTravaDaSubida([PR], registrados('empresa-de-outro-cliente'));
    expect(trava.liberado).toBe(false);
    expect(trava.faltando).toEqual(['Boa Vista Agro Ltda']);
  });

  it('não quebra a frase quando a empresa está sem denominação', () => {
    const semNome: EmpresaDaSubida = { pessoaId: 'empresa-x', denominacao: null };
    const trava = avaliarTravaDaSubida([semNome], registrados());
    expect(trava.faltando).toEqual(['empresa sem denominação']);
    expect(trava.motivo).toBeTruthy();
  });
});
