import { useState, useEffect, useMemo, useRef } from "react";
import { useClientFormOptions } from "@/hooks/useClientFormOptions";
import { useClientEditData } from "@/hooks/useClientEditData";
import { useExternalConsults } from "@/hooks/useExternalConsults";
import { useSaveClientTransaction, generateNextOsNumber } from "@/hooks/useSaveClientTransaction";

import { useAuth } from "@/contexts/AuthContext";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { isProductionEnvironment } from "@/config/api";
import type { DraftEntity, DraftParticipant, DraftOrdemServico, DraftContract, InscricaoIE } from "@/types/clientForm";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  X,
  Building2,
  Loader2,
  CheckCircle2,
  Pencil,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
 import { cn } from "@/lib/utils";
 import { toast } from "sonner";
import { FaturamentoTab } from "./client-form/FaturamentoTab";
import { ClienteTab } from "./client-form/ClienteTab";
import { ParticipantesTab } from "./client-form/ParticipantesTab";
import { ContribuintesTab } from "./client-form/ContribuintesTab";
import { ContratosTab } from "./client-form/ContratosTab";

const clienteTable = isProductionEnvironment ? "cliente" : "cliente_dev";
const contribuinteTable = isProductionEnvironment ? "contribuinte" : "contribuinte_dev";
const participanteTable = isProductionEnvironment ? "participante" : "participante_dev";

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
  const { consultarCnpj, consultarCep } = useExternalConsults();
  const { checkDuplicateName, saveClient } = useSaveClientTransaction();
  const [saving, setSaving] = useState(false);
  const [showDuplicateNameAlert, setShowDuplicateNameAlert] = useState(false);
  
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
  const hasDraftContractData = () => !!((draftContract.valor_projeto && draftContract.valor_projeto > 0) || draftContract.id_servico?.trim());

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

  // Dictionary data from dedicated hook
  const { lideres, catalogServices, allClusters, empresas, produtoSegmentoOptions, produtoSegmentoFullOptions, CENTRO_CUSTO_OPTIONS, PRODUTO_SEGMENTO_OPTIONS } = useClientFormOptions();

  // Edit data from dedicated hook
  const editData = useClientEditData(editingClienteId ?? null, open && !!editingClienteId);

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

  const filteredCatalogServices = useMemo(() => {
    if (osClusterFilter === "__all__") return catalogServices;
    return catalogServices.filter((s: any) => s.cluster_id === osClusterFilter);
  }, [catalogServices, osClusterFilter]);

  const filteredEditCatalogServices = useMemo(() => {
    if (osEditClusterFilter === "__all__") return catalogServices;
    return catalogServices.filter((s: any) => s.cluster_id === osEditClusterFilter);
  }, [catalogServices, osEditClusterFilter]);
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
    if (open && !editData.isLoading) {
      const t = setTimeout(() => {
        initialSnapshotRef.current = JSON.stringify({ clientData, entities, participants, contracts });
      }, 100);
      return () => clearTimeout(t);
    }
    if (!open) {
      initialSnapshotRef.current = null;
    }
  }, [open, editData.isLoading]);

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

  // Sync edit data into local state
  useEffect(() => {
    if (!editData.clientData) return;
    setClientData(editData.clientData);
    setEntities(editData.entities);
    setInscricoesMap(editData.inscricoesMap);
    setParticipants(editData.participants);
    setContracts(editData.contracts);
  }, [editData.clientData, editData.entities, editData.inscricoesMap, editData.participants, editData.contracts]);

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


  // --- ENTITY HANDLERS ---
  // --- CNPJ FETCH ---
  const handleCnpjBlur = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setCnpjLoading(true);
    try {
      const data = await consultarCnpj(digits);
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
      const data = await consultarCep(digits);
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
    if (!draftContract.id_servico) {
      toast.error("Selecione um Serviço Contratado");
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
      const data = await consultarCnpj(digits);
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
      const data = await consultarCep(digits);
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

    // Pre-validation: distribuicao_receita UUIDs and percentage sums
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

    // Duplicate name check (only on creation)
    if (!isEditing) {
      const isDuplicate = await checkDuplicateName(clientData.nome.trim());
      if (isDuplicate) {
        setShowDuplicateNameAlert(true);
        return;
      }
    }

    doSave();
  };

  const doSave = () => {
    setSaving(true);
    saveClient.mutate(
      {
        clientData,
        entities,
        inscricoesMap,
        participants,
        contracts,
        isEditing,
        editingClienteId,
      },
      {
        onSuccess: () => {
          toast.success(isEditing ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
          resetAndClose();
        },
        onError: (err) => {
          toast.error(`Erro ao ${isEditing ? "atualizar" : "cadastrar"} cliente: ${err.message}`);
        },
        onSettled: () => setSaving(false),
      },
    );
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

          {editData.isLoading ? (
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
                    <ClienteTab
                      clientData={clientData}
                      setClientData={setClientData}
                      isReadOnly={isReadOnly}
                    />
                  </TabsContent>

                  <TabsContent value="contribuintes" className="mt-0 p-3 md:p-4">
                    <ContribuintesTab
                      entities={entities}
                      setEntities={setEntities}
                      draftEntity={draftEntity}
                      setDraftEntity={setDraftEntity}
                      inscricoesMap={inscricoesMap}
                      setInscricoesMap={setInscricoesMap}
                      draftInscricoes={draftInscricoes}
                      setDraftInscricoes={setDraftInscricoes}
                      expandedEntityId={expandedEntityId}
                      setExpandedEntityId={setExpandedEntityId}
                      editingEntityId={editingEntityId}
                      editingEntityData={editingEntityData}
                      setEditingEntityData={setEditingEntityData}
                      cnpjLoading={cnpjLoading}
                      cepLoading={cepLoading}
                      onAdd={addEntity}
                      onCnpjBlur={handleCnpjBlur}
                      onCepBlur={handleCepBlur}
                      onInlineCnpjBlur={handleInlineCnpjBlur}
                      onInlineCepBlur={handleInlineCepBlur}
                      onStartEdit={startEditEntity}
                      onCancelEdit={cancelEditEntity}
                      onSaveEdit={saveEditEntity}
                      onCopyFirstAddress={handleCopyFirstAddress}
                      isReadOnly={isReadOnly}
                    />
                  </TabsContent>

                  <TabsContent value="participantes" className="mt-0 p-3 md:p-4">
                    <ParticipantesTab
                      participants={participants}
                      setParticipants={setParticipants}
                      draftParticipant={draftParticipant}
                      setDraftParticipant={setDraftParticipant}
                      expandedParticipantId={expandedParticipantId}
                      setExpandedParticipantId={setExpandedParticipantId}
                      editingParticipantId={editingParticipantId}
                      editingParticipantData={editingParticipantData}
                      setEditingParticipantData={setEditingParticipantData}
                      onAdd={addParticipant}
                      onStartEdit={startEditParticipant}
                      onCancelEdit={cancelEditParticipant}
                      onSaveEdit={saveEditParticipant}
                      isReadOnly={isReadOnly}
                    />
                  </TabsContent>

                  <TabsContent value="contratos" className="mt-0 p-3 md:p-4">
                    <ContratosTab
                      contracts={contracts}
                      setContracts={setContracts}
                      draftContract={draftContract}
                      setDraftContract={setDraftContract}
                      expandedContractId={expandedContractId}
                      setExpandedContractId={setExpandedContractId}
                      editingContractId={editingContractId}
                      editingContractData={editingContractData}
                      setEditingContractData={setEditingContractData}
                      osClusterFilter={osClusterFilter}
                      setOsClusterFilter={setOsClusterFilter}
                      osEditClusterFilter={osEditClusterFilter}
                      setOsEditClusterFilter={setOsEditClusterFilter}
                      isAddingContract={isAddingContract}
                      onAdd={addContract}
                      onStartEdit={startEditContract}
                      onCancelEdit={cancelEditContract}
                      onSaveEdit={saveEditContract}
                      catalogServices={catalogServices}
                      filteredCatalogServices={filteredCatalogServices}
                      filteredEditCatalogServices={filteredEditCatalogServices}
                      allClusters={allClusters}
                      produtoSegmentoFullOptions={produtoSegmentoFullOptions}
                      CENTRO_CUSTO_OPTIONS={CENTRO_CUSTO_OPTIONS}
                      isReadOnly={isReadOnly}
                    />
                  </TabsContent>

                  {/* ====== TAB: FATURAMENTO (read-only) ====== */}
                  <TabsContent value="faturamento" className="mt-0 p-3 md:p-4">
                    <FaturamentoTab entities={entities} />
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

      {/* Duplicate name warning */}
      <AlertDialog open={showDuplicateNameAlert} onOpenChange={setShowDuplicateNameAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nome duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cliente com o nome &quot;{clientData.nome.trim()}&quot;. Deseja cadastrar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDuplicateNameAlert(false); doSave(); }}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
