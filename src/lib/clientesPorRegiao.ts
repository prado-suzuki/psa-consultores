/**
 * Agregação de clientes por região (UF e município) para o mapa de calor do
 * módulo Gerencial (Board).
 *
 * Contexto do dado: `cliente.uf` e `cliente.municipio` são TEXTO DIGITADO À MÃO.
 * Aparecem em minúsculas, com espaços sobrando, com o nome do estado por
 * extenso e com o mesmo município escrito de formas diferentes ("são paulo",
 * "SAO PAULO", "Sao Paulo"). Tudo aqui parte dessa premissa.
 *
 * Duas regras que este módulo protege:
 *
 * 1. NENHUM cliente desaparece. Quem não tem UF reconhecível cai no bucket
 *    explícito `semUf`, contado e exibido na tela — nunca some da soma.
 * 2. "Zero" e "sem dado" são coisas DIFERENTES. Um estado sem nenhum cliente
 *    tem valor zero (fato). Um cliente sem UF é ausência de cadastro
 *    (desconhecido). A legenda do mapa mostra as duas separadamente.
 *
 * O PESO por cliente é parametrizável (`PesoCliente`). A contagem de clientes é
 * simplesmente o peso 1 (`PESO_CONTAGEM`). Isso existe para que uma futura
 * coloração por outra métrica (ex.: faturamento) entre trocando o peso, sem
 * reescrever a agregação nem o mapa.
 */

/** Chave do bucket de clientes sem UF utilizável. Não é uma UF real. */
export const SEM_UF = 'SEM_UF';

/** Rótulo do bucket de município não informado. */
export const SEM_MUNICIPIO_ROTULO = 'Sem município informado';

/** Cliente, no mínimo que a agregação precisa. */
export interface ClienteRegiao {
  id: string;
  nome?: string | null;
  uf?: string | null;
  municipio?: string | null;
  ativo?: boolean | null;
}

/** Peso de um cliente na soma da região. Contagem de clientes = peso 1. */
export type PesoCliente = (cliente: ClienteRegiao) => number;

/** Peso padrão: cada cliente vale 1 → a soma é a contagem de clientes. */
export const PESO_CONTAGEM: PesoCliente = () => 1;

export const UF_NOMES: Readonly<Record<string, string>> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
};

/** As 27 siglas válidas, em ordem alfabética. */
export const UF_SIGLAS: readonly string[] = Object.keys(UF_NOMES);

/** Faixa Unicode dos diacríticos combinantes (o que o NFD separa das letras). */
const DIACRITICOS = /[\u0300-\u036f]/g;

/** Remove acentos e baixa a caixa — usado só como CHAVE de comparação. */
function chaveTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nome do estado por extenso (sem acento, minúsculo) → sigla. */
const NOME_PARA_SIGLA: Record<string, string> = Object.entries(UF_NOMES).reduce(
  (acc, [sigla, nome]) => {
    acc[chaveTexto(nome)] = sigla;
    return acc;
  },
  {} as Record<string, string>,
);

const SIGLAS_VALIDAS = new Set(UF_SIGLAS);

/**
 * Normaliza `cliente.uf` para uma sigla de 2 letras.
 *
 * Aceita: 'sp', ' SP ', 'Sp', 'São Paulo', 'sao paulo'.
 * Devolve `null` para vazio, nulo ou qualquer coisa que não seja um dos 27
 * estados — o chamador manda esse cliente para o bucket `semUf`.
 */
export function normalizarUf(bruto: string | null | undefined): string | null {
  if (typeof bruto !== 'string') return null;

  const limpo = bruto.trim();
  if (!limpo) return null;

  const sigla = limpo.toUpperCase();
  if (sigla.length === 2 && SIGLAS_VALIDAS.has(sigla)) return sigla;

  return NOME_PARA_SIGLA[chaveTexto(limpo)] ?? null;
}

/** Preposições que ficam em minúscula no meio do nome do município. */
const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'di', 'du']);

