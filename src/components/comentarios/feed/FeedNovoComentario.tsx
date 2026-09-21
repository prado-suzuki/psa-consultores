import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { CommentComposer } from '@/components/comentarios/CommentComposer';
import { EscolherDestinoDaFala } from '@/components/comentarios/feed/EscolherDestinoDaFala';
import { useAuth } from '@/contexts/AuthContext';
import { feedComentariosQueryKeyPrefix } from '@/hooks/useDomainFeedComentarios';
import {
  mentionCandidatesQueryOptions,
  useDomainMentionCandidates,
} from '@/hooks/useDomainMentionCandidates';
import { useDomainOrgComments } from '@/hooks/useDomainOrgComments';
import { useExternalClients, useOrgProjectsForFilter } from '@/hooks/useTaxReferenceData';
import type { AreaDeProjetos } from '@/lib/feedComentarios';
import {
  alvoDoDestino,
  destinoDosFiltros,
  DESTINO_VAZIO,
  falaCabeNoRecorte,
  mencoesPermitidas,
  type DestinoDaFala,
} from '@/lib/feedDestino';
import type { FeedFiltros } from '@/lib/feedFiltros';

interface FeedNovoComentarioProps {
  area: AreaDeProjetos;
  /** O recorte da tela: prefila o destino e diz se a fala vai aparecer aqui. */
  filtros: FeedFiltros;
  /** Id da fala publicada e se ela cabe no recorte atual do feed. */
  onPublicou: (id: string, noRecorte: boolean) => void;
}

/** Desistir da escolha de destino não é erro: só interrompe o envio. */
class EnvioDesfeito extends Error {}

/**
 * Começar assunto de dentro do feed.
 *
 * Até aqui o feed só respondia: o compositor nascia preso a um comentário que já
 * existia. Para dizer algo novo era preciso sair do feed, achar a tarefa e abrir
 * o painel dela — que é exatamente o passo que faz a conversa acontecer em outro
 * lugar. O que falta ao feed para ser o lugar da conversa não é mais um campo de
 * texto, é o DESTINO.
 *
 * O destino é perguntado NO ENVIO, não antes. Ele já morou em três campos
 * parados acima da caixa, e ali cobrava uma decisão administrativa (de quem é,
 * em que projeto) antes da frase que a pessoa veio escrever, ocupando uma faixa
 * do rodapé o tempo todo por uma escolha que só importa no instante de gravar.
 * Agora a ordem é a da conversa: escreve, Enter, cliente, projeto, publicado,
 * tudo no teclado (ver `EscolherDestinoDaFala`).
 *
 * A gravação não é reimplementada: é a mesma mutation da thread
 * (`useDomainOrgComments.createComment`), que já cuida de upload de anexo, RPC
 * transacional, menções e auditoria. Ela recebe o destino pelo `alvo` da
 * própria chamada, e por isso nada precisa ser remontado quando a escolha muda.
 */
