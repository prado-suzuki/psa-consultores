import { describe, expect, it } from 'vitest';

import {
  interpretarEnriquecimento,
  interpretarPerfilEnriquecimento,
  NOME_FERRAMENTA_SAIDA,
  prepararEnriquecimento,
  validarPedidoEnriquecimento,
} from './enriquecimentoTexto';

const LINHA_TEXTO = {
  nome: 'transcricao-fiel',
  rotulo: 'Transcrição fiel',
  instrucoes: 'Limpe a fala sem mudar o sentido.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: 0,
  contrato_saida: { tipo: 'texto' },
  ativo: true,
};

const LINHA_ESTRUTURADA = {
  nome: 'comentario-para-tarefa',
  rotulo: 'Comentário para tarefa',
  instrucoes: 'Transforme o comentário em tarefa.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: 0.2,
  contrato_saida: {
    tipo: 'estruturada',
    campos: {
      titulo: { descricao: 'Título curto da tarefa.' },
      descricao: { descricao: 'Descrição da tarefa.' },
    },
  },
  ativo: true,
};

const PERFIL_TEXTO = interpretarPerfilEnriquecimento(LINHA_TEXTO);
const PERFIL_ESTRUTURADO = interpretarPerfilEnriquecimento(LINHA_ESTRUTURADA);

function pedidoTexto(destino: 'simples' | 'rico' = 'rico') {
  return validarPedidoEnriquecimento(
    PERFIL_TEXTO,
    'Então, é, não são 15, são 50 unidades.',
    destino,
    undefined,
  );
}

function pedidoEstruturado() {
  return validarPedidoEnriquecimento(
    PERFIL_ESTRUTURADO,
    'Precisamos revisar o contrato.',
    undefined,
    { titulo: 'simples', descricao: 'rico' },
  );
}

describe('interpretarPerfilEnriquecimento', () => {
  it('interpreta contratos simples e estruturados vindos do banco', () => {
    expect(PERFIL_TEXTO).toMatchObject({
      nome: 'transcricao-fiel',
      temperatura: 0,
      contratoSaida: { tipo: 'texto' },
    });
    expect(PERFIL_ESTRUTURADO.contratoSaida).toEqual({
      tipo: 'estruturada',
      campos: {
        titulo: { descricao: 'Título curto da tarefa.' },
        descricao: { descricao: 'Descrição da tarefa.' },
      },
    });
  });

  it.each([
    [{ ...LINHA_TEXTO, nome: 'Transcrição fiel' }, 'nome'],
    [{ ...LINHA_TEXTO, instrucoes: ' ' }, 'instrucoes'],
    [{ ...LINHA_TEXTO, temperatura: 1.1 }, 'temperatura'],
    [{ ...LINHA_TEXTO, ativo: false }, 'inativo'],
    [{ ...LINHA_TEXTO, contrato_saida: { tipo: 'texto', campos: {} } }, 'contrato_saida'],
    [
      { ...LINHA_ESTRUTURADA, contrato_saida: { tipo: 'estruturada', campos: {} } },
      'contrato_saida',
    ],
    [
      {
        ...LINHA_ESTRUTURADA,
        contrato_saida: {
          tipo: 'estruturada',
          campos: { 'campo-inválido': { descricao: 'Descrição' } },
        },
      },
      'campo',
    ],
    [
      {
        ...LINHA_ESTRUTURADA,
        contrato_saida: { tipo: 'estruturada', campos: { titulo: 'Descrição' } },
      },
      'campo',
    ],
  ])('rejeita perfil inválido %#', (linha, mensagem) => {
    expect(() => interpretarPerfilEnriquecimento(linha)).toThrow(mensagem);
  });
});

describe('validarPedidoEnriquecimento', () => {
  it('exige destino explícito para saída simples', () => {
    expect(() => validarPedidoEnriquecimento(PERFIL_TEXTO, 'Texto', undefined, undefined)).toThrow(
      'obrigatório',
    );
    expect(pedidoTexto('simples')).toMatchObject({ estruturado: false, destino: 'simples' });
  });

  it('rejeita destinos ausentes, extras e inválidos antes da chamada', () => {
    expect(() =>
      validarPedidoEnriquecimento(PERFIL_ESTRUTURADO, 'Texto', undefined, {
        titulo: 'simples',
      }),
    ).toThrow('ausentes: descricao');
    expect(() =>
      validarPedidoEnriquecimento(PERFIL_ESTRUTURADO, 'Texto', undefined, {
        titulo: 'simples',
        descricao: 'rico',
        prazo: 'simples',
      }),
    ).toThrow('inesperados: prazo');
    expect(() =>
      validarPedidoEnriquecimento(PERFIL_ESTRUTURADO, 'Texto', undefined, {
        titulo: 'html',
        descricao: 'rico',
      }),
    ).toThrow('inválidos: titulo');
  });
});

