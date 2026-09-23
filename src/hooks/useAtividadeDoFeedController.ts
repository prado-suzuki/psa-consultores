import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  useCarimbarLeitura,
  useDomainFeedAtividade,
  useMarcarTudoVisto,
} from '@/hooks/useDomainFeedAtividade';
import {
  agruparAtividadePorCliente,
  aplicarLeituraDaSessao,
  carimbosPorProjeto,
  consolidarCarimbos,
  type CarimboDoProjeto,
  type ClienteComAtividade,
  type LinhaDeAtividade,
  type ProjetoComAtividade,
} from '@/lib/feedAtividade';

/**
 * O estado da barra de atividade e da leitura do feed.
 *
 * A barra CONGELA: mostra a leva que chegou quando a tela abriu, senão o cliente
 * sai da lista no instante em que é lido e quem está lendo perde o lugar. O
 * carimbo grava na hora; só a apresentação espera.
 */
export interface AtividadeDoFeed {
  clientes: ClienteComAtividade[];
  carimbos: ReadonlyMap<string, CarimboDoProjeto>;
  /** A minha própria fala nunca é novidade para mim. */
  meuId: string | null;
  carregando: boolean;
  /** Chegou movimento novo depois que a barra congelou. */
  desatualizada: boolean;
  atualizar: () => void;
  /** Clicar no cliente ou no projeto da barra é o único gesto que dá por lido. */
  lerCliente: (cliente: ClienteComAtividade) => void;
  lerProjeto: (projeto: ProjetoComAtividade) => void;
  /** Projetos lidos nesta sessão, já descontados das contagens. */
  lidosAgora: ReadonlySet<string>;
  marcarTudo: () => void;
  marcandoTudo: boolean;
}

/** Constante de módulo: um literal remontaria os `useMemo` a cada render. */
const SEM_RETRATO: LinhaDeAtividade[] = [];

/** Muda quando há fala nova ou algo foi carimbado. */
function assinatura(linhas: readonly LinhaDeAtividade[]): string {
  let ultimo = '';
  let novos = 0;
  let total = 0;
  for (const linha of linhas) {
    if (linha.ultimo_em > ultimo) ultimo = linha.ultimo_em;
    novos += linha.novos;
    total += linha.total;
  }
  return `${ultimo}|${novos}|${total}|${linhas.length}`;
}

export function useAtividadeDoFeedController(): AtividadeDoFeed {
  const { user } = useAuth();
  const meuId = user?.id ?? null;
  const { linhas, isLoading, refetch } = useDomainFeedAtividade();
  const carimbar = useCarimbarLeitura();
  const marcarTudoVisto = useMarcarTudoVisto();

  /** A leva congelada. `null` enquanto a primeira ainda não chegou. */
  const [congelada, setCongelada] = useState<LinhaDeAtividade[] | null>(null);
  const [lidosAgora, setLidosAgora] = useState<ReadonlySet<string>>(() => new Set<string>());

  useEffect(() => {
    // Só o "Atualizar" e o "marcar tudo" trocam o retrato depois desta.
    if (congelada === null && !isLoading) setCongelada(linhas);
  }, [congelada, isLoading, linhas]);

  const atualizar = useCallback(() => {
    void refetch().then((resultado) => {
      if (resultado.data) setCongelada(resultado.data);
      setLidosAgora(new Set<string>());
    });
  }, [refetch]);

  const marcarTudo = useCallback(() => {
    marcarTudoVisto.mutate(undefined, {
      // O retrato só troca depois que o banco confirmou.
      onSuccess: () =>
        void refetch().then((resultado) => {
          if (resultado.data) setCongelada(resultado.data);
          setLidosAgora(new Set<string>());
        }),
    });
  }, [marcarTudoVisto, refetch]);

  const retrato = congelada ?? SEM_RETRATO;
  const doRetrato = useMemo(() => agruparAtividadePorCliente(retrato), [retrato]);
  const carimbos = useMemo(() => carimbosPorProjeto(retrato), [retrato]);
  // O balde e a ordem vêm do retrato; o número desconta o que foi lido agora.
  const clientes = useMemo(
    () => aplicarLeituraDaSessao(doRetrato, lidosAgora),
    [doRetrato, lidosAgora],
  );

  // Carimba até a fala mais nova do retrato, nunca até o relógio de agora: o
  // que chegou depois da barra congelar ainda não foi visto.
  const ler = useCallback(
    (projetos: readonly ProjetoComAtividade[]) => {
      const lidos = projetos.map((projeto) => ({
        projetoId: projeto.projetoId,
        ate: projeto.ultimoEm,
      }));
      const porCliente = consolidarCarimbos(lidos, carimbos);
      if (porCliente.size === 0) return;
      carimbar(porCliente);
      // Por PROJETO: ler um projeto de um cliente com quatro não pode zerar os
      // outros três na lateral.
      setLidosAgora((atuais) => {
        if (lidos.every(({ projetoId }) => atuais.has(projetoId))) return atuais;
        const proximos = new Set(atuais);
        for (const { projetoId } of lidos) proximos.add(projetoId);
        return proximos;
      });
    },
    [carimbar, carimbos],
  );

  const lerCliente = useCallback(
    (cliente: ClienteComAtividade) => ler(cliente.projetos),
    [ler],
  );
  const lerProjeto = useCallback((projeto: ProjetoComAtividade) => ler([projeto]), [ler]);

  // Por assinatura, e não por identidade: o React Query devolve objeto novo a
  // cada `refetch`, e o "Atualizar" acenderia sem nada ter mudado.
  const assinaturaCongelada = useRef('');
  assinaturaCongelada.current = congelada ? assinatura(congelada) : '';
  const desatualizada =
    congelada !== null && linhas.length > 0 && assinatura(linhas) !== assinaturaCongelada.current;

  return {
    clientes,
    carimbos,
    meuId,
    carregando: isLoading && congelada === null,
    desatualizada,
    atualizar,
    lerCliente,
    lerProjeto,
    lidosAgora,
    marcarTudo,
    marcandoTudo: marcarTudoVisto.isPending,
  };
}
