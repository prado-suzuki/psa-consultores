import type { Document, ISpacingProperties, Paragraph, Table, TextRun } from 'docx';
import type { Bloco, TipoBloco } from './types';
import { extrairRunsLinha, removerMarcas, type RunMarcado } from './marcas';
import { segmentar, type Alinhamento, type Segmento } from './tabela';

// Adapter de saída .docx: converte os blocos gerados pelo engine (numerados e
// renderizados) num documento Word formatado por tipo estrutural.
//
// A formatação replica os modelos da casa ("VF_Modelo de Contrato Social" Agro e
// Controladora) e os contratos registrados na Jucemat que saíram deles (MMS Agro
// e MMS Participações, 21/09/2022):
//
//   - A4, margens 3,0 / 2,5 / 2,0 / 2,5 cm (esq / dir / sup / inf);
//   - Arial Narrow 12pt, entrelinha simples, corpo justificado;
//   - espaçamento entre parágrafos ZERO: a respiração vem de linhas em branco
//     em pontos definidos (antes de capítulo e de cláusula), nunca de um
//     `spacing.after` global — é isso que faz o parágrafo colar na sua cláusula
//     e o subtítulo colar no capítulo, como nos dois contratos registrados;
//   - capítulo e subtítulo centralizados em negrito SUBLINHADO;
//   - título do instrumento 18pt e razão social 20pt, ambos centralizados;
//   - alíneas com recuo pendente (letra a 0,5 cm, corpo a 1,0 cm) e marcador
//     em negrito;
//   - bloco de assinatura centralizado por inteiro (régua, nome e o papel do
//     signatário abaixo dele);
//   - rodapé "Página X de Y" à direita, Arial Narrow 12pt, números em negrito.
//
// Todo run sai com fonte e corpo EXPLÍCITOS e o pacote declara um estilo
// `Normal` de verdade: sem isso o arquivo depende só de `docDefaults`, e todo
// leitor que não é o Word (LibreOffice, Google Docs, conversores) cai na fonte
// serifada padrão dele e o contrato inteiro sai fora do padrão.
//
// O pacote `docx` (~350 KB) é carregado sob demanda (import dinâmico): só entra no
// bundle quando o usuário realmente baixa um documento.

type DocxModule = typeof import('docx');

// --- Constantes do modelo de referência (twips; half-points para fontes) ----
const FONTE = 'Arial Narrow';
const PT12 = 24;
/**
 * Corpo do título dos INSTRUMENTOS AGRÁRIOS: 14pt, negrito, centralizado, SEM
 * sublinhado. Medido nos dois .docx assinados do MMS (`w:sz="28"` nos dois
 * parágrafos do título, nos dois contratos).
 *
 * Não é o mesmo cabeçalho do Contrato Social, que é 18pt sublinhado seguido da
 * razão social em 20pt — ver `detectarCapa`.
 */
const PT14 = 28;
const PT18 = 36;
const PT20 = 40;
/** 1 cm = 567 twips. */
const CM = 567;
const A4 = { width: 11906, height: 16838 };
/** 3,0 cm esquerda, 2,5 cm direita, 2,0 cm superior, 2,5 cm inferior. */
const MARGENS = { top: 1134, bottom: 1418, left: 1701, right: 1418, header: 708, footer: 708 };
/**
 * Entrelinha do corpo: 1,15 (`w:line="276"` com `lineRule="auto"`), medida no
 * .docx nativo do modelo, onde 133 parágrafos declaram exatamente isso e os
 * demais herdam do estilo Normal. Entrelinha simples deixa o documento inteiro
 * mais apertado que o padrão da casa.
 */
const ENTRELINHA = 276;
/** Alínea: marcador a 0,5 cm da margem, corpo a 1,0 cm (recuo pendente). */
const RECUO_ALINEA = { left: CM, hanging: Math.round(CM / 2) };
/** Largura útil da linha (página menos margens laterais), para dimensionar tabela. */
const LARGURA_UTIL = A4.width - MARGENS.left - MARGENS.right;

