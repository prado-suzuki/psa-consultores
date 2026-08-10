import { origemDe, type OrigemValor } from './origem';
import { PALAVRA_INCLUSAO, resolverVariante, type RegistroFamilias } from './familia';
import type { Contexto } from './types';

export type { OrigemValor } from './origem';

// Resolve placeholders {{ caminho }} (com caminho pontilhado opcional) e SEÇÕES
// {{#nome}}…{{/nome}} sobre um contexto. É a única camada que toca a string do
// bloco; é agnóstica de formato (texto/HTML) e de domínio (não sabe o que é
// "sócio" — só repete sobre arrays e condiciona sobre booleanos).
//
// Semântica das seções (decidida pelo VALOR resolvido, não pela sintaxe):
//   - array   → repetição: o corpo é renderizado uma vez por item, com o item
//               empilhado como escopo (placeholders resolvem do escopo mais
//               interno para fora). Os itens são unidos por `sep` (padrão "\n")
//               e o último por `fim` (padrão = sep) — prosa jurídica "A; B; e C".
//   - booleano/string → condicional: corpo entra se truthy ("", "false" e false
//               ficam de fora). Permite {{#sePF}}…{{/sePF}} dentro de um loop.

// Um único token cobre os quatro casos: abertura ({{#nome attr="v"}}),
// fechamento ({{/nome}}), placeholder ({{ caminho }}) e INCLUSÃO DE FAMÍLIA
// ({{familia nome="…"}}) — um identificador com atributos, sem "#", que é o que
// distingue a inclusão do placeholder.
const TOKEN =
  /\{\{\s*(?:#([\w.]+)((?:\s+\w+="(?:[^"\\]|\\.)*")*)|\/([\w.]+)|([\w.]+)((?:\s+\w+="(?:[^"\\]|\\.)*")*))\s*\}\}/g;

const ATRIBUTO = /(\w+)="((?:[^"\\]|\\.)*)"/g;

/** Desfaz escapes nos valores de atributo: \n, \t e \" (sep="\n\n" no fecho). */
function desescapar(valor: string): string {
  return valor.replace(/\\(.)/g, (_m, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : c));
}

function parseAtributos(bruto: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of bruto.matchAll(ATRIBUTO)) out[m[1]] = desescapar(m[2]);
  return out;
}

// --- AST ---------------------------------------------------------------------

export type No =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'placeholder'; caminho: string }
  | { tipo: 'secao'; nome: string; atributos: Record<string, string>; filhos: No[] }
  /** Inclusão de família: o texto vem da variante eleita no escopo corrente (ver familia.ts). */
  | { tipo: 'inclusao'; familia: string };

/**
 * Compila o conteúdo num AST. No modo estrito (render) lança erro em seções
 * desbalanceadas (falha cedo); no tolerante (extração durante a digitação no
 * editor) ignora fechamentos órfãos e auto-fecha seções abertas no fim.
 */
