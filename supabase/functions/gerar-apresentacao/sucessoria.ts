// O capítulo 04 dentro do molde: só OOXML. O conteúdo está em `_shared/apresentacao-osg/sucessoria.ts`,
// o contrato dos tokens em docs/OSG modelo/CONTRATO_molde-cap04.md. Nenhum número é recalculado.

import { packPptx, readText, unpackPptx, writeText, type PptxParts } from "../_shared/ooxml/zip.ts";
import { parseXml, qsa, serializeXml } from "../_shared/ooxml/xml.ts";
import { applyTokensToNode, stripRemainingTokens, type Tokens } from "../_shared/ooxml/runs.ts";
import { duplicateSlide, ordemDosSlides, removeSlide, reordenarSlides, slideDoToken } from "../_shared/ooxml/slide.ts";
import {
  cloneRow, insertRowBefore, listGraphicFrames, listRows, removeRow, rowContainsToken, setGraphicFrameBox,
} from "../_shared/ooxml/table.ts";
import { setShapeXfrm } from "../_shared/ooxml/shapes.ts";
import { nextCNvPrId } from "../_shared/ooxml/ids.ts";
import { stripTiming } from "../_shared/ooxml/timing.ts";
import { anota, ONDE, type Probs } from "../_shared/apresentacao-osg/regras.ts";
import {
  montaCapitulo,
  type AtoDoResumo, type CapituloSucessorio, type PaginaDaSimulacao, type PaginaDoResumo,
} from "../_shared/apresentacao-osg/sucessoria.ts";
import { MAXIMO_DE_CENARIOS } from "../_shared/apresentacao-osg/paginacao.ts";
import { carregarSucessoria } from "./data.ts";

const EMU = 914_400;

/** As páginas do molde, pelo token que só cada uma tem; `tokens` confere que o molde do bucket é o certo. */
const PAGINAS = {
  tributacao: { token: "TA_UPF", nome: "Tributação atual", tokens: 11 },
  simulacao: { token: "SIM_NOME", nome: "Simulação", tokens: 20 },
  resumo: { token: "RT_CT_BASE", nome: "Resumo dos tributos", tokens: 23 },
  usufruto: { token: "US_NOME", nome: "Usufruto", tokens: 17 },
  instituicao: { token: "TI_CT_I_BASE", nome: "Tributação da instituição", tokens: 56 },
  cenarios: { token: "RC1_NOME", nome: "Resumo dos cenários", tokens: 24 },
} as const;
type Pagina = keyof typeof PAGINAS;

// ─── OOXML ───────────────────────────────────────────────────────────────────

const textoDe = (no: Element): string => qsa(no, "a:t").map((t) => t.textContent ?? "").join("");
const contaTokens = (xml: string): number => (xml.replace(/<[^>]+>/g, "").match(/\{\{[A-Z0-9_]+\}\}/g) ?? []).length;

/** Os filhos diretos do spTree — formas, tabelas e conectores — com o `cNvPr/@name`. */
function filhosComNome(doc: Document): Array<{ el: Element; nome: string }> {
  const tree = qsa(doc, "p:spTree")[0];
  const out: Array<{ el: Element; nome: string }> = [];
  for (let i = 0; i < tree.childNodes.length; i++) {
    const el = tree.childNodes.item(i) as Element;
    if (!el || el.nodeType !== 1) continue;
    const cNvPr = qsa(el, "p:cNvPr")[0];
    if (cNvPr) out.push({ el, nome: cNvPr.getAttribute("name") ?? "" });
  }
  return out;
}

const porNome = (doc: Document, nome: string): Element | null =>
  filhosComNome(doc).find((x) => x.nome === nome)?.el ?? null;

const remover = (el: Element | null) => el?.parentNode?.removeChild(el);

