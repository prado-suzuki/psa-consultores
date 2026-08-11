import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RequiredMark } from "@/components/ui/required-mark";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcentoArea } from "./acentoArea";
import MarcaPendencia, { CLASSE_CAMPO_PENDENTE } from "./MarcaPendencia";
import SecaoFormulario from "./SecaoFormulario";
import { UF_STATES, type defaultClientData } from "./constants";
import { normalizarNomeDigitado } from "@/lib/nomeProprio";

interface ClusterOption {
  id: string;
  name: string;
}

export interface ClienteTabProps {
  clientData: typeof defaultClientData;
  setClientData: React.Dispatch<React.SetStateAction<typeof defaultClientData>>;
  isReadOnly: boolean;
  allClusters?: ClusterOption[];
  /**
   * Faltas de preenchimento desta aba, campo → frase, já filtradas pela
   * primeira tentativa de salvar. Esta aba não tem lista, então vem direto.
   */
  camposPendentes?: Map<string, string>;
  /** Seções que têm falta, para o número ficar vermelho. */
  secoesPendentes?: Set<number>;
}

/** Linha rótulo/valor do modo Visualizar. Mesmo tamanho de fonte em tudo. */
function ReadRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-3 py-2">
      <dt className="w-full md:w-48 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="flex-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

const TIPO_RELACIONAMENTO_LABEL: Record<string, string> = {
  "Sim": "Fixo",
  "Não": "Pontual",
  "Em Análise": "Em Análise",
};

