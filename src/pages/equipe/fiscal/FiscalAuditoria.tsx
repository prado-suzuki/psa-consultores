import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { AuditLogTable } from '@/components/equipe/audit/AuditLogTable';
import { Shield } from 'lucide-react';

const FiscalAuditoria = () => {
  return (
    <FiscalLayout title="Auditoria" subtitle="Histórico de alterações em projetos e tarefas">
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
        <AuditLogTable area="tax" />
      </div>
    </FiscalLayout>
  );
};

export default FiscalAuditoria;
