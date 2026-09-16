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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ProdutoFormDialog from '@/components/equipe/produto-servico/ProdutoFormDialog';
import ServicoFormDialog from '@/components/equipe/produto-servico/ServicoFormDialog';
import ConfirmarExclusaoDialog from '@/components/equipe/produto-servico/ConfirmarExclusaoDialog';
import CopiarDeProdutoDialog from '@/components/equipe/produto-servico/CopiarDeProdutoDialog';
import { cn } from '@/lib/utils';
import {
  TODOS_CLUSTERS, candidatosParaCopia, contarVinculosPorProduto, filtrarProdutos,
  filtrarServicos, separarPorVinculo, servicosACopiar,
} from '@/lib/produtoServicoVinculo';
import {
  contarVinculosPorServico, dividirNomeServico, ordenarPorCodigoDeServico,
} from '@/lib/produtoServicoNomes';
import {
  useProdutoSegmentoList, useProdutoServicoList, useServicosPrestadosDelete,
  useServicosPrestadosList,
  type ProdutoSegmento, type ServicoPrestado,
} from '@/hooks/useCategorias';
import { useVinculoProdutoServicoController } from '@/hooks/useVinculoProdutoServicoController';
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
 * em dois blocos — os vinculados no topo, os que faltam abaixo, cada um na ordem
 * do código. Direita: o serviço aberto e — o que importa — em quais
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
 * A tela usa só token semântico, e por isso MORA EM DOIS ENDEREÇOS sem saber de
 * nenhum dos dois: `/equipe/acessos`, que o resolvedor de tema resolve para
 * `base-theme` (acento no teal da casa), e `/equipe/tax/gerencial/produtos-servicos`,
 * onde o mesmo componente sai na âncora da Tax. Saiu do grafite em 31/08/2026,
 * junto com o resto do Digital, e não precisou de uma linha para acompanhar —
 * é o que o token semântico compra, e é o que fez o espelho na Tax ser uma
 * página de quinze linhas em vez de uma cópia.
 */
interface ProdutosServicosTabProps {
  /**
   * Cluster em que a bancada ABRE. A Acessos não passa nada e abre em "Todos",
   * porque lá a pergunta é o catálogo da casa inteira; a Tax passa o cluster da
   * área, para o líder não ter de filtrar os 28 produtos toda vez que entra.
   *
   * É só o estado INICIAL. Os chips continuam lá e trocar de cluster segue a um
   * clique nos dois endereços — quem entra pela Tax não fica preso à Tax.
   */
  clusterInicial?: string | null;
}

