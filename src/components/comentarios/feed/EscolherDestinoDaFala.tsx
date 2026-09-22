import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultFilter } from 'cmdk';
import { Building2, CornerDownLeft, FolderKanban, ListChecks } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useDomainTarefasDoProjeto } from '@/hooks/useDomainTarefasDoProjeto';
import { casaSemAcento } from '@/lib/buscaEmCombobox';
import type { DestinoDaFala } from '@/lib/feedDestino';
import { projetosDoCliente, type ProjetoDoFiltro } from '@/lib/feedFiltros';
import { statusColors } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

/** Linha que dispensa o recorte por cliente e abre a casa inteira de projetos. */
const TODOS_OS_CLIENTES = '__todos_os_clientes__';
/** Linha que fecha o destino no projeto, sem tarefa. */
const SEM_TAREFA = '__sem_tarefa__';

type Passo = 'cliente' | 'projeto' | 'tarefa';

export interface ClienteParaDestino {
  id: string;
  nome: string;
}

/**
 * Por que o modal abriu. Muda o que o Enter faz no passo do projeto (publicar a
 * fala, ou só fixar o destino para o "@" ter gente), e é o que o rodapé escreve.
 */
export type MotivoDoDestino = 'publicar' | 'mencionar';

interface EscolherDestinoDaFalaProps {
  aberto: boolean;
  motivo: MotivoDoDestino;
  /** O que o recorte do feed (ou a última fala) já disse — vem pré-selecionado. */
  inicial: DestinoDaFala;
  clientes: ClienteParaDestino[];
  projetos: ProjetoDoFiltro[];
  onEscolher: (destino: DestinoDaFala) => void;
  onCancelar: () => void;
}

/**
 * Para onde vai a fala, perguntado DEPOIS do texto e respondido só no teclado.
 *
 * O compositor do feed tinha três campos de destino parados acima da caixa,
 * ocupados o tempo todo por uma escolha que só importa no instante de enviar.
 * Aqui a ordem é a da conversa: escreve, Enter, cliente, projeto, publicado. A
 * mão não sai do teclado em nenhum dos passos, e cada lista abre com a busca
 * focada.
 *
 * A TAREFA não virou um terceiro Enter obrigatório: quase toda fala vai para o
 * projeto, e cobrar um passo a mais de todo mundo para o caso minoritário é o
 * tipo de peça que faz a pessoa voltar a comentar pelo painel da tarefa. Ela é
 * um DESVIO no passo do projeto: Tab no projeto em destaque abre as tarefas
 * dele. O rodapé do modal diz isso em todos os passos.
 *
 * Esc é o caminho de volta, um passo por vez, e no primeiro passo cancela sem
 * perder o texto escrito.
 */
