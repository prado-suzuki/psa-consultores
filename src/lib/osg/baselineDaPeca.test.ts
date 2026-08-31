import { describe, it, expect } from 'vitest';
import { baselineDoSnapshot, digitosDe, type SnapshotDaPeca } from './baselineDaPeca';

const socio = (cpfCnpj: string | null) => ({ socio: { denominacao: 'Alguém', cpfCnpj } });

const snapshot = (partes: Partial<SnapshotDaPeca> = {}): SnapshotDaPeca => ({
  selecao: { sociedade: { razaoSocial: 'MMS Participações Ltda', capitalValor: '872.674,00' } },
  itensPorLista: { socios: [socio('111.111.111-11'), socio('222.222.222-22')] },
  ...partes,
});

describe('baselineDoSnapshot — o estado que a peça registrada publicou', () => {
  it('lê o capital em pt-BR e os sócios por CPF/CNPJ, só dígitos', () => {
    expect(baselineDoSnapshot(snapshot())).toEqual({
      capitalAnterior: 872674,
      cpfCnpjDosSocios: ['11111111111', '22222222222'],
    });
  });

  it('encontra o capital mesmo quando o binding tem outro nome', () => {
    // O papel é o mesmo; quem escreveu o modelo é que chamou de outra coisa.
    const outroNome: SnapshotDaPeca = {
      selecao: { empresa: { capitalValor: '1.171.800,00' } },
      itensPorLista: {},
    };
    expect(baselineDoSnapshot(outroNome).capitalAnterior).toBe(1171800);
  });

  it('sem snapshot, sem baseline: os dois campos vêm nulos', () => {
    expect(baselineDoSnapshot(null)).toEqual({ capitalAnterior: null, cpfCnpjDosSocios: null });
  });

  it('sócio sem CPF/CNPJ torna o quadro INTEIRO inutilizável, não parcial', () => {
    // Titular sem pessoa cadastrada: casar por documento vazio juntaria pessoas
    // diferentes, e daí sairia ingresso ou retirada que não houve. Meia informação
    // não é baseline.
    const comLegado = snapshot({
      itensPorLista: { socios: [socio('111.111.111-11'), socio(null)] },
    });
    expect(baselineDoSnapshot(comLegado)).toEqual({
      capitalAnterior: 872674,
      cpfCnpjDosSocios: null,
    });
  });

  it('snapshot antigo sem itensPorLista.socios ainda entrega o capital', () => {
    const antigo = snapshot({ itensPorLista: {} });
    expect(baselineDoSnapshot(antigo)).toEqual({
      capitalAnterior: 872674,
      cpfCnpjDosSocios: null,
    });
  });

  it('quadro vazio não é quadro: nada a comparar', () => {
    expect(baselineDoSnapshot(snapshot({ itensPorLista: { socios: [] } })).cpfCnpjDosSocios).toBeNull();
  });

  it('capital ilegível não vira zero', () => {
    // Zero diria "o capital era zero", que liga a resolução de aumento; nulo diz
    // "não sei", e a derivação cai no caminho de compatibilidade.
    const ilegivel = snapshot({ selecao: { sociedade: { capitalValor: '—' } } });
    expect(baselineDoSnapshot(ilegivel).capitalAnterior).toBeNull();
  });

  it('digitosDe descarta formatação e o que não é texto', () => {
    expect(digitosDe('33.333.333/0001-33')).toBe('33333333000133');
    expect(digitosDe(undefined)).toBe('');
    expect(digitosDe(12345)).toBe('');
  });
});
