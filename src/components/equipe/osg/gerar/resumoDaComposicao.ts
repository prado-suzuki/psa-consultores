import type { BlocoDescartado, BlocoGerado, MotivoDescarte } from '@/lib/templates';

// O que a tela conta e o que a tela avisa sobre a COMPOSIÇÃO do documento.
//
// O motor descarta o bloco que não trouxe dado nenhum e ANUNCIA o descarte
// (emenda 9.2 do contrato L2/L3). Antes disto ninguém consumia o anúncio: os
// blocos sumiam da prévia sem sinal e o rodapé continuava contando os blocos
// COMPOSTOS, de modo que uma folha vazia se apresentava como "1 blocos ·
// preenchido do cadastro". A contagem passa a ser a do que saiu de verdade, e o
// que ficou de fora vira aviso nomeado no painel de conferência.

/** Por que o bloco não entrou, em português de tela. */
export const EXPLICACAO_DO_DESCARTE: Record<MotivoDescarte, string> = {
  'lista-vazia': 'a lista que ele percorre não trouxe nenhum item',
  'tabela-vazia': 'a tabela dele saiu só com o cabeçalho',
  'campos-vazios': 'nenhum campo dele veio preenchido',
  'render-em-branco': 'ele saiu em branco',
};

export interface BlocoForaDaFolha {
  /** Posição no modelo (tmpl_documento_bloco.id). */
  id: string;
  nome: string;
  motivo: MotivoDescarte;
  explicacao: string;
}

/** A POSIÇÃO no modelo de um bloco gerado ou descartado (instância de repetidor resolve na origem). */
function posicaoDe(bloco: { id: string; instanciaDe?: string }): string {
  return bloco.instanciaDe ?? bloco.id;
}

/**
 * Os blocos do modelo que ficaram INTEIRAMENTE fora do documento por falta de
 * dado. Um repetidor que perdeu uma instância e manteve outras não entra: a
 * posição continua no documento, e avisar sobre ela seria ruído.
 */
export function blocosForaDaFolha(
  descartados: BlocoDescartado[],
  blocos: BlocoGerado[],
  nomeDaPosicao: (id: string) => string,
): BlocoForaDaFolha[] {
  const noDocumento = new Set(blocos.map(posicaoDe));
  const out: BlocoForaDaFolha[] = [];
  const vistos = new Set<string>();
  for (const d of descartados) {
    const id = posicaoDe(d);
    if (noDocumento.has(id) || vistos.has(id)) continue;
    vistos.add(id);
    out.push({ id, nome: nomeDaPosicao(id), motivo: d.motivo, explicacao: EXPLICACAO_DO_DESCARTE[d.motivo] });
  }
  return out;
}

export interface EntradaResumoDaFolha {
  /** Blocos que entraram no documento (já expandidos e renderizados). */
  blocos: BlocoGerado[];
  descartados: BlocoDescartado[];
  /** Posições do modelo, antes de flags e de descarte. */
  totalNoModelo: number;
  /** Blocos que as flags da empresa tiraram da composição. */
  excluidosPorFlag: number;
}

/**
 * A linha de status sob as ações ("41 blocos · preenchido do cadastro").
 * Conta POSIÇÕES do modelo, não blocos gerados: um repetidor vira uma instância
 * por item da coleção, e contá-las diria "7 de 2 blocos".
 */
export function resumoDaFolha({
  blocos,
  descartados,
  totalNoModelo,
  excluidosPorFlag,
}: EntradaResumoDaFolha): string {
  const posicoes = new Set(blocos.map(posicaoDe)).size;
  const semDado = blocosForaDaFolha(descartados, blocos, (id) => id).length;
  const contagem = posicoes === totalNoModelo ? `${totalNoModelo} blocos` : `${posicoes} de ${totalNoModelo} blocos`;

  const notas: string[] = [];
  if (excluidosPorFlag > 0) notas.push('ajustado ao perfil da empresa');
  if (semDado > 0) notas.push(`${semDado} sem dado para preencher`);
  if (notas.length === 0) notas.push('preenchido do cadastro');
  return `${contagem} · ${notas.join(' · ')}`;
}
