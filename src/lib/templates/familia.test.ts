import { describe, it, expect } from 'vitest';
import { resolverVariante, type VarianteFamilia } from './familia';

function variante(over: Partial<VarianteFamilia> & { ordem: number }): VarianteFamilia {
  return {
    id: `v${over.ordem}`,
    rotulo: `variante ${over.ordem}`,
    seletor: {},
    conteudo: `texto ${over.ordem}`,
    ...over,
  };
}

/** Leitor de escopo achatado ("imovel.urbano" => campos['imovel.urbano']). */
const lerDe = (campos: Record<string, unknown>) => (caminho: string) => campos[caminho];

describe('resolverVariante', () => {
  const posse = variante({ ordem: 1, seletor: { 'imovel.posse': 'sim' }, rotulo: 'posse' });
  const ruralInteiro = variante({
    ordem: 2,
    seletor: { 'imovel.rural': 'sim', 'imovel.inteiro': 'sim' },
    rotulo: 'rural inteiro',
  });
  const ruralFracionado = variante({
    ordem: 3,
    seletor: { 'imovel.rural': 'sim', 'imovel.fracionado': 'sim' },
    rotulo: 'rural fracionado',
  });
  const urbanoInteiro = variante({
    ordem: 4,
    seletor: { 'imovel.urbano': 'sim', 'imovel.inteiro': 'sim' },
    rotulo: 'urbano inteiro',
  });
  const familia = [posse, ruralInteiro, ruralFracionado, urbanoInteiro];

  it('elege a variante cujas condições batem todas', () => {
    const v = resolverVariante(familia, lerDe({ 'imovel.urbano': 'sim', 'imovel.inteiro': 'sim' }));
    expect(v.rotulo).toBe('urbano inteiro');
  });

  it('condição parcial não elege (rural sozinho não decide inteiro x fracionado)', () => {
    const soRural = { 'imovel.posse': '', 'imovel.rural': 'sim', 'imovel.inteiro': '', 'imovel.fracionado': '', 'imovel.urbano': '' };
    expect(() => resolverVariante(familia, lerDe(soRural))).toThrow(/Nenhuma variante/);
  });

  it('campo ausente conta como vazio na comparação, não casa com "sim"', () => {
    expect(() => resolverVariante(familia, lerDe({}))).toThrow(/estão ausentes/);
  });

  it('empate: a MENOR ordem ganha — posse prevalece sobre propriedade exclusiva', () => {
    // O caso real da casa: título não averbado num imóvel rural inteiro casa as
    // duas, e afirmar "de propriedade de" seria falso em documento registrado.
    const v = resolverVariante(
      familia,
      lerDe({ 'imovel.posse': 'sim', 'imovel.rural': 'sim', 'imovel.inteiro': 'sim' }),
    );
    expect(v.rotulo).toBe('posse');
  });

  it('desempate NÃO é por número de condições (senão a de duas ganharia da de posse)', () => {
    const v = resolverVariante(
      familia,
      lerDe({ 'imovel.posse': 'sim', 'imovel.rural': 'sim', 'imovel.fracionado': 'sim' }),
    );
    expect(v.seletor).toEqual({ 'imovel.posse': 'sim' });
  });

  it('seletor vazio é a variante PADRÃO: casa quando nenhuma específica casa', () => {
    const padrao = variante({ ordem: 9, seletor: {}, rotulo: 'padrão' });
    const v = resolverVariante([...familia, padrao], lerDe({}));
    expect(v.rotulo).toBe('padrão');
  });

  it('padrão perde da específica que casa (ordem maior)', () => {
    const padrao = variante({ ordem: 9, seletor: {}, rotulo: 'padrão' });
    const v = resolverVariante([...familia, padrao], lerDe({ 'imovel.posse': 'sim' }));
    expect(v.rotulo).toBe('posse');
  });

  it('a mensagem de erro mostra o que cada condição valia (diagnóstico do cadastro)', () => {
    // Todas as condições PRESENTES (o cadastro respondeu, com '' no que não se aplica):
    // é caso não coberto pelas redações, não dado faltando.
    const vazio = { 'imovel.posse': '', 'imovel.rural': 'sim', 'imovel.inteiro': '', 'imovel.fracionado': '', 'imovel.urbano': '' };
    expect(() => resolverVariante(familia, lerDe(vazio), 'Descrição de imóvel')).toThrow(
      /Nenhuma variante de "Descrição de imóvel" atende este caso.*imovel\.posse="".*imovel\.rural="sim"/s,
    );
  });

  it('condição AUSENTE (snapshot anterior à classificação) aponta o snapshot, não o cadastro', () => {
    // O caso real do contrato do Alessio: a versão foi validada antes de o binding
    // publicar rural/urbano, então o item congelado tem `fracionado` mas não os dois.
    const congeladoAntigo = { 'imovel.posse': '', 'imovel.inteiro': '', 'imovel.fracionado': 'sim' };
    expect(() => resolverVariante(familia, lerDe(congeladoAntigo), 'Descrição de imóvel')).toThrow(
      /imovel\.rural, imovel\.urbano estão ausentes.*Atualizar do cadastro/s,
    );
  });

  it('uma condição ausente conjuga no singular', () => {
    const semUrbano = { 'imovel.posse': '', 'imovel.rural': '', 'imovel.inteiro': '', 'imovel.fracionado': 'sim' };
    expect(() => resolverVariante(familia, lerDe(semUrbano))).toThrow(/imovel\.urbano está ausente/);
  });

  it('valor não-string do contexto é comparado como texto', () => {
    const numerica = variante({ ordem: 1, seletor: { 'imovel.andar': '12' }, rotulo: 'décimo segundo' });
    expect(resolverVariante([numerica], lerDe({ 'imovel.andar': 12 })).rotulo).toBe('décimo segundo');
  });
});
