import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  janelaDoPeriodo, PERIODO_PADRAO, periodosAuditoria,
  type JanelaAuditoria, type PeriodoAuditoria,
} from '@/lib/auditPeriodos';

interface AuditPeriodo {
  /** Valor selecionado, sempre uma das opções. */
  periodo: string;
  setPeriodo: (valor: string) => void;
  opcoes: PeriodoAuditoria[];
  janela: JanelaAuditoria;
  /** Data de referência (YYYY-MM-DD) — as funções puras não leem o relógio. */
  hoje: string;
}

/**
 * Período das abas de Auditoria, compartilhado por todas elas.
 *
 * Mora na URL (`?periodo=`) em vez de um `useState` por aba: escolher o semestre
 * na aba Pessoas e trocar para Produtos mantinha 30 dias, e os números pareciam
 * não bater entre as abas. Como está na URL, o filtro também sobrevive ao
 * recarregar e vai junto num link colado para outra pessoa.
 *
 * `replace: true` porque filtro não é navegação: sem isso, cada troca de período
 * empilharia um passo no botão Voltar.
 */
export function useAuditPeriodo(): AuditPeriodo {
  const [searchParams, setSearchParams] = useSearchParams();
  const hoje = new Date().toISOString().slice(0, 10);
  const opcoes = useMemo(() => periodosAuditoria(hoje), [hoje]);

  // Valor da URL só vale se for uma opção conhecida: link antigo ou digitado à
  // mão não pode deixar o seletor num estado que não está na lista.
  const naUrl = searchParams.get('periodo');
  const periodo = opcoes.some(opcao => opcao.valor === naUrl) ? naUrl! : PERIODO_PADRAO;
  const janela = useMemo(() => janelaDoPeriodo(periodo, hoje), [periodo, hoje]);

  const setPeriodo = (valor: string) => {
    const proxima = new URLSearchParams(searchParams);
    // O padrão sai da URL para o endereço ficar limpo em vez de carregar o óbvio.
    if (valor === PERIODO_PADRAO) proxima.delete('periodo');
    else proxima.set('periodo', valor);
    setSearchParams(proxima, { replace: true });
  };

  return { periodo, setPeriodo, opcoes, janela, hoje };
}
