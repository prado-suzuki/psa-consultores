import { describe, expect, it } from 'vitest';
import { concordar, generoDeConcordancia } from './concordancia';
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
