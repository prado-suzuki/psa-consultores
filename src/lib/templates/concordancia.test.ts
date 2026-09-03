import { describe, expect, it } from 'vitest';
import { concordar, generoDeConcordancia, ufComPreposicao, ufPorExtenso } from './concordancia';
import { derivarCampos } from './vocabulario';

// Emenda 9.11 do contrato L2/L3: pessoa jurídica concorda no FEMININO (a
// sociedade, a empresa, a sócia). Sem isso a PJ cai no fallback masculino, que
// existe para a pessoa física sem gênero cadastrado, e a sociedade assina o
// contrato como "Sócio".

describe('gênero da concordância', () => {
  it('pessoa jurídica concorda no feminino, com gênero nulo ou não', () => {
    expect(generoDeConcordancia(null, 'PJ')).toBe('F');
    expect(generoDeConcordancia(undefined, 'PJ')).toBe('F');
    expect(concordar(generoDeConcordancia(null, 'PJ'), 'Sócio', 'Sócia')).toBe('Sócia');
  });

  it('pessoa física segue o gênero cadastrado, e sem gênero continua no masculino', () => {
    expect(generoDeConcordancia('F', 'PF')).toBe('F');
    expect(generoDeConcordancia('M', 'PF')).toBe('M');
    expect(generoDeConcordancia(null, 'PF')).toBeNull();
    expect(concordar(generoDeConcordancia(null, 'PF'), 'Sócio', 'Sócia')).toBe('Sócio');
    // Tipo ausente (registro incompleto) não vira PJ por engano.
    expect(generoDeConcordancia(null, undefined)).toBeNull();
  });

  it('os campos derivados do catálogo concordam a PJ no feminino', () => {
    // A regra vale no vocabulário inteiro, não só na linha de assinatura: um
    // modelo que escreva {{ socio.socioTitulo }} ou {{ socio.artigo }} para uma
    // sócia PJ não pode receber a forma masculina.
    const pj = derivarCampos('pessoa', { tipoPessoa: 'PJ', genero: '' });
    expect(pj.socioTitulo).toBe('Sócia');
    expect(pj.socioAdministrador).toBe('Sócia administradora');
    expect(pj.artigo).toBe('a');
    expect(pj.inscrito).toBe('inscrita');

    const pfSemGenero = derivarCampos('pessoa', { tipoPessoa: 'PF', genero: '' });
    expect(pfSemGenero.socioTitulo).toBe('Sócio');
    expect(pfSemGenero.artigo).toBe('o');
  });
});

// A regência do nome do estado. Os blocos escreviam "Estado de " + nome, e isso
// sai errado em dezesseis das vinte e sete unidades da federação — os contratos
// assinados dizem "Junta Comercial do Estado da Bahia" e "foro da comarca de São
// Desidério, Estado da Bahia". A frase aparece duas vezes no mesmo instrumento
// (qualificação da pessoa jurídica e cláusula de foro), então divergir salta aos
// olhos de quem lê.
describe('preposição da UF', () => {
  it.each([
    ['BA', 'da Bahia'],
    ['PB', 'da Paraíba'],
    ['PA', 'do Pará'],
    ['RS', 'do Rio Grande do Sul'],
    ['CE', 'do Ceará'],
    ['DF', 'do Distrito Federal'],
    ['MT', 'de Mato Grosso'],
    ['SP', 'de São Paulo'],
    ['GO', 'de Goiás'],
  ])('%s → "Estado %s"', (uf, esperado) => {
    expect(ufComPreposicao(uf)).toBe(esperado);
  });

  it('sem UF devolve vazio, para o bloco pular o trecho em vez de escrever "Estado de"', () => {
    expect(ufComPreposicao(null)).toBe('');
    expect(ufComPreposicao('')).toBe('');
  });

  it('não altera `ufPorExtenso`: a coluna do Anexo quer o nome sem regência', () => {
    expect(ufPorExtenso('BA')).toBe('Bahia');
    expect(ufPorExtenso('MT')).toBe('Mato Grosso');
  });
});
