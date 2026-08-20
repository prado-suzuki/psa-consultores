import { escapeCsv } from '@/lib/auditProdutividade';

/**
 * Agregação do registro de acesso a documento, por usuário e por documento.
 *
 * Pura de propósito: só mapas e conjuntos, zero React e zero banco. É o que
 * permite testar a conta sem invólucro e sem simular Supabase.
 *
 * O molde é `auditProdutividade.ts`, mas nada dela é reaproveitado além do
 * escapador de CSV: lá a unidade é hora apontada, aqui é evento de acesso.
 */

/** Valor gravado por `registrar_download_documento` quando é download de fato. */
export const ACAO_DOWNLOAD = 'download';

/** Balde das linhas sem autor identificado — ver `nomeDoUsuario`. */
export const SEM_USUARIO = 'sem-usuario';

/**
 * Os dois únicos valores que a coluna `papel` recebe.
 *
 * Não é o cargo da pessoa e nem tenta ser: é o ramo da guarda que autorizou o
 * acesso — `equipe` quando passou por papel de equipe com o cliente no escopo,
 * `cliente` quando passou como representante do próprio cliente. Um líder e um
 * membro comum gravam os dois `equipe`. Quem quer o cargo olha a aba Pessoas.
 *
 * Mora aqui, e não no componente, para a tela e o CSV nunca divergirem de
 * vocabulário — foi exatamente o que aconteceu na primeira versão.
 */
const PAPEL_LABEL: Record<string, string> = {
  equipe: 'Equipe',
  cliente: 'Portal do cliente',
};

/** Rótulo da origem do acesso, caindo no valor cru se aparecer um valor novo. */
export function rotuloOrigem(papel: string): string {
  return PAPEL_LABEL[papel] ?? papel;
}

/**
 * Uma linha do registro, do jeito que o hook a entrega.
 *
 * `documento` e `cliente` são embutidos e podem vir `null`: a política de leitura
 * da `documento_download` exige apenas que o cliente seja visível, enquanto a do
 * `documento_arquivo` exige também que ele não esteja excluído. Documento apagado
 * depois do acesso deixa a linha do acesso visível e o embutido vazio, e é
 * exatamente esse acesso que a auditoria não pode perder de vista.
 */
export interface LinhaDownload {
  id: string;
  documento_id: string;
  /** `auth.uid()` congelado pela função. Sem chave estrangeira, por desenho. */
  baixado_por: string | null;
  /** Papel no momento do evento, congelado. Não reflete o papel de hoje. */
  papel: string | null;
  /** Texto livre no banco, nunca enum aqui: hoje só `download`. */
  acao: string;
  baixado_em: string;
  documento: { nome_original: string; categoria: string | null } | null;
  cliente: { nome: string } | null;
}

export interface LinhaPorUsuario {
  usuarioId: string;
  nome: string;
  /** Papéis vistos no período, já que o papel é congelado por evento. */
  papeis: string[];
  downloads: number;
  /** Ações que não são download. Contadas à parte para não inflar a coluna. */
  outrasAcoes: number;
  documentosDistintos: number;
  ultimoEm: string;
}

export interface LinhaPorDocumento {
  documentoId: string;
  /** `null` quando a segurança de linha esconde o documento de quem consulta. */
  nome: string | null;
  cliente: string | null;
  downloads: number;
  outrasAcoes: number;
  usuariosDistintos: number;
  ultimoEm: string;
}

/**
 * Instante mais recente entre dois, comparando string.
 *
 * `baixado_em` chega sempre no mesmo formato ISO em UTC, então ordem
 * lexicográfica é ordem cronológica. Nenhum `Date` é construído aqui: a função
 * não lê relógio nem fuso, e é isso que mantém o teste determinístico.
 */
function maisRecente(a: string, b: string): string {
  return a > b ? a : b;
}

/** Nome legível de quem baixou, sem nunca esconder a linha por falta de nome. */
export function nomeDoUsuario(
  usuarioId: string,
  nomesPorUsuario: Record<string, string>,
): string {
  if (usuarioId === SEM_USUARIO) return 'Não identificado';
  // Cai no identificador em vez de "desconhecido": quem audita precisa de algo
  // que dê para procurar, e perfil fora da lista visível é caso real.
  return nomesPorUsuario[usuarioId] || usuarioId;
}

interface AcumuladorUsuario {
  papeis: Set<string>;
  downloads: number;
  outrasAcoes: number;
  documentos: Set<string>;
  ultimoEm: string;
}

