import { describe, expect, it } from 'vitest';

import { partesDoTexto, rotuloDoLink } from '@/lib/linksNoTexto';

describe('partesDoTexto', () => {
  it('separa o link do texto em volta', () => {
    expect(partesDoTexto('veja https://psa.com.br/a hoje')).toEqual([
      { tipo: 'texto', texto: 'veja ' },
      { tipo: 'link', href: 'https://psa.com.br/a', rotulo: 'psa.com.br/a', original: 'https://psa.com.br/a' },
      { tipo: 'texto', texto: ' hoje' },
    ]);
  });

  it('a pontuação da frase fica fora do link', () => {
    const [, link, resto] = partesDoTexto('saiu em https://x.com/nota.');
    expect(link).toMatchObject({ href: 'https://x.com/nota' });
    expect(resto).toEqual({ tipo: 'texto', texto: '.' });
  });

  it('o parêntese só sai quando não abre dentro da URL', () => {
    expect(partesDoTexto('(ver https://x.com/a)')[1]).toMatchObject({ href: 'https://x.com/a' });
    expect(partesDoTexto('https://pt.wikipedia.org/wiki/Mata_(desambiguação)')[0]).toMatchObject({
      href: 'https://pt.wikipedia.org/wiki/Mata_(desambiguação)',
    });
  });

  it('www. sem protocolo vira https', () => {
    expect(partesDoTexto('www.receita.fazenda.gov.br')[0]).toMatchObject({
      href: 'https://www.receita.fazenda.gov.br',
      rotulo: 'receita.fazenda.gov.br',
    });
  });

  it('texto sem link volta inteiro', () => {
    expect(partesDoTexto('balancete de março')).toEqual([{ tipo: 'texto', texto: 'balancete de março' }]);
  });
});

describe('rotuloDoLink', () => {
  it('encurta URL longa', () => {
    const rotulo = rotuloDoLink(`https://drive.google.com/${'a'.repeat(80)}`);
    expect(rotulo).toHaveLength(48);
    expect(rotulo.endsWith('…')).toBe(true);
  });
});
