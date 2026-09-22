/**
 * Regras puras da fala nova escrita de dentro do feed: para ONDE ela vai, o que
 * cai quando se troca de cliente ou de projeto, quais menções podem ir junto e
 * se o que acabou de ser publicado cabe no recorte que está na tela.
 *
 * O feed sempre soube responder; começar assunto obrigava a sair dele, achar a
 * tarefa e abrir o painel. O que muda com o compositor é que o destino passa a
 * ser ESCOLHIDO — e escolher destino tem regra, que é o que mora aqui, longe do
 * React e do banco.
 *
 * A gravação continua sendo a mesma de sempre (`useDomainOrgComments.createComment`):
 * este arquivo só resolve qual entidade recebe a fala.
 */

import type { OrgCommentEntityType } from '@/hooks/useDomainOrgComments';
import { textoCasaBusca, type FeedFiltros, type ProjetoDoFiltro } from '@/lib/feedFiltros';

/**
 * O que a pessoa escolheu no compositor.
 *
 * O cliente não é destino: ele existe para encurtar a lista de projetos, do
 * mesmo jeito que faz na barra de filtros. Quem recebe a fala é o projeto ou a
 * tarefa.
 */
export interface DestinoDaFala {
  clienteId: string | null;
  projetoId: string | null;
  /** Nulo publica NO PROJETO — é o aviso que não pertence a nenhuma tarefa. */
  tarefaId: string | null;
}

export const DESTINO_VAZIO: DestinoDaFala = {
  clienteId: null,
  projetoId: null,
  tarefaId: null,
};

/** A entidade que recebe a fala, no formato que a mutation de comentário pede. */
export interface AlvoDaFala {
  entityType: OrgCommentEntityType;
  entityId: string;
  /** Sempre o projeto, mesmo quando a fala é de tarefa: é ele que carimba o anexo. */
  projectId: string;
}

/**
 * Traduz a escolha em entidade. Sem projeto não há destino — e é por isso que o
 * compositor não deixa escrever antes de escolher um.
 */
export function alvoDoDestino(destino: DestinoDaFala): AlvoDaFala | null {
  if (!destino.projetoId) return null;
  return destino.tarefaId
    ? { entityType: 'org_task', entityId: destino.tarefaId, projectId: destino.projetoId }
    : { entityType: 'org_project', entityId: destino.projetoId, projectId: destino.projetoId };
}

/**
 * Troca o cliente do destino.
 *
 * Projeto de outro cliente cai, e a tarefa cai junto com ele: tarefa é filha do
 * projeto, e deixá-la de pé apontaria a fala para uma tarefa que não pertence
 * mais ao que está escolhido na tela.
 *
 * Projeto fora da lista é PRESERVADO, pelo mesmo motivo de `aoTrocarDeCliente`
 * nos filtros: a lista é uma query e pode não ter chegado.
 */
export function aoEscolherCliente(
  destino: DestinoDaFala,
  clienteId: string | null,
  projetos: ProjetoDoFiltro[],
): DestinoDaFala {
  if (!clienteId || !destino.projetoId) return { ...destino, clienteId };

  const projeto = projetos.find((candidato) => candidato.id === destino.projetoId);
  const deOutroCliente = projeto !== undefined && projeto.external_client_id !== clienteId;
  if (!deOutroCliente) return { ...destino, clienteId };
  return { clienteId, projetoId: null, tarefaId: null };
}

/**
 * Troca o projeto. A tarefa escolhida era de outro projeto, então cai.
 *
 * O projeto também PREENCHE o cliente: escolhido "Consultoria contábil", o campo
 * de cliente vazio deixava na tela um destino que não se lê — o nome do projeto
 * se repete entre clientes, e é justamente o cliente que diz qual deles é. Com o
 * cliente resolvido, a lista de projetos já abre recortada nele.
 *
 * Projeto cujo cliente vem da ordem de serviço não tem o que preencher e mantém
 * o que estava (ver `useDomainFeedClientes` para as duas formas do vínculo).
 */