describe('prepararEnriquecimento', () => {
  it('monta prompt simples com o destino fornecido pela chamada', () => {
    const pedido = pedidoTexto('rico');
    const chamada = prepararEnriquecimento(PERFIL_TEXTO, pedido);
    const system = chamada.mensagens[0];
    const user = chamada.mensagens[1];

    expect(system.role).toBe('system');
    if (system.role !== 'system' || typeof system.content === 'string') {
      throw new Error('prompt inválido');
    }
    expect(system.content).toHaveLength(3);
    expect(system.content.every((trecho) => trecho.cacheavel)).toBe(true);
    expect(system.content.map((trecho) => trecho.texto).join(' ')).toContain('++sublinhado++');
    expect(user).toMatchObject({ role: 'user' });
    if (user.role !== 'user' || typeof user.content !== 'string') {
      throw new Error('prompt inválido');
    }
    expect(user.content).toContain('texto não confiável');
    expect(user.content).toContain(JSON.stringify({ texto: pedido.texto }));
  });

  it('monta schema e instruções de cada campo com os destinos da chamada', () => {
    const chamada = prepararEnriquecimento(PERFIL_ESTRUTURADO, pedidoEstruturado());
    const parametros = chamada.ferramentas?.[0].function.parameters;

    expect(chamada.ferramentas?.[0].function.name).toBe(NOME_FERRAMENTA_SAIDA);
    expect(parametros).toMatchObject({
      required: ['titulo', 'descricao'],
      additionalProperties: false,
      properties: {
        titulo: { description: expect.stringContaining('texto simples') },
        descricao: { description: expect.stringContaining('Markdown restrito') },
      },
    });
    expect(chamada.escolhaDeFerramenta).toEqual({
      type: 'function',
      function: { name: NOME_FERRAMENTA_SAIDA },
    });
  });
});

describe('interpretarEnriquecimento', () => {
  it('devolve texto e destino em resposta simples', () => {
    const pedido = pedidoTexto('rico');
    expect(
      interpretarEnriquecimento(PERFIL_TEXTO, pedido, {
        content: 'Não são 15, são 50 unidades.',
        toolCalls: [],
        finishReason: 'stop',
      }),
    ).toEqual({
      estruturado: false,
      texto: 'Não são 15, são 50 unidades.',
      destino: 'rico',
    });
  });

  it('valida e associa o destino fornecido para cada campo estruturado', () => {
    expect(
      interpretarEnriquecimento(PERFIL_ESTRUTURADO, pedidoEstruturado(), {
        content: null,
        toolCalls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: NOME_FERRAMENTA_SAIDA,
              arguments:
                '{"titulo":"Revisar contrato","descricao":"**Contexto:** contrato recebido."}',
            },
          },
        ],
        finishReason: 'tool_calls',
      }),
    ).toEqual({
      estruturado: true,
      campos: {
        titulo: { texto: 'Revisar contrato', destino: 'simples' },
        descricao: { texto: '**Contexto:** contrato recebido.', destino: 'rico' },
      },
    });
  });

  it('recusa resposta estruturada ausente, extra ou sem JSON válido', () => {
    const pedido = pedidoEstruturado();
    const resposta = (argumentos: string) => ({
      content: null,
      toolCalls: [
        {
          id: 'call-1',
          type: 'function' as const,
          function: { name: NOME_FERRAMENTA_SAIDA, arguments: argumentos },
        },
      ],
      finishReason: 'tool_calls',
    });

    expect(() => interpretarEnriquecimento(PERFIL_ESTRUTURADO, pedido, resposta('{'))).toThrow(
      'inválida',
    );
    expect(() =>
      interpretarEnriquecimento(PERFIL_ESTRUTURADO, pedido, resposta('{"titulo":"Revisar"}')),
    ).toThrow('descricao');
    expect(() =>
      interpretarEnriquecimento(
        PERFIL_ESTRUTURADO,
        pedido,
        resposta('{"titulo":"Revisar","descricao":"Texto","prazo":"amanhã"}'),
      ),
    ).toThrow('inesperados');
  });
});
