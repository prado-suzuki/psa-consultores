// Lê arquivos Markdown de tarefas e devolve rascunhos de item de backlog.
// Formato documentado em docs/sprints/README.md, seção "Importar tarefas no backlog".

export type PrioridadeImportada = 'low' | 'medium' | 'high';

export interface TarefaImportada {
  title: string;
  description: string;
  priority: PrioridadeImportada;
  estimated_hours: number | null;
  projeto_nome: string | null;
  arquivo: string;
  avisos: string[];
  /** Falso quando o próprio arquivo diz que não é para executar; entra desmarcada na revisão. */
  sugerida: boolean;
}

interface ProjetoParaCasar {
  id: string;
  name: string;
}

const CAMPO = /^(prioridade|horas|projeto)\s*:\s*(.*)$/i;
const ITEM_DE_LISTA = /^([-*+]|\d+[.)])\s/;

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function lerPrioridade(valor: string): PrioridadeImportada | null {
  const v = normalizar(valor);
  if (v === 'alta' || v === 'high') return 'high';
  if (v === 'media' || v === 'medium') return 'medium';
  if (v === 'baixa' || v === 'low') return 'low';
  return null;
}

function lerHoras(valor: string): number | null {
  const limpo = valor.trim().replace(/\s*h(oras?)?$/i, '').replace(',', '.');
  const n = Number(limpo);
  return limpo !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

/** Junta linhas quebradas do mesmo parágrafo, como o Markdown; item de lista mantém a linha. */
function juntarParagrafos(linhas: string[]): string {
  const saida: string[] = [];
  let emBranco = false;
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (linha === '') {
      emBranco = saida.length > 0;
      continue;
    }
    if (saida.length === 0) saida.push(linha);
    else if (emBranco) saida.push('', linha);
    else if (ITEM_DE_LISTA.test(linha)) saida.push(linha);
    else saida[saida.length - 1] += ` ${linha}`;
    emBranco = false;
  }
  return saida.join('\n');
}

interface Secao {
  titulo: string;
  linhas: string[];
}

