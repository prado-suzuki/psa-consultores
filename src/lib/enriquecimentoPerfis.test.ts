import { describe, expect, it } from 'vitest';

import {
  contratoSaidaDe,
  descricaoDoTipoDeSaida,
  lerContratoSaida,
  lerTemperatura,
  nomeDeExibicao,
  rascunhoDe,
  rascunhoVazio,
  temErros,
  validarRascunho,
  valoresDoRascunho,
  type PerfilEnriquecimento,
  type RascunhoDePerfil,
} from './enriquecimentoPerfis';

const PERFIL_ESTRUTURADO: PerfilEnriquecimento = {
  id: 'p1',
  nome: 'comentario-para-tarefa',
  rotulo: 'Comentário para tarefa',
  instrucoes: 'Transforme o comentário em uma única tarefa.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: 0.2,
  contrato_saida: {
    tipo: 'estruturada',
    campos: {
      titulo: { descricao: 'Título curto da tarefa.' },
      descricao: { descricao: 'Descrição completa da tarefa.' },
    },
  },
  ativo: true,
  updated_at: '2026-09-25T12:00:00Z',
};

const rascunhoValido = (acima: Partial<RascunhoDePerfil> = {}): RascunhoDePerfil => ({
  ...rascunhoVazio(),
  nome: 'meu-perfil',
  rotulo: 'Meu perfil',
  instrucoes: 'Faça a coisa certa.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: '0.2',
  ...acima,
});

describe('montagem de contrato_saida', () => {
  it('saída de texto único é o objeto {"tipo":"texto"}, sem chave sobrando', () => {
    expect(contratoSaidaDe(rascunhoValido())).toEqual({ tipo: 'texto' });
  });

  it('saída estruturada converte a lista de campos em objeto', () => {
    const contrato = contratoSaidaDe(
      rascunhoValido({
        tipoDeSaida: 'estruturada',
        campos: [
          { nome: 'titulo', descricao: 'Título curto da tarefa.' },
          { nome: 'descricao', descricao: 'Descrição completa da tarefa.' },
        ],
      }),
    );

    expect(contrato).toEqual({
      tipo: 'estruturada',
      campos: {
        titulo: { descricao: 'Título curto da tarefa.' },
        descricao: { descricao: 'Descrição completa da tarefa.' },
      },
    });
  });

  it('a leitura devolve o contrato para o formulário sem perder campos', () => {
    const lido = lerContratoSaida(PERFIL_ESTRUTURADO.contrato_saida);

    expect(lido.tipoDeSaida).toBe('estruturada');
    expect(lido.campos.map((c) => c.nome)).toEqual(['titulo', 'descricao']);
    expect(lido.campos[0].descricao).toBe('Título curto da tarefa.');
  });

  it('a ida e volta linha → rascunho → valores reproduz a linha original', () => {
    const valores = valoresDoRascunho(rascunhoDe(PERFIL_ESTRUTURADO));

    expect(valores.nome).toBe(PERFIL_ESTRUTURADO.nome);
    expect(valores.rotulo).toBe(PERFIL_ESTRUTURADO.rotulo);
    expect(valores.instrucoes).toBe(PERFIL_ESTRUTURADO.instrucoes);
    expect(valores.modelo).toBe(PERFIL_ESTRUTURADO.modelo);
    expect(valores.temperatura).toBe(0.2);
    expect(valores.contrato_saida).toEqual(PERFIL_ESTRUTURADO.contrato_saida);
    expect(valores.ativo).toBe(true);
  });

  it('jsonb com forma inesperada não estoura: cai em texto com lista vazia', () => {
    // O banco só aceita o que a função valida, mas uma leitura defensiva custa
    // nada e evita tela quebrada caso a forma evolua.
    expect(lerContratoSaida(null)).toEqual({ tipoDeSaida: 'texto', campos: [] });
    expect(lerContratoSaida('texto')).toEqual({ tipoDeSaida: 'texto', campos: [] });
    expect(lerContratoSaida({ tipo: 'estruturada', campos: 'não-objeto' })).toEqual({
      tipoDeSaida: 'estruturada',
      campos: [],
    });
    expect(lerContratoSaida({ tipo: 'estruturada', campos: { a: 'sem objeto' } })).toEqual({
      tipoDeSaida: 'estruturada',
      campos: [{ nome: 'a', descricao: '' }],
    });
  });
});

