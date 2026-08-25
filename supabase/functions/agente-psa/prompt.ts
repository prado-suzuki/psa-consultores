// Montagem do prompt. Funções PURAS de propósito: é aqui que mora a regra de
// honestidade do agente, e regra de honestidade tem que ser lida sem subir
// servidor nenhum.

import type {
  BlocoContexto,
  ConfigAgente,
  ContextoTela,
  LicaoAprendida,
  ModoAgente,
} from './tipos.ts';

/** Teto do contexto serializado. Acima disso, blocos do fim são cortados. */
const MAX_CONTEXTO_CHARS = 24_000;
/** Lições reinjetadas por conversa. Mais que isso dilui o pedido do usuário. */
export const MAX_LICOES = 25;

const REGRAS_BASE = `Você é o Agente PSA, assistente analítico do sistema interno da PSA Consultores (consultoria tributária).

REGRAS QUE NÃO SE NEGOCIAM:
1. Você responde SOBRE OS DADOS DA TELA que estão no bloco CONTEXTO. Nunca invente número, cliente, área ou data que não esteja lá.
2. Se a resposta exige um número que não está no CONTEXTO, diga exatamente o que falta e em qual tela/filtro isso é obtido. Não estime.
3. Onde o CONTEXTO trouxer AVISO de falha de carregamento, trate aquele número como DESCONHECIDO, nunca como zero.
4. Respeite a janela e a nota de cada bloco. Não compare número de janelas diferentes sem dizer que são diferentes.
5. Português do Brasil, direto, sem saudação e sem repetir a pergunta. Valores como a tela mostra.
6. Use **negrito** só no número ou no nome que decide a frase. Nada de markdown além disso: sem títulos, sem tabelas, sem listas numeradas.
7. Máximo de 4 frases na resposta. O que for recomendação vai em insight, não no texto.`;

const REGRAS_MODO: Record<ModoAgente, string> = {
  dados: `MODO DADOS: leitura fiel. Devolva o número pedido, a janela dele e a nota que o qualifica. NÃO recomende nada e NÃO gere insight de opinião — se gerar insight, que seja de categoria "dado" (ex.: base incompleta, OS sem data).`,
  estrategia: `MODO ESTRATÉGIA: depois de responder, cruze pelo menos dois blocos do CONTEXTO e diga o que isso implica em decisão (concentração x receita em risco, entrega da área x prazo, preenchimento x confiabilidade do número). Todo insight precisa citar o número que o sustenta.`,
  aprender: `MODO APRENDER: o usuário está te corrigindo ou te ensinando uma regra da casa. Confirme em uma frase o que você entendeu que passa a valer, sem se justificar e sem repetir a resposta antiga. Devolva no campo resposta a regra na forma imperativa ("Daqui em diante, ..."). Não gere insight neste modo.`,
};

function serializarBloco(bloco: BlocoContexto): string {
  const cabecalho = [
    `## ${bloco.titulo}`,
    bloco.janela ? `Janela: ${bloco.janela}` : null,
    bloco.nota ? `Nota: ${bloco.nota}` : null,
  ].filter(Boolean).join('\n');

  const campos = bloco.campos
    .map((c) => {
      const valor = c.valor ?? 'NÃO APURADO';
      return `- ${c.rotulo}: ${valor}${c.nota ? ` (${c.nota})` : ''}`;
    })
    .join('\n');

  const itens = bloco.itens?.length
    ? '\n' + bloco.itens
      .map((item) => '- ' + Object.entries(item)
        .map(([k, v]) => `${k}: ${v ?? '—'}`)
        .join(' · '))
      .join('\n')
    : '';

  return `${cabecalho}\n${campos}${itens}`;
}

/**
 * Serializa o snapshot da tela. Corta pelo FIM (blocos são publicados em
 * ordem de importância pela tela) e diz que cortou — contexto truncado em
 * silêncio produziria resposta confiante sobre dado que a IA nunca viu.
 */
export function serializarContexto(contexto: ContextoTela): string {
  const filtros = Object.entries(contexto.filtros)
    .map(([k, v]) => `${k}=${v}`)
    .join(' · ') || 'nenhum';

  const partes = [`TELA: ${contexto.rotulo}`, `FILTROS ATIVOS: ${filtros}`];

  if (contexto.avisos?.length) {
    partes.push(
      `AVISOS DE CARREGAMENTO (dado DESCONHECIDO, não zero): ${contexto.avisos.join('; ')}`,
    );
  }

  const blocos: string[] = [];
  let usado = partes.join('\n').length;
  let cortados = 0;

  for (const bloco of contexto.blocos) {
    const texto = serializarBloco(bloco);
    if (usado + texto.length > MAX_CONTEXTO_CHARS) {
      cortados += 1;
      continue;
    }
    blocos.push(texto);
    usado += texto.length;
  }

  if (cortados > 0) {
    blocos.push(
      `## Blocos omitidos\n- ${cortados} bloco(s) da tela não couberam no contexto. `
      + 'Se a pergunta depender deles, diga que não recebeu esses dados.',
    );
  }

  return [...partes, '', ...blocos].join('\n');
}

/** Lições ordenadas por peso: a regra que o admin marcou como forte vem antes. */
export function serializarLicoes(licoes: LicaoAprendida[]): string {
  if (licoes.length === 0) return '';
  const linhas = licoes
    .slice(0, MAX_LICOES)
    .map((l) => `- [${l.tipo}] ${l.licao}`)
    .join('\n');
  return `\nLIÇÕES JÁ ENSINADAS POR USUÁRIOS DESTA CASA (valem MAIS que a sua inferência; se uma delas contradiz o seu instinto, siga a lição):\n${linhas}`;
}

export function montarSystemPrompt(
  config: ConfigAgente,
  modo: ModoAgente,
  licoes: LicaoAprendida[],
): string {
  return [
    REGRAS_BASE,
    REGRAS_MODO[modo],
    config.prompt_personalizado ? `\nCONTEXTO DESTA TELA (definido pelo administrador):\n${config.prompt_personalizado}` : '',
    serializarLicoes(licoes),
    `\nGere no máximo ${config.max_insights_por_resposta} insight(s). Insight sem número que o sustente não deve ser gerado.`,
  ].filter(Boolean).join('\n\n');
}

export function montarPromptUsuario(
  contexto: ContextoTela,
  pergunta: string,
): string {
  return `CONTEXTO (dados que estão na tela agora):\n${serializarContexto(contexto)}\n\nPERGUNTA DO USUÁRIO:\n${pergunta}`;
}
