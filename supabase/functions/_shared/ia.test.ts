import { describe, expect, it } from 'vitest';

import { erroDoGateway, montarFormularioTranscricao, montarPayloadChat } from './ia';

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

describe('montarFormularioTranscricao', () => {
  it('envia o arquivo binário e os parâmetros aceitos pelo endpoint', () => {
    const arquivo = new Blob(['audio'], { type: 'audio/webm' });
    const formulario = montarFormularioTranscricao({
      modelo: 'openai/gpt-4o-transcribe',
      arquivo,
      nomeArquivo: 'ditado.webm',
      idioma: 'pt-BR',
      prompt: 'Preserve nomes próprios.',
      palavrasChave: ['PSA', 'OSG'],
      temperatura: 0,
    });

    expect(formulario.get('model')).toBe('openai/gpt-4o-transcribe');
    expect(formulario.get('language')).toBe('pt-BR');
    expect(formulario.get('response_format')).toBe('json');
    expect(formulario.get('prompt')).toBe('Preserve nomes próprios.');
    expect(formulario.get('keywords')).toBe('PSA,OSG');
    expect(formulario.get('temperature')).toBe('0');
    expect(formulario.get('file')).toBeInstanceOf(Blob);
  });
});
