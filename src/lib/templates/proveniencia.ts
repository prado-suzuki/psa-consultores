// Composição das camadas da prévia interativa: os segmentos do render (texto ×
// valor-com-origem) cruzados com as marcas inline (*_~, por linha) e com as
// tabelas (convenção `| a | b |`). A saída são "pedaços" — trechos atômicos com
// estilo E proveniência — que a prévia renderiza como spans clicáveis.
//
// O truque é trabalhar num espaço de coordenadas só: cada linha é a concatenação
// dos seus fragmentos (pedaços de segmento sem '\n'), então os runs de marcas,
// calculados sobre a linha concatenada, são fatiados nas fronteiras de fragmento
// — um nome em negrito que atravessa texto e valor sai certo dos dois lados.
// Nas tabelas, a divisão em células acontece sobre os FRAGMENTOS (espelhando
// celulasDaLinha caractere a caractere) e cada célula passa pelo mesmo pipeline
// de marcas — com fallback defensivo: célula que divergir do caminho em string
// renderiza sem proveniência, nunca quebra a prévia.

import { runsPosicionados, type Marcas } from './marcas';
import {
  alinhamentosDaSeparadora,
  celulasDaLinha,
  ehLinhaTabela,
  ehSeparadora,
  type Alinhamento,
} from './tabela';
import type { OrigemValor } from './origem';
import type { SegmentoRender } from './render';

/** Trecho atômico de uma linha da prévia: texto final + estilos + proveniência (quando veio de placeholder). */
export interface Pedaco extends Marcas {
  texto: string;
  caminho?: string;
  origem?: OrigemValor;
}

export type SegmentoProveniencia =
  | { tipo: 'linha'; pedacos: Pedaco[] }
  | { tipo: 'tabela'; cabecalho: Pedaco[][]; corpo: Pedaco[][][]; alinhamentos: Alinhamento[] };

/** Pedaço de segmento já confinado a uma linha (sem '\n'), com a proveniência herdada. */
interface Fragmento {
  texto: string;
  caminho?: string;
  origem?: OrigemValor;
}

/**
 * Espelho do `conteudo.trim()` que a prévia aplica por bloco: apara o whitespace
 * das extremidades da LISTA de segmentos (um valor na borda só perde whitespace,
 * nunca conteúdo). Os segmentos internos saem intactos.
 */
export function apararSegmentos(segmentos: SegmentoRender[]): SegmentoRender[] {
  const total = segmentos.map((s) => s.texto).join('');
  const inicio = total.length - total.trimStart().length;
  const fim = total.trimEnd().length;
  if (inicio === 0 && fim === total.length) return segmentos;

  const out: SegmentoRender[] = [];
  let pos = 0;
  for (const s of segmentos) {
    const a = Math.max(pos, inicio);
    const b = Math.min(pos + s.texto.length, fim);
    if (b > a) out.push({ ...s, texto: s.texto.slice(a - pos, b - pos) });
    pos += s.texto.length;
  }
  return out;
}

/** Quebra os segmentos em linhas de fragmentos; a concatenação de cada linha É a linha crua. */
function linhasDeFragmentos(segmentos: SegmentoRender[]): Fragmento[][] {
  const linhas: Fragmento[][] = [[]];
  for (const s of segmentos) {
    s.texto.split('\n').forEach((parte, j) => {
      if (j > 0) linhas.push([]);
      if (!parte) return;
      linhas[linhas.length - 1].push(
        s.tipo === 'valor' ? { texto: parte, caminho: s.caminho, origem: s.origem } : { texto: parte },
      );
    });
  }
  return linhas;
}

/**
 * Cruza as marcas com as fronteiras de fragmento: runs posicionados sobre a
 * linha concatenada, fatiados onde a proveniência muda. Adjacentes idênticos
 * (mesmo estilo e mesma origem) são fundidos, como os runs da versão string.
 */
function pedacosDe(fragmentos: Fragmento[]): Pedaco[] {
  const posicionados: Array<{ inicio: number; fim: number; frag: Fragmento }> = [];
  let pos = 0;
  for (const frag of fragmentos) {
    if (frag.texto) {
      posicionados.push({ inicio: pos, fim: pos + frag.texto.length, frag });
      pos += frag.texto.length;
    }
  }
  const linha = fragmentos.map((f) => f.texto).join('');

  const pedacos: Pedaco[] = [];
  for (const run of runsPosicionados(linha)) {
    for (const { inicio, fim, frag } of posicionados) {
      const a = Math.max(run.inicio, inicio);
      const b = Math.min(run.fim, fim);
      if (b <= a) continue;
      const texto = linha.slice(a, b);
      const anterior = pedacos[pedacos.length - 1];
      if (
        anterior &&
        anterior.negrito === run.negrito &&
        anterior.italico === run.italico &&
        anterior.sublinhado === run.sublinhado &&
        anterior.caminho === frag.caminho &&
        anterior.origem === frag.origem
      ) {
        anterior.texto += texto;
      } else {
        pedacos.push({
          texto,
          negrito: run.negrito,
          italico: run.italico,
          sublinhado: run.sublinhado,
          caminho: frag.caminho,
          origem: frag.origem,
        });
      }
    }
  }
  return pedacos;
}

