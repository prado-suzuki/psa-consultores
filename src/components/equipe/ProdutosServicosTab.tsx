import { useCallback, useMemo, useState } from 'react';
import {
  TODOS_CLUSTERS, agruparPorCluster, contarVinculosPorProduto,
  filtrarProdutos, filtrarServicos, separarVisiveisParaLote,
} from '@/lib/produtoServicoVinculo';
import {
  isVinculoOtimista, useProdutoSegmentoDelete, useProdutoSegmentoList, useProdutoSegmentoToggle,
  useProdutoServicoList, useProdutoServicoLote, useProdutoServicoToggle,
  useServicosPrestadosDelete, useServicosPrestadosList,
  type ProdutoSegmento, type ServicoPrestado,
} from '@/hooks/useCategorias';
import { useEstruturaClusters } from '@/hooks/useEstruturaManager';
import ProdutosVinculoPanel, {
  type ChipCluster, type FiltroProdutos, type ProdutoComVinculos,
} from '@/components/equipe/produto-servico/ProdutosVinculoPanel';
import ServicosVinculoPanel, {
  type FiltroServicos, type ServicoComVinculo,
} from '@/components/equipe/produto-servico/ServicosVinculoPanel';
import ProdutoFormDialog from '@/components/equipe/produto-servico/ProdutoFormDialog';
import ServicoFormDialog from '@/components/equipe/produto-servico/ServicoFormDialog';
import ConfirmarExclusaoDialog from '@/components/equipe/produto-servico/ConfirmarExclusaoDialog';

/** `aberto` com `alvo: null` = criar; com `alvo` preenchido = editar. */
interface EstadoFormulario<T> {
  aberto: boolean;
  alvo: T | null;
}

const FORM_FECHADO = { aberto: false, alvo: null };

/**
 * Bancada Produtos & Serviços: cadastra produto/segmento e serviço prestado nas
 * mesmas duas colunas em que se marca o vínculo entre eles. É esse vínculo que
 * define os serviços disponíveis no cadastro de projetos, então a tela destaca
 * quem está sem vínculo.
 */
