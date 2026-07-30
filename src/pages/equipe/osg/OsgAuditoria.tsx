import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { AuditLogTable } from '@/components/equipe/audit/AuditLogTable';
import { AuditPendenciasTable } from '@/components/equipe/audit/AuditPendenciasTable';
import { AuditPessoasTable } from '@/components/equipe/audit/AuditPessoasTable';
import { AuditProdutividadeTable } from '@/components/equipe/audit/AuditProdutividadeTable';
import { AuditProdutosTable } from '@/components/equipe/audit/AuditProdutosTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        <Tabs defaultValue="pessoas">
          <TabsList>
            <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
            <TabsTrigger value="produtividade">Produtividade</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="pendencias">Não resolvidos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="pessoas" className="mt-4">
            <AuditPessoasTable area="osg" />
          </TabsContent>
          <TabsContent value="atividade" className="mt-4">
            <AuditProdutividadeTable area="osg" visao="atividade" />
          </TabsContent>
          <TabsContent value="produtividade" className="mt-4">
            <AuditProdutividadeTable area="osg" visao="produtividade" />
          </TabsContent>
          <TabsContent value="produtos" className="mt-4">
            <AuditProdutosTable area="osg" />
          </TabsContent>
          <TabsContent value="pendencias" className="mt-4">
            <AuditPendenciasTable area="osg" />
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            <AuditLogTable area="osg" />
          </TabsContent>
        </Tabs>
      </div>
    </OsgLayout>
  );
};

export default OsgAuditoria;