/** Parágrafos de caixa de texto, fora de tabela: é neles que marcador e frase vazia agem. */
function paragrafosDeCaixa(doc: Document): Element[] {
  return qsa(doc, "a:p").filter((p) => {
    for (let n: Node | null = p.parentNode; n; n = n.parentNode) {
      if ((n as Element).nodeName === "a:tbl") return false;
      if ((n as Element).nodeName === "p:txBody") return true;
    }
    return false;
  });
}

/** Tira o parágrafo com marcador `{{SE_*}}` falso ou com frase vazia, para não sobrar linha em branco. */
function tirarParagrafos(doc: Document, tokens: Tokens, condicoes: Record<string, boolean>): void {
  for (const p of paragrafosDeCaixa(doc)) {
    const texto = textoDe(p);
    const marcadores = [...texto.matchAll(/\{\{(SE_[A-Z0-9_]+)\}\}/g)].map((m) => m[1]);
    const falso = marcadores.some((mk) => condicoes[mk] === false);
    const soUmToken = /^\s*\{\{([A-Z0-9_]+)\}\}\s*$/.exec(texto);
    const vazio = soUmToken != null && tokens[soUmToken[1]] === "";
    if (falso || vazio) remover(p);
  }
}

/** Clona a linha-modelo (a que tem `ancora`) uma vez por item, na posição dela. */
function clonarLinhas(frame: Element, ancora: string, itens: Tokens[]): void {
  const modelo = listRows(frame).find((r) => rowContainsToken(r, ancora));
  if (!modelo) return;
  for (const t of itens) {
    const r = cloneRow(modelo);
    applyTokensToNode(r, t);
    insertRowBefore(r, modelo);
  }
  removeRow(modelo);
}

/** A altura do quadro volta a ser a soma das linhas, que mudou com as clonadas. */
function ajustarAltura(frame: Element): void {
  const h = listRows(frame).reduce((s, r) => s + Number(r.getAttribute("h") ?? 0), 0);
  setGraphicFrameBox(frame, { cy: h });
}

function preencher(parts: PptxParts, caminho: string, f: (doc: Document) => void): void {
  const doc = parseXml(readText(parts, caminho));
  f(doc);
  stripRemainingTokens(doc);
  writeText(parts, caminho, stripTiming(serializeXml(doc)));
}

// ─── As páginas ──────────────────────────────────────────────────────────────

/** A tabela da Simulação nasce em 3,15" — o pior caso, com aporte e as duas frases. */
const Y_TABELA_DA_SIMULACAO = 3.15;

function renderSimulacao(doc: Document, pagina: PaginaDaSimulacao): void {
  tirarParagrafos(doc, pagina.tokens, {});
  const tabela = porNome(doc, "ATO tabela");
  if (tabela) {
    clonarLinhas(tabela, "SIM_NOME", pagina.linhas);
    ajustarAltura(tabela);
    /* Sem aporte e sem reserva o texto encolhe, e a tabela sobe para não deixar um
       buraco entre as frases e ela. */
    const y = Y_TABELA_DA_SIMULACAO - (pagina.semAporte ? 0.5 : 0) - (pagina.semReserva ? 0.25 : 0);
    setGraphicFrameBox(tabela, { y: y * EMU });
  }
  applyTokensToNode(doc, pagina.tokens);
}

function preencherCartao(frame: Element, sigla: "CT" | "IT" | "MC", ato: AtoDoResumo): void {
  const c = ato.cartoes[sigla];
  clonarLinhas(frame, `RT_${sigla}_B_ROT`, c.guias.map((g) => ({
    [`RT_${sigla}_B_ROT`]: g.rotulo, [`RT_${sigla}_B_VLR`]: g.base,
  })));
  clonarLinhas(frame, `RT_${sigla}_I_ROT`, c.guias.map((g) => ({
    [`RT_${sigla}_I_ROT`]: g.rotulo, [`RT_${sigla}_I_VLR`]: g.itcd,
  })));
  applyTokensToNode(frame, { [`RT_${sigla}_BASE`]: c.base, [`RT_${sigla}_ITCD`]: c.itcd });
  ajustarAltura(frame);
}