export default function ProdutosServicosTab({ clusterInicial = null }: ProdutosServicosTabProps) {
  const [produtoEscolhidoId, setProdutoEscolhidoId] = useState<string | null>(null);
  const [servicoAbertoId, setServicoAbertoId] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [buscaProduto, setBuscaProduto] = useState('');
  const [cluster, setCluster] = useState<string>(clusterInicial ?? TODOS_CLUSTERS);
  const [filtroServico, setFiltroServico] = useState<{ busca: string; modo: FiltroVinculo }>({
    busca: '', modo: 'todos',
  });
  const [mostrarOutrosClusters, setMostrarOutrosClusters] = useState(false);
  const [formProduto, setFormProduto] = useState<EstadoFormulario<ProdutoSegmento>>(FORM_FECHADO);
  const [formServico, setFormServico] = useState<EstadoFormulario<ServicoPrestado>>(FORM_FECHADO);
  const [servicoParaExcluir, setServicoParaExcluir] = useState<ServicoPrestado | null>(null);
  const [copiarAberto, setCopiarAberto] = useState(false);

  /**
   * O cluster da área chega por QUERY, então pode chegar depois do primeiro
   * render — daí o estado inicial acima não bastar sozinho.
   *
   * Sincroniza só o filtro, e não por `key` no componente: `key` remontaria a
   * bancada inteira e jogaria fora o produto aberto e a marcação em curso. Roda
   * uma vez, quando o id resolve; trocar de chip depois disso é do usuário, e o
   * efeito não volta para desfazer — `clusterInicial` já não muda mais.
   */
  useEffect(() => {
    if (!clusterInicial) return;
    setCluster(clusterInicial);
  }, [clusterInicial]);

  const { data: vinculos = [], isLoading } = useProdutoServicoList();
  const { data: produtos = [] } = useProdutoSegmentoList();
  const { data: servicos = [] } = useServicosPrestadosList();

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

  // ── Ações ───────────────────────────────────────────────────────────
  // As três que escrevem vínculo moram no controlador: alternar uma, o lote com
  // desfazer, e a cópia do conjunto de outro produto.
  const { emAndamento, alternarVinculo, executarLote, copiarDe } =
    useVinculoProdutoServicoController({
      vinculos,
      produto: produtoSelecionado,
      servicos,
      aoConcluirLote: () => setMarcados(new Set()),
    });

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
   * O RETRATO dos vínculos, e por que a lista não se reordena a cada clique.
   *
   * Os serviços do produto vão para o topo (bloco "Vinculados"), e os do cluster
   * que faltam vêm abaixo. Se essa divisão olhasse o vínculo AO VIVO, cada
   * clique na caixa — que grava na hora — mandaria a linha para o outro bloco:
   * ela sai de baixo do cursor e a próxima sobe uma posição. Marcar dez serviços
   * em sequência, que é o trabalho desta tela, ficaria pior do que na lista
   * corrida que havia antes.
   *
   * Então quem decide o bloco é o retrato do momento em que a lista SE ASSENTOU:
   * ao abrir o produto e a cada mudança de busca ou de filtro. Marcar e desmarcar
   * troca a caixa e não move nada; a lista se reorganiza no próximo assentamento.
   *
   * Em `ref` e calculado no render, não em `useEffect`: com efeito, o primeiro
   * render do produto novo sairia com o retrato do produto anterior — a lista
   * apareceria na ordem errada e se recolocaria no frame seguinte.
   */
  const chaveDeAssentamento = [
    produtoSelecionado?.id ?? '', filtroServico.busca, filtroServico.modo,
  ].join('|');
  const retrato = useRef({ chave: '', ids: new Set<string>() });
  if (retrato.current.chave !== chaveDeAssentamento) {
    retrato.current = { chave: chaveDeAssentamento, ids: new Set(idsVinculados) };
  }
  const vinculadosAoAssentar = retrato.current.ids;

  /**
   * TRÊS listas planas, todas ordenadas pelo código: os serviços vinculados ao
   * produto, os do cluster dele que faltam, e os de outros clusters.
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
    const doCluster = clusterDoProduto
      ? emOrdem.filter((s) => s.clusterId === clusterDoProduto)
      : emOrdem;
    const outros = clusterDoProduto
      ? emOrdem.filter((s) => s.clusterId !== clusterDoProduto)
      : ([] as ServicoNaLista[]);
    // Os outros clusters NÃO se dividem em dois blocos: eles moram atrás de um
    // botão justamente porque não é neles que se mexe, e um produto raramente
    // tem vínculo fora do próprio cluster.
    const { jaVinculados, paraVincular } = separarPorVinculo(doCluster, vinculadosAoAssentar);
    return { vinculados: jaVinculados, faltam: paraVincular, outros };
  }, [servicosVisiveis, produtoSelecionado?.cluster_id, vinculadosAoAssentar]);

  // Ordem de exibição — é dela que sai a faixa do shift+clique, e ela tem de ser
  // a ordem dos BLOCOS, não a do código: a faixa segue o que a pessoa vê. Os
  // outros clusters só entram quando estão abertos, pelo mesmo motivo.
  const idsVisiveis = useMemo(
    () => [
      ...listasDeServico.vinculados.map((s) => s.id),
      ...listasDeServico.faltam.map((s) => s.id),
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

  /**
   * Os produtos que podem servir de origem para uma cópia, com os DOIS números
   * que a escolha pede: quantos serviços o candidato tem, e quantos deles ainda
   * faltam aqui. Os do mesmo cluster vão para o topo; os demais continuam
   * alcançáveis, porque produto sem cluster existe.
   */
  const candidatosParaCopiar = useMemo(
    () => (produtoSelecionado ? candidatosParaCopia(produtosAtivos, vinculos, produtoSelecionado) : []),
    [produtosAtivos, vinculos, produtoSelecionado],
  );

  const semVinculoNenhum = produtoSelecionado && vinculosDoProduto.length === 0;

  return (
    /*
      Altura DEFINIDA, não mínima: é ela que a casca reparte entre a lista de
      produtos, os serviços e o painel. Com `min-h` a casca crescia até a altura
      dos 19 produtos e as duas colunas da direita ficavam centradas ~800px
      abaixo, fora da tela — a bancada parecia vazia à direita.

      LARGURA COM TETO, e o número sai do dado, não do gosto: o maior nome de
      serviço do catálogo tem 77 caracteres e a média 36 (produção, 16/09/2026),
      ou seja ~490px no pior caso a 13px. Numa janela de 1900px a coluna do meio
      chegava a ~1300px — o dobro do que qualquer nome pede, e nenhum deles
      truncava nem perto disso. Com 1100 no teto ela fica em ~800px, que ainda
      segura o pior caso com folga, e o que sobra vira margem em vez de linha
      esticada. Abaixo de 1100 nada muda: aqui é teto, não largura.

      Não centralizada de propósito: o título da página é alinhado à esquerda, e
      um cartão centrado embaixo dele ficaria fora de prumo com a própria página.
    */
    <div className="flex h-[72vh] min-h-[480px] max-w-[1100px] flex-col gap-2">
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

      {/*
        A coluna de produtos SOME abaixo de `lg`, e não encolhe: com 280px fixos
        ela e a lista de serviços dividiam uma tela de tablet em duas metades
        estreitas demais para qualquer uma das duas. Quem troca de produto no
        estreito é o seletor no cabeçalho da lista.
      */}
      <ListaMestreDetalhe<string>
        moldura="pagina"
        larguraLista="hidden w-[280px] lg:block"
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
        {/*
          A lista fica SEMPRE montada. Antes, produto sem vínculo nenhum trocava
          a coluna inteira por um cartaz — e o cartaz não tem busca, não tem
          "Novo serviço" e não tem o lápis do produto. Quem desvinculava tudo
          perdia o acesso a criar serviço no produto. Agora a mesma mensagem
          desce como faixa dentro da coluna.

          O `div` que embrulhava esta coluna e o painel saiu junto com o painel:
          a moldura `pagina` do `ListaMestreDetalhe` já entrega um slot flex, e
          `ServicosLista` já é o item que o preenche.
        */}
        <ServicosLista
          produto={produtoSelecionado}
          produtos={produtosVisiveis}
          onSelecionarProduto={setProdutoEscolhidoId}
          vinculados={listasDeServico.vinculados}
          faltam={listasDeServico.faltam}
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
          onAbrirServico={(servico) => setServicoAbertoId(servico.id)}
          onLote={(acao, alvos) => void executarLote(acao, alvos)}
          onAlternarVinculo={(servico) => {
            if (produtoSelecionado) void alternarVinculo(produtoSelecionado.id, servico.id, servico.nome);
          }}
          onNovo={() => setFormServico({ aberto: true, alvo: null })}
          onCopiarDeOutro={() => setCopiarAberto(true)}
          podeCopiar={candidatosParaCopiar.length > 0}
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
              {/*
                Era "Vincular sugeridos do mesmo cluster", e ele marcava o
                CLUSTER INTEIRO — dezenas de serviços num produto cujo vizinho
                mais cheio tem 16. Nenhum produto quer isso. Copiar de um produto
                parecido traz o punhado que de fato se usa junto.
              */}
              {candidatosParaCopiar.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-xs"
                  onClick={() => setCopiarAberto(true)}
                >
                  Copiar de outro produto
                </Button>
              )}
            </div>
          ) : undefined}
          carregando={isLoading}
        />
      </ListaMestreDetalhe>

      {/*
        O detalhe do serviço vive SOBRE a tela, e não ao lado dela — e do TAMANHO
        do que tem para dizer.

        Era uma terceira coluna de 320px, sempre montada, que na maior parte do
        tempo mostrava "Selecione um serviço". Virou painel lateral de altura
        inteira, o que resolveu o vazio permanente mas manteve o exagero de
        escala: 384px pela altura da janela para um nome, um cluster, um número e
        uma lista que em produção tem no máximo 3 linhas. Agora é um diálogo de
        `max-w-md` com altura automática. O conteúdo é o mesmo e o gesto que abre
        também: clicar no nome do serviço.
      */}
      <Dialog
        open={!!servicoAberto}
        onOpenChange={(aberto) => { if (!aberto) setServicoAbertoId(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <ServicoDetalhePanel
            servico={servicoAberto}
            cluster={clusterDoServico}
            vinculados={produtosDoServico.vinculados}
            disponiveis={produtosDoServico.disponiveis}
            carregando={isLoading}
            /*
              Os dois FECHAM o detalhe antes de abrir o seu diálogo. Enquanto o
              detalhe era painel lateral, ele podia ficar aberto atrás do
              formulário; diálogo sobre diálogo empilha dois focos presos e duas
              camadas de overlay para mostrar a mesma coisa duas vezes. Quem vai
              editar ou excluir já decidiu — o detalhe não tem mais o que dizer.
            */
            onEditar={() => {
              const bruto = servicos.find((s) => s.id === servicoAberto?.id);
              if (!bruto) return;
              setServicoAbertoId(null);
              setFormServico({ aberto: true, alvo: bruto });
            }}
            onExcluir={() => {
              const bruto = servicos.find((s) => s.id === servicoAberto?.id);
              if (!bruto) return;
              setServicoAbertoId(null);
              setServicoParaExcluir(bruto);
            }}
            onDesvincular={(produto) => {
              if (servicoAberto) void alternarVinculo(produto.id, servicoAberto.id, servicoAberto.nome);
            }}
            onVincular={(produtoId) => {
              if (servicoAberto) void alternarVinculo(produtoId, servicoAberto.id, servicoAberto.nome);
            }}
          />
        </DialogContent>
      </Dialog>

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

      <CopiarDeProdutoDialog
        aberto={copiarAberto}
        nomeDoAlvo={`${produtoSelecionado?.codigo ?? '?'} — ${produtoSelecionado?.nome ?? ''}`}
        candidatos={candidatosParaCopiar}
        onFechar={() => setCopiarAberto(false)}
        onConfirmar={copiarDe}
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
