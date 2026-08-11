import { describe, expect, it } from 'vitest';
import { normalizarNomeDigitado } from '@/lib/nomeProprio';

// O caso do teste e2e ([TESTE E2E] Grupo MMS) fica de fora de propósito: provar
// que UM nome sobrevive não prova nada. O que precisa sobreviver é a classe
// inteira de grafias em que a caixa carrega significado.
describe('normalizarNomeDigitado', () => {
  it.each([
    ['sigla em caixa alta', 'AGRO MMS S/A'],
    ['abreviatura com ponto', 'J.E. Participações LTDA'],
    ['marcador entre colchetes', '[HOMOLOG] Cliente XPTO'],
    ['tipo societário abreviado', 'Fazenda Boa Vista S.A.'],
    ['partícula em minúscula', 'Irmãos de Souza e Cia'],
    ['algarismo romano colado à sigla', 'CBM II EIRELI'],
    ['acrônimo com número', 'Usina B3 ME'],
  ])('preserva a caixa: %s', (_caso, nome) => {
    expect(normalizarNomeDigitado(nome)).toBe(nome);
  });

  it('apara borda e colapsa espaço repetido, sem mexer na caixa', () => {
    expect(normalizarNomeDigitado('  AGRO MMS   S/A ')).toBe('AGRO MMS S/A');
    expect(normalizarNomeDigitado('J.E.\n Participações\tLTDA')).toBe('J.E. Participações LTDA');
  });

  it('trata ausência de valor como texto vazio', () => {
    expect(normalizarNomeDigitado(null)).toBe('');
    expect(normalizarNomeDigitado(undefined)).toBe('');
    expect(normalizarNomeDigitado('   ')).toBe('');
  });

  it('não faz Title Case: entrada em caixa baixa continua em caixa baixa', () => {
    // Se um dia alguém quiser "arrumar" a caixa, tem de ser decisão explícita do
    // usuário, não efeito colateral de salvar.
    expect(normalizarNomeDigitado('grupo franciosi')).toBe('grupo franciosi');
  });
});
