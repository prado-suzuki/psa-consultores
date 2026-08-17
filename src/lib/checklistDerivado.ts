import type { DocFonte, DocRevisao } from '@/hooks/useDocumentoArquivo';
import type { Alvo } from '@/lib/classificarFicha';
import type { Granularidade, ItemSolicitacao } from '@/lib/solicitacao';

/**
 * O checklist do consultor, DERIVADO. Nada aqui é persistido.
 *
 * A conta (docs/planos/checklist-por-subtracao.md §2):
 *
 *   esperado = solicitacao_item ativo × instâncias do cliente no grão do item
 *   recebido = documento_arquivo com (documento_tipo_id, dono) = (tipo do item, instância)
 *   não se aplica = linha em solicitacao_item_nao_aplicavel (item, instância)
 *   falta = o resto
 *
 * Por que derivar em vez de gerar linhas: `checklist_cliente_item` materializava
 * o esperado e cobrava manutenção eterna (cliente ganha uma pessoa, alguém tem
 * de reexecutar o gerador; item sai da solicitação, a linha fica). Derivado, o
 * checklist não pode divergir do que foi pedido.
 */

/** O agrupador da tela: um card por instância, agrupado pelo tipo dela. */
export type ClusterChecklist =
  | 'pessoa_pf'
  | 'pessoa_pj'
  | 'imovel_rural'
  | 'imovel_urbano'
  | 'bem'
  | 'cliente';

export const CLUSTER_DO_GRAO: Record<Granularidade, ClusterChecklist> = {
  pessoa_pf: 'pessoa_pf',
  pessoa_pj: 'pessoa_pj',
  matricula_rural: 'imovel_rural',
  matricula_urbana: 'imovel_urbano',
  bem: 'bem',
  cliente: 'cliente',
};

/** Uma entidade concreta do cliente (ou o próprio cliente, no grão agregado). */
export interface InstanciaChecklist {
  /** Chave estável, usada para agrupar e para casar arquivo com instância. */
  chave: string;
  alvo: Alvo;
  cluster: ClusterChecklist;
  /** O nome que vai no card. */
  label: string;
  /** Desambiguação secundária (o número da matrícula, quando o imóvel tem nome). */
  detalhe: string | null;
}

export type StatusChecklist = 'recebido' | 'pendente' | 'nao_aplicavel' | 'dispensado';

/**
 * Um arquivo que responde por uma linha.
 *
 * O recusado continua aqui: ele não conta como recebido (ver `derivarChecklist`),
 * mas some da tela seria pior — o consultor precisa ver o que já voltou, e o
 * cliente precisa do motivo. Quem separa um do outro é `revisao`.
 */
export interface ArquivoDaLinha {
  id: string;
  nome: string;
  revisao: DocRevisao;
  motivo: string | null;
  /** Só o que veio do cliente é revisável; o que a PSA subiu não se aprova. */
  fonte: DocFonte;
}

/** Uma linha do checklist: um documento pedido, para uma entidade. */
export interface LinhaChecklist {
  /** `${itemId}|${instancia.chave}`, estável entre renders. */
  chave: string;
  itemId: string;
  documento: string;
  nota: string | null;
  ordem: number;
  granularidade: Granularidade;
  doCatalogo: boolean;
  confidencial: boolean;
  instancia: InstanciaChecklist;
  status: StatusChecklist;
  /**
   * O tipo que casa arquivo com item: o do catálogo, ou o avulso do item manual.
   *
   * Nulo é possível e visível: item pedido à mão que não tem linha em
   * `documento_tipo` (avulso não gerado) nunca pode ser dado como recebido, e a
   * tela mostra isso em vez de deixar a pendência inexplicada.
   */
  documentoTipoId: string | null;
  arquivos: ArquivoDaLinha[];
}

/* ------------------------------------------------------------- instâncias */

/** O que a derivação precisa de uma pessoa. */
export interface PessoaInstancia {
  id: string;
  denominacao: string | null;
  tipo_pessoa: string | null;
}

/** O que a derivação precisa de um bem. */
export interface BemInstancia {
  id: string;
  referencia_dp: string | null;
  denominacao: string | null;
}

/** O que a derivação precisa de uma matrícula (já filtrada por cliente). */
export interface MatriculaInstancia {
  id: string;
  numero: string | null;
  tipo_bem: string | null;
  bem_denominacao: string | null;
  bem_referencia: string | null;
}

/** A instância do grão agregado: o cliente inteiro, arquivo sem dono. */
export const INSTANCIA_CLIENTE: InstanciaChecklist = {
  chave: 'cliente',
  alvo: { kind: 'cliente' },
  cluster: 'cliente',
  label: 'Documentos do cliente',
  detalhe: null,
};

const chaveDoAlvo = (alvo: Alvo): string =>
  alvo.kind === 'cliente' ? 'cliente' : `${alvo.kind}:${alvo.id}`;

