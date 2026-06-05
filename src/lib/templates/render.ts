import type { Contexto } from './types';

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

// Um único token cobre os três casos: abertura ({{#nome attr="v"}}), fechamento
// ({{/nome}}) e placeholder ({{ caminho }}).
const TOKEN = /\{\{\s*(?:#([\w.]+)((?:\s+\w+="(?:[^"\\]|\\.)*")*)|\/([\w.]+)|([\w.]+))\s*\}\}/g;

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
  | { tipo: 'secao'; nome: string; atributos: Record<string, string>; filhos: No[] };

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

    const [, abre, atributos, fecha, caminho] = m;
    if (abre) {
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

/** Resolve um caminho pontilhado do escopo mais interno para fora. */
function resolver(caminho: string, escopos: Contexto[]): unknown {
  const [cabeca, ...resto] = caminho.split('.');
  for (let i = escopos.length - 1; i >= 0; i--) {
    if (!(cabeca in escopos[i])) continue;
    return resto.reduce<unknown>((acc, chave) => {
      if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[chave];
      return undefined;
    }, escopos[i][cabeca]);
  }
  return undefined;
}

function truthy(valor: unknown): boolean {
  if (typeof valor === 'string') return valor !== '' && valor !== 'false';
  return Boolean(valor);
}

function renderNos(nos: No[], escopos: Contexto[]): string {
  let out = '';
  for (const no of nos) {
    if (no.tipo === 'texto') {
      out += no.texto;
    } else if (no.tipo === 'placeholder') {
      const valor = resolver(no.caminho, escopos);
      if (valor === undefined || valor === null) {
        throw new Error(`Placeholder não resolvido: {{${no.caminho}}}`);
      }
      out += String(valor);
    } else {
      const valor = resolver(no.nome, escopos);
      if (valor === undefined || valor === null) {
        throw new Error(`Seção não resolvida: {{#${no.nome}}}`);
      }
      if (Array.isArray(valor)) {
        const sep = no.atributos.sep ?? '\n';
        const fim = no.atributos.fim ?? sep;
        const partes = valor.map((item) =>
          renderNos(no.filhos, [...escopos, (item ?? {}) as Contexto]),
        );
        out +=
          partes.length <= 1
            ? partes.join('')
            : partes.slice(0, -1).join(sep) + fim + partes[partes.length - 1];
      } else if (truthy(valor)) {
        out += renderNos(no.filhos, escopos);
      }
    }
  }
  return out;
}

/** Preenche placeholders e seções de um bloco. Lança erro se algo não resolver (falha cedo, evita texto incompleto no cartório). */
export function renderConteudo(conteudo: string, contexto: Contexto): string {
  return renderNos(compilar(conteudo), [contexto]);
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
