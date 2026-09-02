// Concordância de gênero para qualificação jurídica (pt-BR).
// Deriva formas masc/fem a partir de `pessoa.genero` ('M'/'F'), sem nova sintaxe
// no template: a concordância vira CAMPO derivado (ex.: {{ proprietario.casado }}),
// resolvido pelo render pontilhado já existente. Conjunto inicial pequeno e extensível.

export type Genero = 'M' | 'F' | null | undefined;

/** Escolhe a forma conforme o gênero; fallback no masculino (gênero ausente/nulo). */
export function concordar(genero: Genero, masculino: string, feminino: string): string {
  return genero === 'F' ? feminino : masculino;
}

/**
 * Gênero com que a pessoa concorda no instrumento. Pessoa JURÍDICA concorda no
 * FEMININO — a sociedade, a empresa, a sócia —, qualquer que seja o `genero` da
 * linha: PJ não tem gênero cadastrado, e sem esta regra a concordância cairia no
 * fallback masculino e a sócia PJ assinaria como "Sócio" no fecho.
 *
 * Pessoa física continua concordando pelo `genero` cadastrado, e a PF sem gênero
 * continua no masculino.
 */
export function generoDeConcordancia(genero: Genero, tipoPessoa: string | null | undefined): Genero {
  return tipoPessoa === 'PJ' ? 'F' : genero;
}

// Pares jurídicos recorrentes nas qualificações. Cada entrada produz a forma já
// concordada a partir do gênero — basta `PARES.brasileiro(genero)`.
export const PARES = {
  /** Artigo definido: "o"/"a". */
  artigo: (g: Genero) => concordar(g, 'o', 'a'),
  brasileiro: (g: Genero) => concordar(g, 'brasileiro', 'brasileira'),
  nascido: (g: Genero) => concordar(g, 'nascido', 'nascida'),
  portador: (g: Genero) => concordar(g, 'portador', 'portadora'),
  residente: (g: Genero) => concordar(g, 'residente e domiciliado', 'residente e domiciliada'),
  inscrito: (g: Genero) => concordar(g, 'inscrito', 'inscrita'),
  senhor: (g: Genero) => concordar(g, 'o senhor', 'a senhora'),
  /** Agente da subscrição no caput de capital: "pelo sócio"/"pela sócia". */
  peloSocio: (g: Genero) => concordar(g, 'pelo sócio', 'pela sócia'),
  // Rótulos da linha de assinatura, já capitalizados: são título embaixo do nome,
  // não meio de frase ("Sócia administradora e Outorga Conjugal").
  socioTitulo: (g: Genero) => concordar(g, 'Sócio', 'Sócia'),
  socioAdministrador: (g: Genero) => concordar(g, 'Sócio administrador', 'Sócia administradora'),
} as const;

export type ParJuridico = keyof typeof PARES;

/**
 * Concorda um texto com marcação de gênero "palavra(a)" conforme o gênero.
 * O estado civil é gravado já marcado ("Casado(a)", "Solteiro(a)"…); aqui ele é
 * expandido: masculino mantém o radical ("Casado"), feminino troca o "o" final
 * por "a" ("Casada"). Textos sem marcação (ex.: "União Estável") passam intactos.
 */
export function concordarTexto(texto: string | null | undefined, genero: Genero): string {
  if (!texto) return '';
  return texto.replace(/([A-Za-zÀ-ÿ]+)\(a\)/g, (_m, radical: string) => {
    if (genero !== 'F') return radical;
    return radical.endsWith('o') ? `${radical.slice(0, -1)}a` : `${radical}a`;
  });
}

const UF_EXTENSO: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

/** Converte a sigla da UF para o nome por extenso (ex.: "MT" → "Mato Grosso"). Mantém o valor se já vier por extenso. */
export function ufPorExtenso(uf: string | null | undefined): string {
  if (!uf) return '';
  return UF_EXTENSO[uf.trim().toUpperCase()] ?? uf;
}

/**
 * Contrai a preposição "por" com o artigo que ABRE o texto seguinte:
 * "por" + "o senhor X" → "pelo senhor X"; "por" + "a senhora Y" → "pela senhora Y".
 *
 * Existe porque o representante da sócia PJ chega como frase já montada, com o
 * artigo dentro (`PARES.senhor` devolve "o senhor"/"a senhora"), e o fecho
 * precisava dizer "representada POR ..." — o que produzia "representada por o
 * senhor". Contrair no ponto de junção é o que mantém o artigo concordando com
 * quem representa, sem que o chamador tenha de desmontar a frase.
 *
 * Texto que não começa por artigo passa intacto: "por João" continua "por João",
 * e é o que acontece quando o representante vem sem o tratamento na frente.
 */
export function contrairPor(texto: string): string {
  const t = (texto ?? '').trim();
  if (!t) return 'por';
  const contracao: Record<string, string> = { o: 'pelo', a: 'pela', os: 'pelos', as: 'pelas' };
  const m = /^([oa]s?)\s+(.*)$/is.exec(t);
  if (!m) return `por ${t}`;
  return `${contracao[m[1].toLocaleLowerCase('pt-BR')]} ${m[2]}`;
}