/** Rótulo de cláusula/parágrafo gerado pela numeração automática. */
const ROTULO = /^(CLÁUSULA[^:]*?:|Parágrafo[^:]*?:)\s?/;
/**
 * Marcador de alínea no início da linha: "a)", "iv)" ou bullet. O recuo NÃO
 * depende de o autor ter indentado a linha no bloco — os contratos registrados
 * recuam toda alínea, e exigir o espaço à esquerda deixava metade das listas
 * (objeto social, por exemplo) rente à margem.
 */
const ALINEA = /^\s*([a-zA-ZivxlIVXL]+\)|[•·-])\s+/;
/** Linha de assinatura: "____________". */
const REGUA_ASSINATURA = /^_{5,}$/;

function ehCaixaAlta(linha: string): boolean {
  return /[A-ZÀ-Ý]/.test(linha) && linha === linha.toUpperCase();
}

/** Estilos estruturais do parágrafo, mesclados sobre as marcas inline de cada run. */
interface EstiloBase {
  bold?: boolean;
  underline?: boolean;
  size?: number;
}

/**
 * Converte as marcas inline (*…*, _…_, ~…~) de um trecho em TextRuns,
 * compondo com o estilo estrutural do parágrafo (negrito de rótulo/título soma
 * com as marcas; nunca as desliga). Fonte e corpo saem explícitos em todo run.
 */
function runDoMarcado(docx: DocxModule, r: RunMarcado, base: EstiloBase = {}): TextRun {
  const { TextRun, UnderlineType } = docx;
  return new TextRun({
    text: r.texto,
    font: FONTE,
    size: base.size ?? PT12,
    bold: base.bold || r.negrito || undefined,
    italics: r.italico || undefined,
    underline: base.underline || r.sublinhado ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function runsInline(docx: DocxModule, texto: string, base: EstiloBase = {}): TextRun[] {
  return extrairRunsLinha(texto).map((r) => runDoMarcado(docx, r, base));
}

/** Espaçamento do modelo: entrelinha 1,15 e nada antes nem depois do parágrafo. */
function espacamento(docx: DocxModule): ISpacingProperties {
  return { before: 0, after: 0, line: ENTRELINHA, lineRule: docx.LineRuleType.AUTO };
}

/** Parágrafo vazio — é assim que o modelo separa cláusulas e capítulos. */
function linhaEmBranco(docx: DocxModule): Paragraph {
  return new docx.Paragraph({ spacing: espacamento(docx) });
}

/** Linha centralizada (título, capítulo, assinatura). */
function linhaCentralizada(docx: DocxModule, texto: string, base: EstiloBase): Paragraph {
  const { AlignmentType, Paragraph } = docx;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: espacamento(docx),
    children: runsInline(docx, texto, base),
  });
}

/**
 * Linha justificada com o rótulo ("CLÁUSULA X:" / "Parágrafo X:") em negrito.
 * Alínea recebe recuo pendente e marcador em negrito.
 */
/**
 * Força negrito nos `n` primeiros caracteres dos runs, partindo o run que for
 * atravessado pelo corte.
 *
 * Existe porque medir o rótulo numa string e cortar em OUTRA não funciona: o
 * `ALINEA` casa em `removerMarcas(linha)` ("a) …"), e a linha real tem marcas
 * ("*a)* …"). Cortar 3 caracteres da segunda devolvia `*a)`, deixava um `*`
 * órfão no resto, e a contagem ímpar de delimitadores deslocava TODO o
 * pareamento — o negrito escapava para o corpo e o `*` de fechamento saía
 * literal no .docx. Trabalhando em espaço de RUNS o problema não existe: os runs
 * já vêm sem marca, e a contagem é sobre o texto que o leitor vê.
 */
function comNegritoNoInicio(runs: RunMarcado[], n: number): RunMarcado[] {
  const out: RunMarcado[] = [];
  let restante = n;
  for (const r of runs) {
    if (restante <= 0) {
      out.push(r);
      continue;
    }
    if (r.texto.length <= restante) {
      out.push({ ...r, negrito: true });
      restante -= r.texto.length;
      continue;
    }
    out.push({ ...r, texto: r.texto.slice(0, restante), negrito: true });
    out.push({ ...r, texto: r.texto.slice(restante) });
    restante = 0;
  }
  return out;
}

function linhaComRotulo(docx: DocxModule, linha: string): Paragraph {
  const { AlignmentType, Paragraph, TextRun } = docx;
  const limpo = removerMarcas(linha);
  const marcador = limpo.match(ALINEA);

  let children: TextRun[];
  if (marcador) {
    // "a) " em negrito, o resto da alínea com a formatação normal do corpo.
    // A contagem é sobre o texto SEM marca, e a aplicação também — ver
    // `comNegritoNoInicio`.
    const runs = extrairRunsLinha(linha.replace(/^\s+/, ''));
    const tamanhoDoRotulo = marcador[0].replace(/^\s+/, '').replace(/\s+$/, '').length;
    children = comNegritoNoInicio(runs, tamanhoDoRotulo).map((r) => runDoMarcado(docx, r));
  } else {
    const m = linha.match(ROTULO);
    children = m
      ? [
          new TextRun({ text: m[0], font: FONTE, size: PT12, bold: true }),
          ...runsInline(docx, linha.slice(m[0].length)),
        ]
      : runsInline(docx, linha.replace(/^\s+/, ''));
  }

  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: espacamento(docx),
    indent: marcador ? RECUO_ALINEA : undefined,
    children,
  });
}