export default function ClienteTab({
  clientData, setClientData, isReadOnly, allClusters = [], camposPendentes, secoesPendentes,
}: ClienteTabProps) {
  const acento = useAcentoArea();
  const selectedClusters = allClusters.filter(c => clientData.cluster_ids.includes(c.id));
  const falta = (campo: string) => camposPendentes?.get(campo);
  const secaoPendente = (numero: number) => secoesPendentes?.has(numero) ?? false;

  // Visualizar: valores como texto. Campo desabilitado com placeholder cinza
  // parece vazio e sugere que dá para digitar — não serve para leitura.
  if (isReadOnly) {
    return (
      <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-2 bg-muted/50 border-b">
          <h3 className="text-sm font-bold text-foreground">Dados do Cliente/Grupo</h3>
        </div>
        <dl className="px-4 py-2 divide-y divide-border/50">
          <ReadRow label="Nome do Cliente / Grupo">
            <span className="font-medium">{clientData.nome || "—"}</span>
          </ReadRow>
          <ReadRow label="Categoria">{clientData.categoria || "—"}</ReadRow>
          <ReadRow label="Município / UF">
            {clientData.municipio?.trim() || clientData.uf?.trim()
              ? [clientData.municipio?.trim(), clientData.uf?.trim()].filter(Boolean).join(" / ")
              : "—"}
          </ReadRow>
          <ReadRow label="Status">
            <span className="inline-flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", clientData.ativo ? acento.positivoBarra : "bg-muted-foreground/50")} />
              {clientData.ativo ? "Ativo" : "Inativo"}
            </span>
          </ReadRow>
          <ReadRow label="Tipo de relacionamento">
            {TIPO_RELACIONAMENTO_LABEL[clientData.fixo] || "—"}
          </ReadRow>
          <ReadRow label="Clusters">
            {selectedClusters.length === 0 ? "—" : (
              <span className="flex flex-wrap gap-1">
                {selectedClusters.map(c => <Badge key={c.id} variant="secondary" className="text-sm font-normal">{c.name}</Badge>)}
              </span>
            )}
          </ReadRow>
          <ReadRow label="Observações">
            <span className="whitespace-pre-line">{clientData.observacoes?.trim() || "—"}</span>
          </ReadRow>
        </dl>
      </section>
    );
  }

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
      <div className="space-y-6 px-4 py-4">
        <SecaoFormulario numero={1} titulo="Identificação" pendente={secaoPendente(1)}>
        <div className="flex flex-col gap-2.5">
        {/* 1. Nome */}
        <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground md:pt-2">
            Nome do Cliente / Grupo <RequiredMark />
          </Label>
          <div className="min-w-0 flex-1">
            <Input
              autoFocus={!isReadOnly}
              disabled={isReadOnly}
              value={clientData.nome}
              onChange={(e) => setClientData({ ...clientData, nome: e.target.value })}
              // A única arrumação de nome acontece aqui, no blur, com o campo à
              // vista: apara espaço, nunca caixa. O `initcap()` que rodava no
              // banco (B20) achatava sigla e razão social sem ninguém ver.
              onBlur={(e) => {
                const arrumado = normalizarNomeDigitado(e.target.value);
                if (arrumado !== clientData.nome) setClientData({ ...clientData, nome: arrumado });
              }}
              placeholder="Ex: Grupo Empresarial Silva"
              aria-invalid={!!falta('nome') || undefined}
              className={cn("h-8 w-full", falta('nome') && CLASSE_CAMPO_PENDENTE)}
            />
            <MarcaPendencia>{falta('nome')}</MarcaPendencia>
          </div>
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

        {/*
          2.5. Município e UF do cliente/grupo.

          As colunas `cliente.municipio` e `cliente.uf` já existiam: o carregador
          lia (useClientEditData), o salvamento gravava, a auditoria comparava e
          o sync do DW mandava adiante. Só não havia campo — dado que nenhuma
          tela sabia escrever, e que os modelos de documento precisam para o foro
          e para a qualificação da sede (B18).
        */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
            Município / UF
          </Label>
          <div className="flex min-w-0 flex-1 gap-2">
            <Input
              disabled={isReadOnly}
              value={clientData.municipio ?? ""}
              onChange={(e) => setClientData({ ...clientData, municipio: e.target.value })}
              onBlur={(e) => {
                const arrumado = normalizarNomeDigitado(e.target.value);
                if (arrumado !== clientData.municipio) setClientData({ ...clientData, municipio: arrumado });
              }}
              placeholder="Ex: Lucas do Rio Verde"
              className="h-8 min-w-0 flex-1"
            />
            <Select
              disabled={isReadOnly}
              value={clientData.uf || undefined}
              onValueChange={(v) => setClientData({ ...clientData, uf: v })}
            >
              <SelectTrigger className="h-8 w-24 shrink-0">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UF_STATES.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>
        </SecaoFormulario>

        <SecaoFormulario numero={2} titulo="Relacionamento" pendente={secaoPendente(2)}>
        <div className="flex flex-col gap-2.5">
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
          <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {[
              { value: "Sim", label: "Fixo" },
              { value: "Não", label: "Pontual" },
              { value: "Em Análise", label: "Em Análise" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isReadOnly}
                onClick={() => setClientData({ ...clientData, fixo: opt.value })}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  clientData.fixo === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/70",
                  isReadOnly && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4.5. Clusters */}
        <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground md:pt-2">
            Clusters <RequiredMark />
          </Label>
          <div className="min-w-0 flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isReadOnly}
                aria-invalid={!!falta('cluster_ids') || undefined}
                className={cn(
                  "w-full flex items-center gap-1 flex-wrap min-h-[2rem] px-3 py-1 border rounded-md text-sm bg-background hover:bg-accent/50 transition-colors disabled:opacity-50",
                  falta('cluster_ids') && CLASSE_CAMPO_PENDENTE,
                )}
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
          <MarcaPendencia>{falta('cluster_ids')}</MarcaPendencia>
          </div>
        </div>

        </div>
        </SecaoFormulario>

        <SecaoFormulario numero={3} titulo="Observações" pendente={secaoPendente(3)}>
        <div className="flex flex-col md:flex-row md:items-start gap-1 md:gap-3">
          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground md:pt-2">
            Observações {!clientData.ativo && <RequiredMark />}
          </Label>
          <div className="flex-1">
            <Textarea
              disabled={isReadOnly}
              value={clientData.observacoes ?? ""}
              onChange={(e) => setClientData({ ...clientData, observacoes: e.target.value })}
              placeholder="Observações sobre o cliente (mín. 20 caracteres se preenchido)..."
              className={cn("min-h-[60px]", falta('observacoes') && CLASSE_CAMPO_PENDENTE)}
            />
            <MarcaPendencia>{falta('observacoes')}</MarcaPendencia>
            {!clientData.ativo && !falta('observacoes') && (
              <p className="text-xs text-muted-foreground mt-1">
                Obrigatória para inativar o cliente (mín. 20 caracteres).
              </p>
            )}
          </div>
        </div>
        </SecaoFormulario>
      </div>
    </section>
  );
}
