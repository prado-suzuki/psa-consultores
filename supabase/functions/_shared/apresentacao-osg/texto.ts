// Cópia do extenso, do romano e do nome curto para o capítulo 04, porque a Edge Function não
// alcança o `src/`. `src/lib/osg/cenariosDoCapitulo04.test.ts` falha se ela divergir.

// ---------------------------------------------------------------------------
// Extenso e numeral romano — cópia de `src/lib/templates/extenso.ts`
// ---------------------------------------------------------------------------

const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

const ESCALAS = [
  { singular: '', plural: '' },
  { singular: 'mil', plural: 'mil' },
  { singular: 'milhão', plural: 'milhões' },
  { singular: 'bilhão', plural: 'bilhões' },
];

/** Formas femininas: só "um/dois" e as centenas a partir de duzentos flexionam ("quinhentas quotas"). */
const UNIDADES_F = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const CENTENAS_F = ['', 'cento', 'duzentas', 'trezentas', 'quatrocentas', 'quinhentas', 'seiscentas', 'setecentas', 'oitocentas', 'novecentas'];

function ate99(n: number, feminino = false): string {
  const unidades = feminino ? UNIDADES_F : UNIDADES;
  if (n < 10) return unidades[n];
  if (n < 20) return ESPECIAIS[n - 10];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DEZENAS[d] : `${DEZENAS[d]} e ${unidades[u]}`;
}

function ate999(n: number, feminino = false): string {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push((feminino ? CENTENAS_F : CENTENAS)[c]);
  if (resto > 0) partes.push(ate99(resto, feminino));
  return partes.join(' e ');
}

/** Junta os grupos: " e " no último quando vale menos de 100 ou é múltiplo de 100; senão ", ". */
function juntarGrupos(partes: Array<{ texto: string; valor: number }>): string {
  if (partes.length === 1) return partes[0].texto;
  const ultimo = partes[partes.length - 1];
  const inicio = partes.slice(0, -1).map((p) => p.texto).join(', ');
  const conector = ultimo.valor < 100 || ultimo.valor % 100 === 0 ? ' e ' : ', ';
  return `${inicio}${conector}${ultimo.texto}`;
}

/**
 * Cardinal por extenso; `feminino` concorda com o substantivo contado, nas unidades e nos milhares.
 * Milhão e bilhão não flexionam: "dois milhões de quotas".
 */
export function cardinalExtenso(valor: number, feminino = false): string {
  const n = Math.floor(Math.abs(valor));
  if (n === 0) return 'zero';

  const grupos: number[] = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }

  const partes: Array<{ texto: string; valor: number }> = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    let texto: string;
    if (i === 0) {
      texto = ate999(g, feminino);
    } else if (i === 1) {
      texto = g === 1 ? 'mil' : `${ate999(g, feminino)} mil`;
    } else {
      const escala = ESCALAS[i];
      texto = `${ate999(g)} ${g === 1 ? escala.singular : escala.plural}`;
    }
    partes.push({ texto, valor: g });
  }
  return juntarGrupos(partes);
}

/** Termina em substantivo de escala ("um milhão")? Então o que vem depois pede "de"; "mil" não pede. */
function terminaEmEscala(valor: number): boolean {
  const n = Math.floor(Math.abs(valor));
  return n >= 1_000_000 && n % 1_000_000 === 0;
}

/** Cardinal com a preposição que a escala pede: "um milhão de" reais. */
function cardinalExtensoContado(valor: number, feminino = false): string {
  const texto = cardinalExtenso(valor, feminino);
  return terminaEmEscala(valor) ? `${texto} de` : texto;
}

/** Valor monetário por extenso. Ex.: 558413.55 → "...reais e cinquenta e cinco centavos". */
export function valorExtenso(valor: number): string {
  const total = Math.round(valor * 100);
  const reais = Math.floor(total / 100);
  const centavos = total % 100;
  const partes: string[] = [];
  // "um milhão de reais", não "um milhão reais" (ver terminaEmEscala).
  if (reais > 0) partes.push(`${cardinalExtensoContado(reais)} ${reais === 1 ? 'real' : 'reais'}`);
  if (centavos > 0) partes.push(`${cardinalExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  if (partes.length === 0) return 'zero reais';
  return partes.join(' e ');
}

const ROMANOS: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/** Numeral romano. Ex.: 13 → "XIII" (capítulos de contrato). */
export function romano(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) {
    throw new Error(`Romano fora do intervalo suportado (1–3999): ${n}`);
  }
  let resto = n;
  let saida = '';
  for (const [valor, simbolo] of ROMANOS) {
    while (resto >= valor) {
      saida += simbolo;
      resto -= valor;
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Nome curto — cópia de `src/lib/osg/nomeCurto.ts`
// ---------------------------------------------------------------------------

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'di', 'van', 'von']);

/** "AVELINO NERI BOCOLLI" → ["Avelino", "Neri", "Bocolli"], sem partículas. */
function partes(nome: string): string[] {
  return nome
    .trim()
    .split(/\s+/)
    .map((parte) => parte.toLocaleLowerCase('pt-BR'))
    .filter((parte) => parte !== '' && !PARTICULAS.has(parte))
    .map((parte) => parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1));
}

/**
 * Nome curto de cada pessoa, crescendo só quem colide no conjunto recebido. Homônimo verdadeiro para
 * no nome completo: numerar esconderia que o cadastro tem duas pessoas iguais.
 */
export function nomesCurtos(
  pessoas: Array<{ id: string; nome: string }>,
): Map<string, string> {
  const porId = new Map(pessoas.map((p) => [p.id, partes(p.nome)]));

  const curto = new Map<string, string>();
  for (const [id, p] of porId) {
    curto.set(id, p[0] ?? '');
  }

  // Cresce enquanto houver empate e houver sobrenome para acrescentar. O limite de
  // voltas é o maior nome, então homônimo verdadeiro não gera laço infinito.
  const maxPartes = Math.max(1, ...[...porId.values()].map((p) => p.length));
  for (let usar = 2; usar <= maxPartes; usar += 1) {
    const contagem = new Map<string, number>();
    for (const valor of curto.values()) {
      contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
    }
    const empatados = [...curto].filter(([, valor]) => (contagem.get(valor) ?? 0) > 1);
    if (empatados.length === 0) break;

    for (const [id] of empatados) {
      const p = porId.get(id)!;
      if (p.length >= usar) curto.set(id, p.slice(0, usar).join(' '));
    }
  }

  return curto;
}
