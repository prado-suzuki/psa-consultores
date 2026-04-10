import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RequiredMark } from "@/components/ui/required-mark";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown } from "lucide-react";
import type { defaultClientData } from "./constants";

interface SetorCliente {
  id: string;
  nome: string;
  sigla: string;
}

interface ClusterOption {
  id: string;
  name: string;
}

export interface ClienteTabProps {
  clientData: typeof defaultClientData;
  setClientData: React.Dispatch<React.SetStateAction<typeof defaultClientData>>;
  isReadOnly: boolean;
  setoresCliente: SetorCliente[];
  allClusters?: ClusterOption[];
}

export default function ClienteTab({ clientData, setClientData, isReadOnly, setoresCliente, allClusters = [] }: ClienteTabProps) {
  const selectedClusters = allClusters.filter(c => clientData.cluster_ids.includes(c.id));

  const toggleCluster = (clusterId: string) => {
    setClientData(prev => ({
      ...prev,
      cluster_ids: prev.cluster_ids.includes(clusterId)
        ? prev.cluster_ids.filter(id => id !== clusterId)
        : [...prev.cluster_ids, clusterId],
    }));
  };

  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b">
        <h3 className="text-sm font-bold text-foreground">Dados do Cliente/Grupo</h3>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {/* 1. Nome */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Nome do Cliente / Grupo <RequiredMark />
          </Label>
          <Input
            autoFocus={!isReadOnly}
            disabled={isReadOnly}
            value={clientData.nome}
            onChange={(e) => setClientData({ ...clientData, nome: e.target.value })}
            placeholder="Ex: Grupo Empresarial Silva"
            className="flex-1 h-8"
          />
        </div>

        {/* 2. Categoria */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Categoria
          </Label>
          <Select
            disabled={isReadOnly}
            value={clientData.categoria}
            onValueChange={(v) => setClientData({ ...clientData, categoria: v })}
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bronze">Bronze</SelectItem>
              <SelectItem value="Prata">Prata</SelectItem>
              <SelectItem value="Ouro">Ouro</SelectItem>
              <SelectItem value="Diamante">Diamante</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 3. Status */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Status
          </Label>
          <div className="flex items-center gap-2">
            <Switch
              disabled={isReadOnly}
              checked={clientData.ativo}
              onCheckedChange={(c) => setClientData({ ...clientData, ativo: c })}
            />
            <span className="text-xs font-medium">{clientData.ativo ? "Ativo" : "Inativo"}</span>
          </div>
        </div>

        {/* 4. Tipo de Relacionamento */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Tipo de relacionamento
          </Label>
          <div className="flex border rounded-md overflow-hidden">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setClientData({ ...clientData, fixo: "Sim" })}
              className={`px-4 py-1.5 text-xs font-semibold transition-colors ${clientData.fixo === "Sim" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
            >
              Fixo
            </button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setClientData({ ...clientData, fixo: "Não" })}
              className={`px-4 py-1.5 text-xs font-semibold border-l transition-colors ${clientData.fixo === "Não" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
            >
              Pontual
            </button>
          </div>
        </div>

        {/* 4.5. Clusters */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Clusters
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isReadOnly}
                className="flex-1 flex items-center gap-1 flex-wrap min-h-[2rem] px-3 py-1 border rounded-md text-sm bg-background hover:bg-accent/50 transition-colors disabled:opacity-50"
              >
                {selectedClusters.length > 0 ? (
                  selectedClusters.map(c => (
                    <Badge key={c.id} variant="secondary" className="text-xs">
                      {c.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs">Selecione...</span>
                )}
                <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="start">
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {allClusters.map(cluster => (
                  <label
                    key={cluster.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={clientData.cluster_ids.includes(cluster.id)}
                      onCheckedChange={() => toggleCluster(cluster.id)}
                      disabled={isReadOnly}
                    />
                    {cluster.name}
                  </label>
                ))}
                {allClusters.length === 0 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">Nenhum cluster disponível</span>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 5. Área do Negócio */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Área do negócio *
          </Label>
          <Select
            disabled={isReadOnly}
            value={clientData.setor_cliente_id || "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") {
                setClientData({ ...clientData, setor_cliente_id: "", setor_cliente: "" });
              } else {
                const setor = setoresCliente.find(s => s.id === v);
                setClientData({
                  ...clientData,
                  setor_cliente_id: v,
                  setor_cliente: setor?.sigla || "",
                });
              }
            }}
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Selecione...</SelectItem>
              {setoresCliente.map((setor) => (
                <SelectItem key={setor.id} value={setor.id}>
                  {setor.sigla} - {setor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 6. Região */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Região *
          </Label>
          <Select
            disabled={isReadOnly}
            value={clientData.regiao || "__none__"}
            onValueChange={(v) => setClientData({ ...clientData, regiao: v === "__none__" ? "" : v })}
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Selecione...</SelectItem>
              <SelectItem value="BRA">BRA - Bahia, Goiás, Distrito Federal</SelectItem>
              <SelectItem value="3NO">3NO - BR-163 Norte</SelectItem>
              <SelectItem value="3SU">
                3SU - BR-163 Sul, Vale do Araguaia, Serra da Petrovina, Norte do MS
              </SelectItem>
              <SelectItem value="PAR">
                PAR - Chapadão do Parecis, região sucroalcooleira, Rondônia
              </SelectItem>
              <SelectItem value="CBA">CBA - Baixada Cuiabana</SelectItem>
              <SelectItem value="RAO">
                RAO - Sul do MS, Paraná, SC, Cerrado Mineiro, São Paulo
              </SelectItem>
              <SelectItem value="MPT">MPT - Mapito, BR-010, Pará</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
