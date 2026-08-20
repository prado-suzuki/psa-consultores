import { describe, expect, it } from 'vitest';
import {
  canonicoNaLista, chaveNomeLugar, combinaBusca, municipioAoTrocarUf, parseMunicipiosIbge,
  siglaDaUf, urlMunicipiosIbge,
} from '@/lib/municipiosIbge';

/** Forma real da resposta do IBGE, reduzida ao que importa mais o aninhado. */
function item(nome: string, over: Record<string, unknown> = {}) {
  return {
    id: 5103403,
    nome,
    microrregiao: {
      id: 51009,
      nome: 'Cuiabá',
      mesorregiao: { id: 5103, nome: 'Centro-Sul', UF: { id: 51, sigla: 'MT' } },
    },
    ...over,
  };
}

describe('urlMunicipiosIbge', () => {
  it('monta o endereço da UF', () => {
    expect(urlMunicipiosIbge('MT')).toContain('/estados/MT/municipios');
  });

  it('escapa a UF em vez de concatenar cru', () => {
    expect(urlMunicipiosIbge('a/b')).toContain('a%2Fb');
  });
});

describe('parseMunicipiosIbge', () => {
  it('devolve só os nomes, descartando o aninhado de regiões', () => {
    expect(parseMunicipiosIbge([item('Cuiabá'), item('Sinop')])).toEqual(['Cuiabá', 'Sinop']);
  });

  it('ordena em pt-BR, para acentuada não cair no fim da lista', () => {
    const lista = parseMunicipiosIbge([item('Zortéa'), item('Água Boa'), item('Barra do Bugres')]);

    expect(lista).toEqual(['Água Boa', 'Barra do Bugres', 'Zortéa']);
  });

  // Alguns municípios do IBGE vêm com microrregiao nula; exigir qualquer campo
  // além do nome derrubaria a lista inteira por causa de um item.
  it('aceita item sem o aninhado', () => {
    expect(parseMunicipiosIbge([item('Cuiabá', { microrregiao: null })])).toEqual(['Cuiabá']);
  });

  it('descarta item sem nome em vez de criar linha vazia', () => {
    expect(parseMunicipiosIbge([item('Sinop'), { id: 1 }, { id: 2, nome: '   ' }]))
      .toEqual(['Sinop']);
  });

  it('não repete nome duplicado', () => {
    expect(parseMunicipiosIbge([item('Sinop'), item('Sinop')])).toEqual(['Sinop']);
  });

  it('resposta que não é lista devolve vazio em vez de estourar', () => {
    expect(parseMunicipiosIbge({ erro: 'fora do ar' })).toEqual([]);
    expect(parseMunicipiosIbge(null)).toEqual([]);
  });
});

describe('chaveNomeLugar', () => {
  it('iguala o que só difere em acento, caixa e espaço', () => {
    expect(chaveNomeLugar('  cuiabá ')).toBe(chaveNomeLugar('CUIABA'));
    expect(chaveNomeLugar('Matupá')).toBe(chaveNomeLugar('MATUPA'));
    expect(chaveNomeLugar('Barra  do   Bugres')).toBe(chaveNomeLugar('BARRA DO BUGRES'));
  });

  it('não iguala municípios diferentes', () => {
    expect(chaveNomeLugar('Sinop')).not.toBe(chaveNomeLugar('Sorriso'));
  });
});

describe('canonicoNaLista', () => {
  const LISTA = ['Cuiabá', 'Matupá', 'Sinop'];

  // É o caso dos 70 de 75 clientes gravados em maiúsculas sem acento.
  it('reconhece o valor legado e devolve a forma canônica', () => {
    expect(canonicoNaLista('CUIABA', LISTA)).toBe('Cuiabá');
    expect(canonicoNaLista('MATUPA', LISTA)).toBe('Matupá');
  });

  it('devolve undefined para valor que não é município da UF', () => {
    expect(canonicoNaLista('Mapito', LISTA)).toBeUndefined();
  });

  it('valor vazio não casa com nada', () => {
    expect(canonicoNaLista('   ', LISTA)).toBeUndefined();
  });
});

describe('combinaBusca', () => {
  // O dado gravado não tem acento, então quem digita como está gravado tem de
  // achar a cidade acentuada. Era o defeito achado na validação de tela.
  it('acha a acentuada digitando sem acento', () => {
    expect(combinaBusca('Água Boa', 'agua boa')).toBe(true);
    expect(combinaBusca('São José do Rio Claro', 'sao jose')).toBe(true);
    expect(combinaBusca('Vila Bela da Santíssima Trindade', 'santissima')).toBe(true);
    expect(combinaBusca('Itaúba', 'itauba')).toBe(true);
  });

  it('acha pelo meio do nome e ignora a caixa', () => {
    expect(combinaBusca('Barra do Bugres', 'BUGRES')).toBe(true);
  });

  it('não acha o que não está no nome', () => {
    expect(combinaBusca('Sinop', 'sorriso')).toBe(false);
  });

  it('busca vazia não filtra nada', () => {
    expect(combinaBusca('Sinop', '  ')).toBe(true);
  });
});

describe('municipioAoTrocarUf', () => {
  it('trocar de estado tira a cidade, que não pertence mais', () => {
    expect(municipioAoTrocarUf('SP', 'MT', 'Sinop')).toBe('');
  });

  // O caso mais comum do dado existente: metade dos clientes tem o estado por
  // extenso, e corrigir isso não pode apagar a cidade certa.
  it('corrigir a UF por extenso para a sigla preserva a cidade', () => {
    expect(municipioAoTrocarUf('MT', 'MATO GROSSO', 'Sinop')).toBe('Sinop');
    expect(municipioAoTrocarUf('GO', 'Goiás', 'Anápolis')).toBe('Anápolis');
  });

  it('escolher a mesma UF de novo não mexe na cidade', () => {
    expect(municipioAoTrocarUf('MT', 'MT', 'Sinop')).toBe('Sinop');
  });

  it('preencher a UF que estava vazia limpa a cidade órfã', () => {
    expect(municipioAoTrocarUf('MT', '', 'Sinop')).toBe('');
  });

  it('cidade ausente devolve vazio, nunca nulo', () => {
    expect(municipioAoTrocarUf('MT', 'MT', null)).toBe('');
  });
});

describe('siglaDaUf', () => {
  it('devolve a sigla quando já é sigla', () => {
    expect(siglaDaUf('MT')).toBe('MT');
    expect(siglaDaUf('mt')).toBe('MT');
  });

  // Metade dos clientes tem o estado por extenso, herança de importação.
  it('traduz o estado por extenso, com e sem acento', () => {
    expect(siglaDaUf('MATO GROSSO')).toBe('MT');
    expect(siglaDaUf('Mato Grosso do Sul')).toBe('MS');
    expect(siglaDaUf('GOIAS')).toBe('GO');
    expect(siglaDaUf('Goiás')).toBe('GO');
    expect(siglaDaUf('São Paulo')).toBe('SP');
    expect(siglaDaUf('Rio Grande do Norte')).toBe('RN');
  });

  it('devolve undefined para vazio e para o que não reconhece', () => {
    expect(siglaDaUf('')).toBeUndefined();
    expect(siglaDaUf(null)).toBeUndefined();
    expect(siglaDaUf('Mapito')).toBeUndefined();
  });
});