function renderResumo(doc: Document, xmlOriginal: string, pagina: PaginaDoResumo): void {
  const { plano } = pagina;
  tirarParagrafos(doc, {}, {
    SE_PRIMEIRO: pagina.primeiroCenario && plano.comIntro,
    SE_DEMAIS: !pagina.primeiroCenario && plano.comIntro,
    SE_BASE100: pagina.base100,
  });
  if (!plano.comIntro) remover(porNome(doc, "RT intro"));
  if (!plano.comNotas) remover(porNome(doc, "RT_NOTAS"));

  /* O BLOCO DE UM ATO é o rótulo e os três cartões. Cada ato da página ganha uma cópia,
     na altura que a paginação calculou; os originais saem. */
  const rotulo = porNome(doc, "ATO rotulo");
  const cartoes = (["CT", "IT", "MC"] as const).map((s) => ({ sigla: s, el: porNome(doc, `ATO cartao ${s}`) }));
  const tree = qsa(doc, "p:spTree")[0];
  let id = nextCNvPrId(xmlOriginal) + 100;
  const comId = <T extends Element>(el: T): T => {
    const c = el.cloneNode(true) as T;
    qsa(c, "p:cNvPr")[0]?.setAttribute("id", String(id++));
    return c;
  };

  plano.atos.forEach((pos, i) => {
    const ato = pagina.atos[i];
    if (rotulo && pos.yRotulo != null) {
      const r = comId(rotulo);
      applyTokensToNode(r, { RT_ATO: ato.rotulo });
      setShapeXfrm(r, { y: pos.yRotulo * EMU });
      tree.appendChild(r);
    }
    for (const { sigla, el } of cartoes) {
      if (!el) continue;
      const c = comId(el);
      preencherCartao(c, sigla, ato);
      setGraphicFrameBox(c, { y: pos.yCartoes * EMU });
      tree.appendChild(c);
    }
  });
  remover(rotulo);
  cartoes.forEach(({ el }) => remover(el));
  applyTokensToNode(doc, { ...pagina.tokens, SE_PRIMEIRO: "", SE_DEMAIS: "", SE_BASE100: "" });
}

function renderUsufruto(doc: Document, u: { tokens: Tokens; linhas: Tokens[] }): void {
  const tabela = listGraphicFrames(doc).find((g) => textoDe(g).includes("{{US_NOME}}"));
  if (tabela) {
    clonarLinhas(tabela, "US_NOME", u.linhas);
    ajustarAltura(tabela);
  }
  applyTokensToNode(doc, u.tokens);
}

function renderCenarios(doc: Document, tokens: Tokens, quantos: number): void {
  for (let k = quantos + 1; k <= MAXIMO_DE_CENARIOS; k++) {
    filhosComNome(doc).filter((x) => x.nome.startsWith(`RC${k} `)).forEach((x) => remover(x.el));
  }
  applyTokensToNode(doc, tokens);
}

// ─── O capítulo ──────────────────────────────────────────────────────────────

