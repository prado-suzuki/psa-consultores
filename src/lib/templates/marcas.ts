// Marcas de formatação inline no conteúdo dos blocos (estilo WhatsApp):
// *negrito*, _itálico_ e ~sublinhado~. O modelo de dados continua sendo a STRING
// (mesma filosofia dos placeholders {{ }}): as marcas são interpretadas só na
// SAÍDA — prévia HTML e runs do .docx — nunca persistidas como HTML.
//
// Regra de adjacência: o delimitador só conta quando ISOLADO (não colado em
// outro igual). Isso mantém literais as lacunas de preenchimento dos contratos
// ("______________") e sequências como "shift__name": nenhum "_" de uma
// sequência vira token.
//
// Semântica de toggle por linha: cada par liga/desliga o estilo, permitindo
// sobreposição ("*a _b_ c*" → b sai negrito+itálico). Delimitador sem par na
// linha fica literal (não "vaza" estilo até o fim). Marcas não atravessam linhas.

export interface Marcas {
  negrito: boolean;
  italico: boolean;
  sublinhado: boolean;
}

export interface RunMarcado extends Marcas {
  texto: string;
}

type Delimitador = '*' | '_' | '~';

const ESTILO_DO_DELIM: Record<Delimitador, keyof Marcas> = {
  '*': 'negrito',
  '_': 'italico',
  '~': 'sublinhado',
};

/** Delimitador isolado: não precedido nem seguido pelo mesmo caractere. */
const TOKEN_MARCA = /(?<!\*)\*(?!\*)|(?<!_)_(?!_)|(?<!~)~(?!~)/g;

interface TokenMarca {
  delim: Delimitador;
  indice: number; // posição na linha
}

/** Tokens de delimitador da linha, já descartando os sem par (ímpar → o último vira literal). */
function tokensPareados(linha: string): TokenMarca[] {
  const todos: TokenMarca[] = [];
  for (const m of linha.matchAll(TOKEN_MARCA)) {
    todos.push({ delim: m[0] as Delimitador, indice: m.index! });
  }
  const porDelim = new Map<Delimitador, TokenMarca[]>();
  for (const t of todos) {
    if (!porDelim.has(t.delim)) porDelim.set(t.delim, []);
    porDelim.get(t.delim)!.push(t);
  }
  const validos = new Set<TokenMarca>();
  for (const grupo of porDelim.values()) {
    const pares = grupo.length % 2 === 0 ? grupo : grupo.slice(0, -1);
    for (const t of pares) validos.add(t);
  }
  return todos.filter((t) => validos.has(t));
}

/** Run com a POSIÇÃO na linha crua: [inicio, fim), com os delimitadores pareados fora dos intervalos. */
export interface RunPosicionado extends Marcas {
  inicio: number;
  fim: number;
}

/**
 * Como extrairRunsLinha, mas devolve intervalos na linha CRUA em vez do texto —
 * é o que permite intersectar as marcas com outra camada calculada sobre a
 * mesma linha (proveniência dos placeholders na prévia). Runs vazios são
 * suprimidos; adjacentes de mesmo estilo NÃO são fundidos (há um delimitador
 * entre eles — os intervalos não são contíguos).
 */
export function runsPosicionados(linha: string): RunPosicionado[] {
  const tokens = tokensPareados(linha);
  if (tokens.length === 0) {
    return linha.length === 0
      ? []
      : [{ inicio: 0, fim: linha.length, negrito: false, italico: false, sublinhado: false }];
  }

  const runs: RunPosicionado[] = [];
  const estado: Marcas = { negrito: false, italico: false, sublinhado: false };
  let cursor = 0;
  const emitir = (ate: number) => {
    if (ate > cursor) runs.push({ inicio: cursor, fim: ate, ...estado });
  };

  for (const t of tokens) {
    emitir(t.indice);
    cursor = t.indice + t.delim.length;
    const estilo = ESTILO_DO_DELIM[t.delim];
    estado[estilo] = !estado[estilo];
  }
  emitir(linha.length);
  return runs;
}

/**
 * Divide UMA linha em runs com os estilos resolvidos. Linha sem marcas devolve
 * um único run. Runs vazios são suprimidos e adjacentes com o mesmo estilo,
 * fundidos.
 */
export function extrairRunsLinha(linha: string): RunMarcado[] {
  if (linha.length === 0) {
    return [{ texto: linha, negrito: false, italico: false, sublinhado: false }];
  }
  const runs: RunMarcado[] = [];
  for (const r of runsPosicionados(linha)) {
    const texto = linha.slice(r.inicio, r.fim);
    const anterior = runs[runs.length - 1];
    if (
      anterior &&
      anterior.negrito === r.negrito &&
      anterior.italico === r.italico &&
      anterior.sublinhado === r.sublinhado
    ) {
      anterior.texto += texto;
    } else {
      runs.push({ texto, negrito: r.negrito, italico: r.italico, sublinhado: r.sublinhado });
    }
  }
  return runs;
}

/** Remove as marcas pareadas mantendo o texto (delimitadores sem par ficam, são literais). */
export function removerMarcas(texto: string): string {
  return texto
    .split('\n')
    .map((linha) =>
      extrairRunsLinha(linha)
        .map((r) => r.texto)
        .join(''),
    )
    .join('\n');
}

/** Delimitadores expostos para o editor (atalhos/toolbar). */
export const MARCA = {
  negrito: '*',
  italico: '_',
  sublinhado: '~',
} as const;