/** Quem baixou, quantas vezes, quantos documentos distintos e quando foi a última. */
export function agregarPorUsuario(
  linhas: LinhaDownload[],
  nomesPorUsuario: Record<string, string>,
): LinhaPorUsuario[] {
  const acc = new Map<string, AcumuladorUsuario>();

  for (const linha of linhas) {
    const chave = linha.baixado_por ?? SEM_USUARIO;
    const atual = acc.get(chave) ?? {
      papeis: new Set<string>(),
      downloads: 0,
      outrasAcoes: 0,
      documentos: new Set<string>(),
      ultimoEm: linha.baixado_em,
    };

    if (linha.acao === ACAO_DOWNLOAD) atual.downloads += 1;
    else atual.outrasAcoes += 1;
    if (linha.papel) atual.papeis.add(linha.papel);
    atual.documentos.add(linha.documento_id);
    atual.ultimoEm = maisRecente(atual.ultimoEm, linha.baixado_em);
    acc.set(chave, atual);
  }

  return [...acc.entries()]
    .map(([usuarioId, dados]) => ({
      usuarioId,
      nome: nomeDoUsuario(usuarioId, nomesPorUsuario),
      papeis: [...dados.papeis].sort(),
      downloads: dados.downloads,
      outrasAcoes: dados.outrasAcoes,
      documentosDistintos: dados.documentos.size,
      ultimoEm: dados.ultimoEm,
    }))
    // Mais downloads primeiro; empate desce para o acesso mais recente e depois
    // para o nome, para a ordem não variar entre duas renderizações iguais.
    .sort((a, b) =>
      b.downloads - a.downloads
      || b.ultimoEm.localeCompare(a.ultimoEm)
      || a.nome.localeCompare(b.nome, 'pt-BR'));
}

interface AcumuladorDocumento {
  nome: string | null;
  cliente: string | null;
  downloads: number;
  outrasAcoes: number;
  usuarios: Set<string>;
  ultimoEm: string;
}

/** O que foi baixado, quantas vezes e por quantas pessoas diferentes. */
export function agregarPorDocumento(linhas: LinhaDownload[]): LinhaPorDocumento[] {
  const acc = new Map<string, AcumuladorDocumento>();

  for (const linha of linhas) {
    const atual = acc.get(linha.documento_id) ?? {
      nome: null,
      cliente: null,
      downloads: 0,
      outrasAcoes: 0,
      usuarios: new Set<string>(),
      ultimoEm: linha.baixado_em,
    };

    // O embutido pode faltar em algumas linhas do mesmo documento e vir em
    // outras; a primeira que trouxer nome manda, e a ausência nunca apaga.
    atual.nome = atual.nome ?? linha.documento?.nome_original ?? null;
    atual.cliente = atual.cliente ?? linha.cliente?.nome ?? null;
    if (linha.acao === ACAO_DOWNLOAD) atual.downloads += 1;
    else atual.outrasAcoes += 1;
    atual.usuarios.add(linha.baixado_por ?? SEM_USUARIO);
    atual.ultimoEm = maisRecente(atual.ultimoEm, linha.baixado_em);
    acc.set(linha.documento_id, atual);
  }

  return [...acc.entries()]
    .map(([documentoId, dados]) => ({
      documentoId,
      nome: dados.nome,
      cliente: dados.cliente,
      downloads: dados.downloads,
      outrasAcoes: dados.outrasAcoes,
      usuariosDistintos: dados.usuarios.size,
      ultimoEm: dados.ultimoEm,
    }))
    .sort((a, b) =>
      b.downloads - a.downloads
      || b.ultimoEm.localeCompare(a.ultimoEm)
      // Documento sem nome legível desempata pelo id, que sempre existe.
      || (a.nome ?? a.documentoId).localeCompare(b.nome ?? b.documentoId, 'pt-BR'));
}

/** Separador do CSV pt-BR, igual ao das outras abas de auditoria. */
const SEP = ';';

const CABECALHO_CSV_USUARIO = [
  'usuario', 'usuario_id', 'origem_do_acesso', 'downloads', 'outras_acoes',
  'documentos_distintos', 'ultimo_acesso',
];

/** CSV da visão por usuário, na mesma ordem em que a tabela mostra. */
export function buildDownloadsPorUsuarioCsv(linhas: LinhaPorUsuario[]): string {
  const saida = [CABECALHO_CSV_USUARIO.join(SEP)];

  for (const linha of linhas) {
    saida.push([
      escapeCsv(linha.nome),
      linha.usuarioId,
      // Mesmo rótulo da tela: quem abre o CSV não deve encontrar outro
      // vocabulário para a mesma coisa.
      escapeCsv(linha.papeis.map(rotuloOrigem).join(', ')),
      String(linha.downloads),
      String(linha.outrasAcoes),
      String(linha.documentosDistintos),
      linha.ultimoEm,
    ].join(SEP));
  }

  return saida.join('\n');
}

const CABECALHO_CSV_DOCUMENTO = [
  'documento', 'documento_id', 'cliente', 'downloads', 'outras_acoes',
  'usuarios_distintos', 'ultimo_acesso',
];

/** CSV da visão por documento, na mesma ordem em que a tabela mostra. */
export function buildDownloadsPorDocumentoCsv(linhas: LinhaPorDocumento[]): string {
  const saida = [CABECALHO_CSV_DOCUMENTO.join(SEP)];

  for (const linha of linhas) {
    saida.push([
      escapeCsv(linha.nome ?? ''),
      linha.documentoId,
      escapeCsv(linha.cliente ?? ''),
      String(linha.downloads),
      String(linha.outrasAcoes),
      String(linha.usuariosDistintos),
      linha.ultimoEm,
    ].join(SEP));
  }

  return saida.join('\n');
}
