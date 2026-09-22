import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AtSign, Building2, CalendarClock, FolderKanban, ListFilter, MessagesSquare, Paperclip, Search, User, X } from 'lucide-react';

import { SingleSelectCombobox } from '@/components/ui/SingleSelectCombobox';
import type { ComboOption } from '@/components/ui/MultiSelectCombobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useExternalClients, useOrgProjectsForFilter, useTeamProfilesSafe } from '@/hooks/useTaxReferenceData';
import {
  aoTrocarDeCliente,
  contarFiltrosAtivos,
  FILTROS_VAZIOS,
  PERIODOS_DO_FEED,
  projetosDoCliente,
  temFiltroAtivo,
  termoDaBusca,
  type FeedFiltros as FeedFiltrosValor,
  type PeriodoDoFeed,
} from '@/lib/feedFiltros';

/**
 * Quanto o campo de busca espera antes de virar recorte.
 *
 * Cada termo é uma lista paginada própria no React Query (a chave carrega o
 * recorte), então tecla a tecla seriam oito consultas para escrever
 * "balancete", cada uma abrindo o cursor do zero.
 */
const ESPERA_DA_BUSCA = 350;

interface FeedFiltrosProps {
  filtros: FeedFiltrosValor;
  onFiltrosChange: (filtros: FeedFiltrosValor) => void;
}

/**
 * O item ativo da alternância é uma pastilha clara sobre a canaleta cinza.
 *
 * As cores de texto são redeclaradas porque o `toggleVariants` marca o ativo com
 * `bg-accent` + `text-accent-foreground` — sobre a pastilha `bg-card`, esse par
 * deixa o rótulo branco no branco. O twMerge do `cn` faz a última declaração
 * ganhar.
 */
const ITEM_DA_ALTERNANCIA =
  'h-8 gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm';

/**
 * A barra de recorte do feed.
 *
 * Dois níveis, por frequência de uso. **Menções** é o recorte do dia a dia —
 * "onde me chamaram" — e fica a um clique, em alternância com o feed inteiro e
 * com **Anexos** ("onde está o arquivo que mandaram"); o
 * **período** também fica à vista, porque é o eixo que se mexe junto com
 * qualquer outro. Cliente, projeto e usuário entram num popover: são listas
 * grandes, precisam de busca e não se troca a cada minuto.
 *
 * O que está ligado nunca fica escondido dentro do popover — vira etiqueta na
 * linha de baixo, com o × para desligar. Filtro invisível é filtro que faz a
 * pessoa achar que o feed está vazio.
 *
 * Os filtros não filtram nada aqui: são estado, e o recorte é feito dentro da
 * função `feed_org_comments` (o feed pagina por cursor, então filtrar no front
 * filtraria a página, não o feed).
 */