/**
 * As instâncias do cliente, no vocabulário da tela.
 *
 * Rural é `tipo_bem = 'IR'`, mesma regra do gerador antigo. Matrícula sem
 * `tipo_bem` cai em urbana, como caía antes: preservar a peculiaridade evita que
 * a troca de lógica mexa em qual card o documento aparece.
 */
export function montarInstancias(entrada: {
  pessoas: readonly PessoaInstancia[];
  bens: readonly BemInstancia[];
  matriculas: readonly MatriculaInstancia[];
}): InstanciaChecklist[] {
  const instancias: InstanciaChecklist[] = [INSTANCIA_CLIENTE];

  for (const pessoa of entrada.pessoas) {
    instancias.push({
      chave: `pessoa:${pessoa.id}`,
      alvo: { kind: 'pessoa', id: pessoa.id },
      cluster: pessoa.tipo_pessoa === 'PJ' ? 'pessoa_pj' : 'pessoa_pf',
      label: pessoa.denominacao?.trim() || 'Pessoa sem nome',
      detalhe: null,
    });
  }

  for (const bem of entrada.bens) {
    instancias.push({
      chave: `bem:${bem.id}`,
      alvo: { kind: 'bem', id: bem.id },
      cluster: 'bem',
      label: [bem.referencia_dp, bem.denominacao].filter(Boolean).join(' · ') || 'Bem sem descrição',
      detalhe: null,
    });
  }

  for (const matricula of entrada.matriculas) {
    const imovel = matricula.bem_denominacao?.trim() || matricula.bem_referencia?.trim() || null;
    const numero = matricula.numero?.trim() || null;
    instancias.push({
      chave: `matricula:${matricula.id}`,
      alvo: { kind: 'matricula', id: matricula.id },
      cluster: matricula.tipo_bem === 'IR' ? 'imovel_rural' : 'imovel_urbano',
      label: imovel ?? (numero ? `Matrícula ${numero}` : 'Imóvel sem identificação'),
      detalhe: imovel && numero ? `Matrícula ${numero}` : null,
    });
  }

  return instancias;
}

/* ------------------------------------------------------------- derivação */

/** O arquivo, do jeito que a subtração o lê. */
export interface ArquivoClassificado {
  id: string;
  nome_original: string;
  documento_tipo_id: string | null;
  pessoa_id: string | null;
  bem_id: string | null;
  matricula_id: string | null;
  revisao: DocRevisao;
  revisao_motivo: string | null;
  fonte: DocFonte;
}

/** A marca de "não se aplica a esta entidade". */
export interface MarcaNaoAplicavel {
  solicitacao_item_id: string;
  pessoa_id: string | null;
  bem_id: string | null;
  matricula_id: string | null;
}

export interface EntradaChecklist {
  itens: readonly ItemSolicitacao[];
  instancias: readonly InstanciaChecklist[];
  arquivos: readonly ArquivoClassificado[];
  naoAplicaveis: readonly MarcaNaoAplicavel[];
  /** id do item manual → id do tipo avulso (migration 20260807150000). */
  avulsoPorItem: Readonly<Record<string, string>>;
}

/** A chave do dono de um arquivo ou de uma marca, no vocabulário das instâncias. */
const chaveDoDono = (linha: {
  pessoa_id: string | null;
  bem_id: string | null;
  matricula_id: string | null;
}): string => {
  if (linha.pessoa_id) return `pessoa:${linha.pessoa_id}`;
  if (linha.bem_id) return `bem:${linha.bem_id}`;
  if (linha.matricula_id) return `matricula:${linha.matricula_id}`;
  return 'cliente';
};

/**
 * As linhas do checklist, uma por (item ativo ou dispensado) × instância do grão.
 *
 * Item dispensado entra: ele é rastro do que o analista tirou do pedido, e a tela
 * o mostra entre os encerrados. Quem esconde dispensado é a leitura do CLIENTE
 * (a RPC), não a do consultor.
 */
