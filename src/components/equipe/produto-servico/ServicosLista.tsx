import { useMemo, useState, type ReactNode } from 'react';
import { Layers, Link2, Pencil, Plus, Search, Unlink } from 'lucide-react';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  listRowAria, listRowClasses, listRowFocusClasses, listRowTitleClasses,
  listRowLinkedLabelClasses,
} from '@/lib/listRowStates';
import { dividirNomeServico, faixaDeSelecao } from '@/lib/produtoServicoNomes';
import type { FiltroVinculo } from '@/lib/produtoServicoVinculo';
import type { ProdutoSegmento } from '@/hooks/useCategorias';
import AcoesEmMassaMenu from './AcoesEmMassaMenu';

export interface ServicoNaLista {
  id: string;
  nome: string;
  /** Vinculado ao produto aberto. */
  vinculado: boolean;
  /** Gravando agora — a linha fica inerte. */
  salvando: boolean;
  /** Em quantos produtos este serviço é usado, no total. */
  usadoEm: number;
  clusterId: string | null;
  clusterNome: string | null;
}

const MODOS: { valor: FiltroVinculo; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'vinculados', rotulo: 'Vinculados' },
  { valor: 'disponiveis', rotulo: 'Disponíveis' },
];

interface Props {
  produto: ProdutoSegmento | null;
  /** Serviços do cluster do produto, na ordem do código. É a lista principal. */
  doCluster: ServicoNaLista[];
  /** Serviços de outros clusters (e os sem cluster), na mesma ordem. */
  outrosClusters: ServicoNaLista[];
  mostrarOutros: boolean;
  onMostrarOutros: (mostrar: boolean) => void;
  /** Ids na ordem em que a tela os mostra — base do shift+clique. */
  idsVisiveis: string[];
  resumo: { vinculados: number; total: number };
  filtro: { busca: string; modo: FiltroVinculo };
  onFiltroChange: (patch: Partial<{ busca: string; modo: FiltroVinculo }>) => void;
  marcados: Set<string>;
  onMarcar: (ids: string[], marcar: boolean) => void;
  onLimparMarcados: () => void;
  servicoAbertoId: string | null;
  onAbrirServico: (servico: ServicoNaLista) => void;
  onLote: (acao: 'vincular' | 'desvincular', servicos: ServicoNaLista[]) => void;
  /** Liga/desliga o vínculo de UM serviço, na hora. É o clique da caixa. */
  onAlternarVinculo: (servico: ServicoNaLista) => void;
  onNovo: () => void;
  /** Abre o formulário do PRODUTO aberto — é o único lugar que edita o nome dele. */
  onEditarProduto: () => void;
  /** Faixa de aviso logo abaixo do cabeçalho (produto sem vínculo nenhum). */
  aviso?: ReactNode;
  carregando: boolean;
}

/**
 * Coluna central: os serviços do produto aberto, em UMA lista corrida.
 *
 * Substituiu, em 27/08/2026, um agrupamento de dois níveis — cluster e, dentro
 * dele, "seção" — que a curadoria julgou mais difícil que a lista crua. O motivo
 * está no dado: não existe coluna de seção em `servicos_prestados`, então a seção
 * era o primeiro número recortado da string do nome, e o cabeçalho recolhível
 * dizia "Seção 1", "Seção 2". Número sem nome não orienta ninguém — e, com só a
 * primeira seção aberta, vincular cinco serviços custava abrir cinco sanfonas
 * sobre 113 itens, dos quais só os do cluster do produto interessavam.
 *
 * O que ficou no lugar:
 *
 * · UMA lista, ordenada pelo código que já vem no nome ("1.1", "1.2", "2.1"…).
 *   A ordem faz o trabalho que o agrupamento tentava fazer, sem esconder nada.
 * · Por padrão só o CLUSTER DO PRODUTO. Os outros clusters ficam atrás de um
 *   botão no fim da lista — existem (há serviço sem cluster no catálogo), mas
 *   não é neles que se mexe.
 * · Vincular em bloco continua tendo dois caminhos: a busca ("6." traz o que era
 *   a seção 6) somada ao "Vincular todos os visíveis", e o shift+clique.
 *
 * DOIS GESTOS, DOIS SIGNIFICADOS, e é o que a caixa comunica:
 *
 * · a CAIXA é o vínculo. Um clique liga ou desliga na hora, com "Desfazer" no
 *   toast. Marcada = vinculado, e é por isso que ela leva o acento.
 * · SHIFT+clique no nome seleciona a faixa para ação em massa, com preenchimento
 *   NEUTRO. A barra em massa só aparece daí.
 *
 * As linhas são FAIXAS, não cartões: sem raio, sem borda em volta, separadas por
 * um fio. Quem manda na cor do estado é o `listRowStates`; a forma é local.
 */
