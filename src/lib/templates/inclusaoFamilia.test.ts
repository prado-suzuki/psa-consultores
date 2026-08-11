import { describe, it, expect } from 'vitest';
import { compilar, expandirInclusoes, inclusoesDe, renderConteudo, renderSegmentos } from './render';
import { conteudoParaDeteccao, detectarBindingsDeConteudo } from './binding';
import { gerarBlocos } from './index';
import type { RegistroFamilias } from './familia';
import type { Template } from './types';

// Família mínima com a forma real: rural x urbano cruzado com inteiro x
// fracionado, cada variante lendo campos do escopo do ITEM ({{ imovel.* }}).
const FAMILIAS: RegistroFamilias = {
  'Descrição de imóvel': [
    {
      id: 'var-posse',
      rotulo: 'Direitos não averbados',
      ordem: 1,
      seletor: { 'imovel.posse': 'sim' },
      conteudo: 'Direitos sobre o imóvel {{ imovel.nome }}',
    },
    {
      id: 'var-rural',
      rotulo: 'Rural, propriedade exclusiva',
      ordem: 2,
      seletor: { 'imovel.rural': 'sim', 'imovel.inteiro': 'sim' },
      conteudo: 'Um imóvel rural denominado {{ imovel.nome }}',
    },
    {
      id: 'var-urbano',
      rotulo: 'Urbano, propriedade exclusiva',
      ordem: 3,
      seletor: { 'imovel.urbano': 'sim', 'imovel.inteiro': 'sim' },
      conteudo: 'Um imóvel urbano na {{ imovel.logradouro }}{{#imovel.temConstruida}}, sendo {{ imovel.construida }} construídos{{/imovel.temConstruida}}',
    },
  ],
};

const rural = { imovel: { nome: 'Fazenda São Bento', rural: 'sim', inteiro: 'sim' } };
const urbano = {
  imovel: { nome: 'Sala 1204', urbano: 'sim', inteiro: 'sim', logradouro: 'Avenida das Itaúbas', temConstruida: '', construida: '' },
};

describe('compilação do token {{familia nome="…"}}', () => {
  it('vira nó de inclusão', () => {
    expect(compilar('a {{familia nome="X"}} b')).toEqual([
      { tipo: 'texto', texto: 'a ' },
      { tipo: 'inclusao', familia: 'X' },
      { tipo: 'texto', texto: ' b' },
    ]);
  });

  it('placeholder comum segue placeholder (atributo é o que distingue)', () => {
    expect(compilar('{{ imovel.nome }}')).toEqual([{ tipo: 'placeholder', caminho: 'imovel.nome' }]);
  });

  it('inclusão sem nome falha cedo no modo estrito', () => {
    expect(() => compilar('{{familia rotulo="X"}}')).toThrow(/sem nome/);
  });

  it('identificador com atributos fora da inclusão é erro de escrita', () => {
    expect(() => compilar('{{socio nome="X"}}')).toThrow(/Atributos só são válidos/);
  });

  it('no modo tolerante (editor digitando) o atributo não derruba a extração', () => {
    expect(compilar('{{socio nome="X"}}', { tolerante: true })).toEqual([
      { tipo: 'placeholder', caminho: 'socio' },
    ]);
  });
});

