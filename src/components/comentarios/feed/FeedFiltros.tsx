import { useMemo, useState, type ReactNode } from 'react';
import { AtSign, Building2, CalendarClock, FolderKanban, ListFilter, MessagesSquare, User, X } from 'lucide-react';

import { SingleSelectCombobox } from '@/components/dashboards/SingleSelectCombobox';
import type { ComboOption } from '@/components/dashboards/MultiSelectCombobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useExternalClients, useOrgProjectsForFilter, useTeamProfilesSafe } from '@/hooks/useTaxReferenceData';
import {
  contarFiltrosAtivos,
  FILTROS_VAZIOS,
  PERIODOS_DO_FEED,
  temFiltroAtivo,
  type FeedFiltros as FeedFiltrosValor,
  type PeriodoDoFeed,
} from '@/lib/feedFiltros';

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
 * "onde me chamaram" — e fica a um clique, em alternância com o feed inteiro; o
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
  const opcoesDeProjeto = useMemo<ComboOption[]>(
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
    quantidade - (filtros.apenasMencoes ? 1 : 0) - (filtros.periodo !== 'sempre' ? 1 : 0);

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
      texto: rotuloDe(opcoesDeProjeto, filtros.projetoId, 'Projeto'),
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
    <div className="mb-3 rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {/*
          Alternância, e não caixa de seleção: "tudo" e "só menções" são duas
          leituras do feed, não um filtro que se soma aos outros. `type="single"`
          do Radix devolve string vazia ao desmarcar o item ativo — aí o valor
          cai em 'tudo' em vez de virar um terceiro estado sem sentido.
        */}
        <ToggleGroup
          type="single"
          value={filtros.apenasMencoes ? 'mencoes' : 'tudo'}
          onValueChange={(valor) => alterar({ apenasMencoes: valor === 'mencoes' })}
          className="justify-start gap-0.5 rounded-lg bg-muted/60 p-0.5"
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
        </ToggleGroup>

        {/* Em tela estreita a linha quebra: aí os dois controles ocupam a largura
            toda em vez de ficarem pendurados num canto. */}
        <div className="ml-auto flex items-center gap-2 max-sm:w-full">
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
                  onChange={(valor) => alterar({ clienteId: valor })}
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
                  placeholder="Todos os projetos"
                  searchPlaceholder="Buscar projeto…"
                  emptyText="Nenhum projeto encontrado."
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
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
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
