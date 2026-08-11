import { describe, expect, it } from 'vitest';
import { chaveDeNomeCliente, normalizarNomeDigitado } from '@/lib/nomeProprio';

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

// A invariante que o gatilho `initcap()` sustentava sem dizer: comparar nome de
// cliente por igualdade exata só funcionava porque todo mundo tinha sido achatado
// para a mesma grafia. Com o gatilho fora, quem sustenta é esta chave, dos dois
// lados (aqui, no aviso de duplicata; e no banco, em `nome_cliente_normalizado`,
// que o pareamento dev/prod de `get_ordens_by_client_name` usa).
describe('chaveDeNomeCliente', () => {
  const mesmoCliente = (a: string, b: string) =>
    chaveDeNomeCliente(a) === chaveDeNomeCliente(b);

  it.each([
    ['caixa diferente', 'AGRO MMS S/A', 'Agro Mms S/a'],
    ['o que o initcap() fazia', 'J.E. PARTICIPAÇÕES LTDA', 'J.e. Participações Ltda'],
    ['espaço interno repetido', 'Fazenda  Boa   Vista', 'Fazenda Boa Vista'],
    ['espaço nas bordas', '  [HOMOLOG] Cliente XPTO  ', '[HOMOLOG] Cliente XPTO'],
    ['tudo junto', '   agro   mms  s/a ', 'AGRO MMS S/A'],
  ])('reconhece como o mesmo cliente: %s', (_caso, a, b) => {
    expect(mesmoCliente(a, b)).toBe(true);
  });

  it.each([
    ['nomes de verdade diferentes', 'Agro MMS S/A', 'Agro MMR S/A'],
    ['sufixo a mais', 'Grupo Franciosi', 'Grupo Franciosi II'],
    ['acento é significado', 'Participacoes Alfa', 'Participações Alfa'],
  ])('não confunde clientes distintos: %s', (_caso, a, b) => {
    expect(mesmoCliente(a, b)).toBe(false);
  });

  it('é só para comparar: quem grava continua sendo normalizarNomeDigitado', () => {
    // Se alguém usar a chave para gravar, o B20 volta pela porta dos fundos.
    expect(chaveDeNomeCliente('AGRO MMS S/A')).toBe('agro mms s/a');
    expect(normalizarNomeDigitado('AGRO MMS S/A')).toBe('AGRO MMS S/A');
  });

  it('ausência de valor não casa com nada preenchido', () => {
    expect(chaveDeNomeCliente(null)).toBe('');
    expect(chaveDeNomeCliente('   ')).toBe('');
    expect(mesmoCliente('', 'Grupo X')).toBe(false);
  });
});
