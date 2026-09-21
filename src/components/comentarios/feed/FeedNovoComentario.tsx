import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, FolderKanban, ListChecks } from 'lucide-react';

import { CommentComposer } from '@/components/comentarios/CommentComposer';
import type { ComboOption } from '@/components/ui/MultiSelectCombobox';
import { SingleSelectCombobox } from '@/components/ui/SingleSelectCombobox';
import { useAuth } from '@/contexts/AuthContext';
import { feedComentariosQueryKeyPrefix } from '@/hooks/useDomainFeedComentarios';
import { useDomainMentionCandidates } from '@/hooks/useDomainMentionCandidates';
import { useDomainOrgComments } from '@/hooks/useDomainOrgComments';
import { useDomainTarefasDoProjeto } from '@/hooks/useDomainTarefasDoProjeto';
import { useExternalClients, useOrgProjectsForFilter } from '@/hooks/useTaxReferenceData';
import type { AreaDeProjetos } from '@/lib/feedComentarios';
import {
  alvoDoDestino,
  aoEscolherCliente,
  aoEscolherProjeto,
  destinoDosFiltros,
  DESTINO_VAZIO,
  falaCabeNoRecorte,
  mencoesPermitidas,
  type DestinoDaFala,
} from '@/lib/feedDestino';
import { projetosDoCliente, type FeedFiltros } from '@/lib/feedFiltros';
import { statusColors } from '@/lib/taskStatusColors';

interface FeedNovoComentarioProps {
  area: AreaDeProjetos;
  /** O recorte da tela: prefila o destino e diz se a fala vai aparecer aqui. */
  filtros: FeedFiltros;
  /** Id da fala publicada e se ela cabe no recorte atual do feed. */
  onPublicou: (id: string, noRecorte: boolean) => void;
}

/**
 * Começar assunto de dentro do feed.
 *
 * Até aqui o feed só respondia: o compositor nascia preso a um comentário que já
 * existia. Para dizer algo novo era preciso sair do feed, achar a tarefa e abrir
 * o painel dela — que é exatamente o passo que faz a conversa acontecer em outro
 * lugar. O que falta ao feed para ser o lugar da conversa não é mais um campo de
 * texto, é o DESTINO: aqui ele é escolhido (cliente para encurtar a lista,
 * projeto, e tarefa quando a fala é sobre uma).
 *
 * A gravação não é reimplementada: é a mesma mutation da thread
 * (`useDomainOrgComments.createComment`), que já cuida de upload de anexo, RPC
 * transacional, menções e auditoria. O que este componente acrescenta é a
 * escolha de para onde ela vai.
 *
 * A caixa fica ABERTA, sempre, como a do Slack. Ela já nasceu fechada atrás de
 * um "Escrever no feed…" de uma linha, para poupar altura da barra grudada, e
 * foi assim que ela deixou de existir para quem olha a tela: o lugar de
 * escrever tinha de ser descoberto por um clique. O que se economizava em
 * altura se perdia inteiro no primeiro gesto.
 *
 * Sem projeto escolhido a caixa continua de pé e aceita texto — é só o publicar
 * que espera o destino (`impedimento`, no `CommentComposer`).
 */