export function EscolherDestinoDaFala({
  aberto,
  motivo,
  inicial,
  clientes,
  projetos,
  onEscolher,
  onCancelar,
}: EscolherDestinoDaFalaProps) {
  const [passo, setPasso] = useState<Passo>('cliente');
  const [clienteId, setClienteId] = useState<string | null>(inicial.clienteId);
  const [projetoId, setProjetoId] = useState<string | null>(inicial.projetoId);
  /** Item em destaque na lista — o que o Enter (e o Tab) vai levar. */
  const [destacado, setDestacado] = useState('');
  /**
   * Quem DEVERIA estar em destaque neste passo: o que a tela já sabe.
   *
   * Vai por um estado à parte, e não direto no `destacado`, por causa de uma
   * corrida do cmdk: ao montar a lista ele põe o primeiro item em destaque e
   * avisa pelo `onValueChange`, o que atropelava qualquer escolha feita antes
   * dos itens existirem. Medido na tela: o cliente do recorte nunca ficava em
   * destaque, e o Enter caía sempre na primeira linha da lista. O efeito abaixo
   * roda depois da montagem, então é ele quem dá a última palavra.
   */
  const [desejado, setDesejado] = useState('');
  const [busca, setBusca] = useState('');

  /*
    Cada abertura recomeça do primeiro passo, com o que a tela já sabe em
    destaque: o cliente do recorte, e depois o projeto dele. É o que faz a
    segunda fala seguida para a mesma conversa custar Enter, Enter, Enter.

    `inicial` fica FORA das dependências de propósito: ele muda quando o filtro
    do feed muda, e reagir a isso com o modal aberto reiniciaria a escolha no
    meio do caminho.
  */
  useEffect(() => {
    if (!aberto) return;
    setPasso('cliente');
    setClienteId(inicial.clienteId);
    setProjetoId(inicial.projetoId);
    setBusca('');
    setDesejado(inicial.clienteId ?? TODOS_OS_CLIENTES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const projetosOferecidos = useMemo(
    () => projetosDoCliente(projetos, clienteId),
    [projetos, clienteId],
  );
  const nomeDoCliente = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente.nome])),
    [clientes],
  );
  const { tarefas, isLoading: carregandoTarefas } = useDomainTarefasDoProjeto(
    passo === 'tarefa' ? projetoId : null,
  );

  /*
    O destaque desejado só vale se a linha EXISTIR na lista deste passo: um
    `value` que não casa com item nenhum deixa a lista sem destaque, e aí o
    Enter não faria nada. Sem a linha, quem manda é a escolha do cmdk (o
    primeiro item).
  */
  const listaTemDesejado =
    passo === 'cliente'
      ? desejado === TODOS_OS_CLIENTES || clientes.some((cliente) => cliente.id === desejado)
      : passo === 'projeto'
        ? projetosOferecidos.some((projeto) => projeto.id === desejado)
        : desejado === SEM_TAREFA || tarefas.some((tarefa) => tarefa.id === desejado);

  const listaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!desejado || !listaTemDesejado) return;
    setDestacado(desejado);
    /*
      O cmdk rola até a linha em destaque quando ela é alcançada por tecla, mas
      não quando o destaque é posto por código: com sessenta clientes na lista,
      a escolhida ficava fora da janela e a tela parecia não ter destaque
      nenhum. O quadro seguinte é onde ela já está marcada no DOM.
    */
    requestAnimationFrame(() => {
      listaRef.current
        ?.querySelector('[cmdk-item][aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest' });
    });
  }, [desejado, listaTemDesejado, passo]);

  const irParaProjeto = (escolhido: string | null) => {
    setClienteId(escolhido);
    setPasso('projeto');
    setBusca('');
    /* O projeto que já vinha do recorte só continua em destaque se pertencer ao
       cliente escolhido agora; senão o Enter publicaria em outro cliente. */
    const daCasa = projetosDoCliente(projetos, escolhido).some(
      (projeto) => projeto.id === inicial.projetoId,
    );
    setDesejado(daCasa && inicial.projetoId ? inicial.projetoId : '');
  };

  const irParaTarefa = (escolhido: string) => {
    setProjetoId(escolhido);
    setPasso('tarefa');
    setBusca('');
    setDesejado(SEM_TAREFA);
  };

  const voltar = () => {
    if (passo === 'cliente') {
      onCancelar();
      return;
    }
    setBusca('');
    if (passo === 'tarefa') {
      setPasso('projeto');
      setDesejado(projetoId ?? '');
      return;
    }
    setPasso('cliente');
    setDesejado(clienteId ?? TODOS_OS_CLIENTES);
  };

  const publicarNoProjeto = (escolhido: string) => {
    const projeto = projetos.find((candidato) => candidato.id === escolhido);
    onEscolher({
      clienteId: projeto?.external_client_id ?? clienteId,
      projetoId: escolhido,
      tarefaId: null,
    });
  };

  const publicarNaTarefa = (tarefaEscolhida: string | null) => {
    if (!projetoId) return;
    const projeto = projetos.find((candidato) => candidato.id === projetoId);
    onEscolher({
      clienteId: projeto?.external_client_id ?? clienteId,
      projetoId,
      tarefaId: tarefaEscolhida,
    });
  };

  return (
    <Dialog open={aberto} onOpenChange={(proximo) => !proximo && onCancelar()}>
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-xl"
        /* Esc volta UM passo. Sem isto o Radix fecharia o modal inteiro, e
           errar o cliente custaria refazer a escolha do zero. */
        onEscapeKeyDown={(evento) => {
          if (passo === 'cliente') return;
          evento.preventDefault();
          voltar();
        }}
      >
        <DialogTitle className="sr-only">Para onde vai essa fala</DialogTitle>

        <Command
          /* A busca é por palavra: o `value` do item é um id, e id casando com
             trecho digitado traria linha que não tem nada a ver (mesma razão do
             `SingleSelectCombobox`). */
          filter={(_valor, procurado, palavras) =>
            casaSemAcento(palavras ?? [], procurado)
              ? 1
              : defaultFilter((palavras ?? []).join(' '), procurado)
          }
          value={destacado}
          onValueChange={setDestacado}
          onKeyDown={(evento) => {
            /* Tab no projeto em destaque é o desvio para as tarefas dele. No
               modal não há nada para onde tabular, então o Tab está livre. */
            if (evento.key === 'Tab' && passo === 'projeto' && destacado) {
              evento.preventDefault();
              irParaTarefa(destacado);
            }
          }}
        >
          <Trilha passo={passo} cliente={clienteId ? nomeDoCliente.get(clienteId) : undefined} />

          <CommandInput
            value={busca}
            onValueChange={setBusca}
            placeholder={
              passo === 'cliente'
                ? 'De qual cliente é essa conversa?'
                : passo === 'projeto'
                  ? 'Em qual projeto?'
                  : 'Sobre qual tarefa?'
            }
          />

          <CommandList ref={listaRef} className="max-h-[50vh]">
            {passo === 'cliente' && (
              <>
                <CommandEmpty>Nenhum cliente com esse nome.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value={TODOS_OS_CLIENTES}
                    keywords={['Todos os clientes']}
                    onSelect={() => irParaProjeto(null)}
                  >
                    <Building2 aria-hidden className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                    <span className="text-muted-foreground">
                      Todos os clientes, ver a lista inteira de projetos
                    </span>
                  </CommandItem>
                  {clientes.map((cliente) => (
                    <CommandItem
                      key={cliente.id}
                      value={cliente.id}
                      keywords={[cliente.nome]}
                      onSelect={() => irParaProjeto(cliente.id)}
                    >
                      <Building2 aria-hidden className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                      <span className="truncate">{cliente.nome}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {passo === 'projeto' && (
              <>
                <CommandEmpty>
                  {clienteId
                    ? 'Esse cliente não tem projeto com esse nome.'
                    : 'Nenhum projeto com esse nome.'}
                </CommandEmpty>
                <CommandGroup>
                  {projetosOferecidos.map((projeto) => {
                    /* O nome do projeto se repete entre clientes ("Canal de
                       Chamados" aparece cinco vezes), então o cliente vai na
                       linha e na busca: sem ele a escolha é um sorteio. */
                    const cliente = projeto.external_client_id
                      ? nomeDoCliente.get(projeto.external_client_id)
                      : undefined;
                    return (
                      <CommandItem
                        key={projeto.id}
                        value={projeto.id}
                        keywords={cliente ? [projeto.name, cliente] : [projeto.name]}
                        onSelect={() => publicarNoProjeto(projeto.id)}
                      >
                        <FolderKanban aria-hidden className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                        <span className="truncate">{projeto.name}</span>
                        {cliente && (
                          <span className="ml-2 truncate text-xs text-muted-foreground">
                            {cliente}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}

            {passo === 'tarefa' && (
              <>
                <CommandEmpty>
                  {carregandoTarefas
                    ? 'Carregando as tarefas…'
                    : 'Esse projeto não tem tarefa visível para você.'}
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value={SEM_TAREFA}
                    keywords={['Publicar no projeto, sem tarefa']}
                    onSelect={() => publicarNaTarefa(null)}
                  >
                    <FolderKanban aria-hidden className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                    <span className="text-muted-foreground">Publicar no projeto, sem tarefa</span>
                  </CommandItem>
                  {tarefas.map((tarefa) => (
                    <CommandItem
                      key={tarefa.id}
                      value={tarefa.id}
                      keywords={[tarefa.title]}
                      onSelect={() => publicarNaTarefa(tarefa.id)}
                    >
                      <ListChecks aria-hidden className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                      <span className="truncate">{tarefa.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {statusColors[tarefa.status]?.label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          <Rodape passo={passo} motivo={motivo} />
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Onde a escolha está, e o que já foi escolhido atrás dela. */
function Trilha({ passo, cliente }: { passo: Passo; cliente?: string }) {
  return (
    /* `pr-10`: o X de fechar do `DialogContent` fica ancorado neste canto, e
       sem a folga o nome do cliente passava por baixo dele. */
    <div className="flex items-center gap-1.5 border-b bg-muted/40 py-2 pl-3 pr-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <Etapa ativa={passo === 'cliente'}>Cliente</Etapa>
      <span aria-hidden>›</span>
      <Etapa ativa={passo === 'projeto'}>Projeto</Etapa>
      {passo === 'tarefa' && (
        <>
          <span aria-hidden>›</span>
          <Etapa ativa>Tarefa</Etapa>
        </>
      )}
      {cliente && passo !== 'cliente' && (
        <span className="ml-auto truncate normal-case tracking-normal">{cliente}</span>
      )}
    </div>
  );
}

function Etapa({ ativa, children }: { ativa: boolean; children: string }) {
  return <span className={cn(ativa && 'text-foreground')}>{children}</span>;
}

/** As teclas do passo, escritas: o fluxo inteiro existe para não usar o mouse. */
function Rodape({ passo, motivo }: { passo: Passo; motivo: MotivoDoDestino }) {
  /* Pelo "@" o modal não publica nada: ele só resolve de onde sai a lista de
     gente, e a pessoa volta para o texto de onde parou. */
  const noFim = motivo === 'publicar' ? 'publica' : 'volta a escrever';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-3 py-2 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <CornerDownLeft aria-hidden className="h-3 w-3" />
        {passo === 'cliente' ? 'escolhe o cliente' : noFim}
      </span>
      {passo === 'projeto' && (
        <span>
          <Tecla>Tab</Tecla> escolhe uma tarefa do projeto
        </span>
      )}
      <span className="ml-auto">
        <Tecla>Esc</Tecla> {passo === 'cliente' ? 'cancela, e o texto fica' : 'volta um passo'}
      </span>
      {motivo === 'mencionar' && passo === 'cliente' && (
        <span className="w-full text-[11px]">
          A lista de quem dá para mencionar vem do projeto, por isso a pergunta
          aparece agora.
        </span>
      )}
    </div>
  );
}

function Tecla({ children }: { children: string }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-0.5 font-sans text-[10px] font-medium">
      {children}
    </kbd>
  );
}
