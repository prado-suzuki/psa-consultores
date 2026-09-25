import { useMemo } from 'react';

import type { TaskModalInitialValues } from '@/components/equipe/fiscal/tasks/TaskModal';
import type { TarefaSugeridaDoDitado } from '@/hooks/useDitado';
import { useOrgProjectsList, useProjectMembers } from '@/hooks/useOrgProjects';
import {
  useExternalClients,
  useTeamProfilesSafe,
} from '@/hooks/useTaxReferenceData';
import {
  resolverProjetoDitado,
  resolverTarefaDitada,
  type CampoNaoResolvido,
  type PessoaParaResolucao,
} from '@/lib/resolverTarefaDitada';
import { markdownEnriquecidoParaDoc } from '@/lib/enriquecimentoTexto';
import { serializeTarefaRichText } from '@/lib/tarefaRichText';

interface UseTarefaDitadaResolvidaArgs {
  /** Tarefa extraída da fala; `null` enquanto ninguém ditou nada. */
  sugestao: TarefaSugeridaDoDitado | null;
  /** Projeto do contexto da tela (filtro do feed), usado só quando a fala não menciona projeto. */
  projetoDaTela: string | null;
  /** Membros disponíveis da área, para resolver responsável quando não há projeto. */
  membrosDaArea: { id: string; name: string }[];
}

interface TarefaDitadaResolvida {
  carregando: boolean;
  /** `null` enquanto a resolução carrega; pronto, leva os campos direto ao TaskModal. */
  valores: TaskModalInitialValues | null;
  camposNaoResolvidos: CampoNaoResolvido[];
  conflitos: string[];
}

/**
 * Resolve a sugestão ditada contra os cadastros permitidos antes de abrir o
 * TaskModal. Nenhuma consulta passa por aqui fora dos hooks de domínio — o
 * componente que consome não conhece o Supabase, e a listagem que participa da
 * resolução é a mesma que o usuário acessa (mesmos filtros de ambiente e ativo).
 *
 * A resolução em si é pura (`resolverTarefaDitada`); este hook só compõe os
 * dados: projetos e clientes para casar nomes, membros do projeto RESOLVIDO
 * (por isso a fase extra de projeto antes) e os perfis que dão nome aos ids de
 * `org_project_members`.
 */
export function useTarefaDitadaResolvida({
  sugestao,
  projetoDaTela,
  membrosDaArea,
}: UseTarefaDitadaResolvidaArgs): TarefaDitadaResolvida {
  const { data: projetos = [], isLoading: carregandoProjetos } = useOrgProjectsList(true);
  const { data: clientes = [], isLoading: carregandoClientes } = useExternalClients();
  const { data: perfis = [], isLoading: carregandoPerfis } = useTeamProfilesSafe();

  // Fase 1: só o projeto — o id resolvido define DE QUEM são os membros buscados.
  const alvoProjeto = useMemo(
    () =>
      sugestao
        ? resolverProjetoDitado(
            sugestao,
            projetos.map((p) => ({
              id: p.id,
              nome: p.name,
              external_client_id: p.external_client_id ?? null,
            })),
            projetoDaTela,
          )
        : null,
    [sugestao, projetos, projetoDaTela],
  );

  const { data: membrosDoProjeto = [], isLoading: carregandoMembros } = useProjectMembers(
    alvoProjeto?.projetoId ?? undefined,
  );

  const candidatoPorId = useMemo(() => {
    const mapa = new Map<string, PessoaParaResolucao>();
    for (const perfil of perfis) {
      const nome = [perfil.first_name, perfil.last_name].filter(Boolean).join(' ').trim();
      if (nome) mapa.set(perfil.id, { id: perfil.id, name: nome });
    }
    return mapa;
  }, [perfis]);

  const resolucao = useMemo(() => {
    if (!sugestao) return null;
    return resolverTarefaDitada(
      sugestao,
      {
        projetos: projetos.map((p) => ({
          id: p.id,
          nome: p.name,
          external_client_id: p.external_client_id ?? null,
        })),
        clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
        membrosDoProjeto: membrosDoProjeto
          .map((membro) => candidatoPorId.get(membro.user_id))
          .filter((pessoa): pessoa is PessoaParaResolucao => pessoa !== undefined),
        membrosDaArea,
      },
      projetoDaTela,
    );
  }, [sugestao, projetos, clientes, membrosDoProjeto, candidatoPorId, membrosDaArea, projetoDaTela]);

  const carregando =
    !!sugestao &&
    (carregandoProjetos ||
      carregandoClientes ||
      carregandoPerfis ||
      (alvoProjeto?.projetoId ? carregandoMembros : false));

  const valores = useMemo<TaskModalInitialValues | null>(() => {
    if (!sugestao || !resolucao || carregando) return null;
    return {
      title: sugestao.titulo,
      description: serializeTarefaRichText(markdownEnriquecidoParaDoc(sugestao.descricao)),
      project_id: resolucao.projetoId ?? undefined,
      client_id: resolucao.clienteId ?? undefined,
      assigned_to: resolucao.responsavelId ?? undefined,
      assigned_to_name: resolucao.responsavelNome ?? undefined,
      estimated_hours: resolucao.horasEstimadas ?? undefined,
    };
  }, [sugestao, resolucao, carregando]);

  return {
    carregando,
    valores,
    camposNaoResolvidos: resolucao?.camposNaoResolvidos ?? [],
    conflitos: resolucao?.conflitos ?? [],
  };
}
