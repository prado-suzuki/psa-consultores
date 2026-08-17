import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProdutosServicosTab from '@/components/equipe/ProdutosServicosTab';
import CentroCustoTab from '@/components/equipe/CentroCustoTab';
import EmpresasTab from '@/components/equipe/EmpresasTab';

export default function CadastroCategorias() {
  return (
    <Card className="bg-white border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Cadastro de Categorias</CardTitle>
        <p className="text-sm text-slate-500">
          Gerencie produtos/segmentos, serviços prestados e o vínculo entre eles, além de centros de custo e empresas.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="produtos_servicos">
          <TabsList className="bg-slate-100 border border-slate-200 mb-4 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="produtos_servicos" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Produtos &amp; Serviços
            </TabsTrigger>
            <TabsTrigger value="centros_custo" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Centros de Custo
            </TabsTrigger>
            <TabsTrigger value="empresas" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Empresas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produtos_servicos"><ProdutosServicosTab /></TabsContent>
          <TabsContent value="centros_custo"><CentroCustoTab /></TabsContent>
          <TabsContent value="empresas"><EmpresasTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
