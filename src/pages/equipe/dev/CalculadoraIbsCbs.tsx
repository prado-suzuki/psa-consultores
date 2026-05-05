import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbaClassificacao } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaClassificacao";
import { AbaResumo } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaResumo";
import { AbaPorAnexo } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaPorAnexo";
import { AbaPorProduto } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto";
import { FiltrosMock } from "@/components/equipe/dev/calculadora-ibs-cbs/FiltrosMock";
import { useApuracaoIbsCbs } from "@/hooks/useApuracaoIbsCbs";
import type { ApuracaoFiltros } from "@/lib/ibs-cbs/types";

const TABS = ["classificacao", "resumo", "anexo", "produto"] as const;
type TabKey = (typeof TABS)[number];

const CalculadoraIbsCbs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as TabKey)
    : "classificacao";
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [filtros, setFiltros] = useState<ApuracaoFiltros>({ ufs: [], anexos: [] });

  const { ufsDisponiveis, anexosDisponiveis, periodo } = useApuracaoIbsCbs(filtros);

  useEffect(() => {
    if (!filtros.inicio && periodo.min) {
      setFiltros((f) => ({ ...f, inicio: periodo.min, fim: periodo.max }));
    }
  }, [periodo.min, periodo.max, filtros.inicio]);

  const handleTabChange = (next: string) => {
    const t = next as TabKey;
    setTab(t);
    const params = new URLSearchParams(searchParams);
    params.set("tab", t);
    setSearchParams(params, { replace: true });
  };

  const isMockTab = tab !== "classificacao";

  return (
    <DevLayout
      title="Calculadora de IBS e CBS"
      subtitle="Classificação fiscal e análise de carga tributária — antes vs depois da reforma"
    >
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
          <TabsTrigger value="classificacao">Classificação</TabsTrigger>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="anexo">Por Anexo</TabsTrigger>
          <TabsTrigger value="produto">Por Produto</TabsTrigger>
        </TabsList>

        {isMockTab && (
          <FiltrosMock
            filtros={filtros}
            onChange={setFiltros}
            ufsDisponiveis={ufsDisponiveis}
            anexosDisponiveis={anexosDisponiveis}
            periodo={periodo}
          />
        )}

        <TabsContent value="classificacao" className="mt-0">
          <AbaClassificacao />
        </TabsContent>
        <TabsContent value="resumo" className="mt-0">
          <AbaResumo filtros={filtros} />
        </TabsContent>
        <TabsContent value="anexo" className="mt-0">
          <AbaPorAnexo filtros={filtros} />
        </TabsContent>
        <TabsContent value="produto" className="mt-0">
          <AbaPorProduto filtros={filtros} />
        </TabsContent>
      </Tabs>
    </DevLayout>
  );
};

export default CalculadoraIbsCbs;