/** "SÃO joão   DO oeste" → "São João do Oeste". Preserva os acentos do dado. */
function tituloCase(valor: string): string {
  return valor
    .split(/\s+/)
    .map((palavra, indice) => {
      const minuscula = palavra.toLocaleLowerCase('pt-BR');
      if (indice > 0 && CONECTORES.has(minuscula)) return minuscula;
      // Capitaliza também depois de hífen e apóstrofo: "d'oeste" → "D'Oeste".
      return minuscula.replace(/(^|[-'’])(.)/g, (_, separador: string, letra: string) =>
        separador + letra.toLocaleUpperCase('pt-BR'),
      );
    })
    .join(' ');
}

/**
 * Normaliza `cliente.municipio` para exibição: colapsa espaços e aplica
 * capitalização consistente. Devolve `null` para vazio/nulo.
 */
export function normalizarMunicipio(bruto: string | null | undefined): string | null {
  if (typeof bruto !== 'string') return null;
  const limpo = bruto.replace(/\s+/g, ' ').trim();
  if (!limpo) return null;
  return tituloCase(limpo);
}

/**
 * Chave de agrupamento do município: sem acento e sem caixa, para que
 * "são paulo", "SAO PAULO" e "Sao Paulo" caiam na MESMA linha.
 */
export function chaveMunicipio(bruto: string | null | undefined): string | null {
  if (typeof bruto !== 'string') return null;
  const chave = chaveTexto(bruto);
  return chave || null;
}

/**
 * Entre grafias concorrentes do mesmo município, escolhe a de exibição:
 * a que tem mais acentos (mais informação) e, no empate, a menor
 * alfabeticamente — para o resultado ser determinístico.
 */
function melhorGrafia(a: string, b: string): string {
  // Conta os diacríticos NA FORMA NFD: é lá que 'ã' vira 'a' + U+0303. Comparar
  // com o comprimento da string original daria sempre zero.
  const acentos = (s: string) => {
    const nfd = s.normalize('NFD');
    return nfd.length - nfd.replace(DIACRITICOS, '').length;
  };
  const diferenca = acentos(b) - acentos(a);
  if (diferenca !== 0) return diferenca > 0 ? b : a;
  return a.localeCompare(b, 'pt-BR') <= 0 ? a : b;
}

/**
 * Chave-sentinela do município não informado dentro de uma UF.
 * Começa com espaço, então nunca colide com o retorno de `chaveMunicipio`
 * (que devolve texto sempre trimado e não vazio).
 */
const CHAVE_SEM_MUNICIPIO = ' sem-municipio';

export interface AgregadoMunicipio {
  /** Nome normalizado para exibição, ou `null` quando não foi informado. */
  municipio: string | null;
  /** Sempre preenchido — usa `SEM_MUNICIPIO_ROTULO` quando `municipio` é null. */
  rotulo: string;
  /** Soma dos pesos (com `PESO_CONTAGEM`, é a contagem de clientes). */
  valor: number;
  /** Contagem de clientes, independente do peso. */
  clientes: number;
  /** Quantos desses clientes estão com `ativo = true`. */
  ativos: number;
}

export interface AgregadoUf {
  /** Sigla da UF, ou `SEM_UF` no bucket de sem localização. */
  uf: string;
  /** Nome do estado por extenso (rótulo pronto para a tela). */
  nome: string;
  valor: number;
  clientes: number;
  ativos: number;
  /** Municípios da UF, do maior para o menor valor. */
  municipios: AgregadoMunicipio[];
}

export interface AgregacaoRegiao {
  /** Só UFs REAIS que têm ao menos um cliente. Nunca contém `SEM_UF`. */
  porUf: Record<string, AgregadoUf>;
  /** Siglas presentes em `porUf`, ordenadas por valor desc e depois por sigla. */
  ufsComDado: string[];
  /**
   * Bucket explícito de clientes sem UF reconhecível. Fica FORA de `porUf`
   * de propósito: não é pintável no mapa, mas precisa aparecer na tela.
   */
  semUf: AgregadoUf;
  totalClientes: number;
  totalAtivos: number;
  totalValor: number;
}

function agregadoVazio(uf: string): AgregadoUf {
  return {
    uf,
    nome: uf === SEM_UF ? 'Sem UF informada' : (UF_NOMES[uf] ?? uf),
    valor: 0,
    clientes: 0,
    ativos: 0,
    municipios: [],
  };
}

/**
 * Agrega clientes por UF e, dentro de cada UF, por município.
 *
 * @param clientes lista já filtrada pelo hook (excluido/ambiente).
 * @param peso     peso de cada cliente na soma. Padrão: 1 por cliente.
 */
export function agregarClientesPorRegiao(
  clientes: readonly ClienteRegiao[],
  peso: PesoCliente = PESO_CONTAGEM,
): AgregacaoRegiao {
  const porUf: Record<string, AgregadoUf> = {};
  const semUf = agregadoVazio(SEM_UF);

  // Acumula municípios em mapas por UF, chaveados sem acento/caixa.
  const municipiosPorUf = new Map<string, Map<string, AgregadoMunicipio>>();

  let totalClientes = 0;
  let totalAtivos = 0;
  let totalValor = 0;

  for (const cliente of clientes) {
    const sigla = normalizarUf(cliente.uf);
    const chaveUf = sigla ?? SEM_UF;
    const bruto = peso(cliente);
    // Peso inválido (NaN/Infinity/undefined) não pode contaminar a soma.
    const valor = Number.isFinite(bruto) ? bruto : 0;
    const ativo = cliente.ativo === true ? 1 : 0;

    const alvo = sigla ? (porUf[sigla] ??= agregadoVazio(sigla)) : semUf;
    alvo.valor += valor;
    alvo.clientes += 1;
    alvo.ativos += ativo;

    totalClientes += 1;
    totalAtivos += ativo;
    totalValor += valor;

    let municipios = municipiosPorUf.get(chaveUf);
    if (!municipios) {
      municipios = new Map<string, AgregadoMunicipio>();
      municipiosPorUf.set(chaveUf, municipios);
    }

    const chave = chaveMunicipio(cliente.municipio);
    const exibicao = normalizarMunicipio(cliente.municipio);
    const chaveFinal = chave ?? CHAVE_SEM_MUNICIPIO;

    const existente = municipios.get(chaveFinal);
    if (existente) {
      existente.valor += valor;
      existente.clientes += 1;
      existente.ativos += ativo;
      if (exibicao && existente.municipio) {
        existente.municipio = melhorGrafia(existente.municipio, exibicao);
        existente.rotulo = existente.municipio;
      }
    } else {
      municipios.set(chaveFinal, {
        municipio: exibicao,
        rotulo: exibicao ?? SEM_MUNICIPIO_ROTULO,
        valor,
        clientes: 1,
        ativos: ativo,
      });
    }
  }

  const ordenarMunicipios = (lista: AgregadoMunicipio[]) =>
    lista.sort(
      (a, b) => b.valor - a.valor || b.clientes - a.clientes || a.rotulo.localeCompare(b.rotulo, 'pt-BR'),
    );

  for (const [chaveUf, municipios] of municipiosPorUf) {
    const lista = ordenarMunicipios([...municipios.values()]);
    if (chaveUf === SEM_UF) semUf.municipios = lista;
    else if (porUf[chaveUf]) porUf[chaveUf].municipios = lista;
  }

  const ufsComDado = Object.keys(porUf).sort(
    (a, b) => porUf[b].valor - porUf[a].valor || a.localeCompare(b),
  );

  return { porUf, ufsComDado, semUf, totalClientes, totalAtivos, totalValor };
}

/** Uma faixa da escala de cor. Limites INCLUSIVOS nas duas pontas. */
export interface FaixaCor {
  indice: number;
  min: number;
  max: number;
}

export interface EscalaCor {
  /** Vazia quando não há nenhum valor positivo para colorir. */
  faixas: FaixaCor[];
  /** Menor e maior valor positivo observado (0 quando não há nenhum). */
  minimo: number;
  maximo: number;
}

/**
 * Monta os cortes da escala de cor a partir dos dados.
 *
 * Trabalha só com valores POSITIVOS: região sem cliente não é "a faixa mais
 * fria", é a categoria separada "zero" na legenda.
 *
 * As faixas saem dos valores DISTINTOS observados, nunca de uma divisão
 * (max - min) — então não existe divisão por zero nem faixa degenerada:
 * - lista vazia (ou toda zerada) → `faixas: []`;
 * - um único valor distinto → uma faixa só, com min === max;
 * - menos valores distintos que faixas pedidas → uma faixa por valor.
 */
export function calcularFaixas(valores: readonly number[], quantidade = 5): EscalaCor {
  const positivos = valores.filter((v) => Number.isFinite(v) && v > 0);
  const distintos = [...new Set(positivos)].sort((a, b) => a - b);

  if (distintos.length === 0) return { faixas: [], minimo: 0, maximo: 0 };

  const alvo = Math.max(1, Math.min(Math.floor(quantidade), distintos.length));
  const faixas: FaixaCor[] = [];

  for (let i = 0; i < alvo; i++) {
    const inicio = Math.floor((i * distintos.length) / alvo);
    const fim = Math.floor(((i + 1) * distintos.length) / alvo) - 1;
    faixas.push({ indice: i, min: distintos[inicio], max: distintos[fim] });
  }

  return { faixas, minimo: distintos[0], maximo: distintos[distintos.length - 1] };
}

/**
 * Índice da faixa de um valor, ou `null` quando o valor não é colorível
 * (zero/negativo) — aí a tela usa a cor da categoria "zero".
 */
export function indiceDaFaixa(valor: number, escala: EscalaCor): number | null {
  if (!Number.isFinite(valor) || valor <= 0 || escala.faixas.length === 0) return null;
  for (const faixa of escala.faixas) {
    if (valor <= faixa.max) return faixa.indice;
  }
  return escala.faixas[escala.faixas.length - 1].indice;
}

/** Escala calculada direto da agregação (só UFs reais entram na cor). */
export function escalaDaAgregacao(agregacao: AgregacaoRegiao, quantidade = 5): EscalaCor {
  return calcularFaixas(
    agregacao.ufsComDado.map((uf) => agregacao.porUf[uf].valor),
    quantidade,
  );
}

/** As três categorias que a legenda precisa distinguir. */
export type CategoriaRegiao = 'faixa' | 'zero' | 'sem-dado';

export interface EstadoPintado {
  uf: string;
  nome: string;
  categoria: Extract<CategoriaRegiao, 'faixa' | 'zero'>;
  valor: number;
  clientes: number;
  ativos: number;
  /** `null` quando a categoria é 'zero'. */
  indiceFaixa: number | null;
}

/**
 * Resolve como cada uma das 27 UFs deve ser pintada. Estado ausente da
 * agregação é 'zero' (fato: nenhum cliente lá), nunca 'sem-dado' — "sem dado"
 * é propriedade de CLIENTE sem UF, não de estado.
 */
export function pintarEstados(
  agregacao: AgregacaoRegiao,
  escala: EscalaCor,
  siglas: readonly string[] = UF_SIGLAS,
): Record<string, EstadoPintado> {
  const resultado: Record<string, EstadoPintado> = {};

  for (const uf of siglas) {
    const dado = agregacao.porUf[uf];
    const valor = dado?.valor ?? 0;
    const indice = indiceDaFaixa(valor, escala);
    resultado[uf] = {
      uf,
      nome: UF_NOMES[uf] ?? uf,
      categoria: indice === null ? 'zero' : 'faixa',
      valor,
      clientes: dado?.clientes ?? 0,
      ativos: dado?.ativos ?? 0,
      indiceFaixa: indice,
    };
  }

  return resultado;
}

/** Municípios de uma UF (ou do bucket sem UF), já ordenados. */
export function municipiosDaUf(agregacao: AgregacaoRegiao, uf: string): AgregadoMunicipio[] {
  if (uf === SEM_UF) return agregacao.semUf.municipios;
  return agregacao.porUf[uf]?.municipios ?? [];
}

/** Texto de uma faixa na legenda: "1", "2 a 5". */
export function rotuloFaixa(faixa: FaixaCor): string {
  return faixa.min === faixa.max ? `${faixa.min}` : `${faixa.min} a ${faixa.max}`;
}
