import { useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, FolderKanban, ListChecks, PenLine, X } from 'lucide-react';

import { CommentComposer } from '@/components/comentarios/CommentComposer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
 * Fechado, é uma linha só — o compositor aberto o tempo todo comeria a altura
 * da barra grudada, e quem chega ao feed chega para ler.
 */
export function FeedNovoComentario({ area, filtros, onPublicou }: FeedNovoComentarioProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState<DestinoDaFala>(DESTINO_VAZIO);

  const { data: clientes = [] } = useExternalClients();
  const { data: projetos = [] } = useOrgProjectsForFilter();
  const { tarefas, isLoading: carregandoTarefas } = useDomainTarefasDoProjeto(
    aberto ? destino.projetoId : null,
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

  const abrir = () => {
    // O compositor abre onde a pessoa já está olhando: o recorte da tela vira o
    // destino. Só na abertura — depois disso quem manda é a escolha dela.
    setDestino(destinoDosFiltros(filtros, projetos));
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setDestino(DESTINO_VAZIO);
  };

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-tool-icon-bg text-tool-icon">
          <PenLine aria-hidden className="h-4 w-4" />
        </span>
        Escrever no feed…
        <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
          para um projeto ou uma tarefa
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-3 shadow-md ring-2 ring-primary/10">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-tool-icon-bg text-tool-icon">
          <PenLine aria-hidden className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold">Nova conversa</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar o compositor"
          className="ml-auto h-7 w-7"
          onClick={fechar}
        >
          <X aria-hidden className="h-4 w-4" />
        </Button>
      </div>

      {/* Os três campos na mesma faixa, e na ordem em que se pensa o destino:
          de quem é, em que projeto, sobre qual tarefa. */}
      <div className="grid gap-2 sm:grid-cols-3">
        <CampoDeDestino rotulo="Cliente" icone={Building2}>
          <SingleSelectCombobox
            options={opcoesDeCliente}
            value={destino.clienteId}
            onChange={(valor) =>
              setDestino((atual) => aoEscolherCliente(atual, valor, projetos))
            }
            placeholder="Todos os clientes"
            searchPlaceholder="Buscar cliente…"
            emptyText="Nenhum cliente encontrado."
            opcaoVazia="Todos os clientes"
            className="w-full min-w-0"
          />
        </CampoDeDestino>

        <CampoDeDestino rotulo="Projeto" icone={FolderKanban}>
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
            className="w-full min-w-0"
          />
        </CampoDeDestino>

        {/*
          Tarefa é OPCIONAL, e o campo diz isso de duas formas: no rótulo e na
          linha que limpa. Sem tarefa a fala vai para o projeto — é o aviso que
          não pertence a nenhuma delas, e o feed já sabe desenhar bloco de
          projeto.
        */}
        <CampoDeDestino rotulo="Tarefa (opcional)" icone={ListChecks}>
          <SingleSelectCombobox
            options={opcoesDeTarefa}
            value={destino.tarefaId}
            onChange={(valor) => setDestino((atual) => ({ ...atual, tarefaId: valor }))}
            disabled={!destino.projetoId || carregandoTarefas}
            placeholder={
              !destino.projetoId
                ? 'Escolha o projeto primeiro'
                : carregandoTarefas
                  ? 'Carregando tarefas…'
                  : 'Publicar no projeto'
            }
            searchPlaceholder="Buscar tarefa…"
            emptyText="Esse projeto não tem tarefa visível para você."
            opcaoVazia="Publicar no projeto, sem tarefa"
            className="w-full min-w-0"
          />
        </CampoDeDestino>
      </div>

      {alvo ? (
        <div className="mt-3">
          <CommentComposer
            area={area}
            isPending={isCreating}
            mentionCandidates={mentionCandidates}
            onCancel={fechar}
            onSubmit={async (body, files, mencoes) => {
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
      ) : (
        /* Sem destino não há o que gravar, e um campo de texto que não publica
           é pior do que campo nenhum: a pessoa escreveria o parágrafo inteiro
           para só então descobrir onde estava presa. */
        <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
          Escolha o projeto para começar a escrever. A tarefa é opcional: sem ela, a fala vai para
          o projeto.
        </p>
      )}
    </div>
  );
}

function CampoDeDestino({
  rotulo,
  icone: Icone,
  children,
}: {
  rotulo: string;
  icone: typeof Building2;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icone aria-hidden className="h-3.5 w-3.5" />
        {rotulo}
      </Label>
      {children}
    </div>
  );
}