export function compilar(conteudo: string, opcoes: { tolerante?: boolean } = {}): No[] {
  const { tolerante = false } = opcoes;
  const raiz: No[] = [];
  const pilha: Array<{ nome: string; filhos: No[] }> = [];
  const filhosAtuais = () => (pilha.length ? pilha[pilha.length - 1].filhos : raiz);

  let ultimo = 0;
  for (const m of conteudo.matchAll(TOKEN)) {
    if (m.index! > ultimo) filhosAtuais().push({ tipo: 'texto', texto: conteudo.slice(ultimo, m.index) });
    ultimo = m.index! + m[0].length;

    const [, abre, atributos, fecha, caminho, atributosCaminho] = m;
    if (caminho && atributosCaminho) {
      // Identificador COM atributos: só a inclusão de família tem essa forma.
      // Fora dela é erro de escrita — no modo tolerante (editor digitando) cai
      // para placeholder, que é o que o autor tinha antes de abrir o atributo.
      if (caminho === PALAVRA_INCLUSAO) {
        const nome = parseAtributos(atributosCaminho).nome;
        if (nome) {
          filhosAtuais().push({ tipo: 'inclusao', familia: nome });
        } else if (!tolerante) {
          throw new Error(`Inclusão de família sem nome: use {{${PALAVRA_INCLUSAO} nome="…"}}`);
        }
      } else if (tolerante) {
        filhosAtuais().push({ tipo: 'placeholder', caminho });
      } else {
        throw new Error(
          `Atributos só são válidos em seção ({{#${caminho} …}}) ou inclusão de família ({{${PALAVRA_INCLUSAO} nome="…"}}): {{${caminho} …}}`,
        );
      }
    } else if (abre) {
      const secao: No = { tipo: 'secao', nome: abre, atributos: parseAtributos(atributos ?? ''), filhos: [] };
      filhosAtuais().push(secao);
      pilha.push({ nome: abre, filhos: secao.filhos });
    } else if (fecha) {
      const topo = pilha[pilha.length - 1];
      if (!topo || topo.nome !== fecha) {
        if (!tolerante) {
          throw new Error(`Seção desbalanceada: {{/${fecha}}}${topo ? ` (esperava {{/${topo.nome}}})` : ' sem abertura'}`);
        }
        // Tolerante: fechamento órfão é ignorado.
      } else {
        pilha.pop();
      }
    } else {
      filhosAtuais().push({ tipo: 'placeholder', caminho: caminho! });
    }
  }
  if (pilha.length && !tolerante) throw new Error(`Seção não fechada: {{#${pilha[pilha.length - 1].nome}}}`);
  if (ultimo < conteudo.length) filhosAtuais().push({ tipo: 'texto', texto: conteudo.slice(ultimo) });
  return raiz;
}

// --- Render -------------------------------------------------------------------

/**
 * Saída estruturada do render: o texto final fatiado entre o que veio do bloco
 * ('texto', incluindo rótulos de numeração e as junturas sep/fim) e o que veio
 * de um placeholder ('valor'), com a proveniência quando o contexto a carrega
 * (ver origem.ts). A concatenação dos `texto` É o documento — renderConteudo é
 * só isso, mantendo um núcleo único.
 */
export type SegmentoRender =
  | { tipo: 'texto'; texto: string; realce?: boolean; blocoId?: string }
  | { tipo: 'valor'; texto: string; caminho: string; origem?: OrigemValor; realce?: boolean; blocoId?: string };

/** Opções do render. `familias` é o que torna {{familia nome="…"}} resolvível. */
export interface OpcoesRender {
  familias?: RegistroFamilias;
}

/**
 * Resolve um caminho pontilhado do escopo mais interno para fora, rastreando a
 * origem do objeto MAIS PROFUNDO do caminho que a tenha (o próprio escopo conta:
 * um item de lista pode carregar a origem no topo, ou no sub-objeto do papel —
 * `{{ socio.nome }}` acha a origem em item.socio).
 */
function resolver(caminho: string, escopos: Contexto[]): { valor: unknown; origem?: OrigemValor } {
  const [cabeca, ...resto] = caminho.split('.');
  for (let i = escopos.length - 1; i >= 0; i--) {
    if (!(cabeca in escopos[i])) continue;
    let origem = origemDe(escopos[i]);
    let valor: unknown = escopos[i][cabeca];
    origem = origemDe(valor) ?? origem;
    for (const chave of resto) {
      valor = valor !== null && typeof valor === 'object'
        ? (valor as Record<string, unknown>)[chave]
        : undefined;
      origem = origemDe(valor) ?? origem;
    }
    return { valor, origem };
  }
  return { valor: undefined };
}

function truthy(valor: unknown): boolean {
  if (typeof valor === 'string') return valor !== '' && valor !== 'false';
  return Boolean(valor);
}

