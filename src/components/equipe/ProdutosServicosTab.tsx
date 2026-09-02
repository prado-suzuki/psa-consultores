import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ListaMestreDetalhe from '@/components/equipe/client-form/ListaMestreDetalhe';
import ProdutoLinha from '@/components/equipe/produto-servico/ProdutoLinha';
import ServicosLista, {
  type ServicoNaLista,
} from '@/components/equipe/produto-servico/ServicosLista';
import ServicoDetalhePanel, {
  type ProdutoVinculado,
} from '@/components/equipe/produto-servico/ServicoDetalhePanel';
import ProdutoFormDialog from '@/components/equipe/produto-servico/ProdutoFormDialog';
import ServicoFormDialog from '@/components/equipe/produto-servico/ServicoFormDialog';
import ConfirmarExclusaoDialog from '@/components/equipe/produto-servico/ConfirmarExclusaoDialog';
import { cn } from '@/lib/utils';
import {
  TODOS_CLUSTERS, contarVinculosPorProduto, filtrarProdutos, filtrarServicos,
} from '@/lib/produtoServicoVinculo';
import {
  contarVinculosPorServico, dividirNomeServico, ordenarPorCodigoDeServico,
} from '@/lib/produtoServicoNomes';
import {
  isVinculoOtimista, useProdutoSegmentoList, useProdutoServicoList,
  useProdutoServicoLote, useProdutoServicoToggle, useServicosPrestadosDelete,
  useServicosPrestadosList,
  type ProdutoSegmento, type ServicoPrestado,
} from '@/hooks/useCategorias';
import type { FiltroVinculo } from '@/lib/produtoServicoVinculo';

interface EstadoFormulario<T> {
  aberto: boolean;
  alvo: T | null;
}
const FORM_FECHADO = { aberto: false, alvo: null };

/**
 * Bancada Produtos & Serviços — três colunas.
 *
 * Esquerda: os produtos, na casca `ListaMestreDetalhe` (a mesma do cadastro de
 * cliente, agora em moldura de página). Centro: os serviços do produto aberto,
 * em seções recolhíveis. Direita: o serviço aberto e — o que importa — em quais
 * outros produtos ele vive, com o vínculo reverso ali mesmo.
 *
 * O vínculo não é decorativo: é ele que define quais serviços aparecem ao
 * cadastrar projetos de um produto, e por isso a tela insiste em mostrar quem
 * está sem vínculo (o contador `x/y` e a barra em cada produto).
 *
 * Sem botão Salvar: marcar já grava, com atualização otimista. O que a tela deve
 * é dizer isso — daí o "Salvo automaticamente" no cabeçalho — e oferecer
 * desfazer no que muda muita linha de uma vez.
 *
 * A tela usa só token semântico. Ela vive em `/equipe/acessos`, que o resolvedor
 * de tema resolve para `base-theme` e mais nada, então o acento sai no teal da
 * casa sem que nada aqui saiba disso. Saiu do grafite em 31/08/2026, junto com o
 * resto do Digital, e esta tela não precisou de uma linha para acompanhar — é o
 * que o token semântico compra.
 */