export default function ProdutosServicosTab() {
  const [produtoEscolhidoId, setProdutoEscolhidoId] = useState<string | null>(null);
  // `cluster: ''` = nenhuma aba escolhida ainda; cai na primeira com produtos.
  const [filtroProduto, setFiltroProduto] = useState<FiltroProdutos>({
    busca: '', cluster: '', incluirInativos: false, apenasSemVinculo: false,
  });
  const [filtroServico, setFiltroServico] = useState<FiltroServicos>({ busca: '', modo: 'todos' });
  const [servicosEmAndamento, setServicosEmAndamento] = useState<Set<string>>(new Set());
  const [formProduto, setFormProduto] = useState<EstadoFormulario<ProdutoSegmento>>(FORM_FECHADO);
  const [formServico, setFormServico] = useState<EstadoFormulario<ServicoPrestado>>(FORM_FECHADO);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<ProdutoComVinculos | null>(null);
  const [servicoParaExcluir, setServicoParaExcluir] = useState<ServicoPrestado | null>(null);

  const { data: vinculos = [], isLoading } = useProdutoServicoList();
  const { data: produtos = [] } = useProdutoSegmentoList();
  const { data: servicos = [] } = useServicosPrestadosList();
  const { data: clusters = [] } = useEstruturaClusters();

  const toggleVinculo = useProdutoServicoToggle();
  const lote = useProdutoServicoLote();
  const alternarAtivo = useProdutoSegmentoToggle();
  const { remove: removerProduto } = useProdutoSegmentoDelete();
  const { remove: removerServico } = useServicosPrestadosDelete();

  // Clusters inativos são legado da fusão com empresas_faturamento: vão para o fim, marcados.
  const clustersInativos = useMemo(
    () => new Set(clusters.filter(c => !c.is_active).map(c => c.id)),
    [clusters],
  );

  // ── Produtos ────────────────────────────────────────────────────────
  const produtosComContagem = useMemo<ProdutoComVinculos[]>(() => {
    const contagem = contarVinculosPorProduto(vinculos);
    return produtos
      .filter(p => p.is_active || filtroProduto.incluirInativos)
      .map(p => ({ ...p, totalVinculos: contagem[p.id] || 0 }));
  }, [produtos, vinculos, filtroProduto.incluirInativos]);

  const gruposProdutos = useMemo(
    () => agruparPorCluster(produtosComContagem, { clustersInativos }),
    [produtosComContagem, clustersInativos],
  );

  const abas = useMemo<ChipCluster[]>(() => [
    ...gruposProdutos.map(g => ({ key: g.key, nome: g.nome, inativo: g.inativo, total: g.items.length })),
    { key: TODOS_CLUSTERS, nome: 'Todos', inativo: false, total: produtosComContagem.length },
  ], [gruposProdutos, produtosComContagem.length]);

  // Sem escolha do usuário (ou cluster que deixou de existir), abre no primeiro cluster.
  const clusterAtivo = filtroProduto.cluster === TODOS_CLUSTERS
    || gruposProdutos.some(g => g.key === filtroProduto.cluster)
    ? filtroProduto.cluster
    : gruposProdutos[0]?.key ?? TODOS_CLUSTERS;

  // Buscar percorre todos os clusters — senão o produto de outra aba "não existe".
  const gruposProdutosVisiveis = useMemo(() => {
    const buscando = filtroProduto.busca.trim().length > 0;
    return gruposProdutos
      .filter(g => buscando || clusterAtivo === TODOS_CLUSTERS || g.key === clusterAtivo)
      .map(g => ({
        ...g,
        items: filtrarProdutos(g.items, filtroProduto.busca)
          .filter(p => !filtroProduto.apenasSemVinculo || p.totalVinculos === 0),
      }))
      .filter(g => g.items.length > 0);
  }, [gruposProdutos, clusterAtivo, filtroProduto.busca, filtroProduto.apenasSemVinculo]);

  // Seleção explícita vence; se ela sumiu (produto excluído/desativado), usa o primeiro visível.
  const produtoSelecionado = useMemo(() => {
    const escolhido = produtosComContagem.find(p => p.id === produtoEscolhidoId);
    return escolhido ?? gruposProdutosVisiveis[0]?.items[0] ?? produtosComContagem[0] ?? null;
  }, [produtosComContagem, produtoEscolhidoId, gruposProdutosVisiveis]);

  // ── Serviços do produto selecionado ─────────────────────────────────
  const vinculosDoProduto = useMemo(
    () => vinculos.filter(v => v.produto_segmento_id === produtoSelecionado?.id),
    [vinculos, produtoSelecionado?.id],
  );

  const vinculoPorServico = useMemo(
    () => new Map(vinculosDoProduto.map(v => [v.servico_prestado_id, v])),
    [vinculosDoProduto],
  );

  const idsVinculados = useMemo(
    () => new Set(vinculosDoProduto.map(v => v.servico_prestado_id)),
    [vinculosDoProduto],
  );

  const servicosVisiveis = useMemo(
    () => filtrarServicos(servicos, {
      termo: filtroServico.busca,
      filtro: filtroServico.modo,
      vinculados: idsVinculados,
    }),
    [servicos, filtroServico, idsVinculados],
  );

  const { paraVincular, jaVinculados } = useMemo(
    () => separarVisiveisParaLote(servicosVisiveis, idsVinculados),
    [servicosVisiveis, idsVinculados],
  );

  const gruposServicos = useMemo(() => {
    const enriquecidos: ServicoComVinculo[] = servicosVisiveis.map(s => ({
      ...s,
      vinculado: idsVinculados.has(s.id),
      salvando: servicosEmAndamento.has(s.id),
    }));
    return agruparPorCluster(enriquecidos, {
      clustersInativos,
      clusterSugerido: produtoSelecionado?.cluster_id ?? null,
    });
  }, [servicosVisiveis, idsVinculados, servicosEmAndamento, clustersInativos, produtoSelecionado?.cluster_id]);

  // ── Vínculo ─────────────────────────────────────────────────────────
  const vincularServico = useCallback(async (servicoId: string, servicoNome: string) => {
    if (!produtoSelecionado || servicosEmAndamento.has(servicoId)) return;
    const vinculoAtual = vinculoPorServico.get(servicoId) ?? null;
    // Linha otimista ainda sem id real: ignora o clique até o insert voltar.
    if (vinculoAtual && isVinculoOtimista(vinculoAtual.id)) return;

    setServicosEmAndamento(prev => new Set(prev).add(servicoId));
    try {
      await toggleVinculo.mutateAsync({
        produtoSegmentoId: produtoSelecionado.id,
        servicoPrestadoId: servicoId,
        vinculoAtual,
        entityName: `${produtoSelecionado.codigo || '?'} → ${servicoNome}`,
      });
    } catch {
      // erro tratado no hook (rollback + toast)
    } finally {
      setServicosEmAndamento(prev => {
        const proximo = new Set(prev);
        proximo.delete(servicoId);
        return proximo;
      });
    }
  }, [produtoSelecionado, servicosEmAndamento, vinculoPorServico, toggleVinculo]);

  const handleLote = useCallback((acao: 'vincular' | 'desvincular') => {
    if (!produtoSelecionado) return;
    const produtoCodigo = produtoSelecionado.codigo || '?';

    if (acao === 'vincular') {
      if (paraVincular.length === 0) return;
      lote.mutate({
        acao: 'vincular',
        produtoSegmentoId: produtoSelecionado.id,
        produtoCodigo,
        servicos: paraVincular.map(s => ({ id: s.id, nome: s.nome })),
      });
      return;
    }

    const alvo = jaVinculados
      .map(s => ({ id: vinculoPorServico.get(s.id)?.id, servicoNome: s.nome }))
      .filter((v): v is { id: string; servicoNome: string } => !!v.id && !isVinculoOtimista(v.id));
    if (alvo.length === 0) return;
    lote.mutate({ acao: 'desvincular', produtoCodigo, vinculos: alvo });
  }, [produtoSelecionado, paraVincular, jaVinculados, vinculoPorServico, lote]);

  // ── Cadastro ────────────────────────────────────────────────────────
  const confirmarExclusaoProduto = useCallback(async () => {
    if (!produtoParaExcluir) return;
    await removerProduto(produtoParaExcluir);
    if (produtoEscolhidoId === produtoParaExcluir.id) setProdutoEscolhidoId(null);
    setProdutoParaExcluir(null);
  }, [produtoParaExcluir, removerProduto, produtoEscolhidoId]);

  const confirmarExclusaoServico = useCallback(async () => {
    if (!servicoParaExcluir) return;
    await removerServico(servicoParaExcluir);
    setServicoParaExcluir(null);
  }, [servicoParaExcluir, removerServico]);

  // Produtos ativos sem nenhum serviço: nenhum projeto pode ser cadastrado neles.
  const produtosSemVinculo = useMemo(() => {
    const contagem = contarVinculosPorProduto(vinculos);
    return produtos.filter(p => p.is_active && !contagem[p.id]).length;
  }, [produtos, vinculos]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <ProdutosVinculoPanel
          grupos={gruposProdutosVisiveis}
          abas={abas}
          filtro={{ ...filtroProduto, cluster: clusterAtivo }}
          onFiltroChange={patch => setFiltroProduto(atual => ({ ...atual, ...patch }))}
          selecionadoId={produtoSelecionado?.id ?? null}
          totalSemVinculo={produtosSemVinculo}
          carregando={isLoading}
          acoes={{
            onSelecionar: setProdutoEscolhidoId,
            onNovo: () => setFormProduto({ aberto: true, alvo: null }),
            onEditar: produto => setFormProduto({ aberto: true, alvo: produto }),
            onAlternarAtivo: produto => alternarAtivo.mutate(produto),
            onExcluir: setProdutoParaExcluir,
          }}
        />

        <ServicosVinculoPanel
          produto={produtoSelecionado}
          grupos={gruposServicos}
          resumo={{
            vinculados: vinculosDoProduto.length,
            total: servicos.length,
            faltamVincular: paraVincular.length,
            podeDesvincular: jaVinculados.length,
          }}
          filtro={filtroServico}
          onFiltroChange={patch => setFiltroServico(atual => ({ ...atual, ...patch }))}
          loteEmAndamento={lote.isPending}
          acoes={{
            onAlternarVinculo: servico => vincularServico(servico.id, servico.nome),
            onLote: handleLote,
            onNovo: () => setFormServico({ aberto: true, alvo: null }),
            onEditar: servico => setFormServico({ aberto: true, alvo: servico }),
            onExcluir: setServicoParaExcluir,
          }}
        />
      </div>

      <ProdutoFormDialog
        aberto={formProduto.aberto}
        produto={formProduto.alvo}
        clusterPadrao={clusterAtivo === TODOS_CLUSTERS ? null : clusterAtivo}
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
          void vincularServico(servicoId, nome);
        }}
      />

      <ConfirmarExclusaoDialog
        aberto={!!produtoParaExcluir}
        titulo="Excluir produto?"
        descricao={`"${produtoParaExcluir?.codigo} — ${produtoParaExcluir?.nome}" e seus ${produtoParaExcluir?.totalVinculos ?? 0} vínculo(s) com serviços serão excluídos. Os serviços em si permanecem cadastrados.`}
        onCancelar={() => setProdutoParaExcluir(null)}
        onConfirmar={confirmarExclusaoProduto}
      />

      <ConfirmarExclusaoDialog
        aberto={!!servicoParaExcluir}
        titulo="Excluir serviço?"
        descricao={`"${servicoParaExcluir?.nome}" será excluído e desvinculado de todos os produtos. Serviço já usado em projetos não pode ser excluído.`}
        onCancelar={() => setServicoParaExcluir(null)}
        onConfirmar={confirmarExclusaoServico}
      />
    </>
  );
}
