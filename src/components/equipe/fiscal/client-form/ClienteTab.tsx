import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RequiredMark } from "@/components/ui/required-mark";

export interface ClientData {
  nome: string;
  categoria: string;
  ativo: boolean;
  fixo: string;
  telefone: string;
  municipio: string;
  uf: string;
  setor_cliente: string;
  regiao: string;
}

interface ClienteTabProps {
  clientData: ClientData;
  setClientData: React.Dispatch<React.SetStateAction<ClientData>>;
  isReadOnly: boolean;
}

export const ClienteTab = ({ clientData, setClientData, isReadOnly }: ClienteTabProps) => {
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
            onChange={(e) => setClientData((prev) => ({ ...prev, nome: e.target.value }))}
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
            onValueChange={(v) => setClientData((prev) => ({ ...prev, categoria: v }))}
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
              onCheckedChange={(c) => setClientData((prev) => ({ ...prev, ativo: c }))}
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
              onClick={() => setClientData((prev) => ({ ...prev, fixo: "Sim" }))}
              className={`px-4 py-1.5 text-xs font-semibold transition-colors ${clientData.fixo === "Sim" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
            >
              Fixo
            </button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setClientData((prev) => ({ ...prev, fixo: "Não" }))}
              className={`px-4 py-1.5 text-xs font-semibold border-l transition-colors ${clientData.fixo === "Não" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
            >
              Pontual
            </button>
          </div>
        </div>

        {/* 5. Área do Negócio */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Área do negócio *
          </Label>
          <Select
            disabled={isReadOnly}
            value={clientData.setor_cliente || "__none__"}
            onValueChange={(v) =>
              setClientData((prev) => ({ ...prev, setor_cliente: v === "__none__" ? "" : v }))
            }
          >
            <SelectTrigger className="flex-1 h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Selecione...</SelectItem>
              <SelectItem value="REV">REV - Revendas de insumos, máquinas e cerealistas</SelectItem>
              <SelectItem value="INS">INS - Instituições do agro</SelectItem>
              <SelectItem value="COO">COO - Cooperativas agropecuárias</SelectItem>
              <SelectItem value="AGR">AGR - Produção agropecuária</SelectItem>
              <SelectItem value="IND">IND - Agroindústria</SelectItem>
              <SelectItem value="INF">INF - Infraestrutura e concessões</SelectItem>
              <SelectItem value="DIV">DIV - Outros diversos</SelectItem>
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
            onValueChange={(v) => setClientData((prev) => ({ ...prev, regiao: v === "__none__" ? "" : v }))}
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
};