describe('render da inclusão', () => {
  it('escreve a variante eleita pelos dados do escopo', () => {
    expect(renderConteudo('{{familia nome="Descrição de imóvel"}}.', rural, { familias: FAMILIAS })).toBe(
      'Um imóvel rural denominado Fazenda São Bento.',
    );
    expect(renderConteudo('{{familia nome="Descrição de imóvel"}}.', urbano, { familias: FAMILIAS })).toBe(
      'Um imóvel urbano na Avenida das Itaúbas.',
    );
  });

  it('as seções internas da variante funcionam como em qualquer bloco', () => {
    const comConstruida = { imovel: { ...urbano.imovel, temConstruida: 'sim', construida: '96,40 m²' } };
    expect(renderConteudo('{{familia nome="Descrição de imóvel"}}', comConstruida, { familias: FAMILIAS })).toBe(
      'Um imóvel urbano na Avenida das Itaúbas, sendo 96,40 m² construídos',
    );
  });

  it('UMA variante POR ITEM dentro do laço — o caso que motiva a família', () => {
    const contexto = {
      imoveis: [
        { imovel: rural.imovel },
        { imovel: urbano.imovel },
        { imovel: { nome: 'Gleba do Sítio', posse: 'sim', rural: 'sim', inteiro: 'sim' } },
      ],
    };
    expect(
      renderConteudo('{{#imoveis sep="; "}}{{familia nome="Descrição de imóvel"}}{{/imoveis}}', contexto, {
        familias: FAMILIAS,
      }),
    ).toBe(
      'Um imóvel rural denominado Fazenda São Bento; Um imóvel urbano na Avenida das Itaúbas; Direitos sobre o imóvel Gleba do Sítio',
    );
  });

  it('marca os segmentos com o id da variante (a prévia precisa saber de quem é o trecho)', () => {
    const segs = renderSegmentos('Alínea: {{familia nome="Descrição de imóvel"}}', rural, [], {
      familias: FAMILIAS,
    });
    expect(segs.map((s) => [s.texto, s.blocoId])).toEqual([
      ['Alínea: ', undefined],
      ['Um imóvel rural denominado ', 'var-rural'],
      ['Fazenda São Bento', 'var-rural'],
    ]);
  });

  it('família desconhecida falha nomeando as disponíveis', () => {
    expect(() => renderConteudo('{{familia nome="Outra"}}', rural, { familias: FAMILIAS })).toThrow(
      /Família não encontrada: "Outra".*Descrição de imóvel/,
    );
  });

  it('sem registro de famílias, a inclusão falha em vez de sumir do texto', () => {
    expect(() => renderConteudo('{{familia nome="Descrição de imóvel"}}', rural)).toThrow(/Família não encontrada/);
  });

  it('família dentro de família é barrada (um nível só, como o trigger do banco)', () => {
    const aninhada: RegistroFamilias = {
      A: [{ id: 'a1', rotulo: null, ordem: 1, seletor: {}, conteudo: '{{familia nome="A"}}' }],
    };
    expect(() => renderConteudo('{{familia nome="A"}}', {}, { familias: aninhada })).toThrow(
      /dentro de outra família/,
    );
  });

  it('imóvel que não casa nenhuma variante derruba a prévia (não sai parágrafo faltando)', () => {
    // Cadastro respondeu (campos presentes e vazios): é caso sem redação.
    const semTipo = { imovel: { nome: 'Sem tipo', posse: '', rural: '', urbano: '', inteiro: 'sim' } };
    expect(() => renderConteudo('{{familia nome="Descrição de imóvel"}}', semTipo, { familias: FAMILIAS })).toThrow(
      /Nenhuma variante de "Descrição de imóvel"/,
    );
  });

  it('dado sem os campos de classificação aponta o snapshot antigo, não o cadastro', () => {
    expect(() =>
      renderConteudo('{{familia nome="Descrição de imóvel"}}', { imovel: { nome: 'Congelado' } }, { familias: FAMILIAS }),
    ).toThrow(/não trazem a classificação.*Atualizar do cadastro/s);
  });
});