export default function ProdutosServicosTab() {
  const [produtoEscolhidoId, setProdutoEscolhidoId] = useState<string | null>(null);
  const [servicoAbertoId, setServicoAbertoId] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState(true);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [buscaProduto, setBuscaProduto] = useState('');
  const [cluster, setCluster] = useState<string>(TODOS_CLUSTERS);
  const [filtroServico, setFiltroServico] = useState<{ busca: string; modo: FiltroVinculo }>({
    busca: '', modo: 'todos',
  });
  const [mostrarOutrosClusters, setMostrarOutrosClusters] = useState(false);
  const [emAndamento, setEmAndamento] = useState<Set<string>>(new Set());
  const [formProduto, setFormProduto] = useState<EstadoFormulario<ProdutoSegmento>>(FORM_FECHADO);
  const [formServico, setFormServico] = useState<EstadoFormulario<ServicoPrestado>>(FORM_FECHADO);
  const [servicoParaExcluir, setServicoParaExcluir] = useState<ServicoPrestado | null>(null);

  const { data: vinculos = [], isLoading } = useProdutoServicoList();
  const { data: produtos = [] } = useProdutoSegmentoList();
  const { data: servicos = [] } = useServicosPrestadosList();

  const toggleVinculo = useProdutoServicoToggle();
  const lote = useProdutoServicoLote();
  const { remove: removerServico } = useServicosPrestadosDelete();

  // ── Produtos ────────────────────────────────────────────────────────
  const contagemPorProduto = useMemo(() => contarVinculosPorProduto(vinculos), [vinculos]);
  const produtosAtivos = useMemo(() => produtos.filter((p) => p.is_active), [produtos]);

  const clustersDisponiveis = useMemo(() => {
    const nomes = new Map<string, string>();
    for (const produto of produtosAtivos) {
      if (produto.cluster_id) nomes.set(produto.cluster_id, produto.estrutura_clusters?.name || 'Sem nome');
    }
    return [...nomes].map(([id, nome]) => ({ id, nome }));
  }, [produtosAtivos]);

  const produtosVisiveis = useMemo(() => {
    const porCluster = cluster === TODOS_CLUSTERS
      ? produtosAtivos
      : produtosAtivos.filter((p) => p.cluster_id === cluster);
    return filtrarProdutos(porCluster, buscaProduto);
  }, [produtosAtivos, cluster, buscaProduto]);

  const produtoSelecionado = useMemo(
    () => produtos.find((p) => p.id === produtoEscolhidoId) ?? produtosVisiveis[0] ?? null,
    [produtos, produtoEscolhidoId, produtosVisiveis],
  );

  // ── Serviços do produto aberto ──────────────────────────────────────
  const vinculosDoProduto = useMemo(
    () => vinculos.filter((v) => v.produto_segmento_id === produtoSelecionado?.id),
    [vinculos, produtoSelecionado?.id],
  );
  const vinculoPorServico = useMemo(
    () => new Map(vinculosDoProduto.map((v) => [v.servico_prestado_id, v])),
    [vinculosDoProduto],
  );
  const idsVinculados = useMemo(
    () => new Set(vinculosDoProduto.map((v) => v.servico_prestado_id)),
    [vinculosDoProduto],
  );
  const usoPorServico = useMemo(() => contarVinculosPorServico(vinculos), [vinculos]);

  const servicosVisiveis = useMemo<ServicoNaLista[]>(() => (
    filtrarServicos(servicos, {
      termo: filtroServico.busca, filtro: filtroServico.modo, vinculados: idsVinculados,
    }).map((s) => ({
      id: s.id,
      nome: s.nome,
      vinculado: idsVinculados.has(s.id),
      salvando: emAndamento.has(s.id),
      usadoEm: usoPorServico[s.id] || 0,
      clusterId: s.cluster_id ?? null,
      clusterNome: s.estrutura_clusters?.name ?? null,
    }))
  ), [servicos, filtroServico, idsVinculados, emAndamento, usoPorServico]);

  /**
   * DUAS listas planas, ordenadas pelo código: a do cluster do produto e a dos
   * outros.
   *
   * Substituiu o agrupamento em dois níveis (cluster › seção numérica) em
   * 27/08/2026. O corte por cluster ficou, mas virou uma decisão de VISIBILIDADE
   * em vez de cabeçalho: um produto Tax abre com os 72 serviços Tax e os outros
   * 41 esperam atrás de um botão. As "seções" saíram inteiras — o número que as
   * nomeava não existe como dado, e ordenar pelo código junta os "1.x" do mesmo
   * jeito, sem sanfona.
   *
   * Produto SEM cluster não tem o que separar: tudo cai na lista principal, e
   * não sobra nada para o botão.
   */
  const listasDeServico = useMemo(() => {
    const emOrdem = ordenarPorCodigoDeServico(servicosVisiveis, (s) => s.nome);
    const clusterDoProduto = produtoSelecionado?.cluster_id ?? null;
    if (!clusterDoProduto) return { doCluster: emOrdem, outros: [] as ServicoNaLista[] };
    return {
      doCluster: emOrdem.filter((s) => s.clusterId === clusterDoProduto),
      outros: emOrdem.filter((s) => s.clusterId !== clusterDoProduto),
    };
  }, [servicosVisiveis, produtoSelecionado?.cluster_id]);

  // Ordem de exibição — é dela que sai a faixa do shift+clique. Os outros
  // clusters só entram quando estão abertos: shift+clique não pode saltar para
  // uma linha que a pessoa não vê.
  const idsVisiveis = useMemo(
    () => [
      ...listasDeServico.doCluster.map((s) => s.id),
      ...(mostrarOutrosClusters ? listasDeServico.outros.map((s) => s.id) : []),
    ],
    [listasDeServico, mostrarOutrosClusters],
  );

  /**
   * Denominador do contador da lista de produtos: os serviços do CLUSTER do
   * produto, não os do catálogo. Com o catálogo inteiro todo produto ficava em
   * "2/107", "7/107" — a barra nunca saía de ~2% e não distinguia nada.
   */
  const totalPorCluster = useMemo(() => {
    const total: Record<string, number> = {};
    for (const servico of servicos) {
      const chave = servico.cluster_id ?? '';
      total[chave] = (total[chave] || 0) + 1;
    }
    return total;
  }, [servicos]);

  // Trocar de produto zera a seleção: marcar serviço só faz sentido dentro do
  // produto em que a marca foi feita. E fecha os outros clusters: o cluster do
  // produto novo é outro, então "outros" quer dizer outra coisa.
  useEffect(() => {
    setMarcados(new Set());
    setMostrarOutrosClusters(false);
  }, [produtoSelecionado?.id]);

  // ── Serviço aberto no painel direito ────────────────────────────────
  const servicoAberto = useMemo(
    () => servicosVisiveis.find((s) => s.id === servicoAbertoId) ?? null,
    [servicosVisiveis, servicoAbertoId],
  );
  const clusterDoServico = useMemo(() => {
    const bruto = servicos.find((s) => s.id === servicoAbertoId);
    return bruto?.estrutura_clusters?.name ?? null;
  }, [servicos, servicoAbertoId]);

  const produtosDoServico = useMemo(() => {
    const ligados = new Set(
      vinculos.filter((v) => v.servico_prestado_id === servicoAbertoId)
        .map((v) => v.produto_segmento_id),
    );
    const comoLinha = (p: ProdutoSegmento): ProdutoVinculado => ({
      id: p.id, codigo: p.codigo, nome: p.nome,
    });
    return {
      vinculados: produtosAtivos.filter((p) => ligados.has(p.id)).map(comoLinha),
      disponiveis: produtosAtivos.filter((p) => !ligados.has(p.id)).map(comoLinha),
    };
  }, [vinculos, servicoAbertoId, produtosAtivos]);

  // ── Ações ───────────────────────────────────────────────────────────
  /**
   * O "Desfazer" do toast precisa chamar `alternarVinculo`, que é definida
   * abaixo — referenciá-la direto criaria ciclo no `useCallback`. A ref guarda
   * sempre a versão corrente.
   */
  const alternarVinculoRef = useRef<(p: string, s: string, n: string) => Promise<void>>();

  const alternarVinculo = useCallback(async (produtoId: string, servicoId: string, servicoNome: string) => {
    if (emAndamento.has(servicoId)) return;
    const vinculoAtual = vinculos.find(
      (v) => v.produto_segmento_id === produtoId && v.servico_prestado_id === servicoId,
    ) ?? null;
    if (vinculoAtual && isVinculoOtimista(vinculoAtual.id)) return;

    const desvinculando = !!vinculoAtual;
    setEmAndamento((atual) => new Set(atual).add(servicoId));
    try {
      await toggleVinculo.mutateAsync({
        produtoSegmentoId: produtoId,
        servicoPrestadoId: servicoId,
        vinculoAtual,
        entityName: `${produtoSelecionado?.codigo || '?'} → ${servicoNome}`,
      });
      // O desfazer de um clique é o próprio clique de volta — o toggle é
      // simétrico. Existe mesmo assim porque, sem ele, desvincular por engano
      // só se percebe depois, e aí é preciso reencontrar a linha na lista.
      const { nome } = dividirNomeServico(servicoNome);
      toast.success(desvinculando ? `"${nome}" desvinculado` : `"${nome}" vinculado`, {
        action: {
          label: 'Desfazer',
          onClick: () => void alternarVinculoRef.current?.(produtoId, servicoId, servicoNome),
        },
      });
    } catch {
      // erro já tratado no hook (rollback + toast)
    } finally {
      setEmAndamento((atual) => {
        const proximo = new Set(atual);
        proximo.delete(servicoId);
        return proximo;
      });
    }
  }, [emAndamento, vinculos, toggleVinculo, produtoSelecionado?.codigo]);

  alternarVinculoRef.current = alternarVinculo;

  /**
   * Vincula/desvincula em lote e oferece DESFAZER.
   *
   * O desfazer é o inverso exato: o que foi criado é apagado pelos ids que o
   * insert devolveu, e o que foi apagado é recriado a partir dos serviços que a
   * ação recebeu. Só existe para o lote — o clique numa linha só já é otimista e
   * se desfaz clicando de novo.
   */
  const executarLote = useCallback(async (
    acao: 'vincular' | 'desvincular',
    servicosAlvo: ServicoNaLista[],
  ) => {
    if (!produtoSelecionado || servicosAlvo.length === 0) return;
    const produtoId = produtoSelecionado.id;
    const produtoCodigo = produtoSelecionado.codigo || '?';
    const quantos = servicosAlvo.length;
    const rotulo = `${quantos} ${quantos === 1 ? 'serviço' : 'serviços'}`;

    try {
      if (acao === 'vincular') {
        const resultado = await lote.mutateAsync({
          acao: 'vincular',
          produtoSegmentoId: produtoId,
          produtoCodigo,
          servicos: servicosAlvo.map((s) => ({ id: s.id, nome: s.nome })),
        });
        const criados = resultado.acao === 'vincular' ? resultado.criados : [];
        toast.success(`${rotulo} vinculados`, {
          action: {
            label: 'Desfazer',
            onClick: () => {
              void lote.mutateAsync({
                acao: 'desvincular',
                produtoCodigo,
                vinculos: criados.map((linha) => ({
                  id: linha.id,
                  servicoNome: servicosAlvo.find((s) => s.id === linha.servico_prestado_id)?.nome || '?',
                })),
              });
            },
          },
        });
      } else {
        const alvos = servicosAlvo
          .map((s) => ({ vinculo: vinculoPorServico.get(s.id), servico: s }))
          .filter((par) => !!par.vinculo && !isVinculoOtimista(par.vinculo.id));
        if (alvos.length === 0) return;
        await lote.mutateAsync({
          acao: 'desvincular',
          produtoCodigo,
          vinculos: alvos.map((par) => ({ id: par.vinculo!.id, servicoNome: par.servico.nome })),
        });
        toast.success(`${rotulo} desvinculados`, {
          action: {
            label: 'Desfazer',
            onClick: () => {
              void lote.mutateAsync({
                acao: 'vincular',
                produtoSegmentoId: produtoId,
                produtoCodigo,
                servicos: alvos.map((par) => ({ id: par.servico.id, nome: par.servico.nome })),
              });
            },
          },
        });
      }
      setMarcados(new Set());
    } catch {
      // erro já tratado no hook
    }
  }, [produtoSelecionado, lote, vinculoPorServico]);

  const marcar = useCallback((ids: string[], marcarAgora: boolean) => {
    setMarcados((atual) => {
      const proximo = new Set(atual);
      for (const id of ids) {
        if (marcarAgora) proximo.add(id);
        else proximo.delete(id);
      }
      return proximo;
    });
  }, []);

  const vincularSugeridosDoCluster = useCallback(() => {
    if (!produtoSelecionado?.cluster_id) return;
    void executarLote('vincular', listasDeServico.doCluster.filter((s) => !s.vinculado));
  }, [produtoSelecionado, listasDeServico, executarLote]);

  const semVinculoNenhum = produtoSelecionado && vinculosDoProduto.length === 0;

  return (
    // Altura DEFINIDA, não mínima: é ela que a casca reparte entre a lista de
    // produtos, os serviços e o painel. Com `min-h` a casca crescia até a altura
    // dos 19 produtos e as duas colunas da direita ficavam centradas ~800px
    // abaixo, fora da tela — a bancada parecia vazia à direita.
    <div className="flex h-[72vh] min-h-[480px] flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        {/*
          O texto anterior — "define quais serviços aparecem ao cadastrar
          projetos" — descrevia a premissa de 09/08/2026, em que `produto_servico`
          era taxonomia de escopo e nada mais. A sprint reverteu isso em
          18/08/2026: `gerar_tarefas_projeto` passou a ler esta tabela, e agora
          marcar aqui decide se um projeto NOVO nasce com aquela tarefa.

          A última oração não é conforto, é o que destrava a tela: sem ela a
          pessoa fica na dúvida se desmarcar mexe no que já existe, e não mexe em
          nada. Tela de curadoria que ninguém ousa editar não serve para nada.
          Verificado no banco: a geração não insere quando o projeto já tem
          tarefa de nível superior para o serviço, e desvincular não apaga tarefa
          já gerada.
        */}
        <p className="text-xs text-muted-foreground">
          O vínculo define os serviços do produto. Cada serviço vinculado vira uma tarefa em
          projetos novos desse produto — projetos já criados não mudam.
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">Salvo automaticamente</span>
      </div>

      <ListaMestreDetalhe<string>
        moldura="pagina"
        larguraLista="w-[280px]"
        titulo={`Produtos (${produtosVisiveis.length})`}
        cabecalhoLista={(
          <div className="space-y-2">
            {/*
              O "Novo produto" fica AQUI, no topo da própria coluna, e não na
              faixa de título do cartão: lá ele encostava na borda direita da
              página, a mais de mil pixels da lista que cria, e o rótulo "Novo"
              não dizia novo o quê — o "Novo serviço" da coluna do meio dizia a
              mesma palavra.
            */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full justify-center text-xs"
              onClick={() => setFormProduto({ aberto: true, alvo: null })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />Novo produto
            </Button>
            <div className="flex flex-wrap gap-1">
              {[{ id: TODOS_CLUSTERS, nome: 'Todos' }, ...clustersDisponiveis].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCluster(chip.id)}
                  aria-pressed={cluster === chip.id}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
                    cluster === chip.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {chip.nome}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Buscar produto..."
                aria-label="Buscar produto"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
        )}
        linhas={produtosVisiveis.map((produto) => ({ id: produto.id, titulo: produto.nome }))}
        selecionadoId={produtoSelecionado?.id ?? null}
        onSelecionar={setProdutoEscolhidoId}
        renderLinha={({ linha, selecionada, selecionar }) => {
          const produto = produtosVisiveis.find((p) => p.id === linha.id);
          if (!produto) return null;
          return (
            <ProdutoLinha
              codigo={produto.codigo}
              nome={produto.nome}
              vinculados={contagemPorProduto[produto.id] || 0}
              total={totalPorCluster[produto.cluster_id ?? ''] ?? 0}
              ativo={produto.is_active}
              selecionado={selecionada}
              onSelecionar={selecionar}
            />
          );
        }}
        vazio={buscaProduto ? 'Nenhum produto com esse texto.' : 'Nenhum produto neste cluster.'}
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {
            /*
              A coluna do meio fica SEMPRE montada. Antes, produto sem vínculo
              nenhum trocava a coluna inteira por um cartaz — e o cartaz não tem
              busca, não tem "Novo serviço" e não tem o lápis do produto. Quem
              desvinculava tudo perdia o acesso a criar serviço no produto.
              Agora a mesma mensagem desce como faixa dentro da coluna.
            */
            <ServicosLista
              produto={produtoSelecionado}
              doCluster={listasDeServico.doCluster}
              outrosClusters={listasDeServico.outros}
              mostrarOutros={mostrarOutrosClusters}
              onMostrarOutros={setMostrarOutrosClusters}
              idsVisiveis={idsVisiveis}
              resumo={{ vinculados: vinculosDoProduto.length, total: totalPorCluster[produtoSelecionado?.cluster_id ?? ''] ?? 0 }}
              filtro={filtroServico}
              onFiltroChange={(patch) => setFiltroServico((atual) => ({ ...atual, ...patch }))}
              marcados={marcados}
              onMarcar={marcar}
              onLimparMarcados={() => setMarcados(new Set())}
              servicoAbertoId={servicoAbertoId}
              onAbrirServico={(servico) => { setServicoAbertoId(servico.id); setPainelAberto(true); }}
              onLote={(acao, alvos) => void executarLote(acao, alvos)}
              onAlternarVinculo={(servico) => {
                if (produtoSelecionado) void alternarVinculo(produtoSelecionado.id, servico.id, servico.nome);
              }}
              onNovo={() => setFormServico({ aberto: true, alvo: null })}
              onEditarProduto={() => {
                if (produtoSelecionado) setFormProduto({ aberto: true, alvo: produtoSelecionado });
              }}
              /*
                Produto sem serviço é ESTADO VÁLIDO, e a faixa é informativa —
                nem âmbar, nem alarme.

                Ela dizia "sem vínculo, nenhum projeto pode ser cadastrado para
                ele", e isso era falso. Conferido nos dois lados em 27/08/2026:
                `validateProjectForm` não pede `servico_id`, e
                `gerar_tarefas_projeto` sai por `select` vazio devolvendo 0, sem
                exceção. Produto sem serviço cria projeto igual — o projeto só
                nasce sem tarefa, que é o desenho do Canal de Chamados.
              */
              aviso={semVinculoNenhum ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
                  <span>
                    Nenhum serviço vinculado. Projetos de{' '}
                    <strong className="font-semibold text-foreground">
                      {produtoSelecionado?.codigo} — {produtoSelecionado?.nome}
                    </strong>
                    {' '}são cadastrados normalmente; só nascem sem tarefa nenhuma.
                  </span>
                  {produtoSelecionado?.cluster_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-7 text-xs"
                      onClick={vincularSugeridosDoCluster}
                    >
                      Vincular sugeridos do mesmo cluster
                    </Button>
                  )}
                </div>
              ) : undefined}
              carregando={isLoading}
            />
          }

          {painelAberto && (
            <ServicoDetalhePanel
              servico={servicoAberto}
              cluster={clusterDoServico}
              vinculados={produtosDoServico.vinculados}
              disponiveis={produtosDoServico.disponiveis}
              carregando={isLoading}
              onEditar={() => {
                const bruto = servicos.find((s) => s.id === servicoAberto?.id);
                if (bruto) setFormServico({ aberto: true, alvo: bruto });
              }}
              onExcluir={() => {
                const bruto = servicos.find((s) => s.id === servicoAberto?.id);
                if (bruto) setServicoParaExcluir(bruto);
              }}
              onFechar={() => setPainelAberto(false)}
              onDesvincular={(produto) => {
                if (servicoAberto) void alternarVinculo(produto.id, servicoAberto.id, servicoAberto.nome);
              }}
              onVincular={(produtoId) => {
                if (servicoAberto) void alternarVinculo(produtoId, servicoAberto.id, servicoAberto.nome);
              }}
            />
          )}
        </div>
      </ListaMestreDetalhe>

      <ProdutoFormDialog
        aberto={formProduto.aberto}
        produto={formProduto.alvo}
        clusterPadrao={cluster === TODOS_CLUSTERS ? null : cluster}
        onFechar={() => setFormProduto(FORM_FECHADO)}
        onCriado={setProdutoEscolhidoId}
      />

      <ServicoFormDialog
        aberto={formServico.aberto}
        servico={formServico.alvo}
        clusterPadrao={produtoSelecionado?.cluster_id ?? null}
        onFechar={() => setFormServico(FORM_FECHADO)}
        onCriado={(servicoId, nome) => {
          // Serviço criado dentro de um produto já entra vinculado a ele.
          if (produtoSelecionado) void alternarVinculo(produtoSelecionado.id, servicoId, nome);
        }}
      />

      <ConfirmarExclusaoDialog
        aberto={!!servicoParaExcluir}
        titulo="Excluir serviço?"
        descricao={`"${dividirNomeServico(servicoParaExcluir?.nome).nome}" será excluído e desvinculado de todos os produtos.`}
        onCancelar={() => setServicoParaExcluir(null)}
        onConfirmar={async () => {
          if (!servicoParaExcluir) return;
          await removerServico(servicoParaExcluir);
          if (servicoAbertoId === servicoParaExcluir.id) setServicoAbertoId(null);
          setServicoParaExcluir(null);
        }}
      />
    </div>
  );
}
