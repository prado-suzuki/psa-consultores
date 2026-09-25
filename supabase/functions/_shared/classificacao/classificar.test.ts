import { describe, expect, it, vi } from 'vitest';

import {
  classificarComFallback,
  interpretarClassificacao,
  prepararClassificacao,
} from './classificar';
import { definirClassificador } from './definirClassificador';

const definicao = definirClassificador({
  nome: 'teste-binario',
  versao: 1,
  modelo: 'modelo/teste',
  instrucoes: 'Classifique a entrada para o teste.',
  classes: {
    positivo: { descricao: 'Entrada positiva.' },
    negativo: { descricao: 'Entrada negativa.' },
    incerto: { descricao: 'Entrada inconclusiva.' },
  },
  classeSegura: 'incerto',
});

function resposta(argumentos: unknown) {
  return {
    content: null,
    finishReason: 'tool_calls',
    toolCalls: [
      {
        id: 'call-1',
        type: 'function' as const,
        function: {
          name: 'entregar_classificacao',
          arguments: typeof argumentos === 'string' ? argumentos : JSON.stringify(argumentos),
        },
      },
    ],
  };
}

describe('motor de classificação', () => {
  it('monta ferramenta fechada com as classes da definição', () => {
    const chamada = prepararClassificacao(definicao, { texto: 'conteúdo' });

    expect(chamada.temperatura).toBe(0);
    expect(chamada.escolhaDeFerramenta).toEqual({
      type: 'function',
      function: { name: 'entregar_classificacao' },
    });
    expect(chamada.ferramentas?.[0].function.parameters).toMatchObject({
      properties: {
        classe: { enum: ['positivo', 'negativo', 'incerto'] },
        certeza: { enum: ['alta', 'media', 'baixa'] },
      },
      required: ['classe', 'certeza'],
      additionalProperties: false,
    });
  });

  it('interpreta apenas classe e certeza conhecidas', () => {
    expect(
      interpretarClassificacao(definicao, resposta({ classe: 'positivo', certeza: 'alta' })),
    ).toEqual({ classe: 'positivo', certeza: 'alta' });

    expect(() =>
      interpretarClassificacao(definicao, resposta({ classe: 'outra', certeza: 'alta' })),
    ).toThrow(/classe desconhecida/);
    expect(() =>
      interpretarClassificacao(
        definicao,
        resposta({ classe: 'positivo', certeza: 'alta', explicacao: 'extra' }),
      ),
    ).toThrow(/campos inesperados/);
  });

  it('usa a classe segura quando a chamada ao gateway falha', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(classificarComFallback(definicao, { texto: 'conteúdo' })).resolves.toMatchObject({
      classe: 'incerto',
      certeza: 'baixa',
      fallback: true,
      classificador: 'teste-binario',
      versao: 1,
    });

    aviso.mockRestore();
    vi.unstubAllGlobals();
  });
});