const ALINHAMENTO_CELULA = {
  left: 'LEFT',
  center: 'CENTER',
  right: 'RIGHT',
} as const satisfies Record<Alinhamento, keyof typeof import('docx').AlignmentType>;

/**
 * Larguras de coluna proporcionais ao conteúdo mais largo de cada uma. Com
 * colunas iguais o quadro de sócios quebrava o nome em três linhas e o memorial
 * de vértices partia palavra no meio; o peso é limitado (6..40 caracteres) para
 * que uma coluna de texto longo não engula as vizinhas.
 */
function larguraDasColunas(
  seg: Extract<Segmento, { tipo: 'tabela' }>,
  colunas: number,
): number[] {
  const pesos = Array.from({ length: colunas }, (_, c) => {
    const corpo = Math.max(0, ...seg.corpo.map((l) => removerMarcas(l[c] ?? '').length));
    // O cabeçalho é negrito e não deve quebrar: pesa mais que o mesmo nº de
    // caracteres no corpo. O +2 cobre a margem interna da célula.
    const cabecalho = removerMarcas(seg.cabecalho[c] ?? '').length * 1.5;
    return Math.min(Math.max(corpo, cabecalho) + 2, 40);
  });
  const total = pesos.reduce((a, b) => a + b, 0);
  return pesos.map((p) => Math.round((p / total) * LARGURA_UTIL));
}

/** Converte um segmento de tabela (corrida de linhas-pipe) num Table do Word. */
function tabelaParaDocx(docx: DocxModule, seg: Extract<Segmento, { tipo: 'tabela' }>): Table {
  const {
    AlignmentType,
    BorderStyle,
    Paragraph,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    WidthType,
  } = docx;
  const borda = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const colunas = Math.max(seg.cabecalho.length, ...seg.corpo.map((l) => l.length));
  const margens = { top: 40, bottom: 40, left: 80, right: 80 };

  const celula = (texto: string, coluna: number, cabecalho: boolean) =>
    new TableCell({
      margins: margens,
      children: [
        new Paragraph({
          // Cabeçalho sempre centralizado (como no quadro de sócios dos dois
          // contratos registrados); o corpo segue o alinhamento da coluna.
          alignment: cabecalho
            ? AlignmentType.CENTER
            : AlignmentType[ALINHAMENTO_CELULA[seg.alinhamentos[coluna] ?? 'left']],
          spacing: espacamento(docx),
          children: runsInline(docx, texto, cabecalho ? { bold: true } : {}),
        }),
      ],
    });

  // Normaliza cada linha ao nº de colunas (células faltantes viram vazias).
  const completar = (cels: string[]) => Array.from({ length: colunas }, (_, c) => cels[c] ?? '');

  // Super-cabeçalho opcional: faixas mescladas (columnSpan) centralizadas em negrito.
  const linhaGrupos =
    seg.grupos && seg.grupos.length > 0
      ? new TableRow({
          tableHeader: true,
          children: seg.grupos.map(
            (g) =>
              new TableCell({
                columnSpan: g.span,
                margins: margens,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: espacamento(docx),
                    children: runsInline(docx, g.texto, { bold: true }),
                  }),
                ],
              }),
          ),
        })
      : null;

  const linhaCabecalho = new TableRow({
    tableHeader: true,
    children: completar(seg.cabecalho).map((c, i) => celula(c, i, true)),
  });
  const linhasCorpo = seg.corpo.map(
    (cels) => new TableRow({ children: completar(cels).map((c, i) => celula(c, i, false)) }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    // Larguras fixas calculadas pelo conteúdo: colunas iguais quebravam o nome
    // do sócio em três linhas e partiam palavra no memorial de vértices.
    layout: TableLayoutType.FIXED,
    columnWidths: larguraDasColunas(seg, colunas),
    borders: {
      top: borda,
      bottom: borda,
      left: borda,
      right: borda,
      insideHorizontal: borda,
      insideVertical: borda,
    },
    rows: [...(linhaGrupos ? [linhaGrupos] : []), linhaCabecalho, ...linhasCorpo],
  });
}

