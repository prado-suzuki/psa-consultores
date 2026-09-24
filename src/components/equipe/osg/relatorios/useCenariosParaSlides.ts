import { useEffect, useMemo, useState } from 'react';
import { useSimulacoesItcmd } from '@/hooks/useSimulacoesItcmd';
import {
  bloqueioDe, cadeiasEscolhidas, conflitoDeUpf, escolhaPadrao, opcoesDeCenario,
} from '@/lib/osg/cenariosDoCapitulo04';
import { slidesDoCapitulo04 } from '../../../../../supabase/functions/_shared/apresentacao-osg/paginacao.ts';

/** Quais simulações aprovadas entram no capítulo 04; a regra está em `lib/osg/cenariosDoCapitulo04.ts`, aqui só o estado. */
export function useCenariosParaSlides(clienteId: string | null) {
  const { data: todas, isLoading, isError, refetch } = useSimulacoesItcmd(clienteId);
  const opcoes = useMemo(() => opcoesDeCenario(todas ?? []), [todas]);

  /* `null` = a escolha padrão. Só vira lista quando a pessoa mexe, e aí para de seguir o
     padrão — senão uma simulação aprovada depois reapareceria marcada sozinha. */
  const [mexidas, setMexidas] = useState<string[] | null>(null);
  useEffect(() => {
    setMexidas(null);
  }, [clienteId]);

  const escolhidas = mexidas ?? escolhaPadrao(opcoes);
  const cadeias = cadeiasEscolhidas(escolhidas, opcoes);
  /* A simulação salva já tem o que a paginação lê (`AtoParaPaginar`): vai como vem. */
  const slides = slidesDoCapitulo04(cadeias.map((o) => o.cadeia));

  const alternar = (id: string) => {
    const opcao = opcoes.find((o) => o.simulacao.id === id);
    if (!opcao) return;
    if (escolhidas.includes(id)) {
      setMexidas(escolhidas.filter((x) => x !== id));
      return;
    }
    if (bloqueioDe(opcao, escolhidas, opcoes) == null) setMexidas([...escolhidas, id]);
  };

  return {
    /** Os ids que vão para a `gerar-apresentacao` (deck `sucessoria`), na ordem dos cenários. */
    simulacaoIds: cadeias.map((o) => o.simulacao.id),
    slides,
    /** Por que o capítulo não gera com a escolha de agora (UPFs diferentes); `null` = gera. */
    conflitoDeUpf: conflitoDeUpf(cadeias),
    /** Como a linha descreve a escolha: os nomes, na ordem, sem numeral na frente. */
    descricao: cadeias.length > 0
      ? cadeias.map((o) => o.rotulo).join('  ·  ')
      : isLoading
        ? 'Carregando as simulações…'
        : opcoes.length === 0
          ? 'Nenhuma simulação aprovada na Calculadora de ITCMD.'
          : 'Nenhum cenário marcado.',
    carregando: isLoading,
    /** A consulta falhou: a linha diz que não carregou, nunca que não há simulação. */
    erro: isError,
    tentarDeNovo: () => {
      void refetch();
    },
    opcoes,
    escolhidas,
    alternar,
    bloqueio: (id: string) => {
      const opcao = opcoes.find((o) => o.simulacao.id === id);
      return opcao ? bloqueioDe(opcao, escolhidas, opcoes) : null;
    },
  };
}
