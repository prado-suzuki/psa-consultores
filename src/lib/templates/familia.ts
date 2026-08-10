// Família de variantes de bloco: uma redação por caso, escolhida no RENDER a
// partir dos dados do item corrente.
//
// Por que a resolução mora aqui e não na composição. Uma família resolve por
// INSTÂNCIA de bloco, mas a variante é escolhida por IMÓVEL, e imóvel não é
// coleção de topo: é seção aninhada dentro de cada item de `integralizacoes`
// (ver PAPEIS_LISTA em binding.ts), porque o texto da casa agrupa por sócio
// ("o sócio X integraliza: a) … b) …"). Fazer a cabeça repetir sobre uma coleção
// de imóveis de topo daria um parágrafo por imóvel e perderia tanto o
// agrupamento por sócio quanto a referência cruzada "descrito na alínea 'a' do
// parágrafo segundo". Então a família entra POR DENTRO do bloco hospedeiro, com
// {{familia nome="…"}}, e cada passagem do laço resolve a sua.
//
// A variante continua sendo um bloco de verdade (tem versão, override e entra no
// snapshot); o que muda é só quem decide qual delas escreve o trecho.

/** Uma variante da família, com o seletor que a elege e o texto da versão atual. */
export interface VarianteFamilia {
  /** `tmpl_bloco.id` da variante — proveniência, override e congelamento no snapshot pendem dele. */
  id: string;
  /** Rótulo curto do caso ("Urbano, condomínio"), para mensagem de erro e UI. */
  rotulo: string | null;
  /**
   * Prioridade dentro da família (`tmpl_bloco.variante_ordem`, único por
   * família): é o desempate quando mais de um seletor casa. Ver `resolverVariante`.
   */
  ordem: number;
  /** Condições caminho => valor esperado. Objeto vazio = variante PADRÃO (casa sempre). */
  seletor: Record<string, string>;
  conteudo: string;
}

/** Famílias disponíveis para o render, indexadas pelo nome da cabeça. */
export type RegistroFamilias = Record<string, VarianteFamilia[]>;

/** Token de inclusão de família: `{{familia nome="Descrição de imóvel"}}`. */
export const PALAVRA_INCLUSAO = 'familia';

/**
 * Elege a variante para o item corrente.
 *
 * Uma variante casa quando TODAS as condições do seu seletor batem com o valor
 * lido no escopo (comparação como string, porque o seletor é jsonb digitado no
 * cadastro e as condicionais do vocabulário são 'sim'/''). Seletor vazio é a
 * variante padrão: casa sempre.
 *
 * DESEMPATE por `ordem` (menor ganha), não por especificidade. Os seletores da
 * casa se sobrepõem de propósito: um imóvel rural cujo título ainda não foi
 * averbado casa tanto `{"imovel.posse":"sim"}` quanto
 * `{"imovel.rural":"sim","imovel.inteiro":"sim"}`, e a redação certa é a de
 * posse — que é justamente a de ordem 1. Contar condições daria o contrário
 * (duas condições ganhariam de uma) e afirmaria propriedade de quem só tem
 * posse, que é afirmação falsa em documento levado a registro. Como `ordem` é
 * única por família (índice uq_tmpl_bloco_familia_ordem), o desempate é total.
 *
 * NENHUMA casa ⇒ erro, no mesmo espírito do placeholder não resolvido: é melhor
 * a prévia acusar "imóvel sem redação para este caso" do que o contrato sair com
 * o parágrafo faltando.
 */
export function resolverVariante(
  variantes: VarianteFamilia[],
  ler: (caminho: string) => unknown,
  nomeFamilia = 'família',
): VarianteFamilia {
  const candidatas = variantes.filter((v) =>
    Object.entries(v.seletor).every(([caminho, esperado]) => valorComoTexto(ler(caminho)) === esperado),
  );
  if (candidatas.length === 0) throw semVariante(variantes, ler, nomeFamilia);
  return candidatas.reduce((melhor, v) => (v.ordem < melhor.ordem ? v : melhor));
}

/**
 * Erro de "nenhuma variante atende", separando as duas causas, que pedem ações
 * opostas:
 *
 * - condição AUSENTE do escopo: os dados em uso não têm o campo. O caso real é o
 *   documento com versão validada ANTES de a classificação existir no binding: a
 *   prévia lê do snapshot, e lá não há `rural`/`urbano`. Dado vivo nunca cai aqui,
 *   porque item de lista recebe todo campo do catálogo com '' (ver mapeadores).
 *   Ação: refazer o snapshot ("Atualizar do cadastro").
 * - condição PRESENTE e vazia: o cadastro respondeu, e nenhuma combinação de
 *   redações cobre a resposta (ex.: matrícula sem tipo de bem).
 *   Ação: corrigir o cadastro, ou escrever a variante que falta.
 */
function semVariante(
  variantes: VarianteFamilia[],
  ler: (caminho: string) => unknown,
  nomeFamilia: string,
): Error {
  const caminhos = [...new Set(variantes.flatMap((v) => Object.keys(v.seletor)))];
  const lidos = caminhos.map((caminho) => ({ caminho, valor: ler(caminho) }));
  const ausentes = lidos.filter(({ valor }) => valor === undefined || valor === null).map((l) => l.caminho);
  const avaliadas = lidos.length
    ? lidos.map(({ caminho, valor }) => `${caminho}=${JSON.stringify(valorComoTexto(valor))}`).join(', ')
    : 'nenhuma';

  if (ausentes.length > 0) {
    return new Error(
      `Os dados em uso não trazem a classificação de que a família "${nomeFamilia}" depende: ` +
        `${ausentes.join(', ')} ${ausentes.length === 1 ? 'está ausente' : 'estão ausentes'} (não vazios). ` +
        'Documento com versão validada antes destas redações é a causa usual: use "Atualizar do cadastro" ' +
        `para refazer o snapshot. Condições avaliadas: ${avaliadas}.`,
    );
  }
  return new Error(`Nenhuma variante de "${nomeFamilia}" atende este caso (condições avaliadas: ${avaliadas}).`);
}

/** Valor do contexto como o seletor o compara: ausente/nulo viram string vazia. */
function valorComoTexto(valor: unknown): string {
  if (valor === undefined || valor === null) return '';
  return String(valor);
}