export default function ServicosLista({
  produto, doCluster, outrosClusters, mostrarOutros, onMostrarOutros,
  idsVisiveis, resumo, filtro, onFiltroChange,
  marcados, onMarcar, onLimparMarcados, servicoAbertoId, onAbrirServico,
  onLote, onAlternarVinculo, onNovo, onEditarProduto, aviso, carregando,
}: Props) {
  const [ancora, setAncora] = useState<string | null>(null);
  const [confirmarDesvincular, setConfirmarDesvincular] = useState(false);

  const marcadosNaTela = useMemo(
    () => idsVisiveis.filter((id) => marcados.has(id)),
    [idsVisiveis, marcados],
  );
  // "Visíveis" é literal: o que está na tela depois de busca, filtro e da
  // decisão de mostrar ou não os outros clusters.
  const visiveis = useMemo(
    () => (mostrarOutros ? [...doCluster, ...outrosClusters] : doCluster),
    [doCluster, outrosClusters, mostrarOutros],
  );
  const porId = useMemo(() => new Map(visiveis.map((s) => [s.id, s])), [visiveis]);

  const selecionados = marcadosNaTela
    .map((id) => porId.get(id))
    .filter((s): s is ServicoNaLista => !!s);
  const paraVincular = selecionados.filter((s) => !s.vinculado);
  const paraDesvincular = selecionados.filter((s) => s.vinculado);

  const visiveisSemVinculo = visiveis.filter((s) => !s.vinculado);
  const visiveisComVinculo = visiveis.filter((s) => s.vinculado);

  /** Clique no nome: abre no painel. Com shift: seleciona a faixa, sem abrir. */
  const clicarNome = (servico: ServicoNaLista, comShift: boolean) => {
    if (!comShift) {
      setAncora(servico.id);
      onAbrirServico(servico);
      return;
    }
    onMarcar(faixaDeSelecao(idsVisiveis, ancora, servico.id), !marcados.has(servico.id));
    setAncora(servico.id);
  };

  if (!produto) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Escolha um produto à esquerda para ver e marcar os serviços dele.
        </p>
        <Button size="sm" variant="outline" onClick={onNovo}>
          <Plus className="mr-1 h-3.5 w-3.5" />Novo serviço
        </Button>
      </div>
    );
  }

  const nomesDoAviso = paraDesvincular.slice(0, 3).map((s) => dividirNomeServico(s.nome).nome);
  const restante = paraDesvincular.length - nomesDoAviso.length;

  /** A faixa de um serviço. Sai daqui duas vezes: cluster do produto e outros. */
  const linha = (servico: ServicoNaLista, comCluster: boolean) => {
    const aberto = servico.id === servicoAbertoId;
    const marcado = marcados.has(servico.id);
    const estado = {
      selecionado: marcado,
      vinculado: servico.vinculado,
      desabilitado: servico.salvando,
    };
    const { codigo, nome } = dividirNomeServico(servico.nome);
    return (
      <li key={servico.id}>
        <div
          className={cn(
            listRowClasses(estado),
            'items-center gap-2.5 rounded-none border-y-0 border-r-0 px-2 py-0 min-h-9',
            aberto && 'bg-muted/70',
          )}
        >
          {/* A CAIXA É O VÍNCULO. Um clique liga ou desliga na hora; o
              "Desfazer" vem no toast. */}
          <Checkbox
            checked={servico.vinculado}
            disabled={servico.salvando}
            aria-label={`${servico.vinculado ? 'Desvincular' : 'Vincular'} ${nome}`}
            onCheckedChange={() => onAlternarVinculo(servico)}
          />
          <span className="w-[46px] shrink-0 truncate text-center font-mono text-[11px] text-muted-foreground">
            {codigo || '—'}
          </span>
          <button
            type="button"
            onClick={(evento) => clicarNome(servico, evento.shiftKey)}
            title="Clique para ver os detalhes · Shift+clique para selecionar a faixa"
            {...listRowAria({ vinculado: aberto })}
            className={cn(
              'min-w-0 flex-1 truncate py-2 text-left text-[13px]',
              listRowTitleClasses(estado),
              listRowFocusClasses(),
            )}
          >
            {nome}
          </button>
          {/* O selo do cluster só aparece FORA do cluster do produto: dentro
              dele seria a mesma palavra repetida em toda linha. */}
          {comCluster && (
            <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
              {servico.clusterNome || 'sem cluster'}
            </Badge>
          )}
          {servico.vinculado && (
            <span className={listRowLinkedLabelClasses()}>vinculado</span>
          )}
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            usado em {servico.usadoEm} {servico.usadoEm === 1 ? 'produto' : 'produtos'}
          </span>
        </div>
      </li>
    );
  };

  const listaVazia = doCluster.length === 0 && (!mostrarOutros || outrosClusters.length === 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabeçalho fixo do produto aberto */}
      <div className="shrink-0 space-y-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">{produto.codigo || '—'}</span>
          <span className="text-sm font-semibold text-foreground">{produto.nome || '(sem nome)'}</span>
          {produto.estrutura_clusters?.name && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {produto.estrutura_clusters.name}
            </Badge>
          )}
          {/* O lápis do PRODUTO mora ao lado do nome do produto, e o do SERVIÇO
              no painel do serviço. É a única pista de que os dois cadastros são
              editáveis, e de qual dos dois cada botão mexe. */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-1.5 text-[11px] text-muted-foreground"
            onClick={onEditarProduto}
          >
            <Pencil className="mr-1 h-3 w-3" />Editar produto
          </Button>
          {/* O lápis do PRODUTO mora ao lado do nome do produto, e o do SERVIÇO
              no painel do serviço. É a única pista de que os dois cadastros são
              editáveis, e de qual dos dois cada botão mexe. */}

          <span className="ml-auto text-xs text-muted-foreground">
            <strong className="font-semibold text-primary">{resumo.vinculados}</strong>
            {' '}de {resumo.total} serviços vinculados
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[110px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtro.busca}
              onChange={(e) => onFiltroChange({ busca: e.target.value })}
              placeholder="Buscar serviço..."
              aria-label="Buscar serviço"
              className="h-8 bg-background pl-8 text-sm"
            />
          </div>

          <ToggleGroup
            type="single"
            value={filtro.modo}
            onValueChange={(valor) => valor && onFiltroChange({ modo: valor as FiltroVinculo })}
            className="h-8 shrink-0 gap-0 rounded-md bg-muted p-0.5"
          >
            {MODOS.map((modo) => (
              <ToggleGroupItem
                key={modo.valor}
                value={modo.valor}
                className="h-7 rounded px-2.5 text-xs data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                {modo.rotulo}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <AcoesEmMassaMenu
            faltamVincular={visiveisSemVinculo.length}
            jaVinculados={visiveisComVinculo.length}
            onVincularVisiveis={() => onLote('vincular', visiveisSemVinculo)}
            onDesvincularVisiveis={() => onLote('desvincular', visiveisComVinculo)}
            nomeDoProduto={`${produto.codigo || '?'} — ${produto.nome || ''}`}
          />

          <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={onNovo}>
            <Plus className="mr-1 h-3 w-3" />Novo serviço
          </Button>
        </div>

        {/* Dica permanente, e não tooltip: quem não sabe que o gesto existe não
            passa o mouse para descobrir — e em toque não há mouse nenhum. Subiu
            para cá quando as seções saíram: era no cabeçalho do cluster que ela
            morava. */}
        <p className="hidden text-[11px] text-muted-foreground sm:block">
          A caixa vincula na hora · Shift+clique no nome seleciona um intervalo
        </p>
      </div>

      {aviso && <div className="shrink-0 px-4 pt-2">{aviso}</div>}

      {/* Barra de ação em massa — o mesmo componente das tarefas. */}
      {marcadosNaTela.length > 0 && (
        <div className="shrink-0 px-4 pt-2">
          <BulkActionBar
            count={marcadosNaTela.length}
            label={(n) => `${n} ${n === 1 ? 'serviço selecionado' : 'serviços selecionados'}`}
            onClear={onLimparMarcados}
            actions={[
              {
                label: 'Vincular',
                icon: <Link2 className="h-3.5 w-3.5" />,
                disabled: paraVincular.length === 0,
                onClick: () => onLote('vincular', paraVincular),
              },
              {
                label: 'Desvincular',
                icon: <Unlink className="h-3.5 w-3.5" />,
                variant: 'destructive',
                disabled: paraDesvincular.length === 0,
                onClick: () => setConfirmarDesvincular(true),
              },
            ]}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {carregando ? (
          <div className="space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : listaVazia ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">
            {filtro.busca
              ? 'Nenhum serviço encontrado com esse texto.'
              : filtro.modo === 'vinculados'
                ? 'Este produto ainda não tem serviços vinculados.'
                : 'Nenhum serviço cadastrado neste cluster.'}
          </p>
        ) : (
          <ul className="divide-y">{doCluster.map((servico) => linha(servico, false))}</ul>
        )}

        {/*
          Os outros clusters ficam FECHADOS por padrão. Um produto Tax não tem o
          que fazer com os serviços da OSG, e eram eles que faziam a lista passar
          de 72 para 113 itens. Fechados, e não removidos: existe serviço sem
          cluster no catálogo, e ele não pode ficar inalcançável.
        */}
        {!carregando && outrosClusters.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start text-xs text-muted-foreground"
              onClick={() => onMostrarOutros(!mostrarOutros)}
              aria-expanded={mostrarOutros}
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              {mostrarOutros
                ? `Ocultar os ${outrosClusters.length} serviços de outros clusters`
                : `Ver ${outrosClusters.length} ${outrosClusters.length === 1 ? 'serviço' : 'serviços'} de outros clusters`}
            </Button>
            {mostrarOutros && (
              <ul className="divide-y">{outrosClusters.map((servico) => linha(servico, true))}</ul>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={confirmarDesvincular} onOpenChange={setConfirmarDesvincular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Desvincular {paraDesvincular.length} {paraDesvincular.length === 1 ? 'serviço' : 'serviços'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deixam de estar disponíveis para projetos de{' '}
              <strong>{produto.codigo} — {produto.nome}</strong>:{' '}
              {nomesDoAviso.join(', ')}
              {restante > 0 && ` e outros ${restante} serviço${restante === 1 ? '' : 's'}`}.
              {' '}Você pode vinculá-los de novo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onLote('desvincular', paraDesvincular)}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