/**
 * Estado que atravessa os blocos: o cabeçalho do instrumento (título e razão
 * social) e a linha em branco antes de cada capítulo/cláusula dependem do que
 * veio antes, não só do bloco atual.
 */
interface EstadoDocumento {
  /**
   * A abertura do documento ainda está em curso ('aberta') ou já entrou no corpo
   * ('corpo')? Enquanto aberta, uma linha em caixa alta num bloco livre é título
   * do instrumento; depois dela, é título de seção.
   */
  abertura: 'aberta' | 'corpo';
  /** Tipo do bloco anterior — cláusula logo depois de capítulo não leva linha em branco. */
  tipoAnterior?: TipoBloco;
  /** O documento já termina em parágrafo vazio? Evita abrir bloco com linha dupla. */
  terminaEmBranco: boolean;
}

/**
 * A capa do Contrato Social dentro de UM bloco: título, linha em branco, razão
 * social. Devolve os índices dos dois segmentos, ou `null` quando o bloco não
 * tem essa forma.
 *
 * ── POR QUE A DECISÃO É POR BLOCO, E NÃO POR ESTADO QUE ATRAVESSA BLOCOS ────
 *
 * A versão anterior guardava 'titulo' → 'razao' → 'corpo' no estado do
 * DOCUMENTO: a primeira linha em caixa alta virava título, e a PRÓXIMA linha
 * livre — de qualquer bloco — virava razão social, em 20pt centralizado. Isso
 * funcionava por acidente no Contrato Social, onde as duas moram no mesmo bloco
 * ("Cabeçalho e razão social"), e produzia dois defeitos fora dele:
 *
 *   · no instrumento agrário COMPLETO, o parágrafo "PARCEIRA OUTORGANTE: MMS
 *     AGRO LTDA, pessoa jurídica…" caía no slot da razão social e saía inteiro
 *     centralizado em 20pt;
 *   · no instrumento agrário em RASCUNHO, a tarja "RASCUNHO — DOCUMENTO
 *     INCOMPLETO" consumia o slot do título e empurrava o título de verdade para
 *     o da razão social — o que MASCARAVA o defeito acima.
 *
 * Olhando o bloco, a capa é reconhecida pelo que ela é (duas linhas separadas por
 * uma vazia) e nenhum bloco seguinte herda um slot que não é dele.
 */
function detectarCapa(segs: Segmento[]): { titulo: number; razao: number } | null {
  const indices = segs
    .map((s, i) => ({ i, texto: s.tipo === 'tabela' ? null : removerMarcas(s.texto).trim() }))
    .filter((s) => s.texto !== null) as { i: number; texto: string }[];

  const titulo = indices.find((s) => s.texto !== '');
  if (!titulo || !ehCaixaAlta(titulo.texto)) return null;

  const depois = indices.filter((s) => s.i > titulo.i);
  // Exatamente a forma da capa: pelo menos uma linha VAZIA e, depois dela, texto.
  const vazia = depois.find((s) => s.texto === '');
  if (!vazia) return null;
  const razao = depois.find((s) => s.i > vazia.i && s.texto !== '');
  return razao ? { titulo: titulo.i, razao: razao.i } : null;
}