export function aoEscolherProjeto(
  destino: DestinoDaFala,
  projetoId: string | null,
  projetos: ProjetoDoFiltro[] = [],
): DestinoDaFala {
  if (projetoId === destino.projetoId) return destino;
  if (!projetoId) return { ...destino, projetoId: null, tarefaId: null };

  const projeto = projetos.find((candidato) => candidato.id === projetoId);
  return {
    clienteId: projeto?.external_client_id ?? destino.clienteId,
    projetoId,
    tarefaId: null,
  };
}

/**
 * O destino com que o compositor abre: o que os filtros do feed já disseram.
 *
 * Quem está lendo o feed recortado num cliente quase sempre vai escrever para
 * ele. O projeto do filtro também traz o cliente dele junto, senão a lista de
 * projetos abriria com a casa inteira enquanto um projeto já está escolhido.
 *
 * A tarefa nunca vem daqui: o feed não tem filtro de tarefa, e adivinhar uma
 * seria escolher destino no lugar da pessoa.
 */
export function destinoDosFiltros(
  filtros: FeedFiltros,
  projetos: ProjetoDoFiltro[],
): DestinoDaFala {
  if (filtros.projetoId) {
    const projeto = projetos.find((candidato) => candidato.id === filtros.projetoId);
    return {
      clienteId: filtros.clienteId ?? projeto?.external_client_id ?? null,
      projetoId: filtros.projetoId,
      tarefaId: null,
    };
  }
  return { ...DESTINO_VAZIO, clienteId: filtros.clienteId };
}

/**
 * As menções que podem ir para o banco.
 *
 * O texto sobrevive à troca de projeto (perder um rascunho por mudar o destino
 * seria pior), então o documento pode carregar a menção a alguém que só estava
 * na roda do projeto ANTERIOR. Notificar essa pessoa entregaria a ela o título
 * de uma tarefa de um projeto em que ela não está — o mesmo vazamento que o
 * `useDomainMentionCandidates` existe para impedir.
 *
 * O chip fica no texto, visível a quem vê o comentário; o que não sai daqui é a
 * notificação.
 */
export function mencoesPermitidas(mencoes: string[], candidatos: { id: string }[]): string[] {
  const permitidos = new Set(candidatos.map((candidato) => candidato.id));
  return mencoes.filter((id) => permitidos.has(id));
}

/** A fala recém-publicada, do ponto de vista do recorte que está na tela. */
export interface FalaPublicada {
  projetoId: string;
  /**
   * Cliente do projeto, quando se sabe. NULO É "NÃO SEI", não "sem cliente": o
   * vínculo também pode vir da ordem de serviço (ver `useDomainFeedClientes`), e
   * o compositor conhece só o `external_client_id`.
   */
  clienteId: string | null;
  /** Quem escreveu — neste caminho é sempre quem está lendo o feed. */
  autorId: string | null;
  mencionados: string[];
  /**
   * O texto da fala, já sem a marcação do editor. Só interessa à busca: é o
   * único filtro que olha o CONTEÚDO do que acabou de ser escrito, e não o
   * cadastro em volta dele.
   */
  texto: string;
}

/**
 * A fala vai aparecer no feed como ele está filtrado agora?
 *
 * O feed é cronológico e a fala nasce no topo — mas no topo do feed SEM recorte.
 * Publicar para outro cliente enquanto se lê o recorte de um deles some com a
 * fala na hora, e o "Ver no topo" levaria a lugar nenhum. Daí a pergunta.
 *
 * A dúvida sempre responde SIM: dizer "publicado, mas fora do recorte" quando a
 * fala está ali é pior do que não avisar nada — o aviso mandaria a pessoa
 * limpar um filtro que não estava atrapalhando.
 *
 * Período fica de fora de propósito: o recorte só tem piso, e a fala acabou de
 * nascer.
 */
export function falaCabeNoRecorte(filtros: FeedFiltros, fala: FalaPublicada): boolean {
  if (filtros.projetoId && filtros.projetoId !== fala.projetoId) return false;
  if (filtros.clienteId && fala.clienteId && filtros.clienteId !== fala.clienteId) return false;
  if (filtros.autorId && filtros.autorId !== fala.autorId) return false;
  if (filtros.apenasMencoes && !(fala.autorId && fala.mencionados.includes(fala.autorId))) {
    return false;
  }
  if (!textoCasaBusca(fala.texto, filtros.busca)) return false;
  return true;
}
