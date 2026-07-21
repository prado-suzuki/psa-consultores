import { AlertCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApuracaoPisCofinsController, PisCofinsTab } from "@/hooks/useApuracaoPisCofinsController";
import { ApuracaoTab, CreditosTab, DebitosTab, ResumoTab } from "@/components/equipe/dev/pis-cofins/ApuracaoMainTabs";
import { RateioTab } from "@/components/equipe/dev/pis-cofins/RateioTab";

export function ApuracaoResults({ controller }: { controller: ApuracaoPisCofinsController }) {
  if (!controller.searchTriggered) return null;
  if (controller.query.isLoading) return <div className="bg-card rounded-xl shadow-sm p-6 space-y-3">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-8 w-full" />)}</div>;
  if (controller.query.error) return <div className="bg-card rounded-xl shadow-sm p-8 text-center space-y-2"><AlertCircle className="h-8 w-8 text-destructive mx-auto" /><p className="text-sm text-foreground">Erro ao buscar dados</p><p className="text-xs text-muted-foreground">{controller.query.error.message}</p></div>;
  if (!controller.hasData) return <div className="bg-card rounded-xl shadow-sm p-8 text-center">
    {controller.shouldCheckImports && !controller.imports.ready ? <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>Verificando documentos importados...</span></div> : <p className="text-sm text-muted-foreground">{controller.emptyStateMessage}</p>}
  </div>;
  return <>
    <Tabs value={controller.activeTab} onValueChange={(value) => controller.setActiveTab(value as PisCofinsTab)} className="mb-6">
      <TabsList><TabsTrigger value="resumo">Resumo</TabsTrigger><TabsTrigger value="debitos">Débitos</TabsTrigger><TabsTrigger value="creditos">Créditos</TabsTrigger><TabsTrigger value="apuracao">Apuração</TabsTrigger>{controller.tipoApuracao === "EFD" && <TabsTrigger value="rateio">Rateio</TabsTrigger>}</TabsList>
    </Tabs>
    {controller.activeTab === "resumo" && <ResumoTab controller={controller} />}
    {controller.activeTab === "debitos" && <DebitosTab controller={controller} />}
    {controller.activeTab === "creditos" && <CreditosTab controller={controller} />}
    {controller.activeTab === "apuracao" && <ApuracaoTab controller={controller} />}
    {controller.activeTab === "rateio" && controller.tipoApuracao === "EFD" && <RateioTab controller={controller} />}
  </>;
}
