import { describe, expect, it } from 'vitest';
import { homeDaArea, HOME_PADRAO } from '@/lib/homeDaArea';

describe('homeDaArea', () => {
  it('devolve a pessoa para a área em que ela estava', () => {
    // O caso que motivou a função: negativa dentro da Tax mandava para a
    // Digital, e lá a pessoa via "Nenhuma área disponível".
    expect(homeDaArea('/equipe/tax/gerencial/chamados')).toBe('/equipe/tax');
    expect(homeDaArea('/equipe/osg/gerencial/logs-equipe')).toBe('/equipe/osg');
    expect(homeDaArea('/gestao/contatos')).toBe('/gestao');
  });

  it('a raiz da área conta como sendo da área', () => {
    expect(homeDaArea('/equipe/tax')).toBe('/equipe/tax');
    expect(homeDaArea('/gestao')).toBe('/gestao');
  });

  it('Board e Dev têm home própria, diferente do prefixo', () => {
    expect(homeDaArea('/equipe/board/relatorios')).toBe('/equipe/board/dashboard');
    expect(homeDaArea('/equipe/dev/consulta-sped')).toBe('/equipe/digital');
  });

  it('endereço fora das áreas cai no padrão', () => {
    expect(homeDaArea('/equipe/chamados')).toBe(HOME_PADRAO);
    expect(homeDaArea('/equipe/daily')).toBe(HOME_PADRAO);
    expect(homeDaArea('/qualquer/coisa')).toBe(HOME_PADRAO);
  });

  it('casa por segmento, não por letras iniciais', () => {
    // `/equipe/taxi` não é a Tax.
    expect(homeDaArea('/equipe/taxidermia')).toBe(HOME_PADRAO);
    expect(homeDaArea('/gestaozinha')).toBe(HOME_PADRAO);
  });
});
