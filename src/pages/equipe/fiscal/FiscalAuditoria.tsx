import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { AuditTabs } from '@/components/equipe/audit/AuditTabs';

// O cabeçalho interno que existia aqui repetia o título da página logo abaixo
// dele, e o fazia com outra palavra: "Logs de Auditoria - Tax". Na Tax isso lia
// como se a tela fosse do setor de auditoria, porque é assim que o time se
// chama. Quem nomeia a tela é o `title` do layout.
const FiscalAuditoria = () => {
  return (
    <FiscalLayout title="Logs de Uso" subtitle="Histórico de alterações em projetos e tarefas">
      <div className="space-y-6">
        {/* As abas vivem em AuditTabs — a mesma lista que a OSG e o Board montam. */}
        <AuditTabs area="tax" />
      </div>
    </FiscalLayout>
  );
};

export default FiscalAuditoria;