export function FeedNovoComentario({ area, filtros, onPublicou }: FeedNovoComentarioProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  /**
   * O destino da ÚLTIMA fala (ou o que o recorte da tela diz), não o da
   * próxima: quem escolhe a próxima é o modal do envio.
   *
   * Ele continua no estado por dois motivos. É o que vem pré-selecionado no
   * modal, o que faz a segunda fala seguida para a mesma conversa custar três
   * Enters. E é ele que dá a roda de gente do "@" enquanto se escreve: a lista
   * de quem pode ser mencionado é derivada do projeto, e sem projeto conhecido
   * ela vem vazia (ver `useDomainMentionCandidates`).
   */
  const [destino, setDestino] = useState<DestinoDaFala>(DESTINO_VAZIO);
  const [escolhendoDestino, setEscolhendoDestino] = useState(false);
  /** Quem está esperando a escolha: o `onSubmit` que abriu o modal. */
  const respostaDoModal = useRef<((destino: DestinoDaFala | null) => void) | null>(null);

  const { data: clientes = [] } = useExternalClients();
  const { data: projetos = [] } = useOrgProjectsForFilter();

  const alvo = alvoDoDestino(destino);
  /**
   * A mutation é montada uma vez só, mesmo sem destino: cada publicação diz
   * para onde vai pelo `alvo` da chamada. O `somenteEscrita` desliga a leitura
   * da thread — aqui só se escreve, e o feed já mostra o que existe.
   */
  const { createComment, isCreating } = useDomainOrgComments(
    alvo?.entityType ?? 'org_project',
    alvo?.entityId ?? '',
    area,
    alvo?.projectId ?? null,
    { somenteEscrita: true },
  );
  const { candidates: mentionCandidates } = useDomainMentionCandidates(
    alvo?.entityType ?? 'org_project',
    alvo?.entityId ?? '',
    alvo?.projectId ?? null,
  );

  /**
   * O destino de partida acompanha o RECORTE da tela: quem lê o feed filtrado
   * num cliente quase sempre escreve para ele.
   *
   * A sincronia é pela chave do recorte, e não pelo objeto dos filtros: uma
   * revalidação da lista de projetos ou um re-render à toa apagariam o destino
   * da última fala, que é o que o modal oferece em destaque.
   *
   * Com projeto no filtro ela ESPERA a lista chegar: é ela que traduz projeto
   * em cliente, e sem ela o destino fixaria pela metade.
   */
  const recorte = `${filtros.clienteId ?? ''}|${filtros.projetoId ?? ''}`;
  const recorteSincronizado = useRef<string | null>(null);
  useEffect(() => {
    if (filtros.projetoId && projetos.length === 0) return;
    if (recorteSincronizado.current === recorte) return;
    recorteSincronizado.current = recorte;
    setDestino(destinoDosFiltros(filtros, projetos));
  }, [recorte, filtros, projetos]);

  /** Abre o modal e devolve a escolha (ou `null`, se a pessoa desistiu). */
  const pedirDestino = () =>
    new Promise<DestinoDaFala | null>((resolver) => {
      respostaDoModal.current = resolver;
      setEscolhendoDestino(true);
    });

  const responderModal = (escolhido: DestinoDaFala | null) => {
    setEscolhendoDestino(false);
    respostaDoModal.current?.(escolhido);
    respostaDoModal.current = null;
  };

  return (
    <>
      {/*
        Sem cartão em volta: a MOLDURA é a caixa de texto, como no Slack. O
        cartão externo punha uma segunda borda e mais recuo de cada lado em cima
        da caixa, justamente a peça que tem de ocupar a largura do feed inteiro.
      */}
      <CommentComposer
        caixa
        area={area}
        isPending={isCreating}
        mentionCandidates={mentionCandidates}
        onSubmit={async (body, files, mencoes) => {
          const escolhido = await pedirDestino();
          // Desistiu no modal: o `CommentComposer` guarda o rascunho porque o
          // `onSubmit` não chegou ao fim.
          if (!escolhido) throw new EnvioDesfeito();

          const destinoDaFala = alvoDoDestino(escolhido);
          if (!destinoDaFala) throw new EnvioDesfeito();

          /*
            As menções são peneiradas pela roda de gente do destino ESCOLHIDO
            AGORA, que pode não ser a que estava carregada enquanto se escrevia.
            Sem esta busca, mencionar alguém e mandar para outro projeto
            notificaria pela lista velha, ou por lista nenhuma, quando a caixa
            abriu sem destino. É a mesma query do hook (mesma chave), então em
            geral ela já está em cache e não custa ida ao banco.
          */
          const candidatosDoDestino = await queryClient.fetchQuery(
            mentionCandidatesQueryOptions(
              destinoDaFala.entityType,
              destinoDaFala.entityId,
              destinoDaFala.projectId,
            ),
          );
          const permitidas = mencoesPermitidas(mencoes, candidatosDoDestino);

          const id = await createComment.mutateAsync({
            body,
            files,
            mentions: permitidas,
            alvo: destinoDaFala,
          });
          // O destino escolhido vira o de partida do próximo envio.
          setDestino(escolhido);
          // A fala é o comentário mais novo do sistema, então entra no topo do
          // feed. Invalidar pelo PREFIXO refaz também o recorte filtrado que
          // está na tela.
          await queryClient.invalidateQueries({ queryKey: feedComentariosQueryKeyPrefix() });
          onPublicou(
            id,
            falaCabeNoRecorte(filtros, {
              projetoId: destinoDaFala.projectId,
              clienteId:
                projetos.find((projeto) => projeto.id === destinoDaFala.projectId)
                  ?.external_client_id ?? null,
              autorId: user?.id ?? null,
              mencionados: permitidas,
            }),
          );
        }}
      />

      <EscolherDestinoDaFala
        aberto={escolhendoDestino}
        inicial={destino}
        clientes={clientes}
        projetos={projetos}
        onEscolher={responderModal}
        onCancelar={() => responderModal(null)}
      />
    </>
  );
}
