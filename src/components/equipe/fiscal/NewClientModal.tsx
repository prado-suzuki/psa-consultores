import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useAuditLog } from "@/hooks/useAuditLog";
import { isProductionEnvironment, currentAmbiente } from "@/config/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  X,
  Trash2,
  Building2,
  Loader2,
  CheckCircle2,
  Pencil,
  ChevronRight,
  ChevronLeft,
  Search,
  ChevronDown,
  Save,
  Copy,
  CalendarIcon,
  Tag,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { parseDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/ui/required-mark";

const clienteTable = 'cliente';
const contribuinteTable = 'contribuinte';
const participanteTable = 'participante';

// PRODUTO_SEGMENTO_OPTIONS is now loaded from the database (produto_segmento table)
// with a static fallback for "Outro (personalizado)"

const TIPO_PARTICIPANTE_OPTIONS = [
  "Sócio/Proprietário",
  "Contador",
  "Advogado",
  "Procurador",
  "Representante Legal",
  "Diretor/Gestor",
  "Consultor Externo",
  "Outros",
];



// --- Auto-generate OS number (XXX/AAAA) ---
const generateNextOsNumber = async (localContracts: DraftOrdemServico[]): Promise<string> => {
  const year = new Date().getFullYear();
  const suffix = `/${year}`;

  // Query ALL OS for the current year (including excluido=true) to never reuse a number
  const { data } = await (supabase.from("ordem_servico" as any) as any)
    .select("numero_os")
    .like("numero_os", `%${suffix}`)
    .order("numero_os", { ascending: false })
    .limit(1000);

  let maxSeq = 0;

  // Check DB records
  if (data && data.length > 0) {
    for (const row of data) {
      const match = (row.numero_os as string)?.match(/^(\d+)\//);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  // Check local (unsaved) contracts in the same session
  for (const c of localContracts) {
    if (c.ordem_servico?.endsWith(suffix)) {
      const match = c.ordem_servico.match(/^(\d+)\//);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }

  const next = (maxSeq + 1).toString().padStart(3, "0");
  return `${next}${suffix}`;
};

const SITUACAO_PROJETO_OPTIONS = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "suspenso", label: "Suspenso" },
  { value: "cancelado", label: "Cancelado" },
];

// Types for draft items
interface DraftEntity {
  _id: number;
  _dbId?: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  nome_razao_social: string;
  nome_fantasia: string;
  situacao_inscricao_estadual: string;
  inscricao_estadual: string;
  cod_cnae: string;
  setor: string;
  simples_nacional: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  contribuinte_faturamento: boolean;
  atividade_principal: string;
}

interface InscricaoIE {
  _tempId: number;
  _dbId?: string;
  situacao: string;
  numero_ie: string;
  uf: string;
}

const UF_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

interface DraftParticipant {
  _id: number;
  _dbId?: string;
  nome: string;
  tipo_participante: string;
  cargo: string;
  email: string;
  telefone: string;
  observacoes: string;
  acesso_chamados: boolean;
}

interface DraftOrdemServico {
  _id: number;
  _dbId?: string;
  ordem_servico: string;
  data_emissao: string;
  data_inicio_projeto: string;
  data_fim_projeto: string;
  valor_projeto: number;
  valor_reembolso_km: number;
  valor_reembolso_refeicao: number;
  situacao_projeto: string;
  observacoes_projeto: string;
  id_servico: string;
  id_produto_segmento: string;
  distribuicao_receita: Array<{ id_centro_custo: string; percentual_rateio: number; _dbId?: string }>;
}

/** @deprecated Use DraftOrdemServico */
type DraftContract = DraftOrdemServico;

// --- Mask utilities ---
const formatCpfCnpj = (value: string, tipo: string): string => {
  const digits = value.replace(/\D/g, "");
  if (tipo === "PF") {
    const d = digits.slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  const d = digits.slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const formatCep = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const formatPhone = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

// --- Currency mask utilities (centavos approach) ---
const formatBRLInput = (value: number): string => {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const centsToValue = (cents: number): number => cents / 100;

const valueToCents = (value: number): number => Math.round(value * 100);

// --- Date mask utilities ---
const formatDateMask = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

const parseDateMask = (masked: string): string | null => {
  const d = masked.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const day = parseInt(d.slice(0, 2));
  const month = parseInt(d.slice(2, 4));
  const year = parseInt(d.slice(4, 8));
  if (year < 2000 || year > 2060) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const isoToMasked = (iso: string): string => {
  if (!iso) return "";
  try {
    const date = parseDate(iso);
    return format(date, "dd/MM/yyyy");
  } catch {
    return "";
  }
};

// Helper para sincronizar com DW
const syncCadastrosToDW = (payload: any) => {
  const environment = isProductionEnvironment ? "production" : "development";
  supabase.functions
    .invoke("sync-cadastros", {
      body: { ...payload, environment },
    })
    .then(({ error }) => {
      if (error) console.error("[sync-cadastros] Erro:", error.message);
      else console.log("[sync-cadastros] Sync iniciado");
    })
    .catch((err) => console.error("[sync-cadastros] Erro:", err));
};

// --- Date field component ---
const DateFieldWithInput = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
}) => {
  const [textValue, setTextValue] = useState(isoToMasked(value));

  useEffect(() => {
    setTextValue(isoToMasked(value));
  }, [value]);

  const handleTextChange = (raw: string) => {
    const masked = formatDateMask(raw);
    setTextValue(masked);
    const parsed = parseDateMask(masked);
    if (parsed) onChange(parsed);
  };

  const handleTextBlur = () => {
    if (textValue && textValue.replace(/\D/g, "").length === 8) {
      const parsed = parseDateMask(textValue);
      if (!parsed) {
        toast.error("Data inválida");
        setTextValue(isoToMasked(value));
      }
    } else if (textValue && textValue.replace(/\D/g, "").length > 0) {
      setTextValue(isoToMasked(value));
    }
  };

  return (
    <div className="flex items-center gap-1 max-w-[220px]">
      <Input
        value={textValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleTextBlur}
        placeholder="DD/MM/AAAA"
        className="h-8 font-mono text-sm"
        maxLength={10}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
          <Calendar
            mode="single"
            selected={value ? parseDate(value) : undefined}
            onSelect={(date) => {
              if (date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${d}`);
              }
            }}
            disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

// --- Currency field component (centavos approach) ---
const CurrencyField = ({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) => {
  const [cents, setCents] = useState(valueToCents(value));

  useEffect(() => {
    setCents(valueToCents(value));
  }, [value]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const newCents = parseInt(digits || "0", 10);
    setCents(newCents);
    onChange(centsToValue(newCents));
  };

  return (
    <Input
      value={formatBRLInput(centsToValue(cents))}
      onChange={(e) => handleChange(e.target.value)}
      className={cn("h-8", className)}
      inputMode="numeric"
    />
  );
};

interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClienteId?: string | null;
  readOnly?: boolean;
}

export default function NewClientModal({
  open,
  onOpenChange,
  editingClienteId,
  readOnly = false,
}: NewClientModalProps) {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [isAddingContract, setIsAddingContract] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "cliente" | "contribuintes" | "participantes" | "contratos" | "faturamento"
  >("cliente");
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDraftWarning, setShowDraftWarning] = useState(false);
  const [draftWarningContext, setDraftWarningContext] = useState<{
    action: "save" | "navigate";
    targetTab?: typeof activeTab;
    pendingTabs: string[];
  } | null>(null);

  // Inline expand/edit states
  const [expandedEntityId, setExpandedEntityId] = useState<number | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<number | null>(null);
  const [editingEntityData, setEditingEntityData] = useState<Partial<DraftEntity> | null>(null);

  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
  const [editingParticipantData, setEditingParticipantData] = useState<Partial<DraftParticipant> | null>(null);

  const [expandedContractId, setExpandedContractId] = useState<number | null>(null);
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [editingContractData, setEditingContractData] = useState<Partial<DraftContract> | null>(null);

  // Sync isReadOnly when modal opens or readOnly prop changes
  useEffect(() => {
    if (open) setIsReadOnly(readOnly);
  }, [open, readOnly]);

  const tabOrder: (typeof activeTab)[] = ["cliente", "contribuintes", "participantes", "contratos", "faturamento"];
  const currentTabIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentTabIndex === tabOrder.length - 1;
  const isFirstTab = currentTabIndex === 0;

  // --- Draft detection helpers ---
  const hasDraftEntityData = () => !!(draftEntity.nome_razao_social?.trim() || draftEntity.cpf_cnpj?.trim());
  const hasDraftParticipantData = () => !!(draftParticipant.nome?.trim());
  const hasDraftContractData = () => !!((draftContract.valor_projeto && draftContract.valor_projeto > 0) || draftContract.id_produto_segmento?.trim());

  const getDraftPendingTabs = (): string[] => {
    const tabs: string[] = [];
    if (hasDraftEntityData()) tabs.push("Contribuintes");
    if (hasDraftParticipantData()) tabs.push("Participantes");
    if (hasDraftContractData()) tabs.push("OS");
    return tabs;
  };

  const tabLabelToKey: Record<string, typeof activeTab> = {
    "Contribuintes": "contribuintes",
    "Participantes": "participantes",
    "OS": "contratos",
  };

  const checkDraftAndNavigate = (targetTab: typeof activeTab) => {
    const pendingTabs = getDraftPendingTabs();
    // Only warn about the current tab's draft
    const currentTabDraft =
      (activeTab === "contribuintes" && hasDraftEntityData()) ||
      (activeTab === "participantes" && hasDraftParticipantData()) ||
      (activeTab === "contratos" && hasDraftContractData());

    if (currentTabDraft) {
      const currentPending = activeTab === "contribuintes" ? "Contribuintes" : activeTab === "participantes" ? "Participantes" : "OS";
      setDraftWarningContext({ action: "navigate", targetTab, pendingTabs: [currentPending] });
      setShowDraftWarning(true);
      return;
    }
    setActiveTab(targetTab);
  };

  const handleNext = () => {
    if (!isLastTab) checkDraftAndNavigate(tabOrder[currentTabIndex + 1]);
  };
  const handleBack = () => {
    if (!isFirstTab) checkDraftAndNavigate(tabOrder[currentTabIndex - 1]);
  };

  const handleTabClick = (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    if (isReadOnly) {
      setActiveTab(tab);
      return;
    }
    checkDraftAndNavigate(tab);
  };

  const clearCurrentDraft = () => {
    if (activeTab === "contribuintes") {
      setDraftEntity({ tipo_pessoa: "PJ", cpf_cnpj: "", nome_razao_social: "", nome_fantasia: "", situacao_inscricao_estadual: "", inscricao_estadual: "", cod_cnae: "", setor: "Indústria", simples_nacional: "", telefone: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", municipio: "", uf: "", contribuinte_faturamento: false, atividade_principal: "" });
    } else if (activeTab === "participantes") {
      setDraftParticipant({ nome: "", tipo_participante: "", cargo: "", email: "", telefone: "", observacoes: "", acesso_chamados: false });
    } else if (activeTab === "contratos") {
      setDraftContract({ ordem_servico: "", data_emissao: "", data_inicio_projeto: "", data_fim_projeto: "", valor_projeto: 0, valor_reembolso_km: 0, valor_reembolso_refeicao: 0, situacao_projeto: "em_andamento", observacoes_projeto: "", id_servico: "", id_produto_segmento: "", distribuicao_receita: [] });
    }
  };

  const handleDraftWarningContinue = () => {
    if (!draftWarningContext) return;
    clearCurrentDraft();
    if (draftWarningContext.action === "navigate" && draftWarningContext.targetTab) {
      setActiveTab(draftWarningContext.targetTab);
    } else if (draftWarningContext.action === "save") {
      setShowDraftWarning(false);
      setDraftWarningContext(null);
      executeSave();
      return;
    }
    setShowDraftWarning(false);
    setDraftWarningContext(null);
  };

  const handleDraftWarningGoBack = () => {
    if (draftWarningContext?.pendingTabs[0]) {
      const key = tabLabelToKey[draftWarningContext.pendingTabs[0]];
      if (key) setActiveTab(key);
    }
    setShowDraftWarning(false);
    setDraftWarningContext(null);
  };

  const isEditing = !!editingClienteId;

  // Queries for lider dropdown
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles-lider"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role").eq("role", "lider");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles_safe").select("id, first_name, last_name");
      return data || [];
    },
  });

  const { data: catalogServices = [] } = useQuery({
    queryKey: ["servicos_prestados_services"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("servicos_prestados" as any)
        .select("id, nome, cluster_id, estrutura_clusters(name)") as any)
        .order("nome");
      return data || [];
    },
  });

  const { data: allClusters = [] } = useQuery({
    queryKey: ["estrutura_clusters_for_os_filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("estrutura_clusters")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: produtoSegmentoOptions = [] } = useQuery({
    queryKey: ["produto_segmento"],
    queryFn: async () => {
      const { data } = await supabase.from("produto_segmento").select("id, codigo, nome, is_active").eq("is_active", true).order("codigo");
      return (data || []).map((p: any) => ({ value: p.codigo, label: `${p.codigo} - ${p.nome}` }));
    },
  });

  const { data: CENTRO_CUSTO_OPTIONS = [] } = useQuery({
    queryKey: ["centros_custo_options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("centros_custo")
        .select("id, codigo, nome")
        .eq("is_active", true)
        .order("codigo");
      return (data || []).map((e: any) => ({ id: e.id as string, codigo: e.codigo as string, nome: e.nome as string, label: `${e.codigo} - ${e.nome}` }));
    },
  });

  

  const PRODUTO_SEGMENTO_OPTIONS = useMemo(() => [
    ...produtoSegmentoOptions,
    { value: "__outro__", label: "Outro (personalizado)" },
  ], [produtoSegmentoOptions]);

  // produto_segmento options with ID for OS-level linking (includes cluster join)
  const { data: produtoSegmentoFullOptions = [] } = useQuery({
    queryKey: ["produto_segmento_full"],
    queryFn: async () => {
      const { data } = await supabase.from("produto_segmento").select("id, codigo, nome, is_active, cluster_id, estrutura_clusters(name)").eq("is_active", true).order("codigo");
      return (data || []) as Array<{ id: string; codigo: string; nome: string; is_active: boolean; cluster_id: string | null; estrutura_clusters: { name: string } | null }>;
    },
  });

  const lideres = useMemo(() => {
    const liderIds = new Set(userRoles.map((r: any) => r.user_id));
    return profiles
      .filter((p: any) => liderIds.has(p.id))
      .map((p: any) => ({ id: p.id, nome: `${p.first_name || ""} ${p.last_name || ""}`.trim() }));
  }, [userRoles, profiles]);

  // Default states
  const defaultClientData = {
    nome: "",
    categoria: "Bronze",
    ativo: true,
    fixo: "Sim",
    telefone: "",
    municipio: "",
    uf: "",
    setor_cliente: "",
    regiao: "",
  };

  // Section 1 - Client data
  const [clientData, setClientData] = useState(defaultClientData);

  // Section 2 - Contribuintes
  const [entities, setEntities] = useState<DraftEntity[]>([]);
  const [draftEntity, setDraftEntity] = useState<Partial<DraftEntity>>({
    tipo_pessoa: "PJ",
    cpf_cnpj: "",
    nome_razao_social: "",
    nome_fantasia: "",
    situacao_inscricao_estadual: "",
    inscricao_estadual: "",
    cod_cnae: "",
    setor: "Indústria",
    simples_nacional: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "",
    uf: "",
    contribuinte_faturamento: false,
    atividade_principal: "",
  });

  // Section 3 - Participantes
  const [participants, setParticipants] = useState<DraftParticipant[]>([]);
  const [draftParticipant, setDraftParticipant] = useState({
    nome: "",
    tipo_participante: "",
    cargo: "",
    email: "",
    telefone: "",
    observacoes: "",
    acesso_chamados: false,
  });

  // Section 4 - OS (Ordem de Serviço)
  const [contracts, setContracts] = useState<DraftContract[]>([]);
  const [osClusterFilter, setOsClusterFilter] = useState<string>("__all__");
  const [osEditClusterFilter, setOsEditClusterFilter] = useState<string>("__all__");

  const filteredCatalogProducts = useMemo(() => {
    if (osClusterFilter === "__all__") return produtoSegmentoFullOptions;
    return produtoSegmentoFullOptions.filter((p) => p.cluster_id === osClusterFilter);
  }, [produtoSegmentoFullOptions, osClusterFilter]);

  const filteredEditCatalogProducts = useMemo(() => {
    if (osEditClusterFilter === "__all__") return produtoSegmentoFullOptions;
    return produtoSegmentoFullOptions.filter((p) => p.cluster_id === osEditClusterFilter);
  }, [produtoSegmentoFullOptions, osEditClusterFilter]);
  const [draftContract, setDraftContract] = useState({
    ordem_servico: "",
    data_emissao: "",
    data_inicio_projeto: "",
    data_fim_projeto: "",
    valor_projeto: 0,
    valor_reembolso_km: 0,
    valor_reembolso_refeicao: 0,
    situacao_projeto: "em_andamento",
    observacoes_projeto: "",
    id_servico: "",
    id_produto_segmento: "",
    distribuicao_receita: [] as Array<{ id_centro_custo: string; percentual_rateio: number }>,
  });

  // Inscricoes Estaduais per contribuinte (keyed by _dbId or String(_id))
  const [inscricoesMap, setInscricoesMap] = useState<Record<string, InscricaoIE[]>>({});
  const [draftInscricoes, setDraftInscricoes] = useState<InscricaoIE[]>([]);

  // --- Unsaved changes detection ---
  const initialSnapshotRef = useRef<string | null>(null);

  const currentSnapshot = useMemo(
    () => JSON.stringify({ clientData, entities, participants, contracts }),
    [clientData, entities, participants, contracts],
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return currentSnapshot !== initialSnapshotRef.current;
  }, [currentSnapshot]);

  // Capture initial snapshot once loading completes
  useEffect(() => {
    if (open && !loadingEdit) {
      const t = setTimeout(() => {
        initialSnapshotRef.current = JSON.stringify({ clientData, entities, participants, contracts });
      }, 100);
      return () => clearTimeout(t);
    }
    if (!open) {
      initialSnapshotRef.current = null;
    }
  }, [open, loadingEdit]);

  // Beforeunload protection
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Draft persistence for new client mode
  const draftValues = useMemo(
    () => ({
      clientData,
      entities,
      participants,
      contracts,
      inscricoesMap,
    }),
    [clientData, entities, participants, contracts, inscricoesMap],
  );
  const draftEnabled = open && !isEditing;
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence(
    "newclient-form-draft",
    draftValues,
    draftEnabled,
    user?.id,
  );

  // Load existing data when editing
  useEffect(() => {
    if (!open || !editingClienteId) return;

    const loadData = async () => {
      setLoadingEdit(true);
      try {
        const { data: cli } = await supabase.from(clienteTable).select("*").eq("id", editingClienteId).maybeSingle();
        if (cli) {
          setClientData({
            nome: cli.nome || "",
            categoria: (cli as any).categoria || "Bronze",
            ativo: cli.ativo ?? true,
            fixo: cli.fixo || "Sim",
            telefone: cli.telefone || "",
            municipio: cli.municipio || "",
            uf: cli.uf || "",
            setor_cliente: cli.setor_cliente || "",
            regiao: (cli as any).regiao || "",
          });
        }

        const { data: contribs } = await supabase
          .from(contribuinteTable)
          .select("*")
          .eq("cliente_id", editingClienteId)
          .eq("excluido", false);
        if (contribs) {
          setEntities(
            contribs.map((c) => ({
              _id: Date.now() + Math.random(),
              _dbId: c.id,
              tipo_pessoa: c.tipo_pessoa || "PJ",
              cpf_cnpj: c.cpf_cnpj || "",
              nome_razao_social: c.nome_razao_social || "",
              nome_fantasia: (c as any).nome_fantasia || "",
              situacao_inscricao_estadual: (c as any).situacao_inscricao_estadual || (c.inscricao_estadual ? "sim" : "isento"),
              inscricao_estadual: c.inscricao_estadual || "",
              cod_cnae: c.cod_cnae || "",
              setor: c.setor || "",
              simples_nacional:
                c.simples_nacional === true ? "optante" : c.simples_nacional === false ? "nao_optante" : "",
              telefone: (c as any).telefone || "",
              cep: (c as any).cep || "",
              logradouro: (c as any).logradouro || "",
              numero: (c as any).numero || "",
              complemento: (c as any).complemento || "",
              bairro: (c as any).bairro || "",
              municipio: (c as any).municipio || "",
              uf: (c as any).uf || "",
              contribuinte_faturamento: (c as any).contribuinte_faturamento ?? false,
              atividade_principal: "",
            })),
          );
        }

        // Load inscricoes estaduais
        if (contribs && contribs.length > 0) {
          const contribIds = contribs.map(c => c.id);
          const { data: inscricoes } = await (supabase as any)
            .from("inscricao_contribuinte")
            .select("*")
            .in("contribuinte_id", contribIds);
          if (inscricoes) {
            const map: Record<string, InscricaoIE[]> = {};
            for (const ie of inscricoes as any[]) {
              const key = ie.contribuinte_id as string;
              if (!map[key]) map[key] = [];
              map[key].push({
                _tempId: Date.now() + Math.random(),
                _dbId: ie.id,
                situacao: ie.situacao || "sim",
                numero_ie: ie.numero_ie || "",
                uf: ie.uf || "",
              });
            }
            setInscricoesMap(map);
          } else {
            setInscricoesMap({});
          }
        }

        const { data: parts } = await (supabase.from(participanteTable) as any)
          .select("*")
          .eq("id_cliente", editingClienteId)
          .eq("excluido", false);
        if (parts) {
          setParticipants(
            parts.map((p: any) => ({
              _id: Date.now() + Math.random(),
              _dbId: p.id || p.id_participante,
              nome: p.nome || "",
              tipo_participante: p.tipo_participante || "",
              cargo: p.cargo || "",
              email: p.email || "",
              telefone: p.telefone || "",
              observacoes: p.observacoes || "",
              acesso_chamados: p.acesso_chamados ?? false,
            })),
          );
        }

        // Carregar ordens de serviço do banco
        const { data: existingOS } = await (supabase.from("ordem_servico" as any) as any)
          .select("*")
          .eq("id_cliente", editingClienteId)
          .eq("excluido", false);
        if (existingOS && existingOS.length > 0) {
          // Also load distribuicao_receita for each OS
          const osIds = existingOS.map((os: any) => os.id);
          const { data: distData } = await (supabase.from("distribuicao_receita" as any) as any)
            .select("*")
            .in("id_ordem_servico", osIds)
            .eq("excluido", false);
          const distMap: Record<string, Array<{ id_centro_custo: string; percentual_rateio: number; _dbId: string }>> = {};
          (distData || []).forEach((d: any) => {
            if (!distMap[d.id_ordem_servico]) distMap[d.id_ordem_servico] = [];
            distMap[d.id_ordem_servico].push({ id_centro_custo: d.id_centro_custo, percentual_rateio: Number(d.percentual_rateio), _dbId: d.id });
          });
          setContracts(
            existingOS.map((os: any) => ({
              _id: Date.now() + Math.random(),
              _dbId: os.id,
              ordem_servico: os.numero_os || "",
              data_emissao: os.data_emissao || "",
              data_inicio_projeto: os.data_inicio || "",
              data_fim_projeto: os.data_fim || "",
              valor_projeto: os.valor_projeto || 0,
              valor_reembolso_km: os.valor_reembolso_km || 0,
              valor_reembolso_refeicao: os.valor_reembolso_refeicao || 0,
              situacao_projeto: os.situacao || "em_andamento",
              observacoes_projeto: os.observacoes || "",
              id_servico: os.id_servico || "",
              id_produto_segmento: os.id_produto_segmento || "",
              distribuicao_receita: distMap[os.id] || [],
            })),
          );
        } else {
          setContracts([]);
        }
      } catch (err: any) {
        console.error("Erro ao carregar dados do cliente:", err);
        toast.error("Erro ao carregar dados do cliente");
      } finally {
        setLoadingEdit(false);
      }
    };
    loadData();
  }, [open, editingClienteId]);

  // Restore draft for new client mode
  useEffect(() => {
    if (!open || isEditing) return;
    const saved = restoreDraft();
    if (saved) {
      if (saved.clientData) setClientData(saved.clientData);
      if (saved.entities) setEntities(saved.entities);
      if (saved.participants) setParticipants(saved.participants);
      if (saved.contracts) setContracts(saved.contracts);
      if (saved.inscricoesMap) setInscricoesMap(saved.inscricoesMap);
    }
  }, [open, isEditing]);

  const formatCurrencyDisplay = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // --- ENTITY HANDLERS ---
  // --- CNPJ FETCH ---
  const handleCnpjBlur = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setDraftEntity((prev) => ({
        ...prev,
        nome_razao_social: data.razao_social || prev?.nome_razao_social || "",
        nome_fantasia: data.nome_fantasia || "",
        cod_cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : prev?.cod_cnae || "",
        atividade_principal: data.cnae_fiscal_descricao || "",
        cep: data.cep ? String(data.cep).replace(/\D/g, "") : prev?.cep || "",
        logradouro: data.logradouro || prev?.logradouro || "",
        numero: data.numero || prev?.numero || "",
        complemento: data.complemento || prev?.complemento || "",
        bairro: data.bairro || prev?.bairro || "",
        municipio: data.municipio || prev?.municipio || "",
        uf: data.uf || prev?.uf || "",
      }));
      toast.success("Dados preenchidos via CNPJ");
    } catch {
      toast.error("CNPJ não encontrado na base federal");
    } finally {
      setCnpjLoading(false);
    }
  };

  // --- CEP FETCH ---
  const handleCepBlur = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("not found");
      setDraftEntity((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev?.logradouro || "",
        bairro: data.bairro || prev?.bairro || "",
        municipio: data.localidade || prev?.municipio || "",
        uf: data.uf || prev?.uf || "",
      }));
      toast.success("Endereço preenchido via CEP");
    } catch {
      toast.error("CEP não encontrado");
    } finally {
      setCepLoading(false);
    }
  };

  const addEntity = () => {
    if (!draftEntity.nome_razao_social?.trim()) {
      toast.error("Razão Social é obrigatória");
      return;
    }

    const cpfCnpjDigits = (draftEntity.cpf_cnpj || "").replace(/\D/g, "");
    if (!cpfCnpjDigits) {
      toast.error("CPF/CNPJ é obrigatório");
      return;
    }
    if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
      toast.error("CPF deve ter 11 dígitos ou CNPJ 14 dígitos");
      return;
    }

    if (!draftEntity.cep?.trim()) {
      toast.error("CEP é obrigatório");
      return;
    }
    if (!draftEntity.logradouro?.trim()) {
      toast.error("Logradouro é obrigatório");
      return;
    }
    if (!draftEntity.bairro?.trim()) {
      toast.error("Bairro é obrigatório");
      return;
    }
    if (!draftEntity.municipio?.trim()) {
      toast.error("Município é obrigatório");
      return;
    }
    if (!draftEntity.uf?.trim() || draftEntity.uf?.trim().length !== 2) {
      toast.error("UF deve ter 2 caracteres");
      return;
    }

    // Validate inscricoes estaduais
    for (const ie of draftInscricoes) {
      if (!ie.uf) {
        toast.error("Selecione a UF para todas as inscrições estaduais");
        return;
      }
      if (ie.situacao === "sim" && !ie.numero_ie?.trim()) {
        toast.error(`Informe o número da IE para o estado ${ie.uf}`);
        return;
      }
    }

    if (draftEntity.tipo_pessoa === "PJ") {
      if (!draftEntity.cod_cnae?.trim()) {
        toast.error("CNAE é obrigatório para PJ");
        return;
      }
      if (!draftEntity.simples_nacional) {
        toast.error("Informe a situação do Simples Nacional");
        return;
      }
    }

  const newEntityId = Date.now() + Math.random();
  setEntities([...entities, { ...draftEntity, _id: newEntityId } as DraftEntity]);
  // Move draft inscricoes to map
  if (draftInscricoes.length > 0) {
    setInscricoesMap(prev => ({ ...prev, [String(newEntityId)]: [...draftInscricoes] }));
    setDraftInscricoes([]);
  }
    setDraftEntity({
      tipo_pessoa: "PJ",
      cpf_cnpj: "",
      nome_razao_social: "",
      nome_fantasia: "",
      situacao_inscricao_estadual: "",
      inscricao_estadual: "",
      cod_cnae: "",
      setor: "Indústria",
      simples_nacional: "",
      telefone: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      municipio: "",
      uf: "",
      contribuinte_faturamento: false,
      atividade_principal: "",
    });
  };

  // --- PARTICIPANT HANDLERS ---
  const addParticipant = () => {
    if (!draftParticipant.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!draftParticipant.tipo_participante) {
      toast.error("Tipo de Participante é obrigatório");
      return;
    }

    if (!draftParticipant.email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draftParticipant.email.trim())) {
      toast.error("Formato de e-mail inválido");
      return;
    }

    if (draftParticipant.telefone.trim()) {
      const telDigits = draftParticipant.telefone.replace(/\D/g, "");
      if (telDigits.length < 10) {
        toast.error("Telefone deve ter no mínimo 10 dígitos");
        return;
      }
    }

    if (draftParticipant.observacoes.trim() && draftParticipant.observacoes.trim().length < 20) {
      toast.error("Observações deve ter no mínimo 20 caracteres");
      return;
    }

    setParticipants([...participants, { ...draftParticipant, _id: Date.now() + Math.random() } as DraftParticipant]);
    setDraftParticipant({
      nome: "",
      tipo_participante: "",
      cargo: "",
      email: "",
      telefone: "",
      observacoes: "",
      acesso_chamados: false,
    });
  };

  // --- OS HANDLERS ---
  const addContract = async () => {
    if (!draftContract.id_produto_segmento) {
      toast.error("Selecione um Produto/Serviço Contratado");
      return;
    }

    setIsAddingContract(true);
    try {
      // Auto-generate OS number
      const osNumber = await generateNextOsNumber(contracts);
      const newContract = { ...draftContract, ordem_servico: osNumber, _id: Date.now() + Math.random() } as DraftContract;

      setContracts([...contracts, newContract]);
      setDraftContract({
        ordem_servico: "",
        data_emissao: "",
        data_inicio_projeto: "",
        data_fim_projeto: "",
        valor_projeto: 0,
        valor_reembolso_km: 0,
        valor_reembolso_refeicao: 0,
        situacao_projeto: "em_andamento",
        observacoes_projeto: "",
        id_servico: "",
        id_produto_segmento: "",
        distribuicao_receita: [],
      });
    } finally {
      setIsAddingContract(false);
    }
  };

  // --- INLINE EDIT HELPERS ---
  const handleInlineCnpjBlur = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setEditingEntityData((prev) =>
        prev
          ? {
              ...prev,
              nome_razao_social: data.razao_social || prev.nome_razao_social || "",
              nome_fantasia: data.nome_fantasia || "",
              cod_cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : prev.cod_cnae || "",
              atividade_principal: data.cnae_fiscal_descricao || "",
              cep: data.cep ? String(data.cep).replace(/\D/g, "") : prev.cep || "",
              logradouro: data.logradouro || prev.logradouro || "",
              numero: data.numero || prev.numero || "",
              complemento: data.complemento || prev.complemento || "",
              bairro: data.bairro || prev.bairro || "",
              municipio: data.municipio || prev.municipio || "",
              uf: data.uf || prev.uf || "",
            }
          : prev,
      );
      toast.success("Dados preenchidos via CNPJ");
    } catch {
      toast.error("CNPJ não encontrado");
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleInlineCepBlur = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("not found");
      setEditingEntityData((prev) =>
        prev
          ? {
              ...prev,
              logradouro: data.logradouro || prev.logradouro || "",
              bairro: data.bairro || prev.bairro || "",
              municipio: data.localidade || prev.municipio || "",
              uf: data.uf || prev.uf || "",
            }
          : prev,
      );
      toast.success("Endereço preenchido via CEP");
    } catch {
      toast.error("CEP não encontrado");
    } finally {
      setCepLoading(false);
    }
  };

  const startEditEntity = (ent: DraftEntity) => {
    setEditingEntityId(ent._id);
    setEditingEntityData({ ...ent });
  };
  const cancelEditEntity = () => {
    setEditingEntityId(null);
    setEditingEntityData(null);
  };
  const saveEditEntity = () => {
    if (!editingEntityData || editingEntityId == null) return;
    if (!editingEntityData.cep?.trim()) {
      toast.error("CEP é obrigatório");
      return;
    }
    setEntities(entities.map((e) => (e._id === editingEntityId ? ({ ...e, ...editingEntityData } as DraftEntity) : e)));
    setEditingEntityId(null);
    setEditingEntityData(null);
    toast.success("Contribuinte atualizado");
  };

  const startEditParticipant = (p: DraftParticipant) => {
    setEditingParticipantId(p._id);
    setEditingParticipantData({ ...p });
  };
  const cancelEditParticipant = () => {
    setEditingParticipantId(null);
    setEditingParticipantData(null);
  };
  const saveEditParticipant = () => {
    if (!editingParticipantData || editingParticipantId == null) return;
    setParticipants(
      participants.map((p) =>
        p._id === editingParticipantId ? ({ ...p, ...editingParticipantData } as DraftParticipant) : p,
      ),
    );
    setEditingParticipantId(null);
    setEditingParticipantData(null);
    toast.success("Participante atualizado");
  };

  const startEditContract = (c: DraftContract) => {
    setEditingContractId(c._id);
    setEditingContractData({ ...c });
  };
  const cancelEditContract = () => {
    setEditingContractId(null);
    setEditingContractData(null);
  };
  const saveEditContract = () => {
    if (!editingContractData || editingContractId == null) return;
    setContracts(
      contracts.map((c) => (c._id === editingContractId ? ({ ...c, ...editingContractData } as DraftContract) : c)),
    );
    setEditingContractId(null);
    setEditingContractData(null);
    toast.success("OS atualizada");
  };

  // Field display helper
  const FieldPair = ({ label, value }: { label: string; value: string | undefined }) => (
    <div>
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{value || "—"}</div>
    </div>
  );

  // --- Copy address from first entity ---
  const handleCopyFirstAddress = () => {
    if (entities.length === 0) return;
    const first = entities[0];
    if (!first.cep?.trim()) {
      toast.warning("O primeiro contribuinte não possui endereço cadastrado");
      return;
    }
    setDraftEntity((prev) => ({
      ...prev,
      cep: first.cep,
      logradouro: first.logradouro,
      numero: first.numero,
      complemento: first.complemento,
      bairro: first.bairro,
      municipio: first.municipio,
      uf: first.uf,
    }));
    toast.success("Endereço copiado do primeiro contribuinte");
  };

  

  // --- FINAL SAVE ---
  const handleSave = () => {
    const pendingTabs = getDraftPendingTabs();
    if (pendingTabs.length > 0) {
      setDraftWarningContext({ action: "save", pendingTabs });
      setShowDraftWarning(true);
      return;
    }
    executeSave();
  };

  const executeSave = async () => {
    if (!clientData.nome.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    if (!clientData.setor_cliente) {
      toast.error("Área do negócio é obrigatória");
      return;
    }
    if (!clientData.regiao) {
      toast.error("Região é obrigatória");
      return;
    }

    // --- Pre-validation: distribuicao_receita UUIDs and percentage sums ---
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const c of contracts) {
      if (c.distribuicao_receita && c.distribuicao_receita.length > 0) {
        for (const d of c.distribuicao_receita) {
          if (!d.id_centro_custo || !UUID_REGEX.test(d.id_centro_custo)) {
            toast.error(`OS "${c.ordem_servico || "(sem número)"}": selecione um centro de custo válido para cada linha de distribuição`);
            return;
          }
        }
        const totalPercent = c.distribuicao_receita.reduce((sum, d) => sum + (d.percentual_rateio || 0), 0);
        if (Math.abs(totalPercent - 100) > 0.01) {
          toast.error(`OS "${c.ordem_servico || "(sem número)"}": a soma dos percentuais de distribuição deve ser 100% (atual: ${totalPercent.toFixed(2)}%)`);
          return;
        }
      }
    }

    // --- Duplicate name check (only on creation) ---
    if (!isEditing) {
      const { data: existing } = await supabase
        .from(clienteTable)
        .select("id, nome")
        .eq("nome", clientData.nome.trim())
        .eq("excluido", false)
        .limit(1);
      if (existing && existing.length > 0) {
        const confirmed = window.confirm(
          `Já existe um cliente com o nome "${clientData.nome.trim()}". Deseja cadastrar mesmo assim?`
        );
        if (!confirmed) return;
      }
    }

    setSaving(true);
    let createdClienteId: string | null = null;
    try {
      const clientPayload = {
        nome: clientData.nome.trim(),
        categoria: clientData.categoria || null,
        ativo: clientData.ativo,
        fixo: clientData.fixo || null,
        telefone: clientData.telefone.trim() || null,
        municipio: clientData.municipio.trim() || null,
        uf: clientData.uf.trim() || null,
        setor_cliente: clientData.setor_cliente || null,
        regiao: clientData.regiao || null,
        ambiente: currentAmbiente,
      };

      let clienteId: string;
      let clienteResult: any;

      if (isEditing) {
        const { data: updated, error } = await supabase
          .from(clienteTable)
          .update(clientPayload)
          .eq("id", editingClienteId!)
          .select()
          .single();
        if (error) throw error;
        clienteId = editingClienteId!;
        clienteResult = updated;

        // --- Contribuintes: update existentes, insert novos, delete removidos ---
        const currentContribDbIds = entities.filter(e => e._dbId).map(e => e._dbId!);
        const { data: dbContribs } = await supabase.from(contribuinteTable).select("id").eq("cliente_id", clienteId).eq("excluido", false);
        const removedContribIds = (dbContribs || []).map(c => c.id).filter(id => !currentContribDbIds.includes(id));
        if (removedContribIds.length > 0) {
          await supabase.from(contribuinteTable).update({ excluido: true } as any).in("id", removedContribIds);
        }

        // --- Participantes: update existentes, insert novos, delete removidos ---
        const partIdField = "id_participante";
        const currentPartDbIds = participants.filter(p => p._dbId).map(p => p._dbId!);
        const { data: dbParts } = await (supabase.from(participanteTable) as any).select(partIdField).eq("id_cliente", clienteId).eq("excluido", false);
        const removedPartIds = (dbParts || []).map((p: any) => p[partIdField]).filter((id: string) => !currentPartDbIds.includes(id));
        if (removedPartIds.length > 0) {
          await (supabase.from(participanteTable) as any).update({ excluido: true }).in(partIdField, removedPartIds);
        }

        // --- Ordens de Serviço: update existentes, insert novos, delete removidos ---
        const currentOsDbIds = contracts.filter(c => c._dbId).map(c => c._dbId!);
        const { data: dbOS } = await (supabase.from("ordem_servico" as any) as any).select("id").eq("id_cliente", clienteId).eq("excluido", false);
        const removedOsIds = (dbOS || []).map((o: any) => o.id).filter((id: string) => !currentOsDbIds.includes(id));
        if (removedOsIds.length > 0) {
          await (supabase.from("ordem_servico" as any) as any).update({ excluido: true }).in("id", removedOsIds);
        }
      } else {
        const { data: newCliente, error: clienteError } = await supabase
          .from(clienteTable)
          .insert(clientPayload)
          .select()
          .single();
        if (clienteError) throw clienteError;
        clienteId = newCliente.id;
        createdClienteId = newCliente.id;
        clienteResult = newCliente;
      }

      // --- Persistir contribuintes (update ou insert) ---
      const buildContribFields = (e: DraftEntity) => ({
        cliente_id: clienteId,
        tipo_pessoa: e.tipo_pessoa,
        cpf_cnpj: e.cpf_cnpj || null,
        nome_razao_social: e.nome_razao_social,
        inscricao_estadual: e.inscricao_estadual || null,
        cod_cnae: e.cod_cnae || null,
        setor: e.setor || null,
        simples_nacional:
          e.simples_nacional === "optante" ? true : e.simples_nacional === "nao_optante" ? false : null,
        telefone: e.telefone || null,
        nome_fantasia: e.nome_fantasia || null,
        situacao_inscricao_estadual: e.situacao_inscricao_estadual || null,
        cep: e.cep || null,
        logradouro: e.logradouro || null,
        numero: e.numero || null,
        complemento: e.complemento || null,
        bairro: e.bairro || null,
        municipio: e.municipio || null,
        uf: e.uf || null,
        contribuinte_faturamento: e.contribuinte_faturamento ?? false,
      });

      for (const e of entities) {
        let contribId = e._dbId;
        if (e._dbId) {
          const { error } = await supabase.from(contribuinteTable).update(buildContribFields(e)).eq("id", e._dbId);
          if (error) throw error;
        } else {
          const { data: newContrib, error } = await supabase.from(contribuinteTable).insert(buildContribFields(e)).select("id").single();
          if (error) throw error;
          contribId = newContrib.id;
        }

        // Persist inscricoes estaduais
        const entityKey = e._dbId || String(e._id);
        const ies = inscricoesMap[entityKey] || [];
        if (contribId) {
          const { data: existingIEs } = await (supabase as any)
            .from("inscricao_contribuinte")
            .select("id")
            .eq("contribuinte_id", contribId);
          const currentDbIds = ies.filter(ie => ie._dbId).map(ie => ie._dbId!);
          const removedIds = (existingIEs || []).map((r: any) => r.id).filter((id: string) => !currentDbIds.includes(id));
          if (removedIds.length > 0) {
            await (supabase as any).from("inscricao_contribuinte").delete().in("id", removedIds);
          }
          for (const ie of ies) {
            const iePayload = {
              contribuinte_id: contribId,
              situacao: ie.situacao,
              numero_ie: ie.situacao === "sim" ? (ie.numero_ie || null) : null,
              uf: ie.uf,
            };
            if (ie._dbId) {
              await (supabase as any).from("inscricao_contribuinte").update(iePayload).eq("id", ie._dbId);
            } else {
              await (supabase as any).from("inscricao_contribuinte").insert(iePayload);
            }
          }
        }
      }

      // --- Persistir participantes (update ou insert) ---
      const buildPartFields = (p: DraftParticipant) => ({
        id_cliente: clienteId,
        nome: p.nome,
        cargo: p.cargo || null,
        email: p.email || null,
        telefone: p.telefone || null,
        tipo_participante: p.tipo_participante || null,
        observacoes: p.observacoes || null,
        acesso_chamados: p.acesso_chamados ?? false,
      });

      for (const p of participants) {
        const pIdField = "id_participante";
        if (p._dbId) {
          const { error } = await (supabase.from(participanteTable) as any).update(buildPartFields(p)).eq(pIdField, p._dbId);
          if (error) throw error;
        } else {
          const { error } = await (supabase.from(participanteTable) as any).insert(buildPartFields(p));
          if (error) throw error;
        }
      }

      // --- Persistir ordens de serviço (update ou insert) + distribuicao_receita ---
      const buildOsFields = (c: DraftOrdemServico) => ({
        id_cliente: clienteId,
        numero_os: c.ordem_servico || null,
        data_emissao: c.data_emissao || null,
        data_inicio: c.data_inicio_projeto || null,
        data_fim: c.data_fim_projeto || null,
        valor_projeto: c.valor_projeto || 0,
        valor_reembolso_km: c.valor_reembolso_km || 0,
        valor_reembolso_refeicao: c.valor_reembolso_refeicao || 0,
        situacao: c.situacao_projeto || "em_andamento",
        observacoes: c.observacoes_projeto || null,
        id_produto_segmento: c.id_produto_segmento || null,
      });

      for (const c of contracts) {
        let osId = c._dbId;
        if (c._dbId) {
          const { error } = await (supabase.from("ordem_servico" as any) as any).update(buildOsFields(c)).eq("id", c._dbId);
          if (error) throw error;
        } else {
          const { data: newOs, error } = await (supabase.from("ordem_servico" as any) as any).insert(buildOsFields(c)).select("id").single();
          if (error) throw error;
          osId = newOs.id;
        }

        // Persist distribuicao_receita: delete all then insert
        if (osId) {
          await (supabase.from("distribuicao_receita" as any) as any).update({ excluido: true }).eq("id_ordem_servico", osId).eq("excluido", false);
          if (c.distribuicao_receita && c.distribuicao_receita.length > 0) {
            const distPayload = c.distribuicao_receita
              .filter(d => d.id_centro_custo)
              .map(d => ({
                id_ordem_servico: osId,
                id_centro_custo: d.id_centro_custo,
                percentual_rateio: d.percentual_rateio || 0,
              }));
            if (distPayload.length > 0) {
              const { error: distError } = await (supabase.from("distribuicao_receita" as any) as any).insert(distPayload);
              if (distError) throw distError;
            }
          }
        }
      }

      syncCadastrosToDW({
        clientes: [
          {
            id_cliente: clienteResult.id,
            nome: clienteResult.nome,
            fixo: clienteResult.fixo,
            telefone: clienteResult.telefone,
            setor_cliente: clienteResult.setor_cliente,
            municipio: clienteResult.municipio,
            uf: clienteResult.uf,
            ativo: clienteResult.ativo,
            categoria: (clienteResult as any).categoria ?? null,
            created_at: clienteResult.created_at,
            updated_at: clienteResult.updated_at,
            regiao: (clienteResult as any).regiao ?? null,
          },
        ],
      });

      queryClient.invalidateQueries({ queryKey: ["clientes-lista"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-filtrados"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-modal"] });
      queryClient.invalidateQueries({ queryKey: ["contribuintes-por-cliente"] });

      // ─── Audit logs ───────────────────────────────────────────
      const auditClienteId = isEditing ? editingClienteId! : createdClienteId!;
      logAction({
        area: 'dev',
        entity_type: 'cliente',
        entity_id: auditClienteId,
        entity_name: clientData.nome.trim(),
        action: isEditing ? 'updated' : 'created',
      });

      // Log contribuintes
      for (const e of entities) {
        logAction({
          area: 'dev',
          entity_type: 'contribuinte',
          entity_id: e._dbId || auditClienteId,
          entity_name: e.nome_razao_social,
          action: e._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
        });
      }

      // Log participantes
      for (const p of participants) {
        logAction({
          area: 'dev',
          entity_type: 'participante',
          entity_id: p._dbId || auditClienteId,
          entity_name: p.nome,
          action: p._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
        });
      }

      // Log ordens de serviço
      for (const c of contracts) {
        logAction({
          area: 'dev',
          entity_type: 'ordem_servico',
          entity_id: c._dbId || auditClienteId,
          entity_name: c.ordem_servico || '(sem número)',
          action: c._dbId ? 'updated' : 'created',
          details: `Cliente: ${clientData.nome.trim()}`,
        });
      }

      // Log summary for edits
      if (isEditing) {
        logAction({
          area: 'dev',
          entity_type: 'cliente',
          entity_id: auditClienteId,
          entity_name: clientData.nome.trim(),
          action: 'updated',
          details: `Atualização completa: ${entities.length} contribuintes, ${participants.length} participantes, ${contracts.length} OS`,
        });
      }

      toast.success(isEditing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      resetAndClose();
    } catch (error: any) {
      // Rollback: delete newly created client (CASCADE removes children)
      if (createdClienteId) {
        try {
          await supabase.from(clienteTable).delete().eq("id", createdClienteId);
          console.log("[rollback] Cliente removido:", createdClienteId);
        } catch (rollbackErr) {
          console.error("[rollback] Falha ao remover cliente:", rollbackErr);
        }
      }
      toast.error(`Erro ao ${isEditing ? "atualizar" : "cadastrar"} cliente: ` + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setClientData({ ...defaultClientData });
    setEntities([]);
    setParticipants([]);
    setContracts([]);
    setInscricoesMap({});
    setDraftInscricoes([]);
    setDraftContract({
      ordem_servico: "",
      data_emissao: "",
      data_inicio_projeto: "",
      data_fim_projeto: "",
      valor_projeto: 0,
      valor_reembolso_km: 0,
      valor_reembolso_refeicao: 0,
      situacao_projeto: "em_andamento",
      observacoes_projeto: "",
      id_servico: "",
      id_produto_segmento: "",
      distribuicao_receita: [],
    });
    setDraftParticipant({
      nome: "",
      tipo_participante: "",
      cargo: "",
      email: "",
      telefone: "",
      observacoes: "",
      acesso_chamados: false,
    });
    setActiveTab("cliente");
    setIsReadOnly(readOnly);
    setShowExitConfirm(false);
    clearDraft();
    onOpenChange(false);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      resetAndClose();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleAttemptClose();
        }}
      >
        <DialogContent
          className={cn("max-w-5xl h-[95vh] p-0 flex flex-col overflow-hidden gap-0", "[&>button]:hidden")}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">{isEditing ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário de cadastro de cliente com contribuintes, participantes e contratos
          </DialogDescription>
          {/* Header — Stich style */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-teal-600/10 p-2 rounded-lg">
                {isReadOnly ? (
                  <Building2 className="text-teal-600" size={22} />
                ) : isEditing ? (
                  <Pencil className="text-teal-600" size={22} />
                ) : (
                  <Plus className="text-teal-600" size={22} />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {isReadOnly ? "Visualizar Cliente" : isEditing ? "Editar Cliente" : "Cadastrar Cliente"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {isReadOnly && (
                <Button
                  onClick={() => setIsReadOnly(false)}
                  className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  size="sm"
                >
                  <Pencil size={14} />
                  Editar
                </Button>
              )}
              <button
                onClick={handleAttemptClose}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {loadingEdit ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : (
            <>
              <Tabs
                value={activeTab}
                onValueChange={(v) => handleTabClick(v as typeof activeTab)}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Pill Tabs — Stich style */}
                <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-200 shrink-0">
                  <TabsList className="w-full grid grid-cols-5 bg-gray-100/80 p-1 rounded-lg h-auto">
                    <TabsTrigger
                      value="cliente"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all"
                    >
                      Dados do Cliente/Grupo
                    </TabsTrigger>
                    <TabsTrigger
                      value="contribuintes"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all"
                    >
                      Contribuintes
                    </TabsTrigger>
                    <TabsTrigger
                      value="participantes"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all"
                    >
                      Participantes
                    </TabsTrigger>
                    <TabsTrigger
                      value="contratos"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all"
                    >
                      OS - Ordem de Serviço
                    </TabsTrigger>
                    <TabsTrigger
                      value="faturamento"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all"
                    >
                      Faturamento
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <TabsContent value="cliente" className="mt-0 p-3 md:p-4">
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

                        {/* 5. Área do Negócio */}
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                          <Label className="w-full md:w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                            Área do negócio *
                          </Label>
                          <Select
                            disabled={isReadOnly}
                            value={clientData.setor_cliente || "__none__"}
                            onValueChange={(v) =>
                              setClientData({ ...clientData, setor_cliente: v === "__none__" ? "" : v })
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
                               <SelectItem value="TRA">TRA - Transportadora</SelectItem>
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
                  </TabsContent>

                  <TabsContent value="contribuintes" className="mt-0 p-3 md:p-4">
                    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
                        <h3 className="text-sm font-bold text-foreground">Contribuintes ({entities.length})</h3>
                      </div>
                      <div className="px-4 py-3">
                        {entities.length > 0 && (
                          <div className="space-y-3 mb-4">
                            {entities.map((ent) => {
                              const isExpanded = expandedEntityId === ent._id;
                              const isEditingThis = editingEntityId === ent._id;
                              const ed = isEditingThis ? editingEntityData : null;
                              return (
                                <div
                                  key={ent._id}
                                  className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md"
                                >
                                  {/* Header - always visible */}
                                  <button
                                    type="button"
                                    className="w-full flex items-center justify-between p-4 text-left"
                                    onClick={() => {
                                      if (!isEditingThis) setExpandedEntityId(isExpanded ? null : ent._id);
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-foreground truncate">{ent.nome_razao_social}</div>
                                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                        {ent.cpf_cnpj || "-"}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      {ent.contribuinte_faturamento && (
                                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                                          Faturamento
                                        </span>
                                      )}
                                      {ent.simples_nacional === "optante" && (
                                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold text-foreground">
                                          Simples
                                        </span>
                                      )}
                                      <Badge variant="outline" className="text-[10px]">
                                        {ent.tipo_pessoa}
                                      </Badge>
                                      <ChevronDown
                                        size={16}
                                        className={cn(
                                          "text-muted-foreground transition-transform",
                                          isExpanded && "rotate-180",
                                        )}
                                      />
                                    </div>
                                  </button>

                                  {/* Expanded content */}
                                  {isExpanded && !isEditingThis && (
                                    <div className="px-4 pb-4 border-t pt-3">
                                      <div className="flex justify-end gap-2 mb-3">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditEntity(ent);
                                          }}
                                        >
                                          <Pencil size={12} /> Editar
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-1.5 text-xs text-destructive hover:text-destructive"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Trash2 size={12} /> Remover
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remover contribuinte</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Tem certeza que deseja remover "{ent.nome_razao_social}"? Esta ação não
                                                pode ser desfeita.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={() => {
                                                  setEntities(entities.filter((x) => x._id !== ent._id));
                                                  setExpandedEntityId(null);
                                                }}
                                              >
                                                Remover
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                                        <FieldPair label="Tipo Pessoa" value={ent.tipo_pessoa} />
                                        <FieldPair label="CPF/CNPJ" value={ent.cpf_cnpj} />
                                        <FieldPair label="Razão Social / Nome Completo" value={ent.nome_razao_social} />
                                        {ent.tipo_pessoa !== "PF" && (
                                          <FieldPair label="Nome Fantasia" value={ent.nome_fantasia} />
                                        )}
                                        <FieldPair label="Telefone" value={ent.telefone} />
                                        {/* Situação Inscrição Estadual */}
                                        <FieldPair label="Possui Inscrição Estadual?" value={
                                          ent.situacao_inscricao_estadual === "sim" ? "Sim"
                                            : ent.situacao_inscricao_estadual === "nao" ? "Não"
                                            : ent.situacao_inscricao_estadual === "isento" ? "Isento"
                                            : "—"
                                        } />
                                        {/* Inscrições Estaduais - só exibe se "sim" */}
                                        {ent.situacao_inscricao_estadual === "sim" && (
                                        <div className="col-span-2 md:col-span-3">
                                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {(inscricoesMap[ent._dbId || String(ent._id)] || []).length > 0
                                              ? (inscricoesMap[ent._dbId || String(ent._id)] || []).map((ie) => (
                                                  <Badge key={ie._tempId} variant="secondary" className="text-xs">
                                                    {ie.uf} — {ie.situacao === "isento" ? "Isento" : ie.situacao === "nao" ? "Não inscrito" : ie.numero_ie || "—"}
                                                  </Badge>
                                                ))
                                              : <span className="text-sm text-muted-foreground">Nenhuma IE cadastrada</span>
                                            }
                                          </div>
                                        </div>
                                        )}
                        {ent.tipo_pessoa === "PJ" && <FieldPair label="CNAE" value={ent.cod_cnae} />}
                        {ent.tipo_pessoa === "PJ" && ent.atividade_principal && (
                          <FieldPair label="Atividade Principal" value={ent.atividade_principal} />
                        )}
                                        {ent.tipo_pessoa === "PJ" && (
                                          <FieldPair
                                            label="Simples Nacional"
                                            value={
                                              ent.simples_nacional === "optante"
                                                ? "Optante"
                                                : ent.simples_nacional === "nao_optante"
                                                  ? "Não Optante"
                                                  : "—"
                                            }
                                          />
                                        )}
                                        <FieldPair label="CEP" value={ent.cep} />
                                        <FieldPair label="Logradouro" value={ent.logradouro} />
                                        <FieldPair label="Número" value={ent.numero} />
                                        <FieldPair label="Complemento" value={ent.complemento} />
                                        <FieldPair label="Bairro" value={ent.bairro} />
                                        <FieldPair label="Município" value={ent.municipio} />
                                        <FieldPair label="UF" value={ent.uf} />
                                        <FieldPair
                                          label="Contribuinte de Faturamento"
                                          value={ent.contribuinte_faturamento ? "Sim" : "Não"}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* Inline edit mode */}
                                  {isExpanded && isEditingThis && ed && (
                                    <div className="px-4 pb-4 border-t pt-3">
                                      <div className="flex flex-col gap-2.5">
                                        {/* Tipo */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Tipo
                                          </Label>
                                          <div className="flex-1">
                                            <Select
                                              value={ed.tipo_pessoa || "PJ"}
                                              onValueChange={(v) =>
                                                setEditingEntityData({ ...ed, tipo_pessoa: v, cpf_cnpj: "" })
                                              }
                                            >
                                              <SelectTrigger className="h-8 max-w-[160px]">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="PJ">PJ</SelectItem>
                                                <SelectItem value="PF">PF</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        {/* CPF/CNPJ */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            CPF/CNPJ
                                          </Label>
                                          <div className="flex-1">
                                            <div className="relative">
                                              <Input
                                                value={ed.cpf_cnpj || ""}
                                                onChange={(e) =>
                                                  setEditingEntityData({
                                                    ...ed,
                                                    cpf_cnpj: formatCpfCnpj(e.target.value, ed.tipo_pessoa || "PJ"),
                                                  })
                                                }
                                                onBlur={(e) => handleInlineCnpjBlur(e.target.value)}
                                                className="font-mono pr-8 h-8"
                                              />
                                              {cnpjLoading && (
                                                <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        {/* Razão Social */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            {ed.tipo_pessoa === "PF" ? "Nome completo *" : "Razão Social *"}
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.nome_razao_social || ""}
                                              onChange={(e) =>
                                                setEditingEntityData({ ...ed, nome_razao_social: e.target.value })
                                              }
                                              placeholder={
                                                ed.tipo_pessoa === "PF"
                                                  ? "Nome completo do contribuinte"
                                                  : "Nome Empresarial"
                                              }
                                              className="font-medium h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Nome Fantasia - hidden for PF */}
                                        {ed.tipo_pessoa !== "PF" && (
                                          <div className="flex flex-row items-center gap-4">
                                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                              Nome Fantasia
                                            </Label>
                                            <div className="flex-1">
                                              <Input
                                                value={ed.nome_fantasia || ""}
                                                onChange={(e) =>
                                                  setEditingEntityData({ ...ed, nome_fantasia: e.target.value })
                                                }
                                                className="h-8"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {/* Telefone */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Telefone
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.telefone || ""}
                                              onChange={(e) =>
                                                setEditingEntityData({ ...ed, telefone: formatPhone(e.target.value) })
                                              }
                                              placeholder="(00) 00000-0000"
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Possui Inscrição Estadual? */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Possui Inscrição Estadual?
                                          </Label>
                                          <div className="flex-1">
                                            <Select
                                              value={ed.situacao_inscricao_estadual || undefined}
                                              onValueChange={(v) => {
                                                setEditingEntityData({ ...ed, situacao_inscricao_estadual: v });
                                                if (v !== "sim") {
                                                  const key = ent._dbId || String(ent._id);
                                                  setInscricoesMap(prev => ({ ...prev, [key]: [] }));
                                                }
                                              }}
                                            >
                                              <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="sim">Sim</SelectItem>
                                                <SelectItem value="nao">Não</SelectItem>
                                                <SelectItem value="isento">Isento</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        {/* Inscrições Estaduais - condicional */}
                                        {ed.situacao_inscricao_estadual === "sim" && (
                                        <div className="border border-dashed rounded-lg p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="gap-1 text-xs"
                                              onClick={() => {
                                                const key = ent._dbId || String(ent._id);
                                                setInscricoesMap(prev => ({
                                                  ...prev,
                                                  [key]: [...(prev[key] || []), { _tempId: Date.now() + Math.random(), situacao: "sim", numero_ie: "", uf: "" }],
                                                }));
                                              }}
                                            >
                                              <Plus size={12} /> Adicionar IE
                                            </Button>
                                          </div>
                                          {(inscricoesMap[ent._dbId || String(ent._id)] || []).map((ie, ieIdx) => (
                                            <div key={ie._tempId} className="flex items-center gap-2 mt-1">
                                              <Select value={ie.uf || undefined} onValueChange={(v) => {
                                                const key = ent._dbId || String(ent._id);
                                                setInscricoesMap(prev => {
                                                  const list = [...(prev[key] || [])];
                                                  list[ieIdx] = { ...list[ieIdx], uf: v };
                                                  return { ...prev, [key]: list };
                                                });
                                              }}>
                                                <SelectTrigger className="h-8 w-24 shrink-0"><SelectValue placeholder="UF" /></SelectTrigger>
                                                <SelectContent>
                                                  {UF_STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                                                </SelectContent>
                                              </Select>
                                              <Select value={ie.situacao || undefined} onValueChange={(v) => {
                                                const key = ent._dbId || String(ent._id);
                                                setInscricoesMap(prev => {
                                                  const list = [...(prev[key] || [])];
                                                  list[ieIdx] = { ...list[ieIdx], situacao: v, numero_ie: v !== "sim" ? "" : list[ieIdx].numero_ie };
                                                  return { ...prev, [key]: list };
                                                });
                                              }}>
                                                <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue placeholder="Situação" /></SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="sim">Sim</SelectItem>
                                                  <SelectItem value="nao">Não</SelectItem>
                                                  <SelectItem value="isento">Isento</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              {ie.situacao === "sim" && (
                                                <Input
                                                  value={ie.numero_ie}
                                                  onChange={(e) => {
                                                    const key = ent._dbId || String(ent._id);
                                                    setInscricoesMap(prev => {
                                                      const list = [...(prev[key] || [])];
                                                      list[ieIdx] = { ...list[ieIdx], numero_ie: e.target.value };
                                                      return { ...prev, [key]: list };
                                                    });
                                                  }}
                                                  placeholder="Nº IE"
                                                  maxLength={15}
                                                  className="h-8 flex-1"
                                                />
                                              )}
                                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                                                const key = ent._dbId || String(ent._id);
                                                setInscricoesMap(prev => ({
                                                  ...prev,
                                                  [key]: (prev[key] || []).filter((_, i) => i !== ieIdx),
                                                }));
                                              }}>
                                                <X size={14} />
                                              </Button>
                                            </div>
                                          ))}
                                          {(inscricoesMap[ent._dbId || String(ent._id)] || []).length === 0 && (
                                            <p className="text-xs text-muted-foreground italic mt-1">Nenhuma IE cadastrada.</p>
                                          )}
                                        </div>
                                        )}
                                        {/* CNAE */}
                                        {ed.tipo_pessoa === "PJ" && (
                                          <div className="flex flex-row items-center gap-4">
                                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                              CNAE
                                            </Label>
                                            <div className="flex-1">
                                              <Input
                                                value={ed.cod_cnae || ""}
                                                onChange={(e) =>
                                                  setEditingEntityData({ ...ed, cod_cnae: e.target.value })
                                                }
                                                className="h-8 max-w-[200px]"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {/* Atividade Principal (read-only) */}
                                        {ed.tipo_pessoa === "PJ" && (ed as any).atividade_principal && (
                                          <div className="flex flex-row items-center gap-4">
                                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                              Atividade Principal
                                            </Label>
                                            <div className="flex-1">
                                              <Input
                                                value={(ed as any).atividade_principal || ""}
                                                disabled
                                                className="h-8 bg-muted/50"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {/* Simples Nacional - Select */}
                                        {ed.tipo_pessoa === "PJ" && (
                                          <div className="flex flex-row items-center gap-4">
                                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                              Simples Nacional *
                                            </Label>
                                            <div className="flex-1">
                                              <Select
                                                value={ed.simples_nacional || undefined}
                                                onValueChange={(v) =>
                                                  setEditingEntityData({ ...ed, simples_nacional: v })
                                                }
                                              >
                                                <SelectTrigger className="h-8 max-w-[200px]">
                                                  <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="optante">Optante</SelectItem>
                                                  <SelectItem value="nao_optante">Não Optante</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                        )}
                                        {/* CEP */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            CEP *
                                          </Label>
                                          <div className="flex-1">
                                            <div className="relative max-w-[160px]">
                                              <Input
                                                value={ed.cep || ""}
                                                onChange={(e) =>
                                                  setEditingEntityData({ ...ed, cep: formatCep(e.target.value) })
                                                }
                                                onBlur={(e) => handleInlineCepBlur(e.target.value)}
                                                className="font-mono pr-8 h-8"
                                              />
                                              {cepLoading && (
                                                <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        {/* UF */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            UF
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.uf || ""}
                                              onChange={(e) => setEditingEntityData({ ...ed, uf: e.target.value })}
                                              maxLength={2}
                                              className="h-8 max-w-[120px]"
                                            />
                                          </div>
                                        </div>
                                        {/* Município */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Município
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.municipio || ""}
                                              onChange={(e) =>
                                                setEditingEntityData({ ...ed, municipio: e.target.value })
                                              }
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Bairro */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Bairro
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.bairro || ""}
                                              onChange={(e) => setEditingEntityData({ ...ed, bairro: e.target.value })}
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Logradouro */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Logradouro
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.logradouro || ""}
                                              onChange={(e) =>
                                                setEditingEntityData({ ...ed, logradouro: e.target.value })
                                              }
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Número */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Número
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.numero || ""}
                                              onChange={(e) => setEditingEntityData({ ...ed, numero: e.target.value })}
                                              className="h-8 max-w-[120px]"
                                            />
                                          </div>
                                        </div>
                                        {/* Complemento */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Complemento
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ed.complemento || ""}
                                              onChange={(e) =>
                                                setEditingEntityData({ ...ed, complemento: e.target.value })
                                              }
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Contribuinte de Faturamento */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Contribuinte de Faturamento
                                          </Label>
                                          <div className="flex items-center gap-2">
                                            <Switch
                                              checked={!!(ed as any).contribuinte_faturamento}
                                              onCheckedChange={(v) =>
                                                setEditingEntityData({ ...ed, contribuinte_faturamento: v })
                                              }
                                            />
                                            <span className="text-xs text-muted-foreground">
                                              {(ed as any).contribuinte_faturamento ? "Sim" : "Não"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                                          <Button size="sm" variant="outline" onClick={cancelEditEntity}>
                                            Cancelar
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                size="sm"
                                                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                                              >
                                                <Save size={14} /> Salvar
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Deseja salvar as alterações feitas neste contribuinte?
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                  className="bg-teal-600 hover:bg-teal-700 text-white"
                                                  onClick={saveEditEntity}
                                                >
                                                  Salvar
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isReadOnly && (
                          <div className="bg-muted/50 rounded-lg border p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-bold text-muted-foreground uppercase">Novo Contribuinte</h4>
                              {entities.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={handleCopyFirstAddress}
                                >
                                  <Copy size={12} /> Copiar endereço do primeiro contribuinte
                                </Button>
                              )}
                            </div>
                            <div className="flex flex-col gap-2.5">
                              {/* Tipo */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Tipo
                                </Label>
                                <div className="flex-1">
                                  <Select
                                    value={draftEntity.tipo_pessoa || "PJ"}
                                    onValueChange={(v) =>
                                      setDraftEntity({ ...draftEntity, tipo_pessoa: v, cpf_cnpj: "" })
                                    }
                                  >
                                    <SelectTrigger className="h-8 max-w-[160px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PJ">PJ</SelectItem>
                                      <SelectItem value="PF">PF</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {/* CPF/CNPJ */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  CPF/CNPJ *
                                </Label>
                                <div className="flex-1">
                                  <div className="relative">
                                    <Input
                                      value={draftEntity.cpf_cnpj || ""}
                                      onChange={(e) =>
                                        setDraftEntity({
                                          ...draftEntity,
                                          cpf_cnpj: formatCpfCnpj(e.target.value, draftEntity.tipo_pessoa || "PJ"),
                                        })
                                      }
                                      onBlur={(e) => handleCnpjBlur(e.target.value)}
                                      placeholder={
                                        draftEntity.tipo_pessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"
                                      }
                                      className="font-mono pr-8 h-8"
                                    />
                                    {cnpjLoading && (
                                      <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Razão Social */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  {draftEntity.tipo_pessoa === "PF" ? "Nome completo *" : "Razão Social *"}
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.nome_razao_social || ""}
                                    onChange={(e) =>
                                      setDraftEntity({ ...draftEntity, nome_razao_social: e.target.value })
                                    }
                                    placeholder={
                                      draftEntity.tipo_pessoa === "PF"
                                        ? "Nome completo do contribuinte"
                                        : "Nome Empresarial"
                                    }
                                    className="font-medium h-8"
                                  />
                                </div>
                              </div>
                              {/* Nome Fantasia - hidden for PF */}
                              {draftEntity.tipo_pessoa !== "PF" && (
                                <div className="flex flex-row items-center gap-4">
                                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                    Nome Fantasia
                                  </Label>
                                  <div className="flex-1">
                                    <Input
                                      value={draftEntity.nome_fantasia || ""}
                                      onChange={(e) =>
                                        setDraftEntity({ ...draftEntity, nome_fantasia: e.target.value })
                                      }
                                      placeholder="Nome Fantasia"
                                      className="h-8"
                                    />
                                  </div>
                                </div>
                              )}
                              {/* Telefone */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Telefone
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.telefone || ""}
                                    onChange={(e) =>
                                      setDraftEntity({ ...draftEntity, telefone: formatPhone(e.target.value) })
                                    }
                                    placeholder="(00) 00000-0000"
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {/* Possui Inscrição Estadual? */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Possui Inscrição Estadual?
                                </Label>
                                <div className="flex-1">
                                  <Select
                                    value={draftEntity.situacao_inscricao_estadual || undefined}
                                    onValueChange={(v) => {
                                      setDraftEntity(prev => ({ ...prev, situacao_inscricao_estadual: v }));
                                      if (v !== "sim") {
                                        setDraftInscricoes([]);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sim">Sim</SelectItem>
                                      <SelectItem value="nao">Não</SelectItem>
                                      <SelectItem value="isento">Isento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {/* Inscrições Estaduais - condicional */}
                              {draftEntity.situacao_inscricao_estadual === "sim" && (
                              <div className="border border-dashed rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-xs"
                                    onClick={() => setDraftInscricoes(prev => [...prev, { _tempId: Date.now() + Math.random(), situacao: "sim", numero_ie: "", uf: "" }])}
                                  >
                                    <Plus size={12} /> Adicionar IE
                                  </Button>
                                </div>
                                {draftInscricoes.map((ie, ieIdx) => (
                                  <div key={ie._tempId} className="flex items-center gap-2 mt-1">
                                    <Select value={ie.uf || undefined} onValueChange={(v) => {
                                      setDraftInscricoes(prev => {
                                        const list = [...prev];
                                        list[ieIdx] = { ...list[ieIdx], uf: v };
                                        return list;
                                      });
                                    }}>
                                      <SelectTrigger className="h-8 w-24 shrink-0"><SelectValue placeholder="UF" /></SelectTrigger>
                                      <SelectContent>
                                        {UF_STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                    <Select value={ie.situacao || undefined} onValueChange={(v) => {
                                      setDraftInscricoes(prev => {
                                        const list = [...prev];
                                        list[ieIdx] = { ...list[ieIdx], situacao: v, numero_ie: v !== "sim" ? "" : list[ieIdx].numero_ie };
                                        return list;
                                      });
                                    }}>
                                      <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue placeholder="Situação" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="sim">Sim</SelectItem>
                                        <SelectItem value="nao">Não</SelectItem>
                                        <SelectItem value="isento">Isento</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {ie.situacao === "sim" && (
                                      <Input
                                        value={ie.numero_ie}
                                        onChange={(e) => {
                                          setDraftInscricoes(prev => {
                                            const list = [...prev];
                                            list[ieIdx] = { ...list[ieIdx], numero_ie: e.target.value };
                                            return list;
                                          });
                                        }}
                                        placeholder="Nº IE"
                                        maxLength={15}
                                        className="h-8 flex-1"
                                      />
                                    )}
                                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                                      setDraftInscricoes(prev => prev.filter((_, i) => i !== ieIdx));
                                    }}>
                                      <X size={14} />
                                    </Button>
                                  </div>
                                ))}
                                {draftInscricoes.length === 0 && (
                                  <p className="text-xs text-muted-foreground italic mt-1">Nenhuma IE cadastrada. Clique em "Adicionar IE" para incluir.</p>
                                )}
                              </div>
                              )}
                              {/* CNAE */}
                              {draftEntity.tipo_pessoa === "PJ" && (
                                <div className="flex flex-row items-center gap-4">
                                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                    CNAE *
                                  </Label>
                                  <div className="flex-1">
                                    <Input
                                      value={draftEntity.cod_cnae || ""}
                                      onChange={(e) => setDraftEntity({ ...draftEntity, cod_cnae: e.target.value })}
                                      placeholder="0000-0/00"
                                      className="h-8 max-w-[200px]"
                                    />
                                  </div>
                                </div>
                              )}
                              {/* Atividade Principal (read-only, from BrasilAPI) */}
                              {draftEntity.tipo_pessoa === "PJ" && (draftEntity as any).atividade_principal && (
                                <div className="flex flex-row items-center gap-4">
                                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                    Atividade Principal
                                  </Label>
                                  <div className="flex-1">
                                    <Input
                                      value={(draftEntity as any).atividade_principal || ""}
                                      disabled
                                      className="h-8 bg-muted/50"
                                    />
                                  </div>
                                </div>
                              )}
                              {/* Simples Nacional - Select */}
                              {draftEntity.tipo_pessoa === "PJ" && (
                                <div className="flex flex-row items-center gap-4">
                                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                    Simples Nacional *
                                  </Label>
                                  <div className="flex-1">
                                    <Select
                                      value={draftEntity.simples_nacional || undefined}
                                      onValueChange={(v) => setDraftEntity({ ...draftEntity, simples_nacional: v })}
                                    >
                                      <SelectTrigger className="h-8 max-w-[200px]">
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="optante">Optante</SelectItem>
                                        <SelectItem value="nao_optante">Não Optante</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}
                              {/* CEP */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  CEP *
                                </Label>
                                <div className="flex-1">
                                  <div className="relative max-w-[160px]">
                                    <Input
                                      value={draftEntity.cep || ""}
                                      onChange={(e) =>
                                        setDraftEntity({ ...draftEntity, cep: formatCep(e.target.value) })
                                      }
                                      onBlur={(e) => handleCepBlur(e.target.value)}
                                      placeholder="00000-000"
                                      className="font-mono pr-8 h-8"
                                    />
                                    {cepLoading && (
                                      <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* UF */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  UF *
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.uf || ""}
                                    onChange={(e) => setDraftEntity({ ...draftEntity, uf: e.target.value })}
                                    maxLength={2}
                                    className="h-8 max-w-[120px]"
                                  />
                                </div>
                              </div>
                              {/* Município */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Município *
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.municipio || ""}
                                    onChange={(e) => setDraftEntity({ ...draftEntity, municipio: e.target.value })}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {/* Bairro */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Bairro *
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.bairro || ""}
                                    onChange={(e) => setDraftEntity({ ...draftEntity, bairro: e.target.value })}
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {/* Logradouro */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Logradouro *
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.logradouro || ""}
                                    onChange={(e) => setDraftEntity({ ...draftEntity, logradouro: e.target.value })}
                                    placeholder="Rua, Av., Rod..."
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {/* Número */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Número
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.numero || ""}
                                    onChange={(e) => setDraftEntity({ ...draftEntity, numero: e.target.value })}
                                    placeholder="Nº"
                                    className="h-8 max-w-[120px]"
                                  />
                                </div>
                              </div>
                              {/* Complemento */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Complemento
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftEntity.complemento || ""}
                                    onChange={(e) => setDraftEntity({ ...draftEntity, complemento: e.target.value })}
                                    placeholder="Sala, Andar..."
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {/* Contribuinte de Faturamento */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Contribuinte de Faturamento
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={!!draftEntity.contribuinte_faturamento}
                                    onCheckedChange={(v) =>
                                      setDraftEntity({ ...draftEntity, contribuinte_faturamento: v })
                                    }
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {draftEntity.contribuinte_faturamento ? "Sim" : "Não"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-end mt-2">
                                <Button onClick={addEntity} className="gap-2">
                                  Adicionar à Lista
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="participantes" className="mt-0 p-3 md:p-4">
                    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
                        <h3 className="text-sm font-bold text-foreground">Participantes ({participants.length})</h3>
                      </div>
                      <div className="px-4 py-3">
                        {participants.length > 0 && (
                          <div className="space-y-3 mb-4">
                            {participants.map((part) => {
                              const isExpanded = expandedParticipantId === part._id;
                              const isEditingThis = editingParticipantId === part._id;
                              const ep = isEditingThis ? editingParticipantData : null;
                              return (
                                <div
                                  key={part._id}
                                  className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md"
                                >
                                  <button
                                    type="button"
                                    className="w-full flex items-center justify-between p-4 text-left"
                                    onClick={() => {
                                      if (!isEditingThis) setExpandedParticipantId(isExpanded ? null : part._id);
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-foreground truncate">{part.nome}</div>
                                      <div className="text-sm text-muted-foreground">{part.tipo_participante}</div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      {part.acesso_chamados && (
                                        <Badge variant="outline" className="text-[10px]">
                                          Chamados
                                        </Badge>
                                      )}
                                      <ChevronDown
                                        size={16}
                                        className={cn(
                                          "text-muted-foreground transition-transform",
                                          isExpanded && "rotate-180",
                                        )}
                                      />
                                    </div>
                                  </button>

                                  {isExpanded && !isEditingThis && (
                                    <div className="px-4 pb-4 border-t pt-3">
                                      <div className="flex justify-end gap-2 mb-3">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5 text-xs"
                                          onClick={() => startEditParticipant(part)}
                                        >
                                          <Pencil size={12} /> Editar
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-1.5 text-xs text-destructive hover:text-destructive"
                                            >
                                              <Trash2 size={12} /> Remover
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remover participante</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Tem certeza que deseja remover "{part.nome}"? Esta ação não pode ser
                                                desfeita.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={() => {
                                                  setParticipants(participants.filter((p) => p._id !== part._id));
                                                  setExpandedParticipantId(null);
                                                }}
                                              >
                                                Remover
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        <FieldPair label="Nome" value={part.nome} />
                                        <FieldPair label="Cargo/função" value={part.tipo_participante} />
                                        <FieldPair label="Email" value={part.email} />
                                        <FieldPair label="Telefone" value={part.telefone} />
                                        <FieldPair
                                          label="Acesso a Chamados"
                                          value={part.acesso_chamados ? "Sim" : "Não"}
                                        />
                                        {part.observacoes && (
                                          <div className="col-span-2">
                                            <FieldPair label="Observações" value={part.observacoes} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {isExpanded && isEditingThis && ep && (
                                    <div className="px-4 pb-4 border-t pt-3">
                                      <div className="flex flex-col gap-2.5">
                                        {/* Nome */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                             Nome <RequiredMark />
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ep.nome || ""}
                                              onChange={(e) =>
                                                setEditingParticipantData({ ...ep, nome: e.target.value })
                                              }
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Cargo/função */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Cargo/função *
                                          </Label>
                                          <div className="flex-1">
                                            <Select
                                              value={ep.tipo_participante || "__none__"}
                                              onValueChange={(v) =>
                                                setEditingParticipantData({
                                                  ...ep,
                                                  tipo_participante: v === "__none__" ? "" : v,
                                                })
                                              }
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Selecione..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__none__">Selecione...</SelectItem>
                                                {TIPO_PARTICIPANTE_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt} value={opt}>
                                                    {opt}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        {/* Email */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Email *
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ep.email || ""}
                                              onChange={(e) =>
                                                setEditingParticipantData({ ...ep, email: e.target.value })
                                              }
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Telefone */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Telefone
                                          </Label>
                                          <div className="flex-1">
                                            <Input
                                              value={ep.telefone || ""}
                                              onChange={(e) =>
                                                setEditingParticipantData({
                                                  ...ep,
                                                  telefone: formatPhone(e.target.value),
                                                })
                                              }
                                              className="h-8"
                                            />
                                          </div>
                                        </div>
                                        {/* Acesso Chamados */}
                                        <div className="flex flex-row items-center gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                            Acesso Chamados
                                          </Label>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 h-8">
                                              <Switch
                                                checked={ep.acesso_chamados ?? false}
                                                onCheckedChange={(c) =>
                                                  setEditingParticipantData({ ...ep, acesso_chamados: c })
                                                }
                                              />
                                              <span className="text-sm">
                                                {ep.acesso_chamados ? "Ativado" : "Desativado"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Observações */}
                                        <div className="flex flex-row items-start gap-4">
                                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">
                                            Observações
                                          </Label>
                                          <div className="flex-1">
                                            <Textarea
                                              value={ep.observacoes || ""}
                                              onChange={(e) =>
                                                setEditingParticipantData({ ...ep, observacoes: e.target.value })
                                              }
                                              className="min-h-[60px]"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                                          <Button size="sm" variant="outline" onClick={cancelEditParticipant}>
                                            Cancelar
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                size="sm"
                                                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                                              >
                                                <Save size={14} /> Salvar
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Deseja salvar as alterações feitas neste participante?
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                  className="bg-teal-600 hover:bg-teal-700 text-white"
                                                  onClick={saveEditParticipant}
                                                >
                                                  Salvar
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isReadOnly && (
                          <div className="bg-muted/50 rounded-lg border p-4">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3">
                              Novo Participante
                            </h4>
                            <div className="flex flex-col gap-2.5">
                              {/* Nome */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                   Nome <RequiredMark />
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftParticipant.nome}
                                    onChange={(e) => setDraftParticipant({ ...draftParticipant, nome: e.target.value })}
                                    placeholder="Nome do contato"
                                    className="font-medium h-8"
                                  />
                                </div>
                              </div>
                              {/* Cargo/função */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Cargo/função *
                                </Label>
                                <div className="flex-1">
                                  <Select
                                    value={draftParticipant.tipo_participante || "__none__"}
                                    onValueChange={(v) =>
                                      setDraftParticipant({
                                        ...draftParticipant,
                                        tipo_participante: v === "__none__" ? "" : v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Selecione...</SelectItem>
                                      {TIPO_PARTICIPANTE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {/* Email */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Email *
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftParticipant.email}
                                    onChange={(e) =>
                                      setDraftParticipant({ ...draftParticipant, email: e.target.value })
                                    }
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {/* Telefone */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Telefone
                                </Label>
                                <div className="flex-1">
                                  <Input
                                    value={draftParticipant.telefone}
                                    onChange={(e) =>
                                      setDraftParticipant({
                                        ...draftParticipant,
                                        telefone: formatPhone(e.target.value),
                                      })
                                    }
                                    className="h-8"
                                  />
                                </div>
                              </div>
                              {/* Acesso Chamados */}
                              <div className="flex flex-row items-center gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                                  Acesso Chamados
                                </Label>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 h-8">
                                    <Switch
                                      checked={draftParticipant.acesso_chamados}
                                      onCheckedChange={(c) =>
                                        setDraftParticipant({ ...draftParticipant, acesso_chamados: c })
                                      }
                                    />
                                    <span className="text-sm">
                                      {draftParticipant.acesso_chamados ? "Ativado" : "Desativado"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* Observações */}
                              <div className="flex flex-row items-start gap-4">
                                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">
                                  Observações
                                </Label>
                                <div className="flex-1">
                                  <Textarea
                                    value={draftParticipant.observacoes}
                                    onChange={(e) =>
                                      setDraftParticipant({ ...draftParticipant, observacoes: e.target.value })
                                    }
                                    placeholder="Observações sobre o participante (mín. 20 caracteres se preenchido)..."
                                    className="min-h-[60px]"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end mt-2">
                                <Button onClick={addParticipant} className="gap-2">
                                  Adicionar à Lista
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </TabsContent>

                  <TabsContent value="contratos" className="mt-0 p-3 md:p-4">
                    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
                        <h3 className="text-sm font-bold text-foreground">
                          OS - Ordem de Serviço ({contracts.length})
                        </h3>
                      </div>
                      <div className="px-4 py-3">
                        {contracts.length > 0 && (
                          <div className="space-y-3 mb-6">
                            {contracts.map((cont) => {
                              const isExpanded = expandedContractId === cont._id;
                              const isEditingThis = editingContractId === cont._id;
                              const ec = isEditingThis ? editingContractData : null;
                              return (
                                <div
                                  key={cont._id}
                                  className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md"
                                >
                                  <button
                                    type="button"
                                    className="w-full flex items-center justify-between p-4 text-left"
                                    onClick={() => {
                                      if (!isEditingThis) setExpandedContractId(isExpanded ? null : cont._id);
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-muted text-foreground">
                                          OS {cont.ordem_servico}
                                        </span>
                                      </div>
                                      <div className="font-bold text-foreground mt-0.5">
                                        {formatCurrencyDisplay(cont.valor_projeto)}
                                      </div>
                                    </div>
                                    <ChevronDown
                                      size={16}
                                      className={cn(
                                        "text-muted-foreground transition-transform ml-2",
                                        isExpanded && "rotate-180",
                                      )}
                                    />
                                  </button>

                                  {isExpanded && !isEditingThis && (
                                    <div className="px-4 pb-4 border-t pt-3">
                                      <div className="flex justify-end gap-2 mb-3">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1.5 text-xs"
                                          onClick={() => startEditContract(cont)}
                                        >
                                          <Pencil size={12} /> Editar
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="gap-1.5 text-xs text-destructive hover:text-destructive"
                                            >
                                              <Trash2 size={12} /> Remover
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remover OS</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Tem certeza que deseja remover a OS "{cont.ordem_servico}"? Esta ação
                                                não pode ser desfeita.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={() => {
                                                  setContracts(contracts.filter((c) => c._id !== cont._id));
                                                  setExpandedContractId(null);
                                                }}
                                              >
                                                Remover
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                                        <FieldPair
                                          label="Data Início"
                                          value={cont.data_inicio_projeto ? isoToMasked(cont.data_inicio_projeto) : "—"}
                                        />
                                        <FieldPair
                                          label="Data Fim"
                                          value={cont.data_fim_projeto ? isoToMasked(cont.data_fim_projeto) : "—"}
                                        />
                                        <FieldPair
                                          label="Data Emissão"
                                          value={cont.data_emissao ? isoToMasked(cont.data_emissao) : "—"}
                                        />
                                        {cont.id_produto_segmento && (
                                          <FieldPair
                                            label="Tipo de Produto/Segmento"
                                            value={
                                              produtoSegmentoFullOptions.find((p) => p.id === cont.id_produto_segmento)
                                                ? `${produtoSegmentoFullOptions.find((p) => p.id === cont.id_produto_segmento)!.codigo} - ${produtoSegmentoFullOptions.find((p) => p.id === cont.id_produto_segmento)!.nome}`
                                                : "—"
                                            }
                                          />
                                        )}
                                        <FieldPair
                                          label="Valor do Projeto"
                                          value={formatCurrencyDisplay(cont.valor_projeto)}
                                        />
                                        <FieldPair
                                          label="Situação do Projeto"
                                          value={
                                            SITUACAO_PROJETO_OPTIONS.find(
                                              (o) => o.value === (cont as any).situacao_projeto,
                                            )?.label || "—"
                                          }
                                        />
                                        <div className="col-span-2 grid grid-cols-2 gap-4">
                                          <FieldPair
                                            label="Reembolso por KM"
                                            value={formatCurrencyDisplay(cont.valor_reembolso_km)}
                                          />
                                          <FieldPair
                                            label="Reembolso Refeição"
                                            value={formatCurrencyDisplay(cont.valor_reembolso_refeicao)}
                                          />
                                        </div>
                                        {cont.id_servico && (
                                          <div className="col-span-2 md:col-span-3">
                                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                                              Empresa
                                            </p>
                                            <span className="text-sm">
                                              {(() => {
                                                const svc = catalogServices.find((s: any) => s.id === cont.id_servico);
                                                return (svc as any)?.estrutura_clusters?.name || "—";
                                              })()}
                                            </span>
                                          </div>
                                        )}
                                        {cont.id_servico && (
                                          <div className="col-span-2 md:col-span-3">
                                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                                              Serviço Contratado
                                            </p>
                                            <Badge variant="secondary" className="text-xs mt-1">
                                              {catalogServices.find((s: any) => s.id === cont.id_servico)?.nome || cont.id_servico}
                                            </Badge>
                                          </div>
                                        )}
                                        {cont.distribuicao_receita?.length > 0 && (
                                          <div className="col-span-2 md:col-span-3">
                                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                                              Distribuição de Receita
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                              {cont.distribuicao_receita.map(
                                                (cc, idx) => {
                                                  const ccOpt = CENTRO_CUSTO_OPTIONS.find((o) => o.id === cc.id_centro_custo);
                                                  return (
                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                      {ccOpt?.label || cc.id_centro_custo}: {cc.percentual_rateio}%
                                                    </Badge>
                                                  );
                                                },
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {(cont as any).observacoes_projeto && (
                                          <div className="col-span-2 md:col-span-3">
                                            <FieldPair label="Observações" value={(cont as any).observacoes_projeto} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {isExpanded && isEditingThis && ec && (
                                    <div className="px-4 pb-4 border-t pt-3">
                                      <h5 className="text-xs font-bold uppercase text-muted-foreground border-b pb-2 mb-4">
                                        Dados da OS — {ec.ordem_servico}
                                      </h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* L1: Data Início | Data Fim */}
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Data Início
                                          </Label>
                                          <div className="mt-1">
                                            <DateFieldWithInput
                                              value={ec.data_inicio_projeto || ""}
                                              onChange={(v) =>
                                                setEditingContractData({ ...ec, data_inicio_projeto: v })
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Data Fim
                                          </Label>
                                          <div className="mt-1">
                                            <DateFieldWithInput
                                              value={ec.data_fim_projeto || ""}
                                              onChange={(v) => setEditingContractData({ ...ec, data_fim_projeto: v })}
                                            />
                                          </div>
                                        </div>
                                        {/* L2: Data de Emissão | Tipo Produto/Segmento */}
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Data de Emissão
                                          </Label>
                                          <div className="mt-1">
                                            <DateFieldWithInput
                                              value={ec.data_emissao || ""}
                                              onChange={(v) => setEditingContractData({ ...ec, data_emissao: v })}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Tipo de Produto/Segmento
                                          </Label>
                                          <div className="mt-1">
                                            <Select
                                              value={(ec as any).id_produto_segmento || "__none__"}
                                              onValueChange={(v) =>
                                                setEditingContractData({
                                                  ...ec,
                                                  id_produto_segmento: v === "__none__" ? "" : v,
                                                } as any)
                                              }
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Selecione..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__none__">Selecione...</SelectItem>
                                                {produtoSegmentoFullOptions.map((p) => (
                                                  <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nome}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        {/* L3: Valor do Projeto | Situação do Projeto */}
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Valor do Projeto (R$)
                                          </Label>
                                          <div className="mt-1">
                                            <CurrencyField
                                              value={ec.valor_projeto || 0}
                                              onChange={(v) => setEditingContractData({ ...ec, valor_projeto: v })}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Situação do Projeto
                                          </Label>
                                          <div className="mt-1">
                                            <Select
                                              value={(ec as any).situacao_projeto || "em_andamento"}
                                              onValueChange={(v) =>
                                                setEditingContractData({ ...ec, situacao_projeto: v } as any)
                                              }
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {SITUACAO_PROJETO_OPTIONS.map((opt) => (
                                                  <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        {/* L5: Reembolsos lado a lado */}
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Reembolso por KM (R$)
                                          </Label>
                                          <div className="mt-1">
                                            <CurrencyField
                                              value={ec.valor_reembolso_km || 0}
                                              onChange={(v) => setEditingContractData({ ...ec, valor_reembolso_km: v })}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                            Reembolso Refeição (R$)
                                          </Label>
                                          <div className="mt-1">
                                            <CurrencyField
                                              value={ec.valor_reembolso_refeicao || 0}
                                              onChange={(v) =>
                                                setEditingContractData({ ...ec, valor_reembolso_refeicao: v })
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-4">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa</Label>
                                        <Select value={osEditClusterFilter} onValueChange={setOsEditClusterFilter}>
                                          <SelectTrigger className="h-8 mt-1">
                                            <SelectValue placeholder="Todas as empresas" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__all__">Todas as empresas</SelectItem>
                                            {allClusters.map((c: any) => (
                                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="mt-4">
                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                          Serviço Contratado *
                                        </Label>
                                        <Select
                                          value={(ec as any).id_servico || "__none__"}
                                          onValueChange={(v) =>
                                            setEditingContractData({
                                              ...ec,
                                              id_servico: v === "__none__" ? "" : v,
                                            } as any)
                                          }
                                        >
                                          <SelectTrigger className="h-8 mt-1">
                                            <SelectValue placeholder="Selecione um serviço..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__none__">Selecione...</SelectItem>
                                            {(() => {
                                              const source = filteredEditCatalogServices;
                                              const withCluster = source.filter((s: any) => s.estrutura_clusters?.name);
                                              const withoutCluster = source.filter((s: any) => !s.estrutura_clusters?.name);
                                              const clusterGroups = withCluster.reduce((acc: Record<string, any[]>, s: any) => {
                                                const cName = s.estrutura_clusters.name;
                                                if (!acc[cName]) acc[cName] = [];
                                                acc[cName].push(s);
                                                return acc;
                                              }, {} as Record<string, any[]>);
                                              return (
                                                <>
                                                  {Object.entries(clusterGroups).sort(([a],[b]) => a.localeCompare(b)).map(([clusterName, svcs]) => (
                                                    <SelectGroup key={clusterName}>
                                                      <SelectLabel className="text-xs font-semibold text-muted-foreground">{clusterName}</SelectLabel>
                                                      {(svcs as any[]).map((svc: any) => (
                                                        <SelectItem key={svc.id} value={svc.id}>{svc.nome}</SelectItem>
                                                      ))}
                                                    </SelectGroup>
                                                  ))}
                                                  {withoutCluster.length > 0 && (
                                                    <SelectGroup>
                                                      <SelectLabel className="text-xs font-semibold text-muted-foreground">Sem cluster</SelectLabel>
                                                      {withoutCluster.map((svc: any) => (
                                                        <SelectItem key={svc.id} value={svc.id}>{svc.nome}</SelectItem>
                                                      ))}
                                                    </SelectGroup>
                                                  )}
                                                </>
                                              );
                                            })()}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="border border-dashed rounded-lg p-3 mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="text-xs font-bold text-muted-foreground uppercase">
                                            Distribuição de Receita (Centros de Custo)
                                          </h5>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="gap-1 text-xs"
                                            onClick={() =>
                                              setEditingContractData(prev => prev ? ({
                                                ...prev,
                                                distribuicao_receita: [
                                                  ...((prev as any).distribuicao_receita || []),
                                                  { id_centro_custo: "", percentual_rateio: 0 },
                                                ],
                                              } as any) : prev)
                                            }
                                          >
                                            <Plus size={12} /> Adicionar
                                          </Button>
                                        </div>
                                        {((ec as any).distribuicao_receita || []).map(
                                          (cc: { id_centro_custo: string; percentual_rateio: number }, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 mt-1">
                                              <Select
                                                value={cc.id_centro_custo || "__none__"}
                                                onValueChange={(v) => {
                                                  setEditingContractData(prev => {
                                                    if (!prev) return prev;
                                                    const updated = [...((prev as any).distribuicao_receita || [])];
                                                    updated[idx] = {
                                                      ...updated[idx],
                                                      id_centro_custo: v === "__none__" ? "" : v,
                                                    };
                                                    return { ...prev, distribuicao_receita: updated } as any;
                                                  });
                                                }}
                                              >
                                                <SelectTrigger className="h-8 flex-1">
                                                  <SelectValue placeholder="Centro de Custo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="__none__">Selecione...</SelectItem>
                                                   {CENTRO_CUSTO_OPTIONS.map((cc_opt) => (
                                                     <SelectItem key={cc_opt.id} value={cc_opt.id}>
                                                       {cc_opt.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <Input
                                                  type="number"
                                                  min={0}
                                                  max={100}
                                                  value={cc.percentual_rateio || ""}
                                                  onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setEditingContractData(prev => {
                                                      if (!prev) return prev;
                                                      const updated = [...((prev as any).distribuicao_receita || [])];
                                                      updated[idx] = { ...updated[idx], percentual_rateio: val };
                                                      return { ...prev, distribuicao_receita: updated } as any;
                                                    });
                                                  }}
                                                  className="h-8 w-20 text-right"
                                                  placeholder="%"
                                                />
                                                <span className="text-xs text-muted-foreground">%</span>
                                              </div>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 shrink-0 text-destructive"
                                                onClick={() => {
                                                  setEditingContractData(prev => {
                                                    if (!prev) return prev;
                                                    const updated = ((prev as any).distribuicao_receita || []).filter(
                                                      (_: any, i: number) => i !== idx,
                                                    );
                                                    return { ...prev, distribuicao_receita: updated } as any;
                                                  });
                                                }}
                                              >
                                                <X size={14} />
                                              </Button>
                                            </div>
                                          ),
                                        )}
                                        {((ec as any).distribuicao_receita || []).length > 0 &&
                                          (() => {
                                            const total = ((ec as any).distribuicao_receita || []).reduce(
                                              (acc: number, cc: any) => acc + (cc.percentual_rateio || 0),
                                              0,
                                            );
                                            return (
                                              <p
                                                className={cn(
                                                  "text-xs mt-2 font-medium",
                                                  total === 100
                                                    ? "text-green-600"
                                                    : total > 100
                                                      ? "text-destructive"
                                                      : "text-amber-600",
                                                )}
                                              >
                                                Total: {total.toFixed(0)}%
                                                {total < 100 && ` — Faltam ${(100 - total).toFixed(0)}%`}
                                                {total > 100 && ` — Excedeu ${(total - 100).toFixed(0)}%`}
                                                {total === 100 && " ✓"}
                                              </p>
                                            );
                                          })()}
                                      </div>
                                      {/* Observações (por último) */}
                                      <div className="mt-4">
                                        <h5 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                          Observações
                                        </h5>
                                        <Textarea
                                          value={(ec as any).observacoes_projeto || ""}
                                          onChange={(e) =>
                                            setEditingContractData({
                                              ...ec,
                                              observacoes_projeto: e.target.value,
                                            } as any)
                                          }
                                          placeholder="Insira observações relevantes sobre o projeto..."
                                          className="min-h-[60px]"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                                        <Button size="sm" variant="outline" onClick={cancelEditContract}>
                                          Cancelar
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                                            >
                                              <Save size={14} /> Salvar
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Deseja salvar as alterações feitas nesta OS?
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-teal-600 hover:bg-teal-700 text-white"
                                                onClick={saveEditContract}
                                              >
                                                Salvar
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isReadOnly && (
                          <div className="bg-muted/50 rounded-lg border p-4">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-2 mb-4">
                              Nova OS
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* L1: Data Início | Data Fim */}
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                   Data Início
                                </Label>
                                <div className="mt-1">
                                  <DateFieldWithInput
                                    value={draftContract.data_inicio_projeto}
                                    onChange={(v) => setDraftContract(prev => ({ ...prev, data_inicio_projeto: v }))}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                  Data Fim
                                </Label>
                                <div className="mt-1">
                                  <DateFieldWithInput
                                    value={draftContract.data_fim_projeto}
                                    onChange={(v) => setDraftContract(prev => ({ ...prev, data_fim_projeto: v }))}
                                  />
                                </div>
                              </div>
                              {/* L2: Data de Emissão | Tipo Produto/Segmento */}
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                   Data de Emissão
                                </Label>
                                <div className="mt-1">
                                  <DateFieldWithInput
                                    value={draftContract.data_emissao}
                                    onChange={(v) => setDraftContract(prev => ({ ...prev, data_emissao: v }))}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                  Tipo de Produto/Segmento
                                </Label>
                                <div className="mt-1">
                                  <Select
                                    value={draftContract.id_produto_segmento || "__none__"}
                                    onValueChange={(v) =>
                                      setDraftContract(prev => ({ ...prev, id_produto_segmento: v === "__none__" ? "" : v }))
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Selecione...</SelectItem>
                                      {produtoSegmentoFullOptions.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nome}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {/* L3: Valor do Projeto | Situação do Projeto */}
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                   Valor do Projeto (R$)
                                </Label>
                                <div className="mt-1">
                                  <CurrencyField
                                    value={draftContract.valor_projeto}
                                    onChange={(v) => setDraftContract(prev => ({ ...prev, valor_projeto: v }))}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                   Situação do Projeto
                                </Label>
                                <div className="mt-1">
                                  <Select
                                    value={draftContract.situacao_projeto}
                                    onValueChange={(v) => setDraftContract(prev => ({ ...prev, situacao_projeto: v }))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SITUACAO_PROJETO_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {/* L5: Reembolsos lado a lado */}
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                   Reembolso por KM (R$)
                                </Label>
                                <div className="mt-1">
                                  <CurrencyField
                                    value={draftContract.valor_reembolso_km}
                                    onChange={(v) => setDraftContract(prev => ({ ...prev, valor_reembolso_km: v }))}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                   Reembolso Refeição (R$)
                                </Label>
                                <div className="mt-1">
                                  <CurrencyField
                                    value={draftContract.valor_reembolso_refeicao}
                                    onChange={(v) =>
                                      setDraftContract(prev => ({ ...prev, valor_reembolso_refeicao: v }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            {/* L6: Empresa */}
                            <div className="mt-4">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa</Label>
                              <Select value={osClusterFilter} onValueChange={setOsClusterFilter}>
                                <SelectTrigger className="h-8 mt-1">
                                  <SelectValue placeholder="Todas as empresas" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Todas as empresas</SelectItem>
                                  {allClusters.map((c: any) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* L7: Serviço Contratado */}
                            <div className="mt-4">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                Serviço Contratado *
                              </Label>
                              <Select
                                value={draftContract.id_servico || "__none__"}
                                onValueChange={(v) =>
                                  setDraftContract(prev => ({ ...prev, id_servico: v === "__none__" ? "" : v }))
                                }
                              >
                                <SelectTrigger className="h-8 mt-1">
                                  <SelectValue placeholder="Selecione um serviço..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Selecione...</SelectItem>
                                  {(() => {
                                    const source = filteredCatalogServices;
                                    const withCluster = source.filter((s: any) => s.estrutura_clusters?.name);
                                    const withoutCluster = source.filter((s: any) => !s.estrutura_clusters?.name);
                                    const clusterGroups = withCluster.reduce((acc: Record<string, any[]>, s: any) => {
                                      const cName = s.estrutura_clusters.name;
                                      if (!acc[cName]) acc[cName] = [];
                                      acc[cName].push(s);
                                      return acc;
                                    }, {} as Record<string, any[]>);
                                    return (
                                      <>
                                        {Object.entries(clusterGroups).sort(([a],[b]) => a.localeCompare(b)).map(([clusterName, svcs]) => (
                                          <SelectGroup key={clusterName}>
                                            <SelectLabel className="text-xs font-semibold text-muted-foreground">{clusterName}</SelectLabel>
                                            {(svcs as any[]).map((svc: any) => (
                                              <SelectItem key={svc.id} value={svc.id}>{svc.nome}</SelectItem>
                                            ))}
                                          </SelectGroup>
                                        ))}
                                        {withoutCluster.length > 0 && (
                                          <SelectGroup>
                                            <SelectLabel className="text-xs font-semibold text-muted-foreground">Sem cluster</SelectLabel>
                                            {withoutCluster.map((svc: any) => (
                                              <SelectItem key={svc.id} value={svc.id}>{svc.nome}</SelectItem>
                                            ))}
                                          </SelectGroup>
                                        )}
                                      </>
                                    );
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Distribuição de Receita (Centros de Custo) */}
                            <div className="mt-4 border border-dashed rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-xs font-bold text-muted-foreground uppercase">
                                  Distribuição de Receita (Centros de Custo)
                                </h5>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs"
                                  onClick={() =>
                                    setDraftContract(prev => ({
                                      ...prev,
                                      distribuicao_receita: [...prev.distribuicao_receita, { id_centro_custo: "", percentual_rateio: 0 }],
                                    }))
                                  }
                                >
                                  <Plus size={12} /> Adicionar Centro de Custo
                                </Button>
                              </div>
                              {draftContract.distribuicao_receita.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                  Nenhum centro de custo adicionado.
                                </p>
                              )}
                              {draftContract.distribuicao_receita.map((cc, idx) => (
                                <div key={idx} className="flex items-center gap-2 mt-2">
                                  <Select
                                    value={cc.id_centro_custo || "__none__"}
                                    onValueChange={(v) => {
                                      setDraftContract(prev => {
                                        const updated = [...prev.distribuicao_receita];
                                        updated[idx] = { ...updated[idx], id_centro_custo: v === "__none__" ? "" : v };
                                        return { ...prev, distribuicao_receita: updated };
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 flex-1">
                                      <SelectValue placeholder="Centro de Custo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Selecione...</SelectItem>
                                       {CENTRO_CUSTO_OPTIONS.map((cc_opt) => (
                                         <SelectItem key={cc_opt.id} value={cc_opt.id}>
                                           {cc_opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={cc.percentual_rateio || ""}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setDraftContract(prev => {
                                          const updated = [...prev.distribuicao_receita];
                                          updated[idx] = { ...updated[idx], percentual_rateio: val };
                                          return { ...prev, distribuicao_receita: updated };
                                        });
                                      }}
                                      className="h-8 w-20 text-right"
                                      placeholder="%"
                                    />
                                    <span className="text-xs text-muted-foreground">%</span>
                                  </div>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0 text-destructive"
                                    onClick={() => {
                                      setDraftContract(prev => ({
                                        ...prev,
                                        distribuicao_receita: prev.distribuicao_receita.filter((_, i) => i !== idx),
                                      }));
                                    }}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              ))}
                              {draftContract.distribuicao_receita.length > 0 &&
                                (() => {
                                  const total = draftContract.distribuicao_receita.reduce((acc, cc) => acc + cc.percentual_rateio, 0);
                                  const faltam = 100 - total;
                                  return (
                                    <p
                                      className={cn(
                                        "text-xs mt-2 font-medium",
                                        total === 100
                                          ? "text-green-600"
                                          : total > 100
                                            ? "text-destructive"
                                            : "text-amber-600",
                                      )}
                                    >
                                      Total Distribuído: {total.toFixed(0)}%
                                      {total < 100 && ` — Faltam ${faltam.toFixed(0)}% para completar 100%`}
                                      {total > 100 && ` — Excedeu em ${(total - 100).toFixed(0)}%`}
                                      {total === 100 && " ✓"}
                                    </p>
                                  );
                                })()}
                            </div>

                            {/* L8: Observações (por último) */}
                            <div className="mt-4">
                              <h5 className="text-xs font-bold text-muted-foreground uppercase mb-2">Observações</h5>
                              <Textarea
                                value={draftContract.observacoes_projeto}
                                onChange={(e) =>
                                  setDraftContract(prev => ({ ...prev, observacoes_projeto: e.target.value }))
                                }
                                placeholder="Insira observações relevantes sobre o projeto..."
                                className="min-h-[80px]"
                              />
                            </div>

                            <div className="flex justify-end mt-4 pt-2 border-t">
                              <Button onClick={addContract} disabled={isAddingContract} className="gap-2">
                                {isAddingContract ? "Adicionando..." : "Adicionar OS à Lista"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </TabsContent>

                  {/* ====== TAB: FATURAMENTO (read-only) ====== */}
                  <TabsContent value="faturamento" className="mt-0 p-3 md:p-4">
                    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
                      <div className="px-4 py-2 bg-muted/50 border-b">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                          Dados de Faturamento
                        </h3>
                      </div>
                      {(() => {
                        const faturamentoEntity = entities.find((e) => e.contribuinte_faturamento) || entities[0];
                        if (!faturamentoEntity) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Building2 className="h-8 w-8 text-gray-300" />
                              </div>
                              <h4 className="text-base font-semibold text-gray-900 mb-2">
                                Nenhum contribuinte cadastrado
                              </h4>
                              <p className="text-gray-500 text-sm max-w-sm">
                                Os dados de faturamento serão exibidos aqui após o cadastro de um contribuinte marcado
                                para faturamento.
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                            <div className="space-y-5">
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Razão Social</dt>
                                <dd className="mt-1 text-sm font-semibold text-gray-900">
                                  {faturamentoEntity.nome_razao_social || "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">CPF / CNPJ</dt>
                                <dd className="mt-1 text-sm font-semibold text-gray-900 font-mono">
                                  {faturamentoEntity.cpf_cnpj || "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Inscrição Estadual</dt>
                                <dd className="mt-1 text-sm font-semibold text-gray-900">
                                  {faturamentoEntity.inscricao_estadual || "Isento"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                                <dd className="mt-1 text-sm font-semibold text-gray-900">
                                  {faturamentoEntity.telefone || "—"}
                                </dd>
                              </div>
                            </div>
                            <div className="space-y-5">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">CEP</dt>
                                  <dd className="mt-1 text-sm font-semibold text-gray-900 font-mono">
                                    {faturamentoEntity.cep || "—"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-sm font-medium text-gray-500">Número</dt>
                                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                                    {faturamentoEntity.numero || "—"}
                                  </dd>
                                </div>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                                <dd className="mt-1 text-sm font-semibold text-gray-900">
                                  {faturamentoEntity.logradouro}
                                  {faturamentoEntity.complemento ? `, ${faturamentoEntity.complemento}` : ""}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Bairro</dt>
                                <dd className="mt-1 text-sm font-semibold text-gray-900">
                                  {faturamentoEntity.bairro || "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Cidade / UF</dt>
                                <dd className="mt-1 text-sm font-semibold text-gray-900">
                                  {faturamentoEntity.municipio || "—"}
                                  {faturamentoEntity.uf ? ` / ${faturamentoEntity.uf}` : ""}
                                </dd>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </section>
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              {/* Footer — Stich style */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0">
                <div>
                  {!isFirstTab && (
                    <Button variant="outline" onClick={handleBack} className="gap-2 border-gray-300 text-gray-600">
                      <ChevronLeft size={16} /> Voltar
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  {isReadOnly ? (
                    !isLastTab && (
                      <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                        Avançar <ChevronRight size={16} />
                      </Button>
                    )
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">
                        Cancelar
                      </Button>
                      {!isLastTab && (
                        <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                          Avançar <ChevronRight size={16} />
                        </Button>
                      )}
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        variant={isLastTab ? "default" : "outline"}
                        className={isLastTab
                          ? "bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-lg shadow-teal-600/20"
                          : "border-teal-600 text-teal-700 hover:bg-teal-50 gap-2"
                        }
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={20} />}
                        {isEditing ? "Salvar Alterações" : "Confirmar Dados"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Exit confirmation AlertDialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dados não salvos</AlertDialogTitle>
            <AlertDialogDescription>Você tem dados não salvos. Deseja sair sem salvar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={resetAndClose}
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Draft not added warning AlertDialog */}
      <AlertDialog open={showDraftWarning} onOpenChange={setShowDraftWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dados não adicionados à lista</AlertDialogTitle>
            <AlertDialogDescription>
              Você preencheu dados em <strong>{draftWarningContext?.pendingTabs.join(", ")}</strong> que não foram adicionados à lista.
              {draftWarningContext?.action === "save"
                ? " Deseja salvar mesmo assim ou voltar para adicioná-los?"
                : " Deseja continuar sem adicionar ou voltar para adicioná-los?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDraftWarningGoBack}>
              Voltar e adicionar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDraftWarningContinue}>
              {draftWarningContext?.action === "save" ? "Salvar mesmo assim" : "Continuar sem adicionar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
