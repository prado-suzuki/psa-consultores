import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { AuditTabs } from '@/components/equipe/audit/AuditTabs';
import { Shield } from 'lucide-react';

const FiscalAuditoria = () => {
  return (
    <FiscalLayout title="Logs de Equipe" subtitle="Histórico de alterações em projetos e tarefas">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Logs de Auditoria - Tax</h2>
            <p className="text-sm text-muted-foreground">Registro de criações, edições e exclusões</p>
          </div>
        </div>
        {/* As abas vivem em AuditTabs — a mesma lista que a OSG e o Board montam. */}
        <AuditTabs area="tax" />
      </div>
    </FiscalLayout>
  );
};

export default FiscalAuditoria;
