import { describe, it, expect } from 'vitest';
import { contarRiscos, itensDeDecisao } from './agenteDecisao';
import type { BlocoContexto } from '@/hooks/useAgenteContexto';

const bloco = (itens: Record<string, string | number | null>[]): BlocoContexto[] => [
  { id: 'receita', titulo: 'Receita', campos: [] },
  { id: 'alertas', titulo: 'O que exige decisão', campos: [], itens },
];

describe('itensDeDecisao', () => {
  it('lê o bloco de alertas do snapshot da tela', () => {
    const itens = itensDeDecisao(bloco([
      { severidade: 'risco', alerta: 'Contrato vencido', evidencia: 'Cliente X', valor: 'R$ 120 mil' },
      { severidade: 'atencao', alerta: 'Renovação em 30d', evidencia: 'Cliente Y', valor: null },
    ]));
    expect(itens).toHaveLength(2);
    expect(itens[0]).toEqual({
      severidade: 'risco', alerta: 'Contrato vencido', evidencia: 'Cliente X', valor: 'R$ 120 mil',
    });
  });

  it('mantém valor nulo como null, nunca como a string "null"', () => {
    const itens = itensDeDecisao(bloco([
      { severidade: 'atencao', alerta: 'Sem valor apurado', evidencia: '—', valor: null },
    ]));
    expect(itens[0].valor).toBeNull();
  });

  it('descarta item sem título em vez de desenhar linha vazia', () => {
    const itens = itensDeDecisao(bloco([
      { severidade: 'risco', alerta: '', evidencia: 'sobrou da serialização', valor: null },
    ]));
    expect(itens).toEqual([]);
  });

  it('devolve vazio quando a tela não publicou o bloco (ou não publicou nada)', () => {
    expect(itensDeDecisao(undefined)).toEqual([]);
    expect(itensDeDecisao([{ id: 'receita', titulo: 'Receita', campos: [] }])).toEqual([]);
  });
});

describe('contarRiscos', () => {
  it('conta só a severidade de risco', () => {
    const itens = itensDeDecisao(bloco([
      { severidade: 'risco', alerta: 'A', evidencia: '', valor: null },
      { severidade: 'atencao', alerta: 'B', evidencia: '', valor: null },
      { severidade: 'risco', alerta: 'C', evidencia: '', valor: null },
    ]));
    expect(contarRiscos(itens)).toBe(2);
  });
});
