import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Link2, Plus, Search, Unlink } from 'lucide-react';

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
import {
  type GrupoDeCluster, dividirNomeServico, estadoDaSecao, faixaDeSelecao,
} from '@/lib/produtoServicoSecoes';
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
  /** Cluster do serviço — é o primeiro nível do agrupamento. */
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
  grupos: GrupoDeCluster<ServicoNaLista>[];
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
  carregando: boolean;
}

/**
 * Coluna central: os serviços do produto aberto, em seções recolhíveis.
 *
 * Dois níveis: CLUSTER e, dentro dele, seção numérica. O cluster não é enfeite —
 * OSG numera "1.01" e Tax numera "1.1", e as duas dão seção "1", então um
 * agrupamento plano junta os dois debaixo do mesmo cabeçalho. Ver
 * `agruparPorClusterESecao`.
 *
 * Só a primeira seção do cluster sugerido nasce aberta: abrir tudo devolve a
 * lista corrida que as seções existem para evitar.
 *
 * DOIS GESTOS, DOIS SIGNIFICADOS, e é o que a caixa comunica:
 *
 * · a CAIXA é o vínculo. Um clique liga ou desliga na hora, com "Desfazer" no
 *   toast. Marcada = vinculado, e é por isso que ela leva o acento.
 * · SHIFT+clique no nome seleciona a faixa para ação em massa, com preenchimento
 *   NEUTRO. A barra em massa só aparece daí.
 *
 * A versão anterior acumulava os dois sentidos na caixa: marcar era selecionar,
 * e vincular exigia passar pela barra — dois cliques para o caso comum, que é
 * vincular um serviço.
 *
 * As linhas são FAIXAS, não cartões: sem raio, sem borda em volta, separadas por
 * um fio. Quem manda na cor do estado é o `listRowStates`; a forma é local.
 */
