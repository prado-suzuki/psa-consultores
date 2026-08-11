/**
 * Regras puras do aviso "documentos solicitados ao cliente".
 *
 * Quando a equipe envia a lista de documentos, o registro para a equipe é uma
 * mensagem de sistema na thread do projeto. Só que a solicitação não conhece
 * projeto: ela tem cliente e ordem de servico. Descobrir o projeto e o que este
 * arquivo faz, sem React e sem Supabase.
 *
 * A precedencia e a mesma que a visao do feed ja aplica
 * (`20260730151500_feed_org_comments_filtros.sql`, linhas 39-42), aqui invertida
 * porque a solicitacao parte da ordem de servico.
 */

/** A solicitacao na fatia que a resolucao usa. */
export interface SolicitacaoParaAviso {
  cliente_id: string;
  /** Nulo e caso previsto: `Onboarding.tsx` abre solicitacao sem OS. */
  ordem_servico_id: string | null;
}

/** Projeto candidato, na fatia que a resolucao compara. */
export interface ProjetoCandidato {
  id: string;
  ordem_servico_id: string | null;
  external_client_id: string | null;
}

/**
 * O projeto em cuja thread a mensagem entra, ou `null` para nao publicar.
 *
 * Ordem: primeiro o projeto cuja ordem de servico e a da solicitacao; na falta
 * dele, ou quando a ordem e nula, o projeto cujo cliente externo e o cliente da
 * solicitacao. Zero ou mais de um em qualquer dos dois caminhos devolve `null`.
 *
 * `null` NAO e erro: e o caminho previsto para solicitacao que nao tem thread
 * onde escrever, e quem chama tem de sair em silencio. Hoje esse e o caminho de
 * todas as solicitacoes, porque `org_projects` e estrutura do Tax e a solicitacao
 * e fluxo da OSG; passa a resolver quando a OSG tiver projetos.
 *
 * Mais de um nao cai para o caminho seguinte, devolve `null` direto: escolher
 * "o primeiro que vier" seria publicar na thread errada, e uma mensagem no lugar
 * errado e pior que mensagem nenhuma.
 */
export function resolverProjetoDoAviso(
  solicitacao: SolicitacaoParaAviso,
  candidatos: ProjetoCandidato[],
): string | null {
  if (solicitacao.ordem_servico_id) {
    const porOrdemServico = candidatos.filter(
      (projeto) => projeto.ordem_servico_id === solicitacao.ordem_servico_id,
    );
    if (porOrdemServico.length === 1) return porOrdemServico[0].id;
    if (porOrdemServico.length > 1) return null;
  }

  const porCliente = candidatos.filter(
    (projeto) => projeto.external_client_id === solicitacao.cliente_id,
  );
  return porCliente.length === 1 ? porCliente[0].id : null;
}

/**
 * Corpo da mensagem de sistema.
 *
 * O rotulo "Documentos solicitados ao cliente" vem do mapa de eventos de sistema
 * do painel de comentarios, entao o corpo nao repete o rotulo: ele diz o que
 * mudou para quem le a thread depois.
 */
export function mensagemDoAviso(): string {
  return 'Lista de documentos enviada ao cliente. O acesso ao portal foi liberado.';
}