/** Converte um bloco em parágrafos (e tabelas) Word conforme o tipo estrutural. */
function paragrafosDoBloco(
  docx: DocxModule,
  bloco: Bloco,
  estado: EstadoDocumento,
): (Paragraph | Table)[] {
  const { Paragraph } = docx;
  const tipo = bloco.tipo ?? 'livre';
  const saida: (Paragraph | Table)[] = [];
  // Bloco de assinatura: régua, nome e papel do signatário, tudo centralizado
  // até a próxima linha em branco.
  let assinatura = 0;
  let primeiraLinha = true;

  /**
   * Linha em branco antes do 1º parágrafo do bloco, como no modelo: antes de
   * todo capítulo e de toda cláusula, EXCETO a cláusula que vem imediatamente
   * abaixo do subtítulo do capítulo. Não duplica se o documento já vem
   * terminando em parágrafo vazio.
   */
  const abrirComLinhaEmBranco = (): boolean => {
    if (!primeiraLinha || estado.tipoAnterior === undefined || estado.terminaEmBranco) return false;
    if (tipo === 'capitulo') return true;
    if (tipo === 'clausula') return estado.tipoAnterior !== 'capitulo';
    // Fecho e anexos (livre) depois do corpo numerado também abrem com linha
    // em branco; livre depois de livre (sócios do preâmbulo) não.
    if (tipo === 'livre') return estado.tipoAnterior !== 'livre';
    return false;
  };

  /** Empurra o parágrafo, precedido da linha em branco de abertura se couber. */
  const emitir = (p: Paragraph) => {
    if (abrirComLinhaEmBranco()) saida.push(linhaEmBranco(docx));
    saida.push(p);
    primeiraLinha = false;
    estado.terminaEmBranco = false;
  };

  const segs = segmentar(bloco.conteudo.split('\n'));
  // A capa (título + razão social) é forma DESTE bloco, e só vale enquanto a
  // abertura do documento não terminou.
  const capa = tipo === 'livre' && estado.abertura === 'aberta' ? detectarCapa(segs) : null;
  /** A próxima linha de conteúdo (pulando vazias) abre uma alínea? */
  const proximaEhAlinea = (i: number): boolean => {
    for (let k = i + 1; k < segs.length; k++) {
      const s = segs[k];
      if (s.tipo === 'tabela') return false;
      const t = removerMarcas(s.texto).trim();
      if (t === '') continue;
      return ALINEA.test(t);
    }
    return false;
  };
  // Lista de alíneas é COMPACTA: uma vez aberta, linha em branco entre itens
  // não sai (a lista de imóveis integralizados vem com os itens separados por
  // linha em branco no conteúdo do bloco).
  let listaAberta = false;

  for (const [indice, seg] of segs.entries()) {
    if (seg.tipo === 'tabela') {
      saida.push(tabelaParaDocx(docx, seg));
      assinatura = 0;
      primeiraLinha = false;
      estado.terminaEmBranco = false;
      continue;
    }
    const linha = seg.texto.replace(/\s+$/, '');
    if (linha.trim() === '') {
      // Dentro de uma lista de alíneas a linha em branco é descartada.
      if (listaAberta && proximaEhAlinea(indice)) continue;
      // Duas linhas em branco seguidas no conteúdo não viram duas no documento.
      if (!estado.terminaEmBranco) saida.push(linhaEmBranco(docx));
      assinatura = 0;
      primeiraLinha = false;
      estado.terminaEmBranco = true;
      listaAberta = false;
      continue;
    }

    if (ALINEA.test(removerMarcas(linha).trim())) listaAberta = true;

    if (tipo !== 'livre') estado.abertura = 'corpo';

    // capitulo: título e subtítulo centralizados em negrito sublinhado.
    if (tipo === 'capitulo') {
      emitir(linhaCentralizada(docx, linha.trim(), { bold: true, underline: true }));
      continue;
    }

    // clausula/paragrafo: rótulo em negrito, corpo justificado, alíneas recuadas.
    if (tipo === 'clausula' || tipo === 'paragrafo') {
      emitir(linhaComRotulo(docx, linha));
      continue;
    }

    // livre: abertura do instrumento, fecho e anexos.
    const texto = linha.trim();
    const limpo = removerMarcas(texto);

    // Capa do Contrato Social: título (18pt sublinhado) e, depois da linha em
    // branco, a razão social (20pt sem sublinhado) — as duas centralizadas em
    // negrito, como nos dois contratos registrados na Jucemat.
    if (capa && indice === capa.titulo) {
      emitir(linhaCentralizada(docx, texto, { bold: true, underline: true, size: PT18 }));
      continue;
    }
    if (capa && indice === capa.razao) {
      estado.abertura = 'corpo';
      emitir(linhaCentralizada(docx, texto, { bold: true, size: PT20 }));
      continue;
    }

    // Título do instrumento SEM capa: os agrários abrem com uma linha só, em
    // 14pt negrito centralizado e sem sublinhado. A tarja de rascunho, que é um
    // bloco livre de uma linha em caixa alta prependado ao documento, cai aqui
    // também — e é exatamente o que se quer dela.
    if (capa === null && estado.abertura === 'aberta' && ehCaixaAlta(limpo) && !ALINEA.test(limpo)) {
      emitir(linhaCentralizada(docx, texto, { bold: true, size: PT14 }));
      continue;
    }
    // Primeira linha livre que não é título encerra a abertura: daí para frente,
    // caixa alta é título de SEÇÃO (o "PREÂMBULO" do composse, o "ANEXO ÚNICO"),
    // e não mais o nome do instrumento.
    estado.abertura = 'corpo';

    if (REGUA_ASSINATURA.test(limpo)) {
      emitir(linhaCentralizada(docx, limpo, {}));
      assinatura = 1;
      continue;
    }
    if (assinatura > 0) {
      // Nome do signatário (negrito) e, abaixo dele, o papel — centralizados.
      emitir(linhaCentralizada(docx, texto, { bold: assinatura === 1 }));
      assinatura += 1;
      continue;
    }
    if (ehCaixaAlta(limpo) && !ALINEA.test(limpo)) {
      // Título de seção solto no meio do documento (anexo, por exemplo).
      if (!estado.terminaEmBranco) saida.push(linhaEmBranco(docx));
      emitir(linhaCentralizada(docx, texto, { bold: true }));
      continue;
    }
    emitir(linhaComRotulo(docx, linha));
  }

  estado.tipoAnterior = tipo;
  return saida;
}