export function FeedFiltros({ filtros, onFiltrosChange }: FeedFiltrosProps) {
  const [popoverAberto, setPopoverAberto] = useState(false);
  const { data: clientes = [] } = useExternalClients();
  const { data: projetos = [] } = useOrgProjectsForFilter();
  const { data: perfis = [] } = useTeamProfilesSafe();

  const opcoesDeCliente = useMemo<ComboOption[]>(
    () => clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome })),
    [clientes],
  );
  /**
   * A lista de projetos obedece ao cliente escolhido.
   *
   * Sem isso, o popover oferecia todos os projetos da casa depois de a pessoa já
   * ter dito de qual cliente ela está falando, e escolher um projeto de outro
   * cliente montava um recorte impossível (os dois filtros se cruzam no `WHERE`),
   * devolvendo feed vazio sem explicar a causa.
   */
  const projetosOferecidos = useMemo(
    () => projetosDoCliente(projetos, filtros.clienteId),
    [projetos, filtros.clienteId],
  );
  const opcoesDeProjeto = useMemo<ComboOption[]>(
    () => projetosOferecidos.map((projeto) => ({ value: projeto.id, label: projeto.name })),
    [projetosOferecidos],
  );
  /**
   * A etiqueta lê a lista INTEIRA: o projeto continua nomeado enquanto o cliente
   * está sendo trocado, mesmo no instante em que ele já não está entre os
   * oferecidos.
   */
  const opcoesDeTodoProjeto = useMemo<ComboOption[]>(
    () => projetos.map((projeto) => ({ value: projeto.id, label: projeto.name })),
    [projetos],
  );
  const opcoesDeUsuario = useMemo<ComboOption[]>(
    () =>
      perfis.map((perfil) => ({
        value: perfil.id,
        label: `${perfil.first_name ?? ''} ${perfil.last_name ?? ''}`.trim() || 'Sem nome',
      })),
    [perfis],
  );

  const alterar = (parcial: Partial<FeedFiltrosValor>) =>
    onFiltrosChange({ ...filtros, ...parcial });

  const quantidade = contarFiltrosAtivos(filtros);
  /** O contador do botão não conta o que já está visível fora dele. */
  const quantidadeNoPopover =
    quantidade -
    (filtros.apenasMencoes ? 1 : 0) -
    (filtros.apenasAnexos ? 1 : 0) -
    (filtros.periodo !== 'sempre' ? 1 : 0) -
    (termoDaBusca(filtros) ? 1 : 0);

  const etiquetas = [
    {
      chave: 'cliente',
      icone: Building2,
      texto: rotuloDe(opcoesDeCliente, filtros.clienteId, 'Cliente'),
      limpar: () => alterar({ clienteId: null }),
    },
    {
      chave: 'projeto',
      icone: FolderKanban,
      texto: rotuloDe(opcoesDeTodoProjeto, filtros.projetoId, 'Projeto'),
      limpar: () => alterar({ projetoId: null }),
    },
    {
      chave: 'autor',
      icone: User,
      texto: rotuloDe(opcoesDeUsuario, filtros.autorId, 'Usuário'),
      limpar: () => alterar({ autorId: null }),
    },
  ].filter((etiqueta) => etiqueta.texto !== null);

  return (
    /* Sem moldura nem margem: a faixa grudada de `FeedComentarios` é a máscara, e uma
       margem aqui abriria fresta por onde o conteúdo passaria rolando. */
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {/*
          Alternância, e não caixa de seleção: "tudo", "só menções" e "só
          anexos" são leituras do feed, não um filtro que se soma aos outros.
          `type="single"` do Radix devolve string vazia ao desmarcar o item
          ativo — aí o valor cai em 'tudo' em vez de virar um estado sem sentido.
        */}
        <ToggleGroup
          type="single"
          value={filtros.apenasMencoes ? 'mencoes' : filtros.apenasAnexos ? 'anexos' : 'tudo'}
          onValueChange={(valor) =>
            alterar({ apenasMencoes: valor === 'mencoes', apenasAnexos: valor === 'anexos' })
          }
          className="justify-start gap-0.5 rounded-md bg-muted/60 p-0.5"
        >
          <ToggleGroupItem value="tudo" aria-label="Ver todas as conversas" className={ITEM_DA_ALTERNANCIA}>
            <MessagesSquare aria-hidden className="h-3.5 w-3.5" />
            Tudo
          </ToggleGroupItem>
          <ToggleGroupItem
            value="mencoes"
            aria-label="Ver só as conversas em que me mencionam"
            className={ITEM_DA_ALTERNANCIA}
          >
            <AtSign aria-hidden className="h-3.5 w-3.5" />
            Menções
          </ToggleGroupItem>
          <ToggleGroupItem
            value="anexos"
            aria-label="Ver só as conversas com anexo"
            className={ITEM_DA_ALTERNANCIA}
          >
            <Paperclip aria-hidden className="h-3.5 w-3.5" />
            Anexos
          </ToggleGroupItem>
        </ToggleGroup>

        {/*
          A busca fica na PRIMEIRA linha, à vista, e não dentro do popover: ela é
          o filtro que responde "onde ficou aquilo", a pergunta que trouxe a
          pessoa ao feed sabendo o que procura. Escondida atrás de um clique ela
          seria descoberta por quem já não precisa dela.

          Ela cresce e toma o espaço que sobra entre a alternância e os controles
          de período, porque é onde se digita: campo de texto curto num canto
          mostra três palavras da frase buscada.
        */}
        <CampoDeBusca
          valor={filtros.busca}
          onBuscar={(busca) => alterar({ busca })}
          className="min-w-40 flex-1 max-sm:order-last max-sm:w-full max-sm:flex-none"
        />

        {/* Em tela estreita a linha quebra: aí os dois controles ocupam a largura
            toda em vez de ficarem pendurados num canto. */}
        <div className="flex items-center gap-2 max-sm:w-full">
          <Select
            value={filtros.periodo}
            onValueChange={(valor) => alterar({ periodo: valor as PeriodoDoFeed })}
          >
            {/* `[&>span]` é o valor selecionado: esticado e à esquerda, para o
                rótulo não flutuar no meio quando o gatilho ocupa a linha toda. */}
            <SelectTrigger
              className="h-9 w-auto gap-1.5 text-xs max-sm:flex-1 [&>span]:flex-1 [&>span]:text-left"
              aria-label="Período"
            >
              <CalendarClock aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS_DO_FEED.map((periodo) => (
                <SelectItem key={periodo.valor} value={periodo.valor} className="text-xs">
                  {periodo.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
                <ListFilter aria-hidden className="h-4 w-4" />
                Filtros
                {quantidadeNoPopover > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">
                    {quantidadeNoPopover}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-3">
              <CampoDeFiltro rotulo="Cliente" icone={Building2}>
                <SingleSelectCombobox
                  options={opcoesDeCliente}
                  value={filtros.clienteId}
                  /* Trocar de cliente derruba o projeto que era de outro, ver
                     `aoTrocarDeCliente`. */
                  onChange={(valor) => onFiltrosChange(aoTrocarDeCliente(filtros, valor, projetos))}
                  placeholder="Todos os clientes"
                  searchPlaceholder="Buscar cliente…"
                  emptyText="Nenhum cliente encontrado."
                  className="w-full min-w-0"
                />
              </CampoDeFiltro>

              <CampoDeFiltro rotulo="Projeto" icone={FolderKanban}>
                <SingleSelectCombobox
                  options={opcoesDeProjeto}
                  value={filtros.projetoId}
                  onChange={(valor) => alterar({ projetoId: valor })}
                  placeholder={filtros.clienteId ? 'Todos os projetos do cliente' : 'Todos os projetos'}
                  searchPlaceholder="Buscar projeto…"
                  emptyText={
                    filtros.clienteId
                      ? 'Esse cliente não tem projeto cadastrado.'
                      : 'Nenhum projeto encontrado.'
                  }
                  className="w-full min-w-0"
                />
              </CampoDeFiltro>

              {/*
                "Usuário" é quem ESCREVEU. Quem foi mencionado tem alternância
                própria lá em cima — juntar os dois no mesmo campo misturaria
                "o que o Fulano andou dizendo" com "onde o Fulano foi chamado".
              */}
              <CampoDeFiltro rotulo="Escrito por" icone={User}>
                <SingleSelectCombobox
                  options={opcoesDeUsuario}
                  value={filtros.autorId}
                  onChange={(valor) => alterar({ autorId: valor })}
                  placeholder="Qualquer pessoa"
                  searchPlaceholder="Buscar pessoa…"
                  emptyText="Nenhuma pessoa encontrada."
                  className="w-full min-w-0"
                />
              </CampoDeFiltro>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(etiquetas.length > 0 || temFiltroAtivo(filtros)) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {etiquetas.map((etiqueta) => (
            <span
              key={etiqueta.chave}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 py-1 pl-2.5 pr-1 text-xs"
            >
              <etiqueta.icone aria-hidden className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{etiqueta.texto}</span>
              <button
                type="button"
                onClick={etiqueta.limpar}
                aria-label={`Remover filtro de ${etiqueta.chave}`}
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
              >
                <X aria-hidden className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onFiltrosChange(FILTROS_VAZIOS)}
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * O nome do que está selecionado. Enquanto o cadastro não chegou, mostra o tipo
 * do filtro em vez do uuid cru — a etiqueta existe para dizer que o feed está
 * recortado, e isso ela já diz.
 */
function rotuloDe(opcoes: ComboOption[], id: string | null, tipo: string): string | null {
  if (!id) return null;
  return opcoes.find((opcao) => opcao.value === id)?.label ?? `${tipo} selecionado`;
}

function CampoDeFiltro({
  rotulo,
  icone: Icone,
  children,
}: {
  rotulo: string;
  icone: typeof Building2;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icone aria-hidden className="h-3.5 w-3.5" />
        {rotulo}
      </Label>
      {children}
    </div>
  );
}

/**
 * O campo de busca do feed.
 *
 * Ele tem estado PRÓPRIO porque o recorte mora na URL: escrever direto lá
 * repintaria a página e refaria a consulta a cada tecla, e o cursor do feed é
 * reaberto do zero em cada recorte novo. Aqui a letra aparece na hora e o
 * recorte só muda quando a digitação para (ou no Enter, para quem não quer
 * esperar).
 *
 * A sincronia de volta compara o termo APARADO. Sem isso, o espaço de
 * "balancete " sumia debaixo do dedo: a URL guarda o termo sem as pontas, esse
 * valor voltava para cá e apagava o espaço recém-digitado, colando a palavra
 * seguinte na anterior.
 */
function CampoDeBusca({
  valor,
  onBuscar,
  className,
}: {
  valor: string;
  onBuscar: (busca: string) => void;
  className?: string;
}) {
  const [texto, setTexto] = useState(valor);
  /** O callback muda de identidade a cada render; o relógio não pode reiniciar por isso. */
  const buscarRef = useRef(onBuscar);
  buscarRef.current = onBuscar;

  // O valor de fora manda quando ele muda por outro caminho: "Limpar filtros",
  // F5, link colado por outra pessoa.
  useEffect(() => {
    setTexto((atual) => (atual.trim() === valor.trim() ? atual : valor));
  }, [valor]);

  useEffect(() => {
    if (texto.trim() === valor.trim()) return;
    const relogio = window.setTimeout(() => buscarRef.current(texto), ESPERA_DA_BUSCA);
    return () => window.clearTimeout(relogio);
  }, [texto, valor]);

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          // Enter não espera o relógio; Esc limpa sem tirar a mão do teclado.
          if (evento.key === 'Enter') onBuscar(texto);
          if (evento.key === 'Escape' && texto) {
            evento.stopPropagation();
            setTexto('');
            onBuscar('');
          }
        }}
        placeholder="Buscar no que foi escrito…"
        aria-label="Buscar no texto dos comentários"
        /* `[&::-webkit-search-cancel-button]:hidden`: o × nativo do
           `type="search"` ficaria ao lado do nosso, e o nativo some do estado
           controlado sem avisar o React. */
        className="h-9 pl-8 pr-8 text-xs [&::-webkit-search-cancel-button]:hidden"
      />
      {texto && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => {
            setTexto('');
            onBuscar('');
          }}
          className="absolute right-2 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
        >
          <X aria-hidden className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
