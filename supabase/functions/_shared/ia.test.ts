import { describe, expect, it } from 'vitest';

import { erroDoGateway, montarPayloadChat } from './ia';

describe('montarPayloadChat', () => {
  it('preserva o histórico completo de ferramentas', () => {
    expect(
      montarPayloadChat({
        modelo: 'modelo',
        mensagens: [
          { role: 'system', content: [{ texto: 'fixo', cacheavel: true }, { texto: 'regras' }] },
          {
            role: 'assistant',
            content: null,
            toolCalls: [
              {
                id: 'call-1',
                type: 'function',
                function: { name: 'consultar', arguments: '{"id":1}' },
              },
            ],
          },
          { role: 'tool', toolCallId: 'call-1', content: '{"nome":"Projeto"}' },
        ],
        ferramentas: [
          {
            type: 'function',
            function: { name: 'consultar', parameters: { type: 'object' } },
          },
        ],
        escolhaDeFerramenta: 'auto',
      }),
    ).toMatchObject({
      model: 'modelo',
      temperature: 0,
      messages: [
        { role: 'system', content: 'fixo\n\nregras' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call-1',
              type: 'function',
              function: { name: 'consultar', arguments: '{"id":1}' },
            },
          ],
        },
        { role: 'tool', tool_call_id: 'call-1', content: '{"nome":"Projeto"}' },
      ],
      tool_choice: 'auto',
    });
  });
});

describe('erroDoGateway', () => {
  it('mantém 429 e 402 acionáveis para a interface', () => {
    expect(erroDoGateway(429)).toMatchObject({ status: 429 });
    expect(erroDoGateway(402)).toMatchObject({ status: 402 });
  });

  it('não repassa status interno inesperado do provedor', () => {
    expect(erroDoGateway(500)).toMatchObject({ status: 502 });
  });
});
