import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { AbaResumo } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaResumo";
import { AbaPorAnexo } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaPorAnexo";
import { AbaPorProduto } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto";
import { AbaPorEstado } from "@/components/equipe/dev/calculadora-ibs-cbs/AbaPorEstado";
import { FiltrosCalculadora } from "@/components/equipe/dev/calculadora-ibs-cbs/FiltrosCalculadora";
import { useCalculadoraFiltros } from "@/hooks/useCalculadoraIbsCbs";
import { useClientesList, useContribuintesByCliente } from "@/hooks/useDevClients";
import type { ApuracaoFiltros } from "@/lib/ibs-cbs/types";

const TABS = ["resumo", "anexo", "produto", "estado"] as const;
type TabKey = (typeof TABS)[number];

const CalculadoraIbsCbs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as TabKey)
    : "resumo";
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [clienteId, setClienteId] = useState("");
  const [contribuinteId, setContribuinteId] = useState("");

  const [filtros, setFiltros] = useState<ApuracaoFiltros>({ ufs: [], anexos: [] });

  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: contribuintes = [] } = useContribuintesByCliente(clienteId || null);

  const filtrosQuery = useCalculadoraFiltros(contribuinteId);
  const ufsDisponiveis = filtrosQuery.data?.ufs ?? [];
  const anexosDisponiveis = filtrosQuery.data?.anexos ?? [];
  const periodo = filtrosQuery.data?.periodo ?? { min: null, max: null };

  useEffect(() => {
    if (clienteId && contribuintes.length === 1 && !contribuinteId) {
      setContribuinteId(contribuintes[0].id);
    }
  }, [clienteId, contribuintes, contribuinteId]);

  // Quando o contribuinte muda, descarta filtros antigos para evitar período inválido
  useEffect(() => {
    setFiltros({ ufs: [], anexos: [] });
  }, [contribuinteId]);

  useEffect(() => {
    if (!filtros.inicio && periodo.min) {
      setFiltros((f) => ({
        ...f,
        inicio: periodo.min ?? undefined,
        fim: periodo.max ?? undefined,
      }));
    }
  }, [periodo.min, periodo.max, filtros.inicio]);

  const handleTabChange = (next: string) => {
    const t = next as TabKey;
    setTab(t);
    const params = new URLSearchParams(searchParams);
    params.set("tab", t);
    setSearchParams(params, { replace: true });
  };

  return (
    <DevLayout
      title="Calculadora de IBS e CBS"
      subtitle="Classificação fiscal e análise de carga tributária — antes vs depois da reforma"
    >
      <Card className="mb-6 border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200">
            <Filter className="h-4 w-4 text-teal-600" />
            Escopo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                Cliente
              </label>
              <Select
                value={clienteId}
                onValueChange={(v) => {
                  setClienteId(v);
                  setContribuinteId("");
                }}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                Contribuinte
              </label>
              <Select
                value={contribuinteId}
                onValueChange={setContribuinteId}
                disabled={!clienteId}
              >
                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                  <SelectValue placeholder={clienteId ? "Selecione..." : "Selecione um cliente"} />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-4 mb-6">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="anexo">Por Anexo</TabsTrigger>
          <TabsTrigger value="produto">Por Produto</TabsTrigger>
          <TabsTrigger value="estado">Por Estado</TabsTrigger>
        </TabsList>

        <FiltrosCalculadora
          filtros={filtros}
          onChange={setFiltros}
          ufsDisponiveis={ufsDisponiveis}
          anexosDisponiveis={anexosDisponiveis}
          periodo={periodo}
          disabled={!contribuinteId}
        />

        {!contribuinteId ? (
          <Card className="border-dashed">
            <CardContent className="p-16 text-center text-sm text-slate-500">
              Selecione um cliente e contribuinte para visualizar a apuração.
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="resumo" className="mt-0">
              <AbaResumo filtros={filtros} idContribuinte={contribuinteId} />
            </TabsContent>
            <TabsContent value="anexo" className="mt-0">
              <AbaPorAnexo filtros={filtros} idContribuinte={contribuinteId} />
            </TabsContent>
            <TabsContent value="produto" className="mt-0">
              <AbaPorProduto filtros={filtros} idContribuinte={contribuinteId} />
            </TabsContent>
            <TabsContent value="estado" className="mt-0">
              <AbaPorEstado filtros={filtros} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </DevLayout>
  );
};

export default CalculadoraIbsCbs;
