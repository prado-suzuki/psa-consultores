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
  'clausula-descartada': 'a cláusula que o governa ficou de fora',
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
  /** Blocos que as flags DERIVADAS (perfil da empresa) tiraram da composição. */
  excluidosPorFlag: number;
  /**
   * Blocos que uma flag MANUAL não marcada tirou da composição: as resoluções da
   * alteração contratual, que moram no mesmo modelo do contrato social. O motivo
   * é outro e a frase precisa ser outra: num contrato de constituição as seis
   * ficam de fora porque nenhum evento foi marcado, não porque o perfil da
   * empresa as dispense.
   */
  excluidosPorEvento?: number;
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
  excluidosPorEvento = 0,
}: EntradaResumoDaFolha): string {
  const posicoes = new Set(blocos.map(posicaoDe)).size;
  const semDado = blocosForaDaFolha(descartados, blocos, (id) => id).length;
  const contagem = posicoes === totalNoModelo ? `${totalNoModelo} blocos` : `${posicoes} de ${totalNoModelo} blocos`;

  const notas: string[] = [];
  if (excluidosPorFlag > 0) notas.push('ajustado ao perfil da empresa');
  if (excluidosPorEvento > 0) notas.push(`${excluidosPorEvento} fora por condição não marcada`);
  if (semDado > 0) notas.push(`${semDado} sem dado para preencher`);
  if (notas.length === 0) notas.push('preenchido do cadastro');
  return `${contagem} · ${notas.join(' · ')}`;
}

/**
 * A frase do painel sobre as cláusulas que as FLAGS tiraram da composição
 * ("2 cláusulas não se aplicam a esta empresa e ficaram de fora: A, B.").
 *
 * Existe como função com teste porque a concordância aqui não é sufixo: o verbo
 * inteiro muda ("ficou" → "ficaram"), e montar o plural concatenando terminação
 * produziu por um tempo a palavra inexistente "ficouaram" na tela de todo
 * documento com mais de um bloco excluído. Cada forma vai escrita por extenso.
 */
export function fraseExcluidosPorFlag(nomes: string[]): string {
  if (nomes.length === 0) return 'Todas as cláusulas do modelo se aplicam a esta empresa.';
  const varias = nomes.length > 1;
  const substantivo = varias ? 'cláusulas' : 'cláusula';
  const aplicar = varias ? 'não se aplicam' : 'não se aplica';
  const ficar = varias ? 'ficaram' : 'ficou';
  return `${nomes.length} ${substantivo} ${aplicar} a esta empresa e ${ficar} de fora: ${nomes.join(', ')}.`;
}