function renderNos(
  nos: No[],
  escopos: Contexto[],
  out: SegmentoRender[],
  opcoes: OpcoesRender,
  dentroDeFamilia = false,
): void {
  for (const no of nos) {
    if (no.tipo === 'texto') {
      out.push({ tipo: 'texto', texto: no.texto });
    } else if (no.tipo === 'placeholder') {
      const { valor, origem } = resolver(no.caminho, escopos);
      if (valor === undefined || valor === null) {
        throw new Error(`Placeholder não resolvido: {{${no.caminho}}}`);
      }
      out.push({ tipo: 'valor', texto: String(valor), caminho: no.caminho, origem });
    } else if (no.tipo === 'inclusao') {
      renderInclusao(no.familia, escopos, out, opcoes, dentroDeFamilia);
    } else {
      const { valor } = resolver(no.nome, escopos);
      if (valor === undefined || valor === null) {
        throw new Error(`Seção não resolvida: {{#${no.nome}}}`);
      }
      if (Array.isArray(valor)) {
        const sep = no.atributos.sep ?? '\n';
        const fim = no.atributos.fim ?? sep;
        valor.forEach((item, i) => {
          // Juntura ANTES de cada item após o primeiro: sep entre os do meio,
          // fim antes do último — mesma prosa "A; B; e C" da versão em string.
          if (i > 0) out.push({ tipo: 'texto', texto: i === valor.length - 1 ? fim : sep });
          renderNos(no.filhos, [...escopos, (item ?? {}) as Contexto], out, opcoes, dentroDeFamilia);
        });
      } else if (truthy(valor)) {
        renderNos(no.filhos, escopos, out, opcoes, dentroDeFamilia);
      }
    }
  }
}

/**
 * Escreve, no lugar da inclusão, o texto da variante eleita para o escopo
 * corrente. Dentro de um laço isto roda uma vez por item, que é o ponto todo:
 * a família resolve por imóvel, não por bloco.
 *
 * Os segmentos produzidos ganham `blocoId` da variante — quem os consome (a
 * prévia interativa) precisa saber que aquele trecho não é do bloco hospedeiro,
 * senão o clique para editar abriria o bloco errado.
 *
 * Um nível só, como o trigger do banco: família dentro de família viraria
 * recursão sem dono e não tem caso de uso na casa.
 */
function renderInclusao(
  nome: string,
  escopos: Contexto[],
  out: SegmentoRender[],
  opcoes: OpcoesRender,
  dentroDeFamilia: boolean,
): void {
  if (dentroDeFamilia) {
    throw new Error(`Inclusão de família dentro de outra família não é suportada: {{${PALAVRA_INCLUSAO} nome="${nome}"}}`);
  }
  const registro = opcoes.familias ?? {};
  const variantes = registro[nome];
  if (!variantes || variantes.length === 0) {
    const conhecidas = Object.keys(registro);
    throw new Error(
      `Família não encontrada: "${nome}"${conhecidas.length ? ` (disponíveis: ${conhecidas.join(', ')})` : ''}.`,
    );
  }
  const variante = resolverVariante(variantes, (caminho) => resolver(caminho, escopos).valor, nome);

  const internos: SegmentoRender[] = [];
  renderNos(compilar(variante.conteudo), escopos, internos, opcoes, true);
  for (const seg of internos) out.push({ ...seg, blocoId: variante.id });
}

/**
 * Render estruturado de um bloco: segmentos com proveniência (prévia interativa).
 * Mesmos erros do renderConteudo. `escoposExtras` empilha escopos por cima do
 * contexto (instância de bloco repetidor: o item resolve antes do global).
 */
export function renderSegmentos(
  conteudo: string,
  contexto: Contexto,
  escoposExtras: Contexto[] = [],
  opcoes: OpcoesRender = {},
): SegmentoRender[] {
  const out: SegmentoRender[] = [];
  renderNos(compilar(conteudo), [contexto, ...escoposExtras], out, opcoes);
  return out;
}

/** Preenche placeholders e seções de um bloco. Lança erro se algo não resolver (falha cedo, evita texto incompleto no cartório). */
export function renderConteudo(conteudo: string, contexto: Contexto, opcoes: OpcoesRender = {}): string {
  return renderSegmentos(conteudo, contexto, [], opcoes).map((s) => s.texto).join('');
}

// --- Inclusões de família (varredura textual) ----------------------------------