export function derivarChecklist(entrada: EntradaChecklist): LinhaChecklist[] {
  const porCluster = new Map<ClusterChecklist, InstanciaChecklist[]>();
  for (const instancia of entrada.instancias) {
    const atuais = porCluster.get(instancia.cluster) ?? [];
    atuais.push(instancia);
    porCluster.set(instancia.cluster, atuais);
  }

  // Índices por (tipo|dono) e (item|dono): a derivação é O(itens × instâncias),
  // e uma varredura de arquivos dentro dela seria o cubo.
  const arquivosPorChave = new Map<string, ArquivoDaLinha[]>();
  for (const arquivo of entrada.arquivos) {
    if (!arquivo.documento_tipo_id) continue;
    const chave = `${arquivo.documento_tipo_id}|${chaveDoDono(arquivo)}`;
    const atuais = arquivosPorChave.get(chave) ?? [];
    atuais.push({
      id: arquivo.id,
      nome: arquivo.nome_original,
      revisao: arquivo.revisao,
      motivo: arquivo.revisao_motivo,
      fonte: arquivo.fonte,
    });
    arquivosPorChave.set(chave, atuais);
  }

  const naoAplicaveis = new Set(
    entrada.naoAplicaveis.map((marca) => `${marca.solicitacao_item_id}|${chaveDoDono(marca)}`),
  );

  const linhas: LinhaChecklist[] = [];
  for (const item of entrada.itens) {
    const documentoTipoId = item.itemPadraoId ?? entrada.avulsoPorItem[item.id] ?? null;
    for (const instancia of porCluster.get(CLUSTER_DO_GRAO[item.granularidade]) ?? []) {
      const arquivos = documentoTipoId
        ? arquivosPorChave.get(`${documentoTipoId}|${instancia.chave}`) ?? []
        : [];
      // Recusado não fecha linha: a pendência volta a faltar, e é essa volta que
      // o consultor vê na tela dele e o cliente vê no botão de envio reaberto.
      const valem = arquivos.some((arquivo) => arquivo.revisao !== 'recusado');
      const status: StatusChecklist = item.status === 'dispensado'
        ? 'dispensado'
        : naoAplicaveis.has(`${item.id}|${chaveDoAlvo(instancia.alvo)}`)
          ? 'nao_aplicavel'
          : valem
            ? 'recebido'
            : 'pendente';

      linhas.push({
        chave: `${item.id}|${instancia.chave}`,
        itemId: item.id,
        documento: item.documento,
        nota: item.nota,
        ordem: item.ordem,
        granularidade: item.granularidade,
        doCatalogo: item.doCatalogo,
        confidencial: item.confidencial,
        instancia,
        status,
        documentoTipoId,
        arquivos,
      });
    }
  }

  return linhas.sort((esquerda, direita) =>
    esquerda.ordem - direita.ordem
    || esquerda.documento.localeCompare(direita.documento, 'pt-BR'));
}

/* ------------------------------------------------------------- agregações */

export interface ResumoChecklist {
  recebidos: number;
  pendentes: number;
  encerrados: number;
  /** Recebidos + pendentes. Encerrado (dispensado, não aplicável) fica fora. */
  base: number;
  pct: number;
}

/**
 * O progresso de um conjunto de linhas.
 *
 * "Encerrado" sai da base de propósito: documento que não se aplica ao João não é
 * pendência dele, e contá-lo faria o percentual nunca chegar a 100 num cliente
 * cuja coleta está de fato completa.
 */
export function resumirChecklist(linhas: readonly LinhaChecklist[]): ResumoChecklist {
  let recebidos = 0;
  let pendentes = 0;
  let encerrados = 0;
  for (const linha of linhas) {
    if (linha.status === 'recebido') recebidos += 1;
    else if (linha.status === 'pendente') pendentes += 1;
    else encerrados += 1;
  }
  const base = recebidos + pendentes;
  return { recebidos, pendentes, encerrados, base, pct: base ? Math.round((recebidos / base) * 100) : 0 };
}

/** Um card da tela: a instância e as linhas dela. */
export interface GrupoChecklist {
  chave: string;
  instancia: InstanciaChecklist;
  linhas: LinhaChecklist[];
}

const ORDEM_CLUSTER: ClusterChecklist[] = [
  'pessoa_pf', 'pessoa_pj', 'imovel_rural', 'imovel_urbano', 'bem', 'cliente',
];

/**
 * Agrupa as linhas por instância, com quem tem pendência na frente.
 *
 * Instância sem nenhuma linha não vira card: pessoa cadastrada a quem a
 * solicitação não pediu nada não é pendência, é só cadastro.
 */
export function agruparPorInstancia(linhas: readonly LinhaChecklist[]): GrupoChecklist[] {
  const grupos = new Map<string, GrupoChecklist>();
  for (const linha of linhas) {
    const existente = grupos.get(linha.instancia.chave);
    if (existente) existente.linhas.push(linha);
    else grupos.set(linha.instancia.chave, {
      chave: linha.instancia.chave,
      instancia: linha.instancia,
      linhas: [linha],
    });
  }

  return [...grupos.values()].sort((esquerda, direita) => {
    const clusterA = ORDEM_CLUSTER.indexOf(esquerda.instancia.cluster);
    const clusterB = ORDEM_CLUSTER.indexOf(direita.instancia.cluster);
    if (clusterA !== clusterB) return clusterA - clusterB;
    const pendenteA = esquerda.linhas.some((linha) => linha.status === 'pendente');
    const pendenteB = direita.linhas.some((linha) => linha.status === 'pendente');
    if (pendenteA !== pendenteB) return pendenteA ? -1 : 1;
    return esquerda.instancia.label.localeCompare(direita.instancia.label, 'pt-BR');
  });
}

/**
 * Arquivos ativos que a subtração não consegue ver, por não terem tipo.
 *
 * `documento_arquivo.documento_tipo_id` existe desde 07/08/2026: tudo o que
 * entrou antes tem nulo e não fecha pendência nenhuma. A tela avisa em vez de
 * apresentar a conta como completa (docs/planos/checklist-por-subtracao.md §3).
 */
export const contarArquivosSemTipo = (arquivos: readonly ArquivoClassificado[]): number =>
  arquivos.filter((arquivo) => !arquivo.documento_tipo_id).length;
