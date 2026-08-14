import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { AuditLogTable } from '@/components/equipe/audit/AuditLogTable';
import { AuditPendenciasTable } from '@/components/equipe/audit/AuditPendenciasTable';
import { AuditPessoasTable } from '@/components/equipe/audit/AuditPessoasTable';
import { AuditProdutividadeTable } from '@/components/equipe/audit/AuditProdutividadeTable';
import { AuditProdutosTable } from '@/components/equipe/audit/AuditProdutosTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// O cabeçalho interno que existia aqui repetia o título da página logo abaixo
// dele, e o fazia com outra palavra: "Logs de Auditoria - Tax". Na Tax isso lia
// como se a tela fosse do setor de auditoria, porque é assim que o time se
// chama. Quem nomeia a tela é o `title` do layout.
const FiscalAuditoria = () => {
  return (
    <FiscalLayout title="Logs de Uso" subtitle="Histórico de alterações em projetos e tarefas">
      <div className="space-y-6">
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
            <AuditPessoasTable area="tax" />
          </TabsContent>
          <TabsContent value="atividade" className="mt-4">
            <AuditProdutividadeTable area="tax" visao="atividade" />
          </TabsContent>
          <TabsContent value="produtividade" className="mt-4">
            <AuditProdutividadeTable area="tax" visao="produtividade" />
          </TabsContent>
          <TabsContent value="produtos" className="mt-4">
            <AuditProdutosTable area="tax" />
          </TabsContent>
          <TabsContent value="pendencias" className="mt-4">
            <AuditPendenciasTable area="tax" />
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            <AuditLogTable area="tax" />
          </TabsContent>
        </Tabs>
      </div>
    </FiscalLayout>
  );
};

export default FiscalAuditoria;
