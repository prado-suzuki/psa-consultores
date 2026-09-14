import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { dividirNomeServico } from '@/lib/produtoServicoNomes';
import { servicosACopiar } from '@/lib/produtoServicoVinculo';
import {
  isVinculoOtimista, useProdutoServicoLote, useProdutoServicoToggle,
  type ProdutoSegmento, type ProdutoServico, type ServicoPrestado,
} from '@/hooks/useCategorias';

/** O que o lote e a cópia precisam saber de um serviço: nada além disto. */
interface ServicoDoLote {
  id: string;
  nome: string;
}

interface Params {
  /** Todos os vínculos carregados — a tela inteira lê deste mesmo array. */
  vinculos: ProdutoServico[];
  /** O produto aberto. Sem ele nenhuma ação daqui faz sentido. */
  produto: ProdutoSegmento | null;
  /** O catálogo, para a cópia resolver id → nome. */
  servicos: ServicoPrestado[];
  /** Chamado quando um lote conclui, para a tela limpar a seleção. */
  aoConcluirLote?: () => void;
}

/**
 * As três ações que escrevem vínculo, fora da tela que as dispara.
 *
 * Saíram de `ProdutosServicosTab` quando ele cruzou o teto de 600 linhas. O
 * comportamento é o MESMO, linha por linha: as mesmas mutations, a mesma ordem,
 * os mesmos toasts e os mesmos desfazeres. O que mudou é onde moram.
 *
 * `emAndamento` fica aqui junto com elas: é o estado que torna uma linha inerte
 * enquanto a gravação dela não volta, e quem o liga e desliga são estas ações.
 */
export function useVinculoProdutoServicoController({
  vinculos, produto, servicos, aoConcluirLote,
}: Params) {
  const [emAndamento, setEmAndamento] = useState<Set<string>>(new Set());

  /*
   * A tela passa este callback inline, então ele muda de identidade a cada
   * render. Numa lista de dependências, isso recriaria `executarLote` sempre e
   * derrubaria a memoização de tudo o que o recebe. A ref guarda a versão
   * corrente sem entrar em lista nenhuma.
   */
  const aoConcluirRef = useRef(aoConcluirLote);
  aoConcluirRef.current = aoConcluirLote;

  const toggleVinculo = useProdutoServicoToggle();
  const lote = useProdutoServicoLote();

  // O código abaixo veio de `ProdutosServicosTab` sem uma linha de diferença; o
  // alias evita reescrevê-lo só para trocar um nome.
  const produtoSelecionado = produto;
  const vinculosDoProduto = useMemo(
    () => vinculos.filter((v) => v.produto_segmento_id === produto?.id),
    [vinculos, produto?.id],
  );
  const vinculoPorServico = useMemo(
    () => new Map(vinculosDoProduto.map((v) => [v.servico_prestado_id, v])),
    [vinculosDoProduto],
  );

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
    // `{ id, nome }` e não `ServicoNaLista`: o lote só precisa destes dois, e a
    // cópia de outro produto alcança serviços que não estão na lista visível —
    // eles não têm (nem precisam ter) o estado de tela que `ServicoNaLista` tem.
    servicosAlvo: { id: string; nome: string }[],
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
      aoConcluirRef.current?.();
    } catch {
      // erro já tratado no hook
    }
  }, [produtoSelecionado, lote, vinculoPorServico]);
  /**
   * A cópia alcança serviços que podem não estar na lista visível — busca e
   * filtro não a limitam, porque o que se copia é o conjunto do OUTRO produto,
   * e não o que está na tela. Só acrescenta.
   */
  const copiarDe = useCallback((origemId: string) => {
    if (!produto) return;
    const alvos = servicosACopiar(vinculos, origemId, produto.id)
      .map((id) => servicos.find((s) => s.id === id))
      .filter((s): s is ServicoPrestado => !!s)
      .map((s) => ({ id: s.id, nome: s.nome }));
    void executarLote('vincular', alvos);
  }, [produto, vinculos, servicos, executarLote]);

  return { emAndamento, alternarVinculo, executarLote, copiarDe };
}
