import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AuditArea } from '@/lib/auditAreas';
import { AuditLogTable } from './AuditLogTable';
import { AuditPendenciasTable } from './AuditPendenciasTable';
import { AuditPessoasTable } from './AuditPessoasTable';
import { AuditProdutividadeTable } from './AuditProdutividadeTable';
import { AuditProdutosTable } from './AuditProdutosTable';

interface AuditTabsProps {
  /** Área do módulo ('tax'/'osg') ou 'todas' no consolidado do Board. */
  area: AuditArea;
}

/**
 * As seis abas de "Logs de Equipe", num lugar só.
 *
 * A Tax, a OSG e o Board montam exatamente estas abas — antes cada página
 * repetia a lista, e uma aba nova entrava em duas telas e esquecia a terceira.
 * O que muda entre as montagens é apenas o escopo (`area`) e a moldura de fora.
 *
 * Cada aba tem o seu próprio seletor de período (compartilhado via
 * `useAuditPeriodo`) e o seu próprio CSV — nada disso é decidido aqui.
 */
export const AuditTabs = ({ area }: AuditTabsProps) => (
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
      <AuditPessoasTable area={area} />
    </TabsContent>
    <TabsContent value="atividade" className="mt-4">
      <AuditProdutividadeTable area={area} visao="atividade" />
    </TabsContent>
    <TabsContent value="produtividade" className="mt-4">
      <AuditProdutividadeTable area={area} visao="produtividade" />
    </TabsContent>
    <TabsContent value="produtos" className="mt-4">
      <AuditProdutosTable area={area} />
    </TabsContent>
    <TabsContent value="pendencias" className="mt-4">
      <AuditPendenciasTable area={area} />
    </TabsContent>
    <TabsContent value="historico" className="mt-4">
      <AuditLogTable area={area} />
    </TabsContent>
  </Tabs>
);
