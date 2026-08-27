// Chamada ao gateway de IA da Lovable. Mesmo endpoint e mesma disciplina de
// erro das funções que já existem (`gerar-sintese-executiva`): 429 e 402 são
// mensagem para o usuário, não stack trace.

import type { RespostaAgente, TurnoAnterior } from './tipos.ts';

const ENDPOINT = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export class ErroIA extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ErroIA';
  }
}

const FERRAMENTA = {
  type: 'function',
  function: {
    name: 'responder_agente_psa',
    description: 'Resposta do agente sobre os dados da tela, com insights e rastro do que foi usado.',
    parameters: {
      type: 'object',
      properties: {
        resposta: {
          type: 'string',
          description: 'Resposta em português BR, no máximo 4 frases. **negrito** só no número que decide.',
        },
        insights: {
          type: 'array',
          description: 'Insights estratégicos derivados do cruzamento dos blocos. Vazio se não houver base.',
          items: {
            type: 'object',
            properties: {
              texto: { type: 'string' },
              // A descricao de cada valor existe porque, sem ela, o modelo
              // escorregou TRES vezes seguidas em producao (25/08): insight
              // sobre CADASTRO INCOMPLETO saindo como "execucao". Enum sem
              // descricao e adivinhacao -- o nome do valor nao ensina onde
              // termina um e comeca o outro.
              categoria: {
                type: 'string',
                enum: ['oportunidade', 'risco', 'execucao', 'dado', 'observacao'],
                description: 'oportunidade = receita ou economia a ganhar. '
                  + 'risco = dinheiro ou prazo a perder. '
                  + 'execucao = ritmo de ENTREGA do time (pontualidade, atraso, carga). '
                  + 'dado = a informacao esta faltando, incompleta ou suspeita '
                  + '(cadastro em branco, consulta que falhou, valor implausivel) '
                  + '-- use SEMPRE que o insight for sobre a QUALIDADE do numero '
                  + 'e nao sobre o que o numero diz. '
                  + 'observacao = o que nao cabe em nenhuma acima.',
              },
              severidade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
            },
            required: ['texto', 'categoria', 'severidade'],
            additionalProperties: false,
          },
        },
        campos_usados: {
          type: 'array',
          description: 'Rótulos EXATOS dos campos do CONTEXTO que sustentam a resposta.',
          items: { type: 'string' },
        },
        confianca: {
          type: 'string',
          enum: ['alta', 'media', 'baixa'],
          description: 'baixa quando o contexto não tinha o número pedido.',
        },
      },
      required: ['resposta', 'insights', 'campos_usados', 'confianca'],
      additionalProperties: false,
    },
  },
} as const;

export async function chamarIA(params: {
  apiKey: string;
  modelo: string;
  temperatura: number;
  systemPrompt: string;
  historico: TurnoAnterior[];
  promptUsuario: string;
}): Promise<RespostaAgente> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.modelo,
      temperature: params.temperatura,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.historico.map((t) => ({
          role: t.papel === 'user' ? 'user' : 'assistant',
          content: t.conteudo,
        })),
        { role: 'user', content: params.promptUsuario },
      ],
      tools: [FERRAMENTA],
      tool_choice: { type: 'function', function: { name: 'responder_agente_psa' } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new ErroIA('Muitas perguntas em sequência. Tente de novo em alguns minutos.', 429);
    }
    if (res.status === 402) {
      throw new ErroIA('Créditos de IA esgotados. Avise o administrador (Settings > Workspace > Usage).', 402);
    }
    throw new ErroIA(`Gateway de IA respondeu ${res.status}.`, 502);
  }

  const payload = await res.json();
  const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
  const bruto = toolCall
    ? toolCall.function.arguments
    : payload.choices?.[0]?.message?.content;

  if (!bruto) throw new ErroIA('Gateway de IA devolveu resposta vazia.', 502);

  let parsed: Partial<RespostaAgente>;
  try {
    parsed = JSON.parse(bruto);
  } catch {
    // Sem tool call e sem JSON: aproveita o texto em vez de derrubar o turno.
    return { resposta: String(bruto), insights: [], campos_usados: [], confianca: 'baixa' };
  }

  return {
    resposta: parsed.resposta ?? '',
    insights: Array.isArray(parsed.insights) ? parsed.insights : [],
    campos_usados: Array.isArray(parsed.campos_usados) ? parsed.campos_usados : [],
    confianca: parsed.confianca ?? 'media',
  };
}
