import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuditLog } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { computeFieldDiff } from '@/lib/diffUtils';

/**
 * Gera as tarefas-pai do produto contratado dentro do projeto, pela RPC
 * `gerar_tarefas_projeto(_project_id uuid) → integer`.
 *
 * Molde: `gerarDaOs` em `src/hooks/useDomainSolicitacao.ts` — a irmã gêmea que
 * chama função de banco devolvendo inteiro de forma idempotente. Mesma forma:
 * chama, lança em erro, lê o número com alternativa a zero, audita o diff.
 *
 * POR QUE FUNÇÃO NO BANCO, e não um insert daqui: a política de inserção de
 * tarefa só deixa criar tarefa PARA SI MESMO quem não é sublíder ou superior, e
 * quem cria projeto é frequentemente membro comum. A função é SECURITY DEFINER
 * com guarda de escopo (`can_view_org_project`), então ela cria a tarefa do
 * outro sem abrir a política para todo mundo.
 *
 * A RPC é IDEMPOTENTE e nunca apaga: só insere o que falta. Rodar de novo em um
 * projeto completo devolve `0` — não é erro, é a segunda chamada não tendo o que
 * fazer. É por isso que o aviso de tela sai só quando o número é maior que zero.
 *
 * ELA DEVOLVE ZERO HOJE, PARA TODO PROJETO, e isso não é defeito deste hook: a
 * função ainda lê `produto_tarefa_padrao`, que está vazia nos dois bancos. A
 * assinatura não muda quando a fonte for trocada para `produto_servico`
 * (migration de outra frente), então este caminho passa a produzir número maior
 * que zero sem alteração de código no front.
 */
export interface GerarTarefasProjetoVars {
  projectId: string;
  /** Só para a linha de auditoria ficar legível — não vai à RPC. */
  projectName: string;
}

export function useGerarTarefasProjeto() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ projectId, projectName }: GerarTarefasProjetoVars) => {
      const { data, error } = await supabase.rpc('gerar_tarefas_projeto', {
        _project_id: projectId,
      });
      if (error) throw error;

      // `data` é o inteiro devolvido pela função. Alternativa a zero porque o
      // PostgREST devolve `null` quando a função não retorna linha.
      const criados = data ?? 0;

      // Diff campo a campo, e não só `details`: o registro precisa dizer QUANTO
      // mudou de forma consultável. Chamada que não criou nada deixa o diff
      // vazio de propósito — o rastro de que alguém pediu fica no `details`.
      await logAction({
        area: 'tax',
        entity_type: 'project',
        entity_id: projectId,
        entity_name: projectName,
        action: 'updated',
        changed_fields: computeFieldDiff(
          { tarefas_geradas: 0 },
          { tarefas_geradas: criados },
          ['tarefas_geradas'],
        ),
        details: `${criados} tarefa(s) gerada(s) a partir do catálogo do produto`,
      });

      return criados;
    },
    onSuccess: (criados) => {
      // Mesmo prefixo de `useOrgTasks`: sem isto as tarefas geradas só
      // apareceriam no próximo refetch da lista.
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
      if (criados > 0) {
        toast.success(
          `${criados} tarefa(s) gerada(s) a partir do catálogo do produto`,
        );
      }
    },
    /**
     * Diferente da chamada na criação do projeto (`useOrgProjects.ts`), que
     * engole a falha para não derrubar um projeto já criado: aqui o usuário
     * pediu explicitamente, então a falha é dele saber. É o antídoto para o
     * silêncio do outro caminho.
     */
    onError: (error: Error) =>
      toast.error('Não foi possível gerar as tarefas do projeto: ' + error.message),
  });
}
