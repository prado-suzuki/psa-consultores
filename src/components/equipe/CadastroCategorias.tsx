import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProdutosServicosTab from '@/components/equipe/ProdutosServicosTab';

/**
 * Dona do cadastro de produto/segmento, serviço prestado e do vínculo entre eles.
 *
 * Centros de custo e empresa/cluster ficam em Cadastros Estrutura, onde a
 * estrutura organizacional é dona deles — aqui esses itens só são referenciados
 * por seletor, nunca recadastrados.
 */
export default function CadastroCategorias() {
  return (
    <Card className="bg-white border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Produtos &amp; Serviços</CardTitle>
        <p className="text-sm text-slate-500">
          Cadastre produtos/segmentos e serviços prestados, e marque quais serviços valem para cada produto.
        </p>
      </CardHeader>
      <CardContent>
        <ProdutosServicosTab />
      </CardContent>
    </Card>
  );
}
