import { useEffect, useState } from 'react';
import { useEstudosDoCliente, useRevisoesDoEstudo } from '@/hooks/useDomainPapelDeTrabalho';

/**
 * Qual revisão do papel de trabalho entra na apresentação.
 *
 * ERA UM PAINEL INTEIRO, e por isso um botão à parte: os Papéis de Trabalho
 * abriam dentro da Biblioteca com título, caixa de escolha e "Gerar os slides
 * desta revisão". Só que eles são um modelo de slide como os outros, e na maioria
 * das vezes saem na MESMA apresentação — dois botões de gerar na mesma tela era
 * a tela dizendo que são coisas diferentes quando não são.
 *
 * O que os distingue de verdade é UM PARÂMETRO: qual revisão. Parâmetro cabe num
 * lápis, não num painel.
 *
 * O PAINEL CONTINUA EXISTINDO, com o histórico de arquivos gerados, em
 * `GeradorDeSlides` no Digital Dev. Aqui não é o lugar de administrar revisão —
 * é o de escolher uma e gerar.
 */
export const fmtDataDaRevisao = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function useRevisaoParaSlides(clienteId: string | null) {
  const { data: estudos = [], isLoading: carregandoEstudos } = useEstudosDoCliente(clienteId);
  const [estudoId, setEstudoId] = useState('');
  const estudoEscolhido = estudoId || estudos[0]?.id || '';

  const { data: revisoes = [], isLoading: carregandoRevisoes } = useRevisoesDoEstudo(
    estudoEscolhido || null,
  );
  const [revisaoId, setRevisaoId] = useState('');
  /* A mais nova é o que se quer em quase todo caso, então já vem escolhida. */
  const revisaoEscolhida = revisaoId || revisoes[0]?.id || '';

  /* Trocar de cliente ou de estudo desfaz a escolha anterior, senão a marcação
     seguiria apontando para a revisão de outro cliente. */
  useEffect(() => {
    setEstudoId('');
    setRevisaoId('');
  }, [clienteId]);
  useEffect(() => {
    setRevisaoId('');
  }, [estudoEscolhido]);

  const revisao = revisoes.find((r) => r.id === revisaoEscolhida);
  const carregando = carregandoEstudos || carregandoRevisoes;

  return {
    /** O id que vai para a `gerar-slides-tributarios`. `null` = nada importado. */
    revisaoId: revisaoEscolhida || null,
    /** Como a linha descreve a escolha: "Revisão 3 · 09/09/2026". */
    descricao: revisao
      ? `Revisão ${revisao.versao} · ${fmtDataDaRevisao(revisao.created_at)}`
      : carregando
        ? 'Carregando as revisões…'
        : 'Nenhuma revisão importada.',
    carregando,
    estudos,
    estudoEscolhido,
    setEstudoId,
    revisoes,
    revisaoEscolhida,
    setRevisaoId,
  };
}