describe('inclusão num bloco repetidor (o caminho real da tela Gerar)', () => {
  const template: Template = {
    id: 't',
    nome: 'contrato',
    blocos: [
      {
        id: 'paragrafo-integralizacao',
        tipo: 'paragrafo',
        obrigatorio: true,
        repeteColecao: 'integralizacoes',
        conteudo:
          'O sócio {{ socio.nome }} integraliza:\n{{#imoveis sep="\\n"}}{{ imovel.alinea }}) {{familia nome="Descrição de imóvel"}}.{{/imoveis}}',
      },
    ],
  };

  it('cada alínea de cada sócio resolve a sua variante', () => {
    const contexto = {
      integralizacoes: [
        {
          socio: { nome: 'Avelino' },
          imoveis: [
            { imovel: { ...rural.imovel, alinea: 'a' } },
            { imovel: { ...urbano.imovel, alinea: 'b' } },
          ],
        },
        {
          socio: { nome: 'Iracema' },
          imoveis: [{ imovel: { ...urbano.imovel, nome: 'Casa', logradouro: 'Rua dos Ipês', alinea: 'a' } }],
        },
      ],
    };
    const blocos = gerarBlocos(template, contexto, [], FAMILIAS);
    expect(blocos).toHaveLength(2);
    expect(blocos[0].conteudo).toBe(
      '*Parágrafo Primeiro:* O sócio Avelino integraliza:\na) Um imóvel rural denominado Fazenda São Bento.\nb) Um imóvel urbano na Avenida das Itaúbas.',
    );
    expect(blocos[1].conteudo).toBe(
      '*Parágrafo Segundo:* O sócio Iracema integraliza:\na) Um imóvel urbano na Rua dos Ipês.',
    );
  });
});

describe('detecção de bindings com família', () => {
  it('bloco unitário: os campos das variantes viram binding do papel citado', () => {
    // Sem expandir, a detecção não veria NADA dentro da família e a tela Gerar
    // não pediria o imóvel — o documento sairia sem ter o que preencher.
    const conteudo = conteudoParaDeteccao({ conteudo: 'Anexo: {{familia nome="Descrição de imóvel"}}' }, FAMILIAS);
    const { bindings, campos } = detectarBindingsDeConteudo(conteudo);
    expect(bindings.map((b) => [b.nome, b.tipo])).toEqual([['imovel', 'matricula']]);
    expect(campos).toContain('imovel.logradouro');
    expect(campos).toContain('imovel.nome');
  });

  it('bloco repetidor: os campos ficam no escopo do item, não viram binding unitário', () => {
    const conteudo = conteudoParaDeteccao(
      {
        conteudo: '{{#imoveis}}{{ imovel.alinea }}) {{familia nome="Descrição de imóvel"}}{{/imoveis}}',
        repeteColecao: 'integralizacoes',
      },
      FAMILIAS,
    );
    const { bindings, listas } = detectarBindingsDeConteudo(conteudo);
    expect(listas.map((l) => l.nome)).toEqual(['integralizacoes']);
    expect(bindings).toEqual([]);
  });

  it('sem registro, o token fica intacto e não inventa binding (o render é quem acusa)', () => {
    const conteudo = conteudoParaDeteccao({ conteudo: 'x {{familia nome="Descrição de imóvel"}}' });
    expect(conteudo).toContain('{{familia nome="Descrição de imóvel"}}');
    expect(detectarBindingsDeConteudo(conteudo).bindings).toEqual([]);
  });
});

describe('varredura textual das inclusões (detecção de bindings / UI)', () => {
  it('lista as famílias citadas, sem repetir', () => {
    expect(inclusoesDe('{{familia nome="A"}} x {{familia nome="B"}} y {{familia nome="A"}}')).toEqual(['A', 'B']);
  });

  it('conteúdo sem inclusão devolve lista vazia', () => {
    expect(inclusoesDe('só {{ campos }} aqui')).toEqual([]);
  });

  it('expande preservando a posição (o token pode estar dentro de uma seção)', () => {
    expect(
      expandirInclusoes('{{#imoveis}}a) {{familia nome="Descrição de imóvel"}}{{/imoveis}}', (nome) =>
        FAMILIAS[nome].map((v) => v.conteudo).join(' '),
      ),
    ).toBe(
      '{{#imoveis}}a) Direitos sobre o imóvel {{ imovel.nome }} Um imóvel rural denominado {{ imovel.nome }} Um imóvel urbano na {{ imovel.logradouro }}{{#imovel.temConstruida}}, sendo {{ imovel.construida }} construídos{{/imovel.temConstruida}}{{/imoveis}}',
    );
  });
});
