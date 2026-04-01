import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { currentAmbiente } from "@/config/api";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ParsedPer {
  nr_per: string;
  exercicio: number;
  tri_exercicio: number;
  dt_solicitada: string;
  tp_credito: string;
  vlr_credito: number;
  nr_proc_ret?: string;
  situacao?: string;
  dt_pagamento?: string;
  excluido?: string;
  nr_cancelamento?: string;
}

interface ParsedDcomp {
  nr_documento: string;
  nr_per_orig: string;
  mes_ano_exercicio: string;
  dt_envio: string;
  imposto: string;
  tp_credito: string;
  vlr_compensado: number;
  excluido?: string;
  nr_cancelamento?: string;
}

export function CargaPerdcompCSV() {
  const [selectedContribuinte, setSelectedContribuinte] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"per" | "dcomp">("per");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar contribuintes
  const { data: contribuintes = [] } = useQuery({
    queryKey: ["contribuintes-for-perdcomp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribuinte")
        .select("id, nome_razao_social, cpf_cnpj")
        .eq("ambiente", currentAmbiente)
        .order("nome_razao_social");

      if (error) throw error;
      return (data || []) as unknown as { id: string; nome_razao_social: string; cpf_cnpj: string | null }[];
    },
  });

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const separator = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";

    const headers = firstLine
      .split(separator)
      .map((h) => h.trim().toLowerCase().replace(/"/g, "").replace(/\s+/g, "_"));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(separator).map((v) => v.trim().replace(/"/g, ""));
      if (values.length >= headers.length - 1) {
        // Permite linhas com colunas opcionais vazias
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        rows.push(row);
      }
    }

    return rows;
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === "") return null;

    // Formato DD/MM/YYYY
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    // Formato YYYY-MM-DD (já está correto)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }

    return null;
  };

  const parseNumber = (numStr: string): number => {
    if (!numStr) return 0;
    // Remove pontos de milhar e troca vírgula por ponto
    const cleaned = numStr.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedContribuinte) {
      toast({
        title: "Contribuinte não selecionado",
        description: "Selecione um contribuinte antes de importar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error("CSV vazio ou formato inválido.");
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (activeTab === "per") {
        await importPer(rows, userId);
      } else {
        await importDcomp(rows, userId);
      }
    } catch (error: any) {
      console.error("Erro na importação:", error);
      setResult({
        success: false,
        message: error.message || "Erro ao importar dados",
      });
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const importPer = async (rows: Record<string, string>[], userId?: string) => {
    const persToInsert: any[] = [];
    const situacoesToInsert: any[] = [];

    for (const row of rows) {
      // Aceita tanto nr_per (novo) quanto numero_processo_per (legado) no CSV
      const numeroProcesso = (row.nr_per || row.numero_processo_per)?.trim();
      if (!numeroProcesso) continue;

      const dtSolicitada = parseDate(row.dt_solicitada);
      if (!dtSolicitada) {
        throw new Error(`Data inválida para o processo ${numeroProcesso}: ${row.dt_solicitada}`);
      }

      const perData: ParsedPer = {
        nr_per: numeroProcesso,
        exercicio: parseInt(row.exercicio) || new Date().getFullYear(),
        tri_exercicio: parseInt(row.tri_exercicio) || 1,
        dt_solicitada: dtSolicitada,
        tp_credito: row.tp_credito?.trim() || "",
        vlr_credito: parseNumber(row.vlr_credito),
        nr_proc_ret: row.nr_proc_ret?.trim() || null,
      };

      const porcentagemPsa = row.porcentagem_psa ? parseNumber(row.porcentagem_psa) : null;

      persToInsert.push({
        ...perData,
        id_contribuinte: selectedContribuinte,
        criado_por: userId,
        porcentagem_psa: porcentagemPsa,
      });

      // Se tem situação, prepara para inserir na tabela per_situacao
      const situacao = row.situacao?.trim();
      if (situacao) {
        const dtPagamento = parseDate(row.dt_pagamento);
        situacoesToInsert.push({
          nr_proc_per: numeroProcesso,
          situacao: situacao,
          dt_pagamento: dtPagamento,
          criado_por: userId,
        });
      }
    }

    if (persToInsert.length === 0) {
      throw new Error("Nenhum registro válido de PER encontrado no CSV.");
    }

    // Inserir PERs com upsert (atualiza se já existir) — coluna renomeada para nr_per
    const { error: perError } = await (supabase.from("per") as any).upsert(persToInsert, { onConflict: "nr_per" });

    if (perError) throw perError;

    // Inserir situações
    let situacoesInseridas = 0;
    if (situacoesToInsert.length > 0) {
      const { error: sitError } = await supabase.from("per_situacao").insert(situacoesToInsert);

      if (sitError) {
        console.error("Erro ao inserir situações:", sitError);
        // Não lançar erro, apenas avisar
        toast({
          title: "Aviso",
          description: `PERs importados, mas houve erro ao inserir algumas situações: ${sitError.message}`,
          variant: "default",
        });
      } else {
        situacoesInseridas = situacoesToInsert.length;
      }
    }

    setResult({
      success: true,
      message: `${persToInsert.length} PERs importados com sucesso!${situacoesInseridas > 0 ? ` ${situacoesInseridas} situações registradas.` : ""}`,
      count: persToInsert.length,
    });

    toast({
      title: "Importação concluída",
      description: `${persToInsert.length} PERs importados.`,
    });
  };

  const importDcomp = async (rows: Record<string, string>[], userId?: string) => {
    const dcompsToInsert: any[] = [];

    for (const row of rows) {
      const nrDocumento = row.nr_documento?.trim();
      const nrPerOrig = row.nr_per_orig?.trim() || row.nr_per_oirig?.trim(); // Aceita typo do usuário

      if (!nrDocumento || !nrPerOrig) continue;

      const dtEnvio = parseDate(row.dt_envio);
      if (!dtEnvio) {
        throw new Error(`Data de envio inválida para o documento ${nrDocumento}: ${row.dt_envio}`);
      }

      const mesAnoExercicio = parseDate(row.mes_ano_exercicio);
      if (!mesAnoExercicio) {
        throw new Error(`Mês/Ano exercício inválido para o documento ${nrDocumento}: ${row.mes_ano_exercicio}`);
      }

      const dcompData: ParsedDcomp = {
        nr_documento: nrDocumento,
        nr_per_orig: nrPerOrig,
        mes_ano_exercicio: mesAnoExercicio,
        dt_envio: dtEnvio,
        imposto: row.imposto?.trim() || "",
        tp_credito: row.tp_credito?.trim() || "",
        vlr_compensado: parseNumber(row.vlr_compensado),
      };

      const porcentagemPsa = row.porcentagem_psa ? parseNumber(row.porcentagem_psa) : null;

      dcompsToInsert.push({
        ...dcompData,
        criado_por: userId,
        porcentagem_psa: porcentagemPsa,
      });
    }

    if (dcompsToInsert.length === 0) {
      throw new Error("Nenhum registro válido de DCOMP encontrado no CSV.");
    }

    const { error } = await supabase.from("dcomp").insert(dcompsToInsert);

    if (error) throw error;

    setResult({
      success: true,
      message: `${dcompsToInsert.length} DCOMPs importados com sucesso!`,
      count: dcompsToInsert.length,
    });

    toast({
      title: "Importação concluída",
      description: `${dcompsToInsert.length} DCOMPs importados.`,
    });
  };

  const selectedContribuinteInfo = contribuintes.find((c) => c.id === selectedContribuinte);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Carga PER/DCOMP via CSV
        </CardTitle>
        <CardDescription>Importe dados de PER e DCOMP a partir de arquivos CSV</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Contribuinte */}
        <div className="space-y-2">
          <Label>Contribuinte</Label>
          <Select value={selectedContribuinte} onValueChange={setSelectedContribuinte}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o contribuinte..." />
            </SelectTrigger>
            <SelectContent>
              {contribuintes.map((contrib) => (
                <SelectItem key={contrib.id} value={contrib.id}>
                  {contrib.nome_razao_social} {contrib.cpf_cnpj && `(${contrib.cpf_cnpj})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedContribuinteInfo && (
            <p className="text-sm text-muted-foreground">
              Contribuinte selecionado: <strong>{selectedContribuinteInfo.nome_razao_social}</strong>
            </p>
          )}
        </div>

        {/* Tabs PER/DCOMP */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "per" | "dcomp")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="per">PER (Restituição)</TabsTrigger>
            <TabsTrigger value="dcomp">DCOMP (Compensação)</TabsTrigger>
          </TabsList>

          <TabsContent value="per" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Formato CSV - PER</AlertTitle>
              <AlertDescription className="text-xs">
                <strong>Colunas:</strong> numero_processo_per, exercicio, tri_exercicio, dt_solicitada, tp_credito,
                vlr_credito, nr_proc_ret, situacao, dt_pagamento
                <br />
                <strong>Separador:</strong> ; (ponto e vírgula) ou TAB
                <br />
                <strong>Datas:</strong> DD/MM/YYYY ou YYYY-MM-DD
              </AlertDescription>
            </Alert>

            <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
              {`numero_processo_per;exercicio;tri_exercicio;dt_solicitada;tp_credito;vlr_credito;nr_proc_ret;situacao;dt_pagamento
10010.123456/2024-01;2024;1;15/01/2024;PIS;15000,50;;Deferido;
10010.123457/2024-02;2024;2;15/04/2024;COFINS;25000,00;;Em análise;`}
            </pre>
          </TabsContent>

          <TabsContent value="dcomp" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Formato CSV - DCOMP</AlertTitle>
              <AlertDescription className="text-xs">
                <strong>Colunas:</strong> nr_documento, nr_per_orig, mes_ano_exercicio, dt_envio, imposto, tp_credito,
                vlr_compensado
                <br />
                <strong>Separador:</strong> ; (ponto e vírgula) ou TAB
                <br />
                <strong>Datas:</strong> DD/MM/YYYY ou YYYY-MM-DD
              </AlertDescription>
            </Alert>

            <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
              {`nr_documento;nr_per_orig;mes_ano_exercicio;dt_envio;imposto;tp_credito;vlr_compensado
00452.02945.200226.1.3.18-4556;10010.12345.202401.1.3.18-0001;01/02/2024;15/02/2024;IRPJ;PIS;5000,00
00452.02945.200226.1.3.18-4557;10010.12345.202401.1.3.18-0001;01/03/2024;15/03/2024;CSLL;PIS;3500,50`}
            </pre>
          </TabsContent>
        </Tabs>

        {/* Upload */}
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
            id="perdcomp-csv-upload"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || !selectedContribuinte}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar CSV de {activeTab.toUpperCase()}
          </Button>

          {!selectedContribuinte && (
            <span className="text-sm text-muted-foreground">Selecione um contribuinte primeiro</span>
          )}
        </div>

        {/* Resultado */}
        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Sucesso" : "Erro"}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