/** Monta o Document a partir dos blocos gerados pelo engine. */
function blocosParaDocx(docx: DocxModule, blocos: Bloco[]): Document {
  const { AlignmentType, Footer, PageNumber, Paragraph, TextRun } = docx;
  const estado: EstadoDocumento = { abertura: 'aberta', terminaEmBranco: false };
  const paragrafos = blocos.flatMap((bloco) => paragrafosDoBloco(docx, bloco, estado));

  const rodape = (texto: string | (typeof PageNumber)[keyof typeof PageNumber], bold = false) =>
    new TextRun({ children: [texto], font: FONTE, size: PT12, bold: bold || undefined });

  return new docx.Document({
    styles: {
      default: {
        document: { run: { font: FONTE, size: PT12 } },
      },
      // Estilo `Normal` explícito: os estilos que o pacote `docx` embute
      // (Title, Heading1…) declaram `basedOn="Normal"`, e sem ele o arquivo fica
      // com referência pendurada e a fonte só sobrevive no Word.
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          quickFormat: true,
          run: { font: FONTE, size: PT12 },
          paragraph: { spacing: { before: 0, after: 0, line: 240, lineRule: docx.LineRuleType.AUTO } },
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: A4, margin: MARGENS } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: espacamento(docx),
                children: [
                  rodape('Página '),
                  rodape(PageNumber.CURRENT, true),
                  rodape(' de '),
                  rodape(PageNumber.TOTAL_PAGES, true),
                ],
              }),
            ],
          }),
        },
        children: paragrafos,
      },
    ],
  });
}

function nomeArquivo(nome: string): string {
  const base = (nome || 'documento')
    .normalize('NFD') // separa acentos para removê-los abaixo
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'documento';
  return `${base}.docx`;
}

/** Gera e dispara o download do .docx no navegador. */
export async function baixarDocx(nome: string, blocos: Bloco[]): Promise<void> {
  const docx = await import('docx');
  const doc = blocosParaDocx(docx, blocos);
  const blob = await docx.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo(nome);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Exposto para testes: serializa o Document em XML sem disparar download. */
export async function montarDocx(blocos: Bloco[]): Promise<Document> {
  const docx = await import('docx');
  return blocosParaDocx(docx, blocos);
}
