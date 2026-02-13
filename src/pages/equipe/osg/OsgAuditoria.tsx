import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { AuditLogTable } from '@/components/equipe/audit/AuditLogTable';
import { Shield } from 'lucide-react';

const OsgAuditoria = () => {
  return (
    <OsgLayout title="Auditoria" subtitle="Histórico de alterações">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Logs de Auditoria - OSG</h2>
            <p className="text-sm text-slate-500">Registro de criações, edições e exclusões</p>
          </div>
        </div>
        <AuditLogTable area="osg" />
      </div>
    </OsgLayout>
  );
};

export default OsgAuditoria;