export default function ServicosSecaoLista({
  produto, grupos, idsVisiveis, resumo, filtro, onFiltroChange,
  marcados, onMarcar, onLimparMarcados, servicoAbertoId, onAbrirServico,
  onLote, onAlternarVinculo, onNovo, carregando,
}: Props) {
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const [ancora, setAncora] = useState<string | null>(null);
  const [confirmarDesvincular, setConfirmarDesvincular] = useState(false);

  // Trocar de produto reinicia a sanfona: as seções do produto anterior não
  // dizem nada sobre o novo.
  useEffect(() => {
    // Chave composta: a seção "1" existe dentro de CADA cluster, então a chave
    // da seção sozinha colidiria entre eles.
    const todas = grupos.flatMap((g) => g.secoes.map((s) => `${g.chave}:${s.chave}`));
    setRecolhidas(new Set(todas.slice(1)));
    setAncora(null);
    // `produto?.id` é a dependência real; `secoes` muda a cada filtro e
    // reabriria tudo a cada tecla digitada na busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.id]);

  const marcadosNaTela = useMemo(
    () => idsVisiveis.filter((id) => marcados.has(id)),
    [idsVisiveis, marcados],
  );
  const servicosPorId = useMemo(() => {
    const mapa = new Map<string, ServicoNaLista>();
    for (const grupo of grupos) for (const secao of grupo.secoes) for (const item of secao.itens) mapa.set(item.id, item);
    return mapa;
  }, [grupos]);

  const selecionados = marcadosNaTela
    .map((id) => servicosPorId.get(id))
    .filter((s): s is ServicoNaLista => !!s);
  const paraVincular = selecionados.filter((s) => !s.vinculado);
  const paraDesvincular = selecionados.filter((s) => s.vinculado);

  // "Visíveis" é literal: o que está na tela depois de busca e filtro.
  const visiveis = useMemo(() => [...servicosPorId.values()], [servicosPorId]);
  const visiveisSemVinculo = visiveis.filter((s) => !s.vinculado);
  const visiveisComVinculo = visiveis.filter((s) => s.vinculado);

  const alternarSecao = (chave: string) => setRecolhidas((atual) => {
    const proximo = new Set(atual);
    if (proximo.has(chave)) proximo.delete(chave);
    else proximo.add(chave);
    return proximo;
  });

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

          <Button size="sm" variant="ghost" className="h-8 shrink-0 text-xs" onClick={onNovo}>
            <Plus className="mr-1 h-3 w-3" />Novo
          </Button>
        </div>
      </div>

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
        ) : grupos.length === 0 ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">
            {filtro.busca
              ? 'Nenhum serviço encontrado com esse texto.'
              : filtro.modo === 'vinculados'
                ? 'Este produto ainda não tem serviços vinculados.'
                : 'Nenhum serviço cadastrado.'}
          </p>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.chave} className="mb-4 last:mb-0">
              {/* Cabeçalho do CLUSTER — é ele que torna o número da seção não
                  ambíguo, e o contador dele é sobre o cluster, não sobre o
                  catálogo inteiro. */}
              <div className="sticky top-0 z-10 -mx-4 mb-1.5 flex items-center gap-2 border-b bg-background px-4 py-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {grupo.titulo}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {grupo.vinculados}/{grupo.total} vinculados
                </span>
                {/* Dica permanente, e nao tooltip: quem nao sabe que o gesto
                    existe nao passa o mouse para descobrir — e em toque nao ha
                    mouse nenhum. Custa uma ponta de linha que ja existia. */}
                <span className="ml-auto hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                  Shift+clique seleciona um intervalo
                </span>
              </div>

              {grupo.secoes.map((secao) => {
                const chaveSecao = `${grupo.chave}:${secao.chave}`;
                const recolhida = recolhidas.has(chaveSecao);
                const vinculadosNaSecao = secao.itens.filter((s) => s.vinculado).length;
                // Tri-state sobre o VÍNCULO, no mesmo sentido da caixa da linha.
                const estadoCaixa = estadoDaSecao(secao.itens, new Set(
                  secao.itens.filter((s) => s.vinculado).map((s) => s.id),
                ));
                return (
                  <div key={chaveSecao} className="mb-1.5 last:mb-0">
                    {/* Cabeçalho de SEÇÃO — leve de propósito. Ele mora DENTRO
                        do cluster, e quando os dois tinham peso parecido a
                        hierarquia não lia: pareciam irmãos. Aqui não há fio de
                        largura inteira nem caixa; só o chevron, o nome e o
                        contador, no menor tamanho da tela. */}
                    <div className="flex items-center gap-1.5 py-0.5 pl-1">
                      {/* Caixa da seção: vincula ou desvincula os itens dela de
                          uma vez. Com seções de 18 serviços é onde a tela ganha
                          tempo, e o "Desfazer" do toast cobre o engano. Miúda,
                          para não competir com a caixa da linha. */}
                      <Checkbox
                        checked={estadoCaixa}
                        className="h-3.5 w-3.5 shrink-0"
                        aria-label={`Vincular todos os serviços da seção ${secao.titulo} de ${grupo.titulo}`}
                        onCheckedChange={(marcar) => onLote(
                          marcar === true ? 'vincular' : 'desvincular',
                          marcar === true
                            ? secao.itens.filter((s) => !s.vinculado)
                            : secao.itens.filter((s) => s.vinculado),
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => alternarSecao(chaveSecao)}
                        aria-expanded={!recolhida}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      >
                      {recolhida
                        ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
                      <span className="truncate text-[10px] font-medium text-muted-foreground">
                        Seção {secao.titulo}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                        {vinculadosNaSecao}/{secao.itens.length}
                      </span>
                      </button>
                    </div>

                    {!recolhida && (
                      <ul className="divide-y">
                        {secao.itens.map((servico) => {
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
                                {/* A CAIXA É O VÍNCULO. Um clique liga ou
                                    desliga na hora; o "Desfazer" vem no toast. */}
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
                                {servico.vinculado && (
                                  <span className={listRowLinkedLabelClasses()}>vinculado</span>
                                )}
                                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                  usado em {servico.usadoEm} {servico.usadoEm === 1 ? 'produto' : 'produtos'}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          ))
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