/** O capítulo dentro do molde, exportado à parte para o harness montar o .pptx sem banco. */
export function montaPptxDaSucessoria(
  molde: Uint8Array, capitulo: CapituloSucessorio,
): { bytes: Uint8Array; avisos: string[]; slides: number } {
  const parts = unpackPptx(molde);
  const avisos: string[] = [];

  const caminho = {} as Record<Pagina, string>;
  for (const [chave, pag] of Object.entries(PAGINAS) as Array<[Pagina, typeof PAGINAS[Pagina]]>) {
    const achado = slideDoToken(parts, pag.token);
    if (!achado) throw new Error(`O modelo em uso não tem a página ${pag.nome} (falta o campo {{${pag.token}}}).`);
    const n = contaTokens(readText(parts, achado));
    if (n !== pag.tokens) {
      avisos.push(`O modelo do capítulo 04 no sistema está desatualizado: a página ${pag.nome} tem ${n} campo(s), `
        + `e a certa tem ${pag.tokens}. Avise o suporte da PSA Digital.`);
    }
    caminho[chave] = achado;
  }

  /* As páginas do bloco, cenário a cenário, na ordem do capítulo. Cada uma é cópia da
     página-modelo, preenchida; as modelos saem no fim. */
  const doBloco: string[] = [];
  const copia = (modelo: string, f: (doc: Document, xml: string) => void) => {
    const { newPath } = duplicateSlide(parts, modelo);
    const xml = readText(parts, newPath);
    preencher(parts, newPath, (doc) => f(doc, xml));
    doBloco.push(newPath);
  };
  for (const c of capitulo.cenarios) {
    c.simulacao.forEach((pag) => copia(caminho.simulacao, (doc) => renderSimulacao(doc, pag)));
    c.resumo.forEach((pag) => copia(caminho.resumo, (doc, xml) => renderResumo(doc, xml, pag)));
    if (c.usufruto) {
      const u = c.usufruto;
      copia(caminho.usufruto, (doc) => renderUsufruto(doc, u));
    }
    c.instituicoes.forEach((t) => copia(caminho.instituicao, (doc) => applyTokensToNode(doc, t)));
  }

  preencher(parts, caminho.tributacao, (doc) => applyTokensToNode(doc, capitulo.tributacaoAtual));
  preencher(parts, caminho.cenarios, (doc) =>
    renderCenarios(doc, capitulo.resumoDosCenarios, capitulo.cenarios.length));

  /* A ORDEM: as páginas do molde como estão, e o bloco dos cenários no lugar da
     primeira página-modelo (a Simulação). */
  const modelos = new Set([caminho.simulacao, caminho.resumo, caminho.usufruto, caminho.instituicao]);
  const ordem: string[] = [];
  for (const p of ordemDosSlides(parts)) {
    if (p === caminho.simulacao) ordem.push(...doBloco);
    else if (!modelos.has(p) && !doBloco.includes(p)) ordem.push(p);
  }
  for (const m of modelos) removeSlide(parts, m);
  reordenarSlides(parts, ordem);

  return { bytes: packPptx(parts), avisos, slides: ordem.length };
}

/** O capítulo 04 de um cliente; `db` é a conexão do usuário, para a RLS das `itcd_*` decidir o que ele vê. */
export async function gerarSucessoria(
  // deno-lint-ignore no-explicit-any
  db: any,
  bytesDoMolde: Uint8Array,
  clienteId: string,
  simulacaoIds: string[],
  probs?: Probs,
): Promise<{ bytes: Uint8Array; contagens: Record<string, number>; snapshot: Record<string, unknown> }> {
  const { entrada, empresaPessoaId } = await carregarSucessoria(db, clienteId, simulacaoIds);
  const capitulo = montaCapitulo(entrada);
  for (const p of capitulo.problemas) anota(probs, p.onde, p.detalhe, p.tipo);

  const { bytes, avisos, slides } = montaPptxDaSucessoria(bytesDoMolde, capitulo);
  /* O que o molde não tem é falha nossa. */
  for (const a of avisos) anota(probs, ONDE.sucessoria, a, "sistema");

  return {
    bytes,
    contagens: { cenarios: capitulo.cenarios.length, slides },
    /* O RETRATO do que o capítulo afirmou: as simulações de cada cenário com o nome e a
       versão DA ÉPOCA — o nome muda depois, e líder pode apagar simulação aprovada. */
    snapshot: {
      empresaPessoaId,
      cenarios: capitulo.cenarios.map((c, i) => ({
        nome: c.nome,
        simulacoes: entrada.cenarios[i].map((a) => ({
          id: a.id, versao: a.versao, nome: a.nome, status: a.status, competencia: a.competencia, upf: a.upf,
        })),
      })),
      tributacaoAtual: capitulo.tributacaoAtual,
      resumoDosCenarios: capitulo.resumoDosCenarios,
    },
  };
}
