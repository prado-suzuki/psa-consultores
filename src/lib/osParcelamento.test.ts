import { describe, it, expect } from 'vitest';
import {
  PARCELAS_MAX,
  calcularValorParcela,
  entradaExcedeProjeto,
  parseNumeroParcelas,
} from './osParcelamento';

describe('parseNumeroParcelas', () => {
  it('lê o número digitado', () => {
    expect(parseNumeroParcelas('12')).toBe(12);
    expect(parseNumeroParcelas('1')).toBe(1);
  });

  it('campo vazio é "não informado", não 1 parcela', () => {
    expect(parseNumeroParcelas('')).toBeNull();
  });

  it('zero cai em nulo — resíduo de apagar dígito a dígito, não parcelamento', () => {
    expect(parseNumeroParcelas('0')).toBeNull();
    expect(parseNumeroParcelas('00')).toBeNull();
    expect(parseNumeroParcelas('012')).toBe(12);
  });

  it('ignora o que não é dígito, inclusive sinal e separador', () => {
    expect(parseNumeroParcelas('1a2')).toBe(12);
    expect(parseNumeroParcelas('-5')).toBe(5);
    expect(parseNumeroParcelas('1,5')).toBe(15);
  });

  it('trava no teto da faixa aceita pelo banco', () => {
    expect(parseNumeroParcelas('999')).toBe(PARCELAS_MAX);
  });
});

describe('calcularValorParcela', () => {
  // Aceite 1 da tarefa — ALESSIO SANSAO, OS 058/2026, igual à planilha do financeiro.
  it('divide o total do contrato pelo nº de parcelas', () => {
    expect(calcularValorParcela({ valorProjeto: 36000, valorEntrada: 0, numeroParcelas: 12 })).toBe(3000);
  });

  // Aceite 2 — a entrada sai do total antes de parcelar.
  it('desconta a entrada antes de dividir', () => {
    expect(calcularValorParcela({ valorProjeto: 36000, valorEntrada: 6000, numeroParcelas: 12 })).toBe(2500);
  });

  // Aceite 3 — 1 parcela e campo vazio não quebram a tela.
  it('1 parcela é o próprio valor a pagar', () => {
    expect(calcularValorParcela({ valorProjeto: 36000, valorEntrada: 0, numeroParcelas: 1 })).toBe(36000);
  });

  it('sem nº de parcelas não há o que derivar', () => {
    expect(calcularValorParcela({ valorProjeto: 36000, valorEntrada: 0, numeroParcelas: null })).toBeNull();
    expect(calcularValorParcela({ valorProjeto: 36000, valorEntrada: 0, numeroParcelas: undefined })).toBeNull();
  });

  // Aceite 4 — OS antigas, sem nenhum dos campos novos.
  it('nunca divide por zero nem devolve infinito', () => {
    expect(calcularValorParcela({ valorProjeto: 36000, valorEntrada: 0, numeroParcelas: 0 })).toBeNull();
    expect(calcularValorParcela({ valorProjeto: null, valorEntrada: null, numeroParcelas: null })).toBeNull();
    expect(calcularValorParcela({ valorProjeto: 36000, valorEntrada: 0, numeroParcelas: Number.NaN })).toBeNull();
  });

  it('valor do projeto zerado dá parcela zerada, não erro', () => {
    expect(calcularValorParcela({ valorProjeto: 0, valorEntrada: 0, numeroParcelas: 12 })).toBe(0);
  });

  it('arredonda a dízima em 2 casas — o centavo da última parcela é do faturamento', () => {
    expect(calcularValorParcela({ valorProjeto: 85000, valorEntrada: 0, numeroParcelas: 12 })).toBe(7083.33);
    expect(calcularValorParcela({ valorProjeto: 100, valorEntrada: 0, numeroParcelas: 3 })).toBe(33.33);
  });

  it('entrada maior que o total devolve parcela negativa, para o erro aparecer', () => {
    expect(calcularValorParcela({ valorProjeto: 1000, valorEntrada: 3000, numeroParcelas: 2 })).toBe(-1000);
  });
});

describe('entradaExcedeProjeto', () => {
  it('acusa só quando a entrada passa do total', () => {
    expect(entradaExcedeProjeto({ valorProjeto: 36000, valorEntrada: 6000 })).toBe(false);
    expect(entradaExcedeProjeto({ valorProjeto: 36000, valorEntrada: 36000 })).toBe(false);
    expect(entradaExcedeProjeto({ valorProjeto: 36000, valorEntrada: 40000 })).toBe(true);
  });

  it('OS sem valor e sem entrada não acusa nada', () => {
    expect(entradaExcedeProjeto({ valorProjeto: null, valorEntrada: null })).toBe(false);
    expect(entradaExcedeProjeto({ valorProjeto: 0, valorEntrada: 0 })).toBe(false);
  });
});