/** Separa por cabeçalho do nível pedido, ignorando `#` dentro de bloco de código. */
function secoes(linhas: string[], nivel: '#' | '##'): Secao[] {
  const prefixo = `${nivel} `;
  const resultado: Secao[] = [];
  let atual: Secao | null = null;
  let emCodigo = false;
  for (const linha of linhas) {
    if (/^\s*(```|~~~)/.test(linha)) emCodigo = !emCodigo;
    if (!emCodigo && linha.startsWith(prefixo)) {
      atual = { titulo: linha.slice(prefixo.length).trim(), linhas: [] };
      resultado.push(atual);
    } else if (atual) {
      atual.linhas.push(linha);
    }
  }
  return resultado;
}

/** Campos `prioridade:`/`horas:`/`projeto:` só valem logo abaixo do título, antes do texto. */
function extrairCampos(linhas: string[]) {
  const campos: Record<string, string> = {};
  let i = 0;
  for (; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (linha === '') continue;
    const m = CAMPO.exec(linha);
    if (!m) break;
    campos[normalizar(m[1])] = m[2].trim();
  }
  return { campos, resto: linhas.slice(i) };
}

function montar(titulo: string, linhas: string[], arquivo: string, descricao: (resto: string[]) => string): TarefaImportada {
  const { campos, resto } = extrairCampos(linhas);
  const avisos: string[] = [];

  let priority: PrioridadeImportada = 'medium';
  if (campos.prioridade) {
    const p = lerPrioridade(campos.prioridade);
    if (p) priority = p;
    else avisos.push(`Prioridade "${campos.prioridade}" não reconhecida; ficou média.`);
  }

  let estimated_hours: number | null = null;
  if (campos.horas) {
    estimated_hours = lerHoras(campos.horas);
    if (estimated_hours === null) avisos.push(`Horas "${campos.horas}" não é um número.`);
  }

  return {
    title: titulo,
    description: descricao(resto),
    priority,
    estimated_hours,
    projeto_nome: campos.projeto || null,
    arquivo,
    avisos,
    sugerida: true,
  };
}

/** Resumo do arquivo de tarefa: o primeiro bloco de citação, ou o primeiro parágrafo. */
function resumoDoArquivo(resto: string[], arquivo: string): string {
  const inicio = resto.findIndex((l) => l.trim() !== '');
  const bloco: string[] = [];
  if (inicio >= 0) {
    const citacao = resto[inicio].trimStart().startsWith('>');
    for (const linha of resto.slice(inicio)) {
      const t = linha.trim();
      if (citacao ? !t.startsWith('>') : t === '' || t.startsWith('#')) break;
      bloco.push((citacao ? t.replace(/^>\s?/, '') : t).replace(/^#+\s+/, ''));
    }
  }
  const resumo = juntarParagrafos(bloco).replace(/\*\*/g, '');
  return [resumo, `Arquivo de origem: ${arquivo}`].filter(Boolean).join('\n\n');
}

// Os títulos variam entre sprints: "TAREFA 1 —", "TAREFA 1:", "TAREFA:", "TAREFA —", "TAREFA Nome".
const PREFIXO_TAREFA = /^TAREFA\b(\s+\d+)?\s*[:—–-]?\s*/i;

/** Arquivo que abre dizendo que foi aposentado não deve entrar marcado. */
function aposentada(linhas: string[]): boolean {
  const topo = linhas.filter((l) => l.trim() !== '').slice(0, 3).join(' ');
  return /APOSENTAD[AO]|N[ÃA]O EXECUTAR/i.test(topo);
}

/** O README de cada pasta de sprint é o índice das tarefas, não uma tarefa. */
export function ehIndiceDaSprint(arquivo: string): boolean {
  return /^readme\.md$/i.test(arquivo);
}

/**
 * Arquivo com `# ` no topo é UMA tarefa (os `TAREFA_*.md` de docs/sprints); sem `# `,
 * cada `## ` é uma tarefa. Os `TAREFA_*.md` têm seções `##`, por isso o `#` decide.
 */
export function lerArquivoDeTarefas(arquivo: string, texto: string): TarefaImportada[] {
  if (ehIndiceDaSprint(arquivo)) return [];
  const linhas = texto.replace(/\r\n?/g, '\n').split('\n');

  const [principal] = secoes(linhas, '#');
  if (principal) {
    const semPrefixo = principal.titulo.replace(PREFIXO_TAREFA, '') || principal.titulo;
    const titulo = semPrefixo.charAt(0).toUpperCase() + semPrefixo.slice(1);
    const tarefa = montar(titulo, principal.linhas, arquivo, (resto) => resumoDoArquivo(resto, arquivo));
    if (!aposentada(principal.linhas)) return [tarefa];
    return [{ ...tarefa, sugerida: false, avisos: [...tarefa.avisos, 'O arquivo diz que esta tarefa foi aposentada.'] }];
  }

  return secoes(linhas, '##')
    .filter((s) => s.titulo !== '')
    .map((s) => montar(s.titulo, s.linhas, arquivo, juntarParagrafos));
}

/** Diz se um título já está no backlog, sem diferenciar acento, caixa e espaço nas pontas. */
export function verificadorDeDuplicada(titulosNoBacklog: string[]): (titulo: string) => boolean {
  const existentes = new Set(titulosNoBacklog.map(normalizar));
  return (titulo) => existentes.has(normalizar(titulo));
}

/** Casa o nome escrito no arquivo com um projeto cadastrado, sem diferenciar acento e caixa. */
export function casarProjeto(nome: string | null, projetos: ProjetoParaCasar[]): string | null {
  if (!nome) return null;
  const alvo = normalizar(nome);
  return projetos.find((p) => normalizar(p.name) === alvo)?.id ?? null;
}
