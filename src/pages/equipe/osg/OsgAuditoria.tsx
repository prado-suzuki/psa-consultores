import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { AuditTabs } from '@/components/equipe/audit/AuditTabs';

// Espelho da versão Tax: o cabeçalho interno repetia o título da página com
// outra palavra e saiu. Ver `FiscalAuditoria.tsx`.
const OsgAuditoria = () => {
  return (
    <OsgLayout title="Logs de Uso" subtitle="Histórico de alterações">
      <div className="space-y-6">
        {/* As abas vivem em AuditTabs — a mesma lista que a Tax e o Board montam. */}
        <AuditTabs area="osg" />
      </div>
    </OsgLayout>
  );
};

export default OsgAuditoria;
