// Tabelas como CONVENÇÃO TEXTUAL (estilo markdown) dentro da string do bloco —
// mesma filosofia dos placeholders {{ }} e das marcas (*_~): a tabela é só um
// trecho de linhas com `|`, interpretado na SAÍDA, nunca persistido como estrutura.
//
// Uma tabela é uma corrida de linhas consecutivas onde a 1ª (cabeçalho) é
// SEGUIDA por uma separadora ("| --- | :--: | --: |"). Exigir a separadora (como
// no GFM) evita que uma linha de texto qualquer com `|` vire tabela por acidente.
// As linhas seguintes são o corpo, até a corrida acabar.
//
// As linhas dinâmicas saem de graça do loop de seção do render.ts: o corpo
//   {{#socios}}| {{ nome }} | {{ quotas }} |{{/socios}}
// gera uma linha de pipe por item (sep padrão "\n"), já com os placeholders
// resolvidos quando chega aqui. As marcas (*_~) permanecem no texto da célula e
// são resolvidas a jusante (runsInline no adapter .docx).

export type Alinhamento = 'left' | 'center' | 'right';

/** Célula-título de um cabeçalho agrupado (super-cabeçalho), com nº de colunas que mescla. */
export interface GrupoCabecalho {
  texto: string;
  span: number;
}

export type Segmento =
  | { tipo: 'linha'; texto: string }
  | {
      tipo: 'tabela';
      // Super-cabeçalho opcional (faixas mescladas acima do cabeçalho).
      grupos?: GrupoCabecalho[];
      cabecalho: string[];
      corpo: string[][];
      alinhamentos: Alinhamento[];
    };

/** Linha que parece de tabela: começa e termina com `|` (ignorando espaços nas bordas). */
export function ehLinhaTabela(linha: string): boolean {
  const t = linha.trim();
  return t.length >= 2 && t.startsWith('|') && t.endsWith('|');
}

/**
 * Divide uma linha de tabela em células, descartando as bordas externas,
 * desfazendo o escape `\|` (pipe literal numa célula) e aparando espaços.
 */
export function celulasDaLinha(linha: string): string[] {
  const t = linha.trim().replace(/^\|/, '').replace(/\|$/, '');
  const celulas: string[] = [];
  let atual = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\' && t[i + 1] === '|') {
      atual += '|';
      i++;
    } else if (t[i] === '|') {
      celulas.push(atual.trim());
      atual = '';
    } else {
      atual += t[i];
    }
  }
  celulas.push(atual.trim());
  return celulas;
}

/** Separadora de cabeçalho: toda célula casa "---", ":--", "--:" ou ":-:". */
export function ehSeparadora(linha: string): boolean {
  if (!ehLinhaTabela(linha)) return false;
  const cels = celulasDaLinha(linha);
  return cels.length > 0 && cels.every((c) => /^:?-+:?$/.test(c));
}

function alinhamentoDaCelula(sep: string): Alinhamento {
  const ini = sep.startsWith(':');
  const fim = sep.endsWith(':');
  if (ini && fim) return 'center';
  if (fim) return 'right';
  return 'left';
}

/** Alinhamentos declarados numa linha separadora ("| :-- | :-: | --: |"). */
export function alinhamentosDaSeparadora(linha: string): Alinhamento[] {
  return celulasDaLinha(linha).map(alinhamentoDaCelula);
}

/**
 * Agrupa as células de um super-cabeçalho em faixas mescladas: toda célula com
 * texto inicia um grupo (span 1) e cada célula vazia seguinte estende o grupo
 * anterior (mescla à esquerda). Ex.: `| VÉRTICE | | | | SEGMENTO VANTE | | | |`
 * → [{ VÉRTICE, span 4 }, { SEGMENTO VANTE, span 4 }].
 */
export function gruposDoCabecalho(celulas: string[]): GrupoCabecalho[] {
  const grupos: GrupoCabecalho[] = [];
  for (const cel of celulas) {
    if (cel === '' && grupos.length > 0) {
      grupos[grupos.length - 1].span += 1;
    } else {
      grupos.push({ texto: cel, span: 1 });
    }
  }
  return grupos;
}

/**
 * Quebra as linhas de um bloco (já renderizado) em segmentos: trechos de texto
 * comum e tabelas. Cada tabela é cabeçalho + separadora (consumida) + corpo até
 * a corrida de linhas-pipe acabar. Linhas-pipe SEM separadora logo abaixo ficam
 * como texto (não viram tabela).
 *
 * Um super-cabeçalho (faixas mescladas) é opcional: DUAS linhas-pipe consecutivas
 * (grupos, depois cabeçalho) seguidas da separadora — a 1ª mescla colunas, a 2ª
 * nomeia cada coluna. Sem a 2ª linha-pipe, vale a tabela simples de sempre.
 */
export function segmentar(linhas: string[]): Segmento[] {
  const segs: Segmento[] = [];
  let i = 0;
  const ehLinhaConteudo = (k: number) =>
    k < linhas.length && ehLinhaTabela(linhas[k]) && !ehSeparadora(linhas[k]);

  while (i < linhas.length) {
    // Tabela com super-cabeçalho: linhas[i] (grupos) + linhas[i+1] (cabeçalho) + separadora.
    const temGrupos =
      ehLinhaConteudo(i) && ehLinhaConteudo(i + 1) && i + 2 < linhas.length && ehSeparadora(linhas[i + 2]);
    // Tabela simples: cabeçalho seguido direto da separadora.
    const ehCabecalho = ehLinhaConteudo(i) && i + 1 < linhas.length && ehSeparadora(linhas[i + 1]);

    if (temGrupos || ehCabecalho) {
      const grupos = temGrupos ? gruposDoCabecalho(celulasDaLinha(linhas[i])) : undefined;
      const idxCab = temGrupos ? i + 1 : i;
      const cabecalho = celulasDaLinha(linhas[idxCab]);
      const alinhamentos = alinhamentosDaSeparadora(linhas[idxCab + 1]);
      i = idxCab + 2; // pula (grupos +) cabeçalho + separadora
      const corpo: string[][] = [];
      while (i < linhas.length && ehLinhaTabela(linhas[i]) && !ehSeparadora(linhas[i])) {
        corpo.push(celulasDaLinha(linhas[i]));
        i++;
      }
      segs.push({ tipo: 'tabela', grupos, cabecalho, corpo, alinhamentos });
    } else {
      segs.push({ tipo: 'linha', texto: linhas[i] });
      i++;
    }
  }
  return segs;
}