/**
 * Espelho de celulasDaLinha sobre fragmentos: descarta as bordas `|`, divide em
 * `|` não escapado (`\|` vira `|` literal, atribuído ao fragmento do escape) e
 * apara o whitespace das pontas de cada célula — caractere a caractere, para
 * cada célula saber de quais fragmentos veio.
 */
function celulasDeFragmentos(fragmentos: Fragmento[]): Fragmento[][] {
  const linha = fragmentos.map((f) => f.texto).join('');
  // Conteúdo entre as bordas: primeiro/último não-whitespace são os `|` externos
  // (garantidos por ehLinhaTabela sobre a linha concatenada).
  let inicio = linha.length - linha.trimStart().length;
  let fim = linha.trimEnd().length - 1;
  if (linha[inicio] === '|') inicio += 1;
  if (linha[fim] !== '|') fim += 1;

  // Acumula por célula trechos contíguos do mesmo fragmento de origem.
  const celulas: Array<Array<{ frag: Fragmento; texto: string }>> = [[]];
  const emitir = (ch: string, frag: Fragmento) => {
    const celula = celulas[celulas.length - 1];
    const ultimo = celula[celula.length - 1];
    if (ultimo && ultimo.frag === frag) ultimo.texto += ch;
    else celula.push({ frag, texto: ch });
  };

  let f = 0; // índice do fragmento que contém a posição atual
  let base = 0; // offset global do início do fragmento f
  const fragEm = (i: number): Fragmento => {
    while (base + fragmentos[f].texto.length <= i) {
      base += fragmentos[f].texto.length;
      f += 1;
    }
    return fragmentos[f];
  };

  for (let i = inicio; i < fim; i++) {
    if (linha[i] === '\\' && linha[i + 1] === '|') {
      emitir('|', fragEm(i));
      i += 1;
    } else if (linha[i] === '|') {
      celulas.push([]);
    } else {
      emitir(linha[i], fragEm(i));
    }
  }

  // Trim de cada célula, encurtando os trechos das extremidades.
  return celulas.map((trechos) => {
    const frags = trechos.map((t) => ({ texto: t.texto, caminho: t.frag.caminho, origem: t.frag.origem }));
    while (frags.length) {
      frags[0].texto = frags[0].texto.replace(/^\s+/, '');
      if (frags[0].texto) break;
      frags.shift();
    }
    while (frags.length) {
      frags[frags.length - 1].texto = frags[frags.length - 1].texto.replace(/\s+$/, '');
      if (frags[frags.length - 1].texto) break;
      frags.pop();
    }
    return frags;
  });
}

/**
 * Células de uma linha de tabela com proveniência, validadas contra o caminho em
 * string (celulasDaLinha): qualquer divergência cai no fallback — as mesmas
 * células, sem origem (sem clique), nunca uma prévia quebrada.
 */
function celulasSeguras(fragmentos: Fragmento[], linha: string): Pedaco[][] {
  const plano = celulasDaLinha(linha);
  try {
    const cels = celulasDeFragmentos(fragmentos);
    const iguais =
      cels.length === plano.length &&
      cels.every((c, j) => c.map((frag) => frag.texto).join('') === plano[j]);
    if (iguais) return cels.map(pedacosDe);
  } catch {
    // cai no fallback
  }
  return plano.map((cel) => pedacosDe([{ texto: cel }]));
}

/**
 * Equivalente, com proveniência, do `segmentar(texto.split('\n'))` da prévia:
 * mesma varredura de tabelas (cabeçalho + separadora consumida + corpo até a
 * corrida acabar; linha-pipe sem separadora fica como texto), mas cada linha e
 * cada célula saem como pedaços prontos para render.
 */
export function segmentarComProveniencia(segmentos: SegmentoRender[]): SegmentoProveniencia[] {
  const linhas = linhasDeFragmentos(segmentos);
  const textos = linhas.map((l) => l.map((frag) => frag.texto).join(''));

  const out: SegmentoProveniencia[] = [];
  let i = 0;
  while (i < linhas.length) {
    const ehCabecalho =
      ehLinhaTabela(textos[i]) &&
      !ehSeparadora(textos[i]) &&
      i + 1 < linhas.length &&
      ehSeparadora(textos[i + 1]);

    if (ehCabecalho) {
      const cabecalho = celulasSeguras(linhas[i], textos[i]);
      const alinhamentos = alinhamentosDaSeparadora(textos[i + 1]);
      i += 2;
      const corpo: Pedaco[][][] = [];
      while (i < linhas.length && ehLinhaTabela(textos[i]) && !ehSeparadora(textos[i])) {
        corpo.push(celulasSeguras(linhas[i], textos[i]));
        i++;
      }
      out.push({ tipo: 'tabela', cabecalho, corpo, alinhamentos });
    } else {
      out.push({ tipo: 'linha', pedacos: pedacosDe(linhas[i]) });
      i++;
    }
  }
  return out;
}
