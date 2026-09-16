// Os nomes dos arquivos DENTRO do .zip do download em lote, e o nome do próprio
// .zip.
//
// Por que isso é um módulo à parte: dois documentos podem ter o mesmo
// `nome_original` sem nenhum erro de cadastro (o cliente manda "RG.pdf" de três
// pessoas da família). Duas entradas de mesmo nome num .zip não dão erro: o
// extrator sobrescreve uma com a outra, calado, e o analista abre a pasta com
// menos arquivos do que marcou. O desempate é lógica pura, e é aqui que ele é
// testado.

/** Proibidos em nome de arquivo no Windows; `/` e `\` ainda criariam pasta no zip. */
const PROIBIDOS = /[\\/:*?"<>|]/g;

/** Caracteres de controle: invisíveis no nome e capazes de quebrar a extração. */
// eslint-disable-next-line no-control-regex -- é justamente o que se remove aqui
const CONTROLE = /[\x00-\x1f]/g;

/** Tira o que quebraria a extração e nunca devolve nome vazio. */
export function sanitizarNomeDeArquivo(nome: string): string {
  const limpo = nome.replace(PROIBIDOS, '-').replace(CONTROLE, '').trim();
  return limpo || 'documento';
}

/** 'contrato.pdf' → ['contrato', '.pdf']; '.gitignore' → ['.gitignore', '']. */
function partesDoNome(nome: string): [base: string, extensao: string] {
  const i = nome.lastIndexOf('.');
  return i > 0 ? [nome.slice(0, i), nome.slice(i)] : [nome, ''];
}

/**
 * Os nomes na MESMA ordem da entrada, já sanitizados e sem repetição: o segundo
 * "RG.pdf" vira "RG (2).pdf", o terceiro "RG (3).pdf".
 *
 * A comparação é em caixa baixa porque Windows e macOS tratam "RG.pdf" e
 * "rg.pdf" como o mesmo arquivo — colidiriam na extração mesmo sendo duas
 * entradas distintas dentro do zip.
 */
export function nomesUnicosNoZip(nomes: string[]): string[] {
  const usados = new Set<string>();
  return nomes.map((bruto) => {
    const nome = sanitizarNomeDeArquivo(bruto);
    if (!usados.has(nome.toLowerCase())) {
      usados.add(nome.toLowerCase());
      return nome;
    }
    const [base, ext] = partesDoNome(nome);
    for (let n = 2; ; n += 1) {
      const candidato = `${base} (${n})${ext}`;
      if (!usados.has(candidato.toLowerCase())) {
        usados.add(candidato.toLowerCase());
        return candidato;
      }
    }
  });
}

/** 'Pessoas Físicas' → 'pessoas-fisicas'. Sem acento, sem espaço, sem vazio. */
export function slugDePasta(rotulo: string): string {
  const slug = rotulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'documentos';
}

/**
 * Nome do .zip: 'documentos-pessoas-fisicas-2026-09-16.zip'.
 *
 * A data é a LOCAL, não a de `toISOString()`: depois das 21h em Brasília o UTC
 * já virou o dia seguinte, e o arquivo chegaria à pasta de downloads datado de
 * amanhã.
 */
export function nomeDoZip(rotuloDaPasta: string, quando: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const data = `${quando.getFullYear()}-${p(quando.getMonth() + 1)}-${p(quando.getDate())}`;
  return `documentos-${slugDePasta(rotuloDaPasta)}-${data}.zip`;
}
