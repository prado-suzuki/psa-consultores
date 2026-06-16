// Diff por palavra entre o conteúdo ORIGINAL de um bloco e o conteúdo
// sobrescrito (override do documento): marca, nos segmentos já renderizados do
// substituto, só os trechos que mudaram — para a prévia destacar as palavras
// alteradas (e não o bloco inteiro). O diff roda sobre o TEXTO FINAL (pós-render
// dos placeholders/numeração), então uma mudança de placeholder some quando o
// valor resolve igual e só a edição real do redator aparece.

import type { SegmentoRender } from './render';

interface Token {
  texto: string;
  inicio: number;
}

/** Quebra em tokens alternando corridas de espaço e de não-espaço, com offset. */
function tokenizar(s: string): Token[] {
  const out: Token[] = [];
  const re = /\s+|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) out.push({ texto: m[0], inicio: m.index });
  return out;
}

const soEspaco = (s: string) => /^\s+$/.test(s);

/**
 * Faixas [a, b) do texto NOVO que não casam com o original (LCS por token). Os
 * tokens só-espaço das bordas de cada corrida alterada são aparados, para o
 * realce nunca começar/terminar num espaço solto; espaços internos ficam, dando
 * um destaque contíguo.
 */
function faixasAlteradas(original: string, novo: string): Array<{ a: number; b: number }> {
  const A = tokenizar(original);
  const B = tokenizar(novo);
  const n = A.length;
  const m = B.length;

  // LCS clássico: dp[i][j] = maior subsequência comum de A[i..] e B[j..].
  const dp: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        A[i].texto === B[j].texto ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const casado = new Uint8Array(m); // 1 = token do NOVO faz parte da LCS (inalterado)
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i].texto === B[j].texto) {
      casado[j] = 1;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const faixas: Array<{ a: number; b: number }> = [];
  let k = 0;
  while (k < m) {
    if (casado[k]) {
      k++;
      continue;
    }
    const ini = k;
    while (k < m && !casado[k]) k++;
    let a = ini;
    let b = k - 1;
    while (a <= b && soEspaco(B[a].texto)) a++;
    while (b >= a && soEspaco(B[b].texto)) b--;
    if (a <= b) faixas.push({ a: B[a].inicio, b: B[b].inicio + B[b].texto.length });
  }
  return faixas;
}

/** Recorta os segmentos nas fronteiras das faixas, marcando `realce` nos trechos alterados. */
function aplicarRealce(
  segmentos: SegmentoRender[],
  faixas: Array<{ a: number; b: number }>,
): SegmentoRender[] {
  const out: SegmentoRender[] = [];
  let pos = 0;
  for (const seg of segmentos) {
    const ini = pos;
    const fim = pos + seg.texto.length;
    let cursor = ini;
    while (cursor < fim) {
      const dentro = faixas.find((f) => f.a <= cursor && cursor < f.b);
      let next: number;
      let realce: boolean;
      if (dentro) {
        next = Math.min(dentro.b, fim);
        realce = true;
      } else {
        const prox = faixas.find((f) => f.a > cursor);
        next = prox ? Math.min(prox.a, fim) : fim;
        realce = false;
      }
      const texto = seg.texto.slice(cursor - ini, next - ini);
      if (texto) out.push(realce ? { ...seg, texto, realce: true } : { ...seg, texto });
      cursor = next;
    }
    pos = fim;
  }
  return out;
}

/**
 * Marca, nos segmentos renderizados do bloco sobrescrito, as palavras que
 * diferem do conteúdo original já renderizado. Sem diferença (override que
 * resultou no mesmo texto), devolve os segmentos intactos.
 */
export function marcarRealceDiff(
  segmentos: SegmentoRender[],
  textoOriginal: string,
): SegmentoRender[] {
  const novo = segmentos.map((s) => s.texto).join('');
  const faixas = faixasAlteradas(textoOriginal, novo);
  if (faixas.length === 0) return segmentos;
  return aplicarRealce(segmentos, faixas);
}
