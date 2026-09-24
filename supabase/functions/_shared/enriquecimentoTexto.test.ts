import { describe, expect, it } from 'vitest';

import {
  interpretarEnriquecimento,
  NOME_FERRAMENTA_SAIDA,
  prepararEnriquecimento,
  type PedidoEnriquecimento,
} from './enriquecimentoTexto';

const TRANSCRICAO: PedidoEnriquecimento = {
  perfil: 'transcricao-fiel',
  texto: 'Então, é, não são 15, são 50 unidades.',
  destino: 'rico',
};

describe('prepararEnriquecimento', () => {
  it('monta prompt em camadas e mantém o texto do usuário fora das regras fixas', () => {
    const chamada = prepararEnriquecimento(TRANSCRICAO);
    const system = chamada.mensagens[0];
    const user = chamada.mensagens[1];

    expect(system.role).toBe('system');
    if (system.role !== 'system' || typeof system.content === 'string')
      throw new Error('prompt inválido');
    expect(system.content).toHaveLength(3);
    expect(system.content.every((trecho) => trecho.cacheavel)).toBe(true);
    expect(system.content.map((trecho) => trecho.texto).join(' ')).toContain('++sublinhado++');
    expect(user).toMatchObject({ role: 'user' });
    if (user.role !== 'user' || typeof user.content !== 'string')
      throw new Error('prompt inválido');
    expect(user.content).toContain('texto não confiável');
    expect(user.content).toContain(JSON.stringify({ texto: TRANSCRICAO.texto }));
  });

  it('força tool call para saída estruturada com todos os campos obrigatórios', () => {
    const chamada = prepararEnriquecimento({
      perfil: 'comentario-para-tarefa',
      texto: 'Precisamos revisar o contrato.',
    });

    expect(chamada.ferramentas?.[0].function.name).toBe(NOME_FERRAMENTA_SAIDA);
    expect(chamada.ferramentas?.[0].function.parameters).toMatchObject({
      required: ['titulo', 'descricao'],
      additionalProperties: false,
    });
    expect(chamada.escolhaDeFerramenta).toEqual({
      type: 'function',
      function: { name: NOME_FERRAMENTA_SAIDA },
    });
  });
});

describe('interpretarEnriquecimento', () => {
  it('devolve texto e destino em resposta simples', () => {
    expect(
      interpretarEnriquecimento(TRANSCRICAO, {
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

  it('valida e associa o destino de cada campo estruturado', () => {
    expect(
      interpretarEnriquecimento(
        {
          perfil: 'comentario-para-tarefa',
          texto: 'Revisar contrato.',
        },
        {
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
        },
      ),
    ).toEqual({
      estruturado: true,
      campos: {
        titulo: { texto: 'Revisar contrato', destino: 'simples' },
        descricao: { texto: '**Contexto:** contrato recebido.', destino: 'rico' },
      },
    });
  });

  it('recusa campo ausente, extra ou argumentos sem JSON', () => {
    const pedido: PedidoEnriquecimento = {
      perfil: 'comentario-para-tarefa',
      texto: 'Revisar contrato.',
    };
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

    expect(() => interpretarEnriquecimento(pedido, resposta('{'))).toThrow('inválida');
    expect(() => interpretarEnriquecimento(pedido, resposta('{"titulo":"Revisar"}'))).toThrow(
      'descricao',
    );
    expect(() =>
      interpretarEnriquecimento(
        pedido,
        resposta('{"titulo":"Revisar","descricao":"Texto","prazo":"amanhã"}'),
      ),
    ).toThrow('inesperados');
  });
});
