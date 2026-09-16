import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import PainelTarefas from '@/components/equipe/tarefas/PainelTarefas';
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

/**
 * "Projetos e tarefas" da Tax, servindo DUAS rotas: `/projetos/cadastro`, que é a
 * do menu e do cartão, e `/projetos/tarefas`, para onde o sino de notificações, as
 * pendências, o feed e a criação em lote mandam o usuário.
 *
 * Até 14/09/2026 eram dois arquivos, e o `diff` entre eles devolvia apenas o nome
 * da const: `FiscalDemandasTarefas` era cópia deste. Os dois vieram do redesign de
 * 23/07, quando projeto e tarefa viraram uma hierarquia só e o `PainelTarefas`
 * passou a dar conta das duas — a página antiga de cadastro de projetos foi
 * reapontada para o mesmo painel e ninguém removeu a outra.
 *
 * O reexport de `ProjetosCadastroContent` saiu junto: ele existia só para o teste
 * deste arquivo importar, enquanto a OSG já pegava o componente do módulo real.
 */
const FiscalProjetosCadastro = () => {
  // Lista de 1200px, Kanban de altura cheia e Gantt: a barra recolhe sozinha.
  useTelaDeTrabalhoLargo();

  return (
    <FiscalLayout tela="projetosETarefas">
      <PainelTarefas area="tax" />
    </FiscalLayout>
  );
};

export default FiscalProjetosCadastro;
