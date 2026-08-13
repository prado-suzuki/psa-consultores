import { useMemo } from 'react';

import { useBensByCliente, useAllMatriculas } from '@/hooks/useDiagnosticoPatrimonial';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import { useDomainSolicitacao } from '@/hooks/useDomainSolicitacao';
import { useSolicitacaoNaoAplicavelDoCliente } from '@/hooks/useDomainSolicitacaoNaoAplicavel';
import { useTiposAvulsosDoCliente } from '@/hooks/useOsgChecklist';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import {
  contarArquivosSemTipo,
  derivarChecklist,
  montarInstancias,
  type ArquivoClassificado,
  type LinhaChecklist,
} from '@/lib/checklistDerivado';
import type { SolicitacaoStatus } from '@/lib/solicitacao';

/**
 * O checklist do consultor, montado por subtração (sem tabela própria).
 *
 * Compõe cinco leituras que já existem, e nenhuma delas é nova: a solicitação
 * (o esperado), as instâncias do cliente (o multiplicador), os arquivos (o
 * chegou), as marcas de "não se aplica" e os tipos avulsos (o que dá tipo ao
 * item pedido à mão). Ver docs/planos/checklist-por-subtracao.md §2.
 */

export interface ChecklistDerivado {
  linhas: LinhaChecklist[];
  /** O cabeçalho do pedido, para a tela dizer em que estado ele está. */
  solicitacao: { id: string; status: SolicitacaoStatus; encerradaEm: string | null } | null;
  /**
   * Arquivos ativos sem tipo, que a subtração não consegue enxergar. A tela avisa
   * em vez de dar a conta como fechada.
   */
  arquivosSemTipo: number;
  isLoading: boolean;
}

export function useChecklistDerivado(clienteId: string | null): ChecklistDerivado {
  const { solicitacao, isLoading: carregandoSolicitacao } = useDomainSolicitacao(clienteId);
  const { data: pessoas = [], isLoading: carregandoPessoas } = usePessoasByCliente(clienteId);
  const { data: bens = [], isLoading: carregandoBens } = useBensByCliente(clienteId);
  const { data: todasMatriculas = [], isLoading: carregandoMatriculas } = useAllMatriculas();
  const { data: arquivos = [], isLoading: carregandoArquivos } = useDocumentosByCliente(clienteId);
  const { data: naoAplicaveis = [] } = useSolicitacaoNaoAplicavelDoCliente(clienteId);
  const { data: avulsoPorItem = {} } = useTiposAvulsosDoCliente(clienteId);

  // `useAllMatriculas` é global: restringe às deste cliente pelo bem ou pela
  // titularidade, mesmo critério de ClassificarDocumentos e OrganizarDocumentos.
  const matriculas = useMemo(
    () => (clienteId
      ? todasMatriculas.filter((matricula) => matricula.bem_cliente_id === clienteId
        || matricula.titular_cliente_ids.includes(clienteId))
      : []),
    [todasMatriculas, clienteId],
  );

  const arquivosClassificados = useMemo<ArquivoClassificado[]>(
    () => arquivos.map((arquivo) => ({
      id: arquivo.id,
      nome_original: arquivo.nome_original,
      documento_tipo_id: arquivo.documento_tipo_id ?? null,
      pessoa_id: arquivo.pessoa_id,
      bem_id: arquivo.bem_id,
      matricula_id: arquivo.matricula_id,
    })),
    [arquivos],
  );

  const linhas = useMemo(() => {
    if (!solicitacao) return [];
    return derivarChecklist({
      itens: solicitacao.itens,
      instancias: montarInstancias({
        pessoas: pessoas.map((pessoa) => ({
          id: pessoa.id,
          denominacao: pessoa.denominacao,
          tipo_pessoa: pessoa.tipo_pessoa,
        })),
        bens: bens.map((bem) => ({
          id: bem.id,
          referencia_dp: bem.referencia_dp,
          denominacao: bem.denominacao,
        })),
        matriculas: matriculas.map((matricula) => ({
          id: matricula.id,
          numero: matricula.numero,
          tipo_bem: matricula.tipo_bem,
          bem_denominacao: matricula.bem_denominacao,
          bem_referencia: matricula.bem_referencia,
        })),
      }),
      arquivos: arquivosClassificados,
      naoAplicaveis,
      avulsoPorItem,
    });
  }, [solicitacao, pessoas, bens, matriculas, arquivosClassificados, naoAplicaveis, avulsoPorItem]);

  return {
    linhas,
    solicitacao: solicitacao
      ? { id: solicitacao.id, status: solicitacao.status, encerradaEm: solicitacao.encerradaEm }
      : null,
    arquivosSemTipo: contarArquivosSemTipo(arquivosClassificados),
    isLoading: carregandoSolicitacao || carregandoPessoas || carregandoBens
      || carregandoMatriculas || carregandoArquivos,
  };
}
