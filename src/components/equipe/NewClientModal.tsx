import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { Plus, X, CheckCircle2, Pencil, Building2, History, AlertCircle } from "lucide-react";
import { AreaLoader } from "@/components/equipe/AreaLoader";
import { cn } from "@/lib/utils";
import type { DraftEntity, InscricaoIE, DraftRepresentante, DraftContract, NewClientModalProps } from "@/types/clientForm";
import { defaultClientData } from "./client-form/constants";
import { AcentoAreaProvider, acentoDaArea } from "./client-form/acentoArea";
import {
  mapearPendencias,
  pendenciasCliente,
  pendenciasContribuinte,
  pendenciasDocumentosRepetidos,
  pendenciasOrdemServico,
  pendenciasRepresentante,
  type AbaCadastro,
  type FocoPendencia,
  type Pendencia,
} from "@/lib/camposObrigatorios";

import ClienteTab from "./client-form/ClienteTab";
import ContribuintesTab from "./client-form/ContribuintesTab";
import RepresentantesTab from "./client-form/RepresentantesTab";
import ContratosTab from "./client-form/ContratosTab";
import FaturamentoTab from "./client-form/FaturamentoTab";
import HistoricoTab from "./client-form/HistoricoTab";

export default function NewClientModal({
  open, onOpenChange, editingClienteId, readOnly = false, canEdit = true, area,
}: NewClientModalProps) {
  const { user, isAdmin, isLider } = useAuth();
  // O modal e quem monta o provedor, entao nao pode consumir o contexto dele.
  const acento = acentoDaArea(area);

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
  /** O que confirmar o descarte deve fazer: fechar o modal ou só sair da edição. */
  const [descarteFecha, setDescarteFecha] = useState(true);
  /**
   * O que a sessão de edição em curso libera.
   *
   * `'cliente'` é o "Editar" do rodapé: destrava tudo. `'item'` é o "Editar" de
   * uma linha de OS ou de contribuinte: destrava só aquela linha, e as outras
   * abas seguem em leitura. Sem essa distinção, abrir uma OS para conferir um
   * valor deixava o cadastro inteiro editável sem avisar.
   */
  const [escopoEdicao, setEscopoEdicao] = useState<'cliente' | 'item' | null>(null);
  /** Bump força o recarregamento do cliente sem fechar o modal (após salvar). */
  const [reloadKey, setReloadKey] = useState(0);
  /**
   * O consultor já tentou salvar nesta sessão de edição.
   *
   * As marcas de campo obrigatório só aparecem depois disso. Antes, a tela fica
   * limpa: pintar de vermelho um cadastro que a pessoa acabou de começar é
   * castigá-la por ainda não ter chegado no campo.
   */
  const [tentouSalvar, setTentouSalvar] = useState(false);
  /** Item que o aviso do rodapé mandou abrir. */
  const [foco, setFoco] = useState<{ aba: AbaCadastro; pedido: FocoPendencia } | null>(null);

  useEffect(() => {
    if (open) {
      setIsReadOnly(readOnly);
      setEscopoEdicao(readOnly ? null : 'cliente');
    }
  }, [open, readOnly]);


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
  const { loadingEdit, originalSnapshot } = useClientEditData(open, editingClienteId, editSetters, reloadKey);

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
    onSuccess: () => voltarParaLeitura(),
    originalSnapshot,
  });

  const handleSave = () => {
    setTentouSalvar(true);
    executeSave();
  };

  /**
   * Onde faltam campos obrigatórios, para a tela poder apontar.
   *
   * Roda sempre, mas só é exibido depois da primeira tentativa de salvar. Quem
   * decide se o salvamento acontece continua sendo `clientFormValidation`; isto
   * aqui só localiza a falta, e há teste garantindo que os dois não divirjam.
   */
  const pendencias = useMemo<Pendencia[]>(() => {
    const todas = [
      ...pendenciasCliente(clientData),
      ...entities.flatMap((e) => pendenciasContribuinte(e, inscricoesMap[e._dbId || String(e._id)] || [])),
      ...pendenciasDocumentosRepetidos(entities),
      ...participants.flatMap(pendenciasRepresentante),
      ...contracts.flatMap(pendenciasOrdemServico),
    ];
    // Contar uma falta de OS para quem não enxerga a aba de OS seria mandar a
    // pessoa procurar um campo que a tela não mostra.
    return canViewFinancialTabs ? todas : todas.filter((p) => p.aba !== 'contratos');
  }, [clientData, entities, inscricoesMap, participants, contracts, canViewFinancialTabs]);

  const mapaPendencias = useMemo(
    () => (tentouSalvar ? mapearPendencias(pendencias) : null),
    [tentouSalvar, pendencias],
  );

  /** Abre a aba e o item da falta, a partir do aviso do rodapé. */
  const irParaPendencia = (p: Pendencia) => {
    setActiveTab(p.aba);
    setFoco(p.itemId != null ? { aba: p.aba, pedido: { itemId: p.itemId } } : null);
  };

  /** O pedido de foco só vale para a aba de onde ele veio. */
  const focoDa = (aba: AbaCadastro) => (foco?.aba === aba ? foco.pedido : null);

  /**
   * Depois de salvar (ou de cancelar) a edição de um cliente que já existe, o
   * modal fica aberto e volta para a visualização, na mesma aba. Antes ele
   * fechava, e conferir o que acabou de ser gravado exigia reabrir o cliente.
   *
   * Cadastro novo não tem visualização para onde voltar: nesse caso fecha, que é
   * o comportamento de sempre.
   */
  const voltarParaLeitura = () => {
    if (!isEditing) {
      resetAndClose();
      return;
    }
    clearDraft();
    setInlineEditingContrib(false);
    setEscopoEdicao(null);
    setIsReadOnly(true);
    setTentouSalvar(false);
    setFoco(null);
    // Relê do banco: sem isto a visualização mostraria o rascunho local, e o
    // aviso de "alterações não salvas" ficaria aceso contra um snapshot velho.
    setReloadKey((k) => k + 1);
  };

  const resetAndClose = () => {
    setClientData({ ...defaultClientData });
    setEntities([]);
    setParticipants([]);
    setContracts([]);
    setInscricoesMap({});
    setActiveTab("cliente");
    setIsReadOnly(readOnly);
    setEscopoEdicao(readOnly ? null : 'cliente');
    setShowExitConfirm(false);
    setTentouSalvar(false);
    setFoco(null);
    clearDraft();
    onOpenChange(false);
  };

  /** "Cancelar" da edição: descarta e volta para a visualização, sem fechar. */
  const handleCancelarEdicao = () => {
    if (hasUnsavedChanges) {
      setDescarteFecha(false);
      setShowExitConfirm(true);
    } else voltarParaLeitura();
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setDescarteFecha(true);
      setShowExitConfirm(true);
    } else resetAndClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleAttemptClose(); }}>
        {/*
          Clicar fora fecha, passando pela mesma guarda do "Cancelar": com
          alterações pendentes aparece a confirmação, sem elas fecha direto.
          Antes o clique era simplesmente ignorado, e a única saída era o botão.
        */}
        <DialogContent
          className={cn("max-w-7xl h-[95vh] p-0 flex flex-col overflow-hidden gap-0", "[&>button]:hidden", acento.fundoModal)}
          onInteractOutside={(e) => { e.preventDefault(); handleAttemptClose(); }}
        >
          <AcentoAreaProvider area={area}>
          <DialogTitle className="sr-only">{isEditing ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
          <DialogDescription className="sr-only">Formulário de cadastro de cliente com contribuintes, representantes e contratos</DialogDescription>

          {/* Header. Sem fundo próprio: quem pinta é o modal, e assim a folha
              quente da OSG atravessa a barra inteira em vez de virar uma faixa
              branca no topo. */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", acento.positivoFundo)}>
                {isReadOnly ? <Building2 className={acento.texto} size={22} /> : isEditing ? <Pencil className={acento.texto} size={22} /> : <Plus className={acento.texto} size={22} />}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{isReadOnly ? "Visualizar Cliente" : isEditing ? "Editar Cliente" : "Cadastrar Cliente"}</h2>
            </div>
              <button onClick={handleAttemptClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
          </div>

          {loadingEdit ? (
            <div className={cn("flex-1 flex items-center justify-center", acento.texto)}><AreaLoader area={area} size={64} /></div>
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={(v) => handleTabClick(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
                {/* Escurecimento neutro em vez de cinza fixo: funciona igual
                    sobre o branco da Tax e sobre a folha quente da OSG. */}
                <div className="px-6 py-3 bg-black/[0.02] border-b border-gray-200 shrink-0">
                  <TabsList className={cn("w-full grid bg-black/[0.04] p-1 rounded-lg h-auto", tabsGridClass)}>
                    {visibleTabs.map((tab) => (
                      <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 rounded-md py-2 text-xs font-medium transition-all gap-1.5">
                        {tab === "cliente"
                          ? "Dados do Cliente/Grupo"
                          : tab === "contribuintes"
                            ? `Contribuintes (${entities.length})`
                            : tab === "representantes"
                              ? `Representantes (${participants.length})`
                              : tab === "contratos"
                                ? `OS - Ordem de Serviço (${contracts.length})`
                                : "Faturamento"}
                        {/* O ponto diz em qual aba está a falta sem obrigar a
                            abrir uma por uma até achar. */}
                        {mapaPendencias?.abas.has(tab as AbaCadastro) && (
                          <span
                            title="Campos obrigatórios em falta nesta aba"
                            aria-label="Campos obrigatórios em falta nesta aba"
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
                          />
                        )}
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
                  <TabsContent value="cliente" className="mt-0 p-3 md:p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                    <ClienteTab
                      clientData={clientData} setClientData={setClientData}
                      isReadOnly={isReadOnly} allClusters={allClusters}
                      camposPendentes={mapaPendencias?.camposPorItem.get(0)}
                      secoesPendentes={mapaPendencias?.secoesPorItem.get(0)}
                    />
                  </TabsContent>

                  <TabsContent value="contribuintes" className="mt-0 p-3 md:p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                    <ContribuintesTab
                      entities={entities} setEntities={setEntities}
                      inscricoesMap={inscricoesMap} setInscricoesMap={setInscricoesMap}
                      cnpjLoading={cnpjLoading} cepLoading={cepLoading}
                      cnpjLookup={cnpjLookup} cepLookup={cepLookup}
                      isReadOnly={isReadOnly}
                      escopoEdicao={escopoEdicao}
                      entidadesOriginais={originalSnapshot?.entities}
                      pendencias={mapaPendencias}
                      foco={focoDa('contribuintes')}
                      cadastroNovo={!isEditing}
                      onInlineEditingChange={setInlineEditingContrib}
                      onRequestItemEdit={canEdit ? () => { setIsReadOnly(false); setEscopoEdicao('item'); } : undefined}
                    />
                  </TabsContent>

                  <TabsContent value="representantes" className="mt-0 p-3 md:p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                    <RepresentantesTab
                      participants={participants} setParticipants={setParticipants}
                      isReadOnly={isReadOnly}
                      escopoEdicao={escopoEdicao}
                      representantesOriginais={originalSnapshot?.participants}
                      pendencias={mapaPendencias}
                      foco={focoDa('representantes')}
                      cadastroNovo={!isEditing}
                      onRequestItemEdit={canEdit ? () => { setIsReadOnly(false); setEscopoEdicao('item'); } : undefined}
                    />
                  </TabsContent>

                  {canViewFinancialTabs && (
                    <>
                      <TabsContent value="contratos" className="mt-0 p-3 md:p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                        <ContratosTab
                          contracts={contracts} setContracts={setContracts}
                          isReadOnly={isReadOnly}
                          produtoSegmentoFullOptions={produtoSegmentoFullOptions}
                          allClusters={allClusters}
                          CENTRO_CUSTO_OPTIONS={CENTRO_CUSTO_OPTIONS}
                          setoresCliente={setoresCliente}
                          escopoEdicao={escopoEdicao}
                          onRequestItemEdit={canEdit ? () => { setIsReadOnly(false); setEscopoEdicao('item'); } : undefined}
                          contratosOriginais={originalSnapshot?.contracts}
                          pendencias={mapaPendencias}
                          foco={focoDa('contratos')}
                          cadastroNovo={!isEditing}
                        />
                      </TabsContent>

                      <TabsContent value="faturamento" className="mt-0 p-3 md:p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                        <FaturamentoTab entities={entities} />
                      </TabsContent>
                    </>
                  )}

                  {editingClienteId && (
                    <TabsContent value="historico" className="mt-0 p-3 md:p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
                      <HistoricoTab clienteId={editingClienteId} entities={entities} participants={participants} contracts={contracts} />
                    </TabsContent>
                  )}
                </ScrollArea>
              </Tabs>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center shrink-0">
              {isReadOnly ? (
                  <>
                    <Button variant="outline" onClick={handleAttemptClose} className="border-gray-300 text-gray-600">Fechar</Button>
                    {canEdit && (
                      <Button
                        onClick={() => { setIsReadOnly(false); setEscopoEdicao('cliente'); }}
                        className={cn("gap-2 shadow-lg", acento.botao)}
                      >
                        <Pencil size={16} /> Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCancelarEdicao} className="border-gray-300 text-gray-600">Cancelar</Button>
                    <div className="flex items-center gap-3">
                      {/*
                        O aviso é clicável de propósito: dizer "faltam 3 campos"
                        sem dizer onde foi exatamente o defeito que originou esta
                        tarefa. Clicar abre a aba e o item da primeira falta.
                      */}
                      {mapaPendencias && mapaPendencias.todas.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => irParaPendencia(mapaPendencias.todas[0])}
                          className="flex items-center gap-1.5 rounded text-sm font-medium text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                        >
                          <AlertCircle size={16} className="shrink-0" />
                          {mapaPendencias.todas.length === 1
                            ? "1 campo obrigatório pendente"
                            : `${mapaPendencias.todas.length} campos obrigatórios pendentes`}
                        </button>
                      ) : hasUnsavedChanges && (
                        <span className="flex items-center gap-1.5 text-sm text-amber-700">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Alterações não salvas
                        </span>
                      )}
                      <Button
                        onClick={handleSave} disabled={saving}
                        className={cn("gap-2 shadow-lg", acento.botao)}
                      >
                        {saving ? <AreaLoader area={area} size={20} /> : <CheckCircle2 size={20} />}
                        {isEditing ? "Salvar Alterações" : "Salvar Cliente"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          </AcentoAreaProvider>
        </DialogContent>
      </Dialog>

      {/* Exit confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dados não salvos</AlertDialogTitle>
            <AlertDialogDescription>
              {descarteFecha
                ? 'Você tem dados não salvos. Deseja sair sem salvar?'
                : 'Você tem dados não salvos. Descartar as alterações e voltar para a visualização?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowExitConfirm(false);
                if (descarteFecha) resetAndClose();
                else voltarParaLeitura();
              }}
            >
              {descarteFecha ? 'Sair' : 'Descartar'}
            </AlertDialogAction>
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
