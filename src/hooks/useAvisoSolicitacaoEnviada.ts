import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  mensagemDoAviso,
  resolverProjetoDoAviso,
  type ProjetoCandidato,
  type SolicitacaoParaAviso,
} from '@/lib/avisoSolicitacaoEnviada';

/**
 * Registra na thread do projeto que a lista de documentos foi enviada ao cliente.
 *
 * E a metade "avisar a equipe" do envio: o aviso de tela do clique desaparece e
 * nao avisa quem nao estava olhando, entao o registro que fica e uma mensagem de
 * sistema em `org_comments`, do tipo `documentos_solicitados`.
 *
 * **Mutacao separada, chamada sem `await` no sucesso do envio.** O envio ja
 * gravou status e data e liberou a area do cliente antes de chegar aqui; se este
 * aviso falhasse dentro do fluxo do envio, a tela mostraria erro para uma
 * operacao que deu certo. Separada, a falha cai no `onError` daqui e o envio
 * segue sendo sucesso.
 *
 * **Sai em silencio quando nao ha projeto.** A solicitacao nao conhece projeto, e
 * a resolucao pode nao achar nenhum (ou achar mais de um). Nao e erro: e o
 * caminho previsto, e hoje e o caminho de todas as solicitacoes, porque
 * `org_projects` e estrutura do Tax e a solicitacao e fluxo da OSG.
 *
 * Nota sobre permissao, conferida no banco: a leitura de `org_projects` e a
 * escrita em `org_comments` sao barradas pelas MESMAS quatro regras
 * (`can_view_org_project` e `visible_org_project_ids` sao construidas iguais).
 * Quem nao pode comentar tambem nao ve o projeto na leitura acima, entao cai no
 * caminho silencioso em vez de tomar recusa no insert.
 */
export function useAvisoSolicitacaoEnviada() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (solicitacao: SolicitacaoParaAviso) => {
      const { data, error } = await supabase
        .from('org_projects')
        .select('id, ordem_servico_id, external_client_id');

      if (error) throw error;

      const projectId = resolverProjetoDoAviso(
        solicitacao,
        (data ?? []) as ProjetoCandidato[],
      );
      if (!projectId) return { publicado: false as const };

      const nome =
        [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || user?.email || 'Sistema';

      // Sem `project_id` no payload: trg_org_comments_resolve_scope o preenche a
      // partir de entity_type/entity_id, e a policy de insert e avaliada depois
      // dele. E como o insert daquele molde (useOrgTasks.ts) ja funciona.
      const { error: erroComentario } = await supabase
        .from('org_comments' as never)
        .insert({
          entity_type: 'org_project',
          entity_id: projectId,
          author_id: user?.id,
          author_name: nome,
          body: mensagemDoAviso(),
          kind: 'documentos_solicitados',
        } as never);

      if (erroComentario) throw erroComentario;
      return { publicado: true as const };
    },
    // `toast.warning` e nao `toast.error`: o envio deu certo, o que faltou foi o
    // registro. Erro vermelho aqui faria a pessoa duvidar se a solicitacao saiu.
    onError: () =>
      toast.warning(
        'Solicitação enviada. O aviso não pôde ser registrado na thread do projeto.',
      ),
  });
}