// Mesma forma que o TOKEN reconhece, isolada para varrer sem compilar. O nome da
// palavra está literal aqui (e em PALAVRA_INCLUSAO) porque regex literal é mais
// legível que uma montada por concatenação — os dois têm teste que os amarra.
const TOKEN_INCLUSAO = /\{\{\s*familia((?:\s+\w+="(?:[^"\\]|\\.)*")*)\s*\}\}/g;

/** Famílias citadas por um conteúdo, na ordem de aparição, sem repetir. */
export function inclusoesDe(conteudo: string): string[] {
  const nomes: string[] = [];
  for (const m of conteudo.matchAll(TOKEN_INCLUSAO)) {
    const nome = parseAtributos(m[1] ?? '').nome;
    if (nome && !nomes.includes(nome)) nomes.push(nome);
  }
  return nomes;
}

/**
 * Troca cada inclusão pelo texto que a função devolver, PRESERVANDO a posição.
 * É como a detecção de bindings enxerga a família: no lugar do token entram
 * TODAS as variantes (o render escolhe uma; a detecção precisa da união dos
 * campos, senão a tela Gerar não pede o que só a variante urbana usa). Manter a
 * posição importa porque o token pode estar dentro de {{#imoveis}}, e é isso que
 * põe os campos no escopo do item em vez de virarem binding unitário.
 *
 * `null` (família desconhecida) deixa o token INTACTO, de propósito: apagá-lo
 * faria a detecção seguir como se o trecho não existisse, e o erro só apareceria
 * como um parágrafo mudo. Intacto, a extração o ignora (nó de inclusão não é
 * placeholder, não vira campo fantasma) e o render acusa com a lista das famílias
 * disponíveis.
 */
export function expandirInclusoes(conteudo: string, textoDaFamilia: (nome: string) => string | null): string {
  return conteudo.replace(TOKEN_INCLUSAO, (inteiro, attrs: string) => {
    const nome = parseAtributos(attrs ?? '').nome;
    if (!nome) return inteiro;
    return textoDaFamilia(nome) ?? inteiro;
  });
}

// --- Extração (detecção de bindings / form dinâmico) ---------------------------

/** Lista os campos ({{ }}) distintos usados num conteúdo, na ordem de aparição — inclui os internos a seções. Tolerante a seções abertas (roda durante a digitação). */
export function extrairCampos(conteudo: string): string[] {
  const campos = new Set<string>();
  const visitar = (nos: No[]) => {
    for (const no of nos) {
      if (no.tipo === 'placeholder') campos.add(no.caminho);
      else if (no.tipo === 'secao') visitar(no.filhos);
    }
  };
  visitar(compilar(conteudo, { tolerante: true }));
  return [...campos];
}

export interface SecaoExtraida {
  nome: string;
  /** Campos referenciados dentro da seção (recursivo, inclui condicionais internas). */
  campos: string[];
  /** Nomes de seções condicionais aninhadas (ex.: sePF/sePJ dentro de socios). */
  secoesInternas: string[];
}

export interface EstruturaConteudo {
  /** Campos fora de qualquer seção (comportamento legado). */
  camposTopo: string[];
  /** Seções de primeiro nível, na ordem de aparição. */
  secoes: SecaoExtraida[];
}

/**
 * Estrutura do conteúdo para a detecção de bindings: separa os campos de topo
 * dos campos internos a cada seção (que pertencem ao escopo do item, não a um
 * binding próprio). Tolerante a seções desbalanceadas (a tela Gerar não pode
 * quebrar por um bloco em edição; o render estrito acusa o erro na prévia).
 */
export function extrairEstrutura(conteudo: string): EstruturaConteudo {
  const camposTopo = new Set<string>();
  const secoes = new Map<string, SecaoExtraida>();

  const coletarInternos = (nos: No[], secao: SecaoExtraida) => {
    for (const no of nos) {
      if (no.tipo === 'placeholder') {
        if (!secao.campos.includes(no.caminho)) secao.campos.push(no.caminho);
      } else if (no.tipo === 'secao') {
        if (!secao.secoesInternas.includes(no.nome)) secao.secoesInternas.push(no.nome);
        coletarInternos(no.filhos, secao);
      }
    }
  };

  for (const no of compilar(conteudo, { tolerante: true })) {
    if (no.tipo === 'placeholder') {
      camposTopo.add(no.caminho);
    } else if (no.tipo === 'secao') {
      const existente = secoes.get(no.nome);
      const secao = existente ?? { nome: no.nome, campos: [], secoesInternas: [] };
      coletarInternos(no.filhos, secao);
      if (!existente) secoes.set(no.nome, secao);
    }
  }
  return { camposTopo: [...camposTopo], secoes: [...secoes.values()] };
}
