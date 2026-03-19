import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProdutoSegmentoTab from '@/components/equipe/ProdutoSegmentoTab';
import ServicosTab from '@/components/equipe/ServicosTab';
import CentroCustoTab from '@/components/equipe/CentroCustoTab';
import ProdutoServicoTab from '@/components/equipe/ProdutoServicoTab';

export default function CadastroCategorias() {
  return (
    <Card className="bg-white border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Cadastro de Categorias</CardTitle>
        <p className="text-sm text-slate-500">Gerencie tipos de produto/segmento, serviços prestados, centros de custo e empresas.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="servicos">
          <TabsList className="bg-slate-100 border border-slate-200 mb-4 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="produto_segmento" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Produto/Segmento
            </TabsTrigger>
            <TabsTrigger value="servicos" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Serviços Prestados
            </TabsTrigger>
            <TabsTrigger value="centros_custo" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Centros de Custo
            </TabsTrigger>
            <TabsTrigger value="produto_servico_vinculo" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Produto × Serviço
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produto_segmento"><ProdutoSegmentoTab /></TabsContent>
          <TabsContent value="servicos"><ServicosTab /></TabsContent>
          <TabsContent value="centros_custo"><CentroCustoTab /></TabsContent>
          <TabsContent value="produto_servico_vinculo"><ProdutoServicoTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