describe('validação antes de salvar', () => {
  it('rascunho completo não tem erro nenhum', () => {
    expect(temErros(validarRascunho(rascunhoValido()))).toBe(false);
  });

  it('nome do perfil é obrigatório e segue o padrão do banco', () => {
    expect(validarRascunho(rascunhoValido({ nome: '  ' })).nome).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ nome: 'Maiúscula' })).nome).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ nome: 'com espaço' })).nome).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ nome: '1comeca-por-numero' })).nome).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ nome: '-hifen-na-frente' })).nome).toBeTruthy();
    // O padrão do banco (`^[a-z][a-z0-9-]*$`) permite dígito e hífen no meio:
    expect(validarRascunho(rascunhoValido({ nome: 'perfil-2b' })).nome).toBeUndefined();
  });

  it('rótulo, instruções e modelo são obrigatórios', () => {
    expect(validarRascunho(rascunhoValido({ rotulo: '' })).rotulo).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ instrucoes: '   ' })).instrucoes).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ modelo: '' })).modelo).toBeTruthy();
  });

  it('temperatura só vale entre 0 e 1 (vírgula decimal aceita)', () => {
    expect(validarRascunho(rascunhoValido({ temperatura: '0,5' })).temperatura).toBeUndefined();
    expect(validarRascunho(rascunhoValido({ temperatura: '0' })).temperatura).toBeUndefined();
    expect(validarRascunho(rascunhoValido({ temperatura: '1' })).temperatura).toBeUndefined();
    expect(validarRascunho(rascunhoValido({ temperatura: '1.01' })).temperatura).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ temperatura: '-0.1' })).temperatura).toBeTruthy();
    expect(validarRascunho(rascunhoValido({ temperatura: 'quente' })).temperatura).toBeTruthy();
    expect(lerTemperatura('0,30')).toBe(0.3);
  });

  it('saída estruturada exige pelo menos um campo', () => {
    const erros = validarRascunho(rascunhoValido({ tipoDeSaida: 'estruturada', campos: [] }));
    expect(erros.campos).toBeTruthy();
  });

  it('saída de texto não valida campos nem reclama de lista vazia', () => {
    const erros = validarRascunho(rascunhoValido({ tipoDeSaida: 'texto', campos: [] }));
    expect(erros.campos).toBeUndefined();
    expect(erros.errosDeCampo).toEqual({});
  });

  it('nome de campo segue o padrão de chave do contrato', () => {
    const campos = (nome: string) => [{ nome, descricao: 'ok' }];
    const errosDe = (nome: string) =>
      validarRascunho(rascunhoValido({ tipoDeSaida: 'estruturada', campos: campos(nome) }));

    // Campo válido NÃO cria entrada em errosDeCampo — o mapa é esparso.
    expect(errosDe('titulo').errosDeCampo[0]).toBeUndefined();
    expect(errosDe('titulo_2').errosDeCampo[0]).toBeUndefined();
    expect(errosDe('Titulo').errosDeCampo[0]?.nome).toBeTruthy(); // maiúscula
    expect(errosDe('1titulo').errosDeCampo[0]?.nome).toBeTruthy(); // dígito na frente
    expect(errosDe('com-hifen').errosDeCampo[0]?.nome).toBeTruthy(); // hífen não vale aqui
  });

  it('nomes de campo repetidos são recusados', () => {
    const erros = validarRascunho(
      rascunhoValido({
        tipoDeSaida: 'estruturada',
        campos: [
          { nome: 'titulo', descricao: 'um' },
          { nome: 'titulo', descricao: 'dois' },
        ],
      }),
    );

    expect(erros.errosDeCampo[0]).toBeUndefined();
    expect(erros.errosDeCampo[1]?.nome).toBeTruthy();
  });

  it('descrição é obrigatória em todos os campos', () => {
    const erros = validarRascunho(
      rascunhoValido({
        tipoDeSaida: 'estruturada',
        campos: [
          { nome: 'titulo', descricao: 'ok' },
          { nome: 'descricao', descricao: '' },
        ],
      }),
    );

    expect(erros.errosDeCampo[0]).toBeUndefined();
    expect(erros.errosDeCampo[1]?.descricao).toBeTruthy();
  });
});

describe('valores do rascunho', () => {
  it('limpa espaços e converte a temperatura para número', () => {
    const valores = valoresDoRascunho(
      rascunhoValido({ nome: '  meu-perfil  ', rotulo: ' Meu perfil ', temperatura: ' 0,35 ' }),
    );

    expect(valores.nome).toBe('meu-perfil');
    expect(valores.rotulo).toBe('Meu perfil');
    expect(valores.temperatura).toBe(0.35);
  });
});

describe('ajustes de exibição', () => {
  it('o nome de exibição é o rótulo, caindo para o nome técnico', () => {
    expect(nomeDeExibicao(PERFIL_ESTRUTURADO)).toBe('Comentário para tarefa');
    expect(nomeDeExibicao({ rotulo: '  ', nome: 'so-o-nome' })).toBe('so-o-nome');
  });

  it('a listagem descreve o tipo de saída com a contagem de campos', () => {
    expect(descricaoDoTipoDeSaida({ tipo: 'texto' })).toBe('Texto');
    expect(descricaoDoTipoDeSaida(PERFIL_ESTRUTURADO.contrato_saida)).toBe('Estruturada · 2 campos');
    expect(descricaoDoTipoDeSaida({ tipo: 'estruturada', campos: { a: { descricao: 'd' } } })).toBe(
      'Estruturada · 1 campo',
    );
  });
});