export function FeedNovoComentario({ area, filtros, onPublicou }: FeedNovoComentarioProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [destino, setDestino] = useState<DestinoDaFala>(DESTINO_VAZIO);

  const { data: clientes = [] } = useExternalClients();
  const { data: projetos = [] } = useOrgProjectsForFilter();
  const { tarefas, isLoading: carregandoTarefas } = useDomainTarefasDoProjeto(
    destino.projetoId,
  );

  const alvo = alvoDoDestino(destino);
  /**
   * A mutation precisa de uma entidade para ser montada, e o destino pode não
   * estar escolhido ainda. Com `entityId` vazio o hook não lê thread nenhuma
   * (`somenteEscrita` desliga a leitura mesmo depois de escolhido: aqui só se
   * escreve, e o feed já mostra o que existe).
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

  const projetosOferecidos = useMemo(
    () => projetosDoCliente(projetos, destino.clienteId),
    [projetos, destino.clienteId],
  );
  const opcoesDeCliente = useMemo<ComboOption[]>(
    () => clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome })),
    [clientes],
  );
  const nomeDoCliente = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente.nome])),
    [clientes],
  );
  /**
   * O cliente vai junto do nome do projeto, no `hint` e na busca.
   *
   * Sem isso a lista oferecia cinco linhas "Canal de Chamados" idênticas — o
   * nome do projeto se repete entre clientes, e na barra de filtros escolher a
   * errada só devolve feed vazio, mas AQUI ela publica a fala no cliente errado.
   * Projeto cujo cliente vem da ordem de serviço fica sem o complemento: o
   * vínculo não está na linha do projeto (ver `useDomainFeedClientes`).
   */
  const opcoesDeProjeto = useMemo<ComboOption[]>(
    () =>
      projetosOferecidos.map((projeto) => {
        const cliente = projeto.external_client_id
          ? nomeDoCliente.get(projeto.external_client_id)
          : undefined;
        return {
          value: projeto.id,
          label: projeto.name,
          hint: cliente,
          keywords: cliente ? [cliente] : undefined,
        };
      }),
    [projetosOferecidos, nomeDoCliente],
  );
  /** O status vai no `hint`: duas tarefas do mesmo projeto costumam ter nomes parecidos. */
  const opcoesDeTarefa = useMemo<ComboOption[]>(
    () =>
      tarefas.map((tarefa) => ({
        value: tarefa.id,
        label: tarefa.title,
        hint: statusColors[tarefa.status]?.label,
      })),
    [tarefas],
  );

  /**
   * O destino acompanha o RECORTE da tela: quem lê o feed filtrado num cliente
   * quase sempre escreve para ele. Antes isso acontecia na abertura do
   * compositor; sem abertura, é este efeito que faz o mesmo trabalho.
   *
   * A sincronia é pela chave do recorte, e não pelo objeto dos filtros: uma
   * revalidação da lista de projetos ou um re-render à toa apagariam a escolha
   * feita à mão. Escolha manual vale até o recorte mudar.
   *
   * Com projeto no filtro a sincronia ESPERA a lista chegar: é ela que traduz
   * projeto em cliente, e sem ela o destino fixaria pela metade — projeto
   * escolhido, cliente vazio, que é o estado que a lista de projetos abre com a
   * casa inteira.
   */
  const recorte = `${filtros.clienteId ?? ''}|${filtros.projetoId ?? ''}`;
  const recorteSincronizado = useRef<string | null>(null);
  useEffect(() => {
    if (filtros.projetoId && projetos.length === 0) return;
    if (recorteSincronizado.current === recorte) return;
    recorteSincronizado.current = recorte;
    setDestino(destinoDosFiltros(filtros, projetos));
  }, [recorte, filtros, projetos]);

  return (
    /*
      Sem cartão em volta: a MOLDURA é a caixa de texto, como no Slack. O cartão
      externo punha uma segunda borda e mais recuo de cada lado em cima da caixa
      — justamente a peça que tem de ocupar a largura do feed inteiro.
    */
    <div className="space-y-1.5">
      {/*
        Os três campos na mesma linha, e na ordem em que se pensa o destino: de
        quem é, em que projeto, sobre qual tarefa. Sem rótulo em cima de cada
        um: com a caixa aberta o tempo todo, três rótulos empilhados sobre os
        campos custariam uma faixa inteira de altura do rodapé para repetir o
        que o texto de espera já diz. O ícone dentro do gatilho é o que sobrou
        do rótulo, e o nome completo vai no `aria-label` de cada campo.
      */}
      <div className="grid gap-1.5 sm:grid-cols-3">
        <SingleSelectCombobox
          options={opcoesDeCliente}
          value={destino.clienteId}
          onChange={(valor) => setDestino((atual) => aoEscolherCliente(atual, valor, projetos))}
          placeholder="Todos os clientes"
          searchPlaceholder="Buscar cliente…"
          emptyText="Nenhum cliente encontrado."
          opcaoVazia="Todos os clientes"
          icone={<Building2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          aria-label="Cliente da conversa"
          className="h-8 w-full min-w-0 text-xs"
        />

        <SingleSelectCombobox
          options={opcoesDeProjeto}
          value={destino.projetoId}
          onChange={(valor) => setDestino((atual) => aoEscolherProjeto(atual, valor, projetos))}
          placeholder={destino.clienteId ? 'Projetos do cliente' : 'Escolher projeto'}
          searchPlaceholder="Buscar projeto…"
          emptyText={
            destino.clienteId
              ? 'Esse cliente não tem projeto cadastrado.'
              : 'Nenhum projeto encontrado.'
          }
          icone={
            <FolderKanban aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          }
          aria-label="Projeto que recebe a conversa"
          className="h-8 w-full min-w-0 text-xs"
        />

        {/*
          Tarefa é OPCIONAL, e o campo diz isso duas vezes: no texto de espera e
          na linha que limpa. Sem tarefa a fala vai para o projeto — é o aviso
          que não pertence a nenhuma delas, e o feed já sabe desenhar bloco de
          projeto.
        */}
        <SingleSelectCombobox
          options={opcoesDeTarefa}
          value={destino.tarefaId}
          onChange={(valor) => setDestino((atual) => ({ ...atual, tarefaId: valor }))}
          disabled={!destino.projetoId || carregandoTarefas}
          placeholder={
            !destino.projetoId
              ? 'Tarefa (escolha o projeto)'
              : carregandoTarefas
                ? 'Carregando tarefas…'
                : 'Tarefa (opcional)'
          }
          searchPlaceholder="Buscar tarefa…"
          emptyText="Esse projeto não tem tarefa visível para você."
          opcaoVazia="Publicar no projeto, sem tarefa"
          icone={<ListChecks aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          aria-label="Tarefa que recebe a conversa (opcional)"
          className="h-8 w-full min-w-0 text-xs"
        />
      </div>

      <CommentComposer
        caixa
        area={area}
        isPending={isCreating}
        mentionCandidates={mentionCandidates}
        /* Sem destino a caixa continua escrevível: o que espera é o publicar. */
        impedimento={alvo ? null : 'Escolha o projeto para publicar'}
        onSubmit={async (body, files, mencoes) => {
          if (!alvo) return;
          // As menções são peneiradas pela roda de gente do destino ATUAL: o
          // rascunho sobrevive à troca de projeto, e com ele sobreviveria a
          // menção a quem não está no novo (ver `mencoesPermitidas`).
          const permitidas = mencoesPermitidas(mencoes, mentionCandidates);
          const id = await createComment.mutateAsync({
            body,
            files,
            mentions: permitidas,
          });
          // A fala é o comentário mais novo do sistema, então entra no topo
          // do feed. Invalidar pelo PREFIXO refaz também o recorte filtrado
          // que está na tela.
          await queryClient.invalidateQueries({ queryKey: feedComentariosQueryKeyPrefix() });
          onPublicou(
            id,
            falaCabeNoRecorte(filtros, {
              projetoId: alvo.projectId,
              clienteId:
                projetos.find((projeto) => projeto.id === alvo.projectId)
                  ?.external_client_id ?? null,
              autorId: user?.id ?? null,
              mencionados: permitidas,
            }),
          );
        }}
      />
    </div>
  );
}
