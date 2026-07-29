import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useSetoresCliente } from "@/hooks/useSetorCliente";
import { useClientFormOptions } from "@/hooks/useClientFormOptions";
import { useClientEditData } from "@/hooks/useClientEditData";
import { useExternalConsults } from "@/hooks/useExternalConsults";
import { useSaveClientTransaction } from "@/hooks/useSaveClientTransaction";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, X, Loader2, CheckCircle2, Pencil, Building2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraftEntity, InscricaoIE, DraftRepresentante, DraftContract, NewClientModalProps } from "@/types/clientForm";
import { defaultClientData } from "./client-form/constants";
import { OS_SITUACAO_TO_PROJECT_STATUS } from "@/lib/projetosCadastro";
import type { LoteFromOs } from "@/lib/projetosLote";

import ClienteTab from "./client-form/ClienteTab";
import ContribuintesTab from "./client-form/ContribuintesTab";
import RepresentantesTab from "./client-form/RepresentantesTab";
import ContratosTab from "./client-form/ContratosTab";
import FaturamentoTab from "./client-form/FaturamentoTab";
import HistoricoTab from "./client-form/HistoricoTab";

export default function NewClientModal({
  open, onOpenChange, editingClienteId, readOnly = false, canEdit = true,
}: NewClientModalProps) {
  const { user, isAdmin, isLider } = useAuth();
  const navigate = useNavigate();

  // Duplicate confirm state (replaces window.confirm)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const pendingDuplicateResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const onDuplicateFound = useCallback((name: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setDuplicateName(name);
      pendingDuplicateResolveRef.current = resolve;
      setShowDuplicateConfirm(true);
    });
  }, []);

  const [activeTab, setActiveTab] = useState<"cliente" | "contribuintes" | "representantes" | "contratos" | "faturamento" | "historico">("cliente");
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => { if (open) setIsReadOnly(readOnly); }, [open, readOnly]);


  const isEditing = !!editingClienteId;
  const canViewFinancialTabs = isAdmin || isLider;
  const visibleTabs = canViewFinancialTabs
    ? (["cliente", "contribuintes", "representantes", "contratos", "faturamento"] as const)
    : (["cliente", "contribuintes", "representantes"] as const);
  const tabsGridClass = editingClienteId
    ? canViewFinancialTabs ? "grid-cols-6" : "grid-cols-4"
    : canViewFinancialTabs ? "grid-cols-5" : "grid-cols-3";

  // --- Hooks ---
  const { catalogServices, allClusters, PRODUTO_SEGMENTO_OPTIONS, CENTRO_CUSTO_OPTIONS, produtoSegmentoFullOptions, lideres } = useClientFormOptions();
  const { data: setoresCliente = [] } = useSetoresCliente();

  // --- State ---
  const [clientData, setClientData] = useState(defaultClientData);
  const [entities, setEntities] = useState<DraftEntity[]>([]);
  const [participants, setParticipants] = useState<DraftRepresentante[]>([]);
  const [contracts, setContracts] = useState<DraftContract[]>([]);
  const [inscricoesMap, setInscricoesMap] = useState<Record<string, InscricaoIE[]>>({});

  // Load existing data when editing
  const editSetters = useMemo(() => ({ setClientData, setEntities, setParticipants, setContracts, setInscricoesMap }), []);
  const { loadingEdit, originalSnapshot } = useClientEditData(open, editingClienteId, editSetters);

  // External consults
  const { handleCnpjBlur: cnpjLookup, handleCepBlur: cepLookup, cnpjLoading, cepLoading } = useExternalConsults();

  // Edição inline em andamento (linha "Editar" de um contribuinte existente).
  const [inlineEditingContrib, setInlineEditingContrib] = useState(false);

  const handleTabClick = (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  // --- Unsaved changes detection ---
  const initialSnapshotRef = useRef<string | null>(null);
  const currentSnapshot = useMemo(() => JSON.stringify({ clientData, entities, participants, contracts }), [clientData, entities, participants, contracts]);
  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return currentSnapshot !== initialSnapshotRef.current;
  }, [currentSnapshot]);

  useEffect(() => {
    if (open && !loadingEdit) {
      const t = setTimeout(() => { initialSnapshotRef.current = JSON.stringify({ clientData, entities, participants, contracts }); }, 100);
      return () => clearTimeout(t);
    }
    if (!open) initialSnapshotRef.current = null;
  }, [open, loadingEdit]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Draft persistence
  const draftValues = useMemo(() => ({ clientData, entities, participants, contracts, inscricoesMap }), [clientData, entities, participants, contracts, inscricoesMap]);
  const draftEnabled = open && !isEditing;
  const { restore: restoreDraft, clear: clearDraft } = useDraftPersistence("newclient-form-draft", draftValues, draftEnabled, user?.id);

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

  // --- SAVE ---
  const { executeSave, saving } = useSaveClientTransaction({
    clientData, entities, participants, contracts, inscricoesMap,
    clusterIds: clientData.cluster_ids,
    isEditing, editingClienteId, setoresCliente,
    onDuplicateFound,
    onSuccess: () => resetAndClose(),
    originalSnapshot,
  });

  const handleSave = () => {
    executeSave();
  };

  const resetAndClose = () => {
    setClientData({ ...defaultClientData });
    setEntities([]);
    setParticipants([]);
    setContracts([]);
    setInscricoesMap({});
    setActiveTab("cliente");
    setIsReadOnly(readOnly);
    setShowExitConfirm(false);
    clearDraft();
    onOpenChange(false);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) setShowExitConfirm(true);
    else resetAndClose();
  };

  // --- Criar projetos (1 por produto) a partir de uma OS já persistida ---
  const [pendingLoteState, setPendingLoteState] = useState<LoteFromOs | null>(null);
  const [showCreateProjectConfirm, setShowCreateProjectConfirm] = useState(false);

  const buildLoteState = (cont: DraftContract): LoteFromOs | null => {
    // Só é possível a partir de uma OS já salva (com id no banco) de um cliente existente.
    if (!cont._dbId || !editingClienteId) return null;
    const produtos = (cont.produtos_contratados || []).map((pc) => {
      const option = produtoSegmentoFullOptions.find((o) => o.id === pc.produto_segmento_id);
      return {
        produtoSegmentoId: pc.produto_segmento_id,
        produtoLabel: option ? `${option.codigo} — ${option.nome}` : pc.produto_segmento_id,
      };
    });
    if (produtos.length === 0) return null;
    return {
      clientId: editingClienteId,
      clientName: clientData.nome?.trim() || "",
      ordemServicoId: cont._dbId,
      osNumero: cont.ordem_servico,
      startDate: cont.data_inicio_projeto || "",
      endDate: cont.data_fim_projeto || "",
      status: OS_SITUACAO_TO_PROJECT_STATUS[cont.situacao_projeto] || "active",
      description: cont.observacoes_projeto || "",
      produtos,
    };
  };

  const navigateToLote = (loteState: LoteFromOs) => {
    onOpenChange(false);
    navigate("/equipe/tax/projetos/cadastro-lote", { state: { loteFromOs: loteState } });
  };

  const handleCreateProjectFromOs = (cont: DraftContract) => {
    const loteState = buildLoteState(cont);
    if (!loteState) return;
    if (hasUnsavedChanges) {
      setPendingLoteState(loteState);
      setShowCreateProjectConfirm(true);
      return;
    }
    navigateToLote(loteState);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleAttemptClose(); }}>
        <DialogContent className={cn("max-w-5xl h-[95vh] p-0 flex flex-col overflow-hidden gap-0", "[&>button]:hidden")} onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">{isEditing ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
          <DialogDescription className="sr-only">Formulário de cadastro de cliente com contribuintes, representantes e contratos</DialogDescription>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-teal-600/10 p-2 rounded-lg">
                {isReadOnly ? <Building2 className="text-teal-600" size={22} /> : isEditing ? <Pencil className="text-teal-600" size={22} /> : <Plus className="text-teal-600" size={22} />}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{isReadOnly ? "Visualizar Cliente" : isEditing ? "Editar Cliente" : "Cadastrar Cliente"}</h2>
            </div>
              <button onClick={handleAttemptClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
          </div>

          {loadingEdit ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={(v) => handleTabClick(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-200 shrink-0">
                  <TabsList className={cn("w-full grid bg-gray-100/80 p-1 rounded-lg h-auto", tabsGridClass)}>
                    {visibleTabs.map((tab) => (
                      <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all">
                        {tab === "cliente"
                          ? "Dados do Cliente/Grupo"
                          : tab === "contribuintes"
                            ? `Contribuintes (${entities.length})`
                            : tab === "representantes"
                              ? `Representantes (${participants.length})`
                              : tab === "contratos"
                                ? `OS - Ordem de Serviço (${contracts.length})`
                                : "Faturamento"}
                      </TabsTrigger>
                    ))}
                    {editingClienteId && (
                      <TabsTrigger value="historico" className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all gap-1">
                        <History size={14} /> Histórico
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <TabsContent value="cliente" className="mt-0 p-3 md:p-4">
                    <ClienteTab clientData={clientData} setClientData={setClientData} isReadOnly={isReadOnly} allClusters={allClusters} />
                  </TabsContent>

                  <TabsContent value="contribuintes" className="mt-0 p-3 md:p-4">
                    <ContribuintesTab
                      entities={entities} setEntities={setEntities}
                      inscricoesMap={inscricoesMap} setInscricoesMap={setInscricoesMap}
                      cnpjLoading={cnpjLoading} cepLoading={cepLoading}
                      cnpjLookup={cnpjLookup} cepLookup={cepLookup}
                      isReadOnly={isReadOnly}
                      onInlineEditingChange={setInlineEditingContrib}
                    />
                  </TabsContent>

                  <TabsContent value="representantes" className="mt-0 p-3 md:p-4">
                    <RepresentantesTab
                      participants={participants} setParticipants={setParticipants}
                      isReadOnly={isReadOnly}
                    />
                  </TabsContent>

                  {canViewFinancialTabs && (
                    <>
                      <TabsContent value="contratos" className="mt-0 p-3 md:p-4">
                        <ContratosTab
                          contracts={contracts} setContracts={setContracts}
                          isReadOnly={isReadOnly}
                          produtoSegmentoFullOptions={produtoSegmentoFullOptions}
                          allClusters={allClusters}
                          CENTRO_CUSTO_OPTIONS={CENTRO_CUSTO_OPTIONS}
                          setoresCliente={setoresCliente}
                          onCreateProjectFromOs={editingClienteId ? handleCreateProjectFromOs : undefined}
                          onRequestEditMode={canEdit ? () => setIsReadOnly(false) : undefined}
                        />
                      </TabsContent>

                      <TabsContent value="faturamento" className="mt-0 p-3 md:p-4">
                        <FaturamentoTab entities={entities} />
                      </TabsContent>
                    </>
                  )}

                  {editingClienteId && (
                    <TabsContent value="historico" className="mt-0 p-3 md:p-4">
                      <HistoricoTab clienteId={editingClienteId} entities={entities} participants={participants} contracts={contracts} />
                    </TabsContent>
                  )}
                </ScrollArea>
              </Tabs>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center shrink-0">
              {isReadOnly ? (
                  <>
                    <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">Fechar</Button>
                    {canEdit && (
                      <Button onClick={() => setIsReadOnly(false)} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-lg shadow-teal-600/20">
                        <Pencil size={16} /> Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">Cancelar</Button>
                    <div className="flex items-center gap-3">
                      {hasUnsavedChanges && (
                        <span className="flex items-center gap-1.5 text-sm text-amber-700">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Alterações não salvas
                        </span>
                      )}
                      <Button
                        onClick={handleSave} disabled={saving}
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-lg shadow-teal-600/20"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={20} />}
                        {isEditing ? "Salvar Alterações" : "Salvar Cliente"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Exit confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Dados não salvos</AlertDialogTitle><AlertDialogDescription>Você tem dados não salvos. Deseja sair sem salvar?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={resetAndClose}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Criar projetos a partir da OS — confirmação quando há alterações não salvas */}
      <AlertDialog open={showCreateProjectConfirm} onOpenChange={(v) => { if (!v) { setShowCreateProjectConfirm(false); setPendingLoteState(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas neste cadastro. Ao criar os projetos você será levado para a tela de criação em lote e essas alterações serão descartadas. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowCreateProjectConfirm(false); setPendingLoteState(null); }}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingLoteState) navigateToLote(pendingLoteState); }}>Descartar e criar projetos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate confirmation */}
      <AlertDialog open={showDuplicateConfirm} onOpenChange={(v) => {
        if (!v) { pendingDuplicateResolveRef.current?.(false); pendingDuplicateResolveRef.current = null; setShowDuplicateConfirm(false); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cliente duplicado</AlertDialogTitle>
            <AlertDialogDescription>Já existe um cliente com o nome <strong>"{duplicateName}"</strong>. Deseja cadastrar mesmo assim?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { pendingDuplicateResolveRef.current?.(false); pendingDuplicateResolveRef.current = null; setShowDuplicateConfirm(false); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { pendingDuplicateResolveRef.current?.(true); pendingDuplicateResolveRef.current = null; setShowDuplicateConfirm(false); }}>Cadastrar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
