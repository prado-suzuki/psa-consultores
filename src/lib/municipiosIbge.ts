/**
 * A lista de municípios por UF, vinda do IBGE.
 *
 * Puro de propósito: monta a URL, entende a resposta e compara nomes. Nada de
 * React e nada de rede, que é o que faz o teste rodar sem invólucro.
 *
 * Por que direto do navegador e não pelo nosso backend: decisão do Bernardo em
 * 17/08. Medido antes: a resposta de uma UF custa cerca de 3 KB comprimidos
 * (Mato Grosso) contra 28 KB de embutir o Brasil inteiro no pacote, e como
 * quase todo cliente é de MT o usuário nunca baixa os outros 26 estados.
 */

/** Endereço da lista de municípios de uma UF. */
export function urlMunicipiosIbge(uf: string): string {
  return `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`;
}

/**
 * Extrai apenas os nomes da resposta do IBGE.
 *
 * A resposta traz região, microrregião e mesorregião aninhadas em cada
 * município: 63 KB crus para MT, dos quais só uns 2 KB são texto útil. Guardar
 * o aninhado em memória seria carregar estrutura para nunca usar.
 *
 * Tolerante à forma porque é dado de terceiro: item sem nome é descartado em vez
 * de virar linha vazia na lista, e resposta que não é lista devolve vazio em vez
 * de estourar. Alguns municípios do IBGE vêm com `microrregiao` nula, então
 * nenhum campo além do nome pode ser exigido.
 */
export function parseMunicipiosIbge(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return [];

  const nomes = new Set<string>();
  for (const item of bruto) {
    const nome = (item as { nome?: unknown })?.nome;
    if (typeof nome === 'string' && nome.trim()) nomes.add(nome.trim());
  }

  // Ordem pt-BR: sem isso "Água Boa" cai depois de "Zortéa", porque a ordem de
  // código põe as acentuadas no fim.
  return [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Chave de comparação de nome de lugar: maiúsculas, sem acento, espaço único.
 *
 * Existe para o dado que já está gravado. Hoje 70 dos 75 clientes com município
 * têm o nome em maiúsculas e sem acento ("CUIABA"), porque o campo era aberto.
 * Comparar pela chave permite reconhecer que "CUIABA" é "Cuiabá" sem reescrever
 * nada por conta própria.
 */
export function chaveNomeLugar(nome: string): string {
  return nome
    .normalize('NFD')
    // Faixa dos diacríticos combinantes, escrita por código: o caractere
    // literal aqui dependeria da codificação do arquivo sobreviver intacta.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Se o município combina com o que a pessoa digitou na busca.
 *
 * A busca precisa ignorar acento pelo mesmo motivo que a comparação ignora: o
 * dado gravado não tem acento nenhum ("CUIABA", "RONDONOPOLIS"), então quem
 * digita como está gravado tem de achar a cidade acentuada. Sem isso, "agua
 * boa" não encontrava "Água Boa" e "sao jose" não encontrava nenhum dos dois
 * São José de Mato Grosso.
 */
export function combinaBusca(nome: string, busca: string): boolean {
  const alvo = chaveNomeLugar(busca);
  if (!alvo) return true;
  return chaveNomeLugar(nome).includes(alvo);
}

/**
 * O nome canônico da lista equivalente ao valor gravado, se existir.
 *
 * Devolve `undefined` quando não há equivalente, e é isso que a tela usa para
 * marcar o valor como fora da lista. Nunca substitui em silêncio: quem troca o
 * valor é a pessoa, escolhendo na lista.
 */
export function canonicoNaLista(valor: string, lista: string[]): string | undefined {
  if (!valor.trim()) return undefined;
  const chave = chaveNomeLugar(valor);
  return lista.find((nome) => chaveNomeLugar(nome) === chave);
}

/**
 * O que a UF gravada aceita como código de duas letras.
 *
 * Metade dos clientes tem o estado por extenso no campo de UF ("MATO GROSSO"),
 * herança de importação por planilha. A lista do IBGE é consultada por sigla,
 * então sem esta tradução o campo de município nasceria vazio para eles.
 *
 * Traduz apenas leitura. A correção do dado é outra frente, e está registrada.
 */
const UF_POR_NOME: Record<string, string> = {
  ACRE: 'AC', ALAGOAS: 'AL', AMAPA: 'AP', AMAZONAS: 'AM', BAHIA: 'BA',
  CEARA: 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', GOIAS: 'GO',
  MARANHAO: 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG', PARA: 'PA', PARAIBA: 'PB', PARANA: 'PR',
  PERNAMBUCO: 'PE', PIAUI: 'PI', 'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', RONDONIA: 'RO',
  RORAIMA: 'RR', 'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP', SERGIPE: 'SE',
  TOCANTINS: 'TO',
};

/**
 * O que acontece com o município quando a UF é trocada.
 *
 * Trocar de estado invalida a cidade escolhida, então ela sai. Mas corrigir
 * "MATO GROSSO" para "MT" não troca de estado: as duas resolvem a mesma sigla, e
 * limpar ali faria a correção da UF apagar uma cidade certa. Como metade dos
 * clientes tem o estado por extenso, esse caso é a regra e não a exceção.
 *
 * Mora aqui, fora do JSX, porque é a única regra de decisão do campo.
 */
export function municipioAoTrocarUf(
  ufNova: string | null | undefined,
  ufAtual: string | null | undefined,
  municipio: string | null | undefined,
): string {
  const mesmoEstado = siglaDaUf(ufNova) === siglaDaUf(ufAtual);
  return mesmoEstado ? (municipio ?? '') : '';
}

/** As 27 siglas, derivadas da tabela acima para não haver duas listas. */
const SIGLAS = new Set(Object.values(UF_POR_NOME));

/**
 * Sigla de UF a partir do que está gravado, ou `undefined` se não reconhecer.
 *
 * Sigla desconhecida ("XX") devolve `undefined` em vez de passar adiante: o
 * campo fica desabilitado com aviso, que é melhor do que disparar uma consulta
 * que o IBGE responderia com erro.
 */
export function siglaDaUf(valor: string | null | undefined): string | undefined {
  const chave = chaveNomeLugar(valor ?? '');
  if (!chave) return undefined;
  if (SIGLAS.has(chave)) return chave;
  return UF_POR_NOME[chave];
}
