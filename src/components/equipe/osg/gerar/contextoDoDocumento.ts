import { comOrigem, type Contexto } from '@/lib/templates';
import type { Binding } from '@/lib/templates/binding';
import { GEOREF_CAMPOS_MATRICULA, type ItemLista } from '@/lib/templates/mapeadores';

// Peças puras da montagem do contexto de render da tela Gerar. Moram fora do
// controller porque cada uma responde por uma decisão com regra própria (e teste
// próprio) — o controller só as encadeia.

type Campos = Record<string, string>;

/**
 * Quando uma lista do snapshot selado cai para a fonte VIVA.
 *
 * O snapshot é o retrato do documento no momento da validação; ele governa a
 * prévia justamente para o documento não mudar sozinho. Mas um snapshot selado
 * ANTES de uma lista existir simplesmente não tem a chave dela — e lista ausente
 * vira laço vazio, que desde a regra de "bloco sem dado não entra no documento"
 * faz o motor DESCARTAR o bloco inteiro, calado. Foi assim que todo documento
 * validado antes de `signatarios` existir passou a reabrir sem NENHUMA linha de
 * assinatura: o fecho é um bloco cujo conteúdo inteiro é o laço `{{#signatarios}}`.
 *
 * A regra é por lista, e não uma só, porque as duas listas têm naturezas
 * diferentes — está escrito em cada linha abaixo.
 */
const CAI_PARA_A_FONTE_VIVA: Record<string, (itens: ItemLista[] | undefined) => boolean> = {
  // Georref não é dado congelável: vem do BigQuery a cada abertura, e a matrícula
  // pode ter sido certificada depois da validação. Lista ausente OU vazia recarrega.
  vertices: (itens) => !itens || itens.length === 0,
  // Signatários SÃO dado congelado (vêm do quadro societário e dos cônjuges no
  // instante da validação). Só a AUSÊNCIA da chave — a marca de um snapshot
  // anterior à lista — cai para a fonte viva; lista vazia é decisão do documento
  // selado e é preservada, senão a validação deixaria de congelar quem assina.
  signatarios: (itens) => itens === undefined,
};

/**
 * Completa as listas do snapshot que precisam cair para a fonte viva. Devolve o
 * MESMO objeto quando não há nada a completar — quem compara identidade depois
 * (para religar a proveniência) depende disso.
 */
export function completarListasDoSnapshot(
  doSnapshot: Record<string, ItemLista[]>,
  vivas: Record<string, ItemLista[]>,
): Record<string, ItemLista[]> {
  let out: Record<string, ItemLista[]> | null = null;
  for (const [nome, precisaDaFonteViva] of Object.entries(CAI_PARA_A_FONTE_VIVA)) {
    if (!precisaDaFonteViva(doSnapshot[nome])) continue;
    out = out ?? { ...doSnapshot };
    out[nome] = vivas[nome] ?? [];
  }
  return out ?? doSnapshot;
}

/**
 * Religa a proveniência dos bindings unitários de um snapshot. A origem viaja
 * como Symbol (ver origem.ts) e some no round-trip do jsonb, e sem ela os
 * valores da prévia deixam de ser clicáveis. A id de cada registro está no
 * próprio snapshot — é dela que a origem é reconstruída.
 */
export function selecaoComOrigemDoSnapshot(
  selecao: Record<string, Campos>,
  bindings: Binding[],
  registroPorBinding: Record<string, string>,
  empresaId: string | null,
): Record<string, Campos> {
  const out: Record<string, Campos> = {};
  for (const [nome, campos] of Object.entries(selecao)) {
    const b = bindings.find((x) => x.nome === nome);
    const id = b?.tipo === 'sociedade' ? empresaId : registroPorBinding[nome];
    out[nome] = b && id ? comOrigem({ ...campos }, { tipo: b.tipo, id }) : campos;
  }
  return out;
}

/**
 * Os campos georef* do binding de matrícula, com default `''` e o cabeçalho vivo
 * (do BigQuery) por cima QUANDO TEM VALOR.
 *
 * O default existe porque `{{ imovel.georefArea }}` de chave AUSENTE derruba o
 * render, enquanto `''` resolve e deixa a guarda do bloco decidir. O "por cima
 * quando tem valor" cobre de uma vez o caminho vivo e os snapshots selados antes
 * destes campos existirem, sem apagar o que o snapshot trouxe.
 */
export function camposComGeoref(campos: Campos, cabecalho: Record<string, string>): Campos {
  const out: Campos = {};
  for (const id of GEOREF_CAMPOS_MATRICULA) out[id] = '';
  Object.assign(out, campos);
  for (const [id, valor] of Object.entries(cabecalho)) {
    if (valor) out[id] = valor;
  }
  return out;
}

/** Aplica {@link camposComGeoref} ao binding de matrícula do contexto, se houver. */
export function contextoComGeoref(
  ctx: Contexto,
  bindingMatricula: string | null,
  cabecalho: Record<string, string>,
): void {
  if (!bindingMatricula || !ctx[bindingMatricula]) return;
  ctx[bindingMatricula] = camposComGeoref(ctx[bindingMatricula] as Campos, cabecalho);
}
