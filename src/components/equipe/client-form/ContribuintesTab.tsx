import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Check, Copy, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCpfCnpj, formatCep, formatPhone } from "./constants";
import type { DraftEntity, InscricaoIE } from "@/types/clientForm";
import { useAcentoArea } from "./acentoArea";
import { RequiredMark } from "@/components/ui/required-mark";
import { useAuth } from "@/contexts/AuthContext";
import { useContribuinteDuplicateCheck, type DuplicateContribuinte } from "@/hooks/useContribuinteDuplicateCheck";
import { useContribuinteAutofill, type ContribuinteAutofill } from "@/hooks/useContribuinteAutofill";
import ListaMestreDetalhe from "./ListaMestreDetalhe";
import ContribuinteLeitura from "./ContribuinteLeitura";
import ContribuinteDadosFiscais from "./ContribuinteDadosFiscais";
import SecaoFormulario from "./SecaoFormulario";
import MarcaPendencia, { CLASSE_CAMPO_PENDENTE } from "./MarcaPendencia";
import { idsAlterados, resolverSelecao, selecaoAposRemover } from "@/lib/listaMestreDetalhe";
import { normalizarNomeDigitado } from "@/lib/nomeProprio";
import type { FocoPendencia, MapaPendencias } from "@/lib/camposObrigatorios";

export interface ContribuintesTabProps {
  entities: DraftEntity[];
  setEntities: React.Dispatch<React.SetStateAction<DraftEntity[]>>;
  inscricoesMap: Record<string, InscricaoIE[]>;
  setInscricoesMap: React.Dispatch<React.SetStateAction<Record<string, InscricaoIE[]>>>;
  cnpjLoading: boolean;
  cepLoading: boolean;
  cnpjLookup: (value: string, setter: any) => Promise<void>;
  cepLookup: (value: string, setter: any) => Promise<void>;
  isReadOnly: boolean;
  /**
   * O que a edição em curso libera. `'cliente'` veio do "Editar" do rodapé e
   * destrava tudo; `'item'` veio do "Editar" de uma linha e destrava só ela.
   */
  escopoEdicao?: 'cliente' | 'item' | null;
  /**
   * Abre a edição com escopo de item, a partir da visualização. Antes desta
   * prop não havia como corrigir um contribuinte sem destravar o cadastro todo.
   */
  onRequestItemEdit?: () => void;
  /** Os contribuintes como vieram do banco, para marcar na lista o que mudou. */
  entidadesOriginais?: DraftEntity[];
  /** Faltas de preenchimento, já filtradas pela primeira tentativa de salvar. */
  pendencias?: MapaPendencias | null;
  /** Item a abrir quando o consultor clica no aviso de pendências do rodapé. */
  foco?: FocoPendencia | null;
  /** Cadastro de cliente novo, que não tem modo de visualização. */
  cadastroNovo?: boolean;
  onInlineEditingChange?: (isEditing: boolean) => void;
}

export default function ContribuintesTab({
  entities, setEntities,
  inscricoesMap, setInscricoesMap,
  cnpjLoading, cepLoading,
  cnpjLookup, cepLookup,
  isReadOnly,
  escopoEdicao,
  onRequestItemEdit,
  entidadesOriginais,
  pendencias,
  foco,
  cadastroNovo,
  onInlineEditingChange,
}: ContribuintesTabProps) {
  const { isAdmin } = useAuth();
  const acento = useAcentoArea();
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<number | null>(null);

  const escopoCliente = !isReadOnly && escopoEdicao !== 'item';
  /**
   * O "Editar" por linha existe só na visualização, como porta de entrada do
   * escopo de item. Em edição do cliente os campos já estão abertos.
   */
  const mostrarEditarPorLinha = isReadOnly ? !!onRequestItemEdit : escopoEdicao === 'item';
  /**
   * Adicionar: na visualização, que é a porta de entrada, e no cadastro novo,
   * que não tem visualização para onde voltar. Mesma regra do "Criar nova OS":
   * com uma edição em curso o botão some, para ninguém sair com um contribuinte
   * a mais sem perceber.
   */
  const mostrarCriar = (isReadOnly && !!onRequestItemEdit) || (cadastroNovo && escopoCliente);
  /** A lixeira vale nas duas frentes: vendo o contribuinte ou com ele aberto. */
  const mostrarRemover = !isReadOnly || !!onRequestItemEdit;

  // Mantem sempre algo selecionado, inclusive quando a lista chega depois.
  const selecaoEfetiva = resolverSelecao(entities, selecionadoId);
  useEffect(() => {
    if (selecaoEfetiva !== selecionadoId) setSelecionadoId(selecaoEfetiva);
  }, [selecaoEfetiva, selecionadoId]);

  // O aviso do rodapé manda abrir um item específico. Só reage à mudança do
  // pedido: se dependesse da seleção, escolher outro item na lista seria
  // desfeito no mesmo instante.
  useEffect(() => {
    if (foco) setSelecionadoId(foco.itemId);
  }, [foco]);

  const alterados = useMemo(
    () => idsAlterados(entities, entidadesOriginais ?? []),
    [entities, entidadesOriginais],
  );

  useEffect(() => {
    onInlineEditingChange?.(editingEntityId != null);
  }, [editingEntityId, onInlineEditingChange]);

  type DupState = { found: true; isLocal: boolean; clienteName?: string | null } | null;
  const [editDuplicate, setEditDuplicate] = useState<DupState>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const checkDuplicate = useContribuinteDuplicateCheck();
  const checkAutofill = useContribuinteAutofill();

  // Autofill de conveniência para PF: ao informar um CPF já existente na base,
  // pré-preenche os campos VAZIOS a partir da cópia mais recente. Não cria vínculo
  // nem reusa id — a linha nova continua sendo inserida com id próprio no save.
  const applyCpfAutofill = async (
    rawValue: string,
    current: Partial<DraftEntity>,
    setter: React.Dispatch<React.SetStateAction<any>>,
  ) => {
    const digits = (rawValue || "").replace(/\D/g, "");
    if (digits.length !== 11) return;
    let auto: ContribuinteAutofill | null = null;
    try {
      auto = await checkAutofill(rawValue);
    } catch (err) {
      console.error("Erro no autofill de CPF:", err);
      return;
    }
    if (!auto) return;
    const fields: (keyof ContribuinteAutofill)[] = [
      "nome_razao_social", "telefone", "cep", "logradouro", "numero",
      "complemento", "bairro", "municipio", "uf",
    ];
    const patch: Record<string, string> = {};
    for (const f of fields) {
      const cur = (current as any)[f];
      if ((!cur || String(cur).trim() === "") && auto[f]) {
        patch[f] = auto[f];
      }
    }
    if (Object.keys(patch).length === 0) return;
    setter((prev: any) => ({ ...prev, ...patch }));
    toast.success("Dados preenchidos a partir de um cadastro existente deste CPF.");
  };

  const findLocalDuplicate = (digits: string, ignoreLocalId?: number) => {
    if (digits.length !== 11 && digits.length !== 14) return false;
    return entities.some(
      (e) => e._id !== ignoreLocalId && (e.cpf_cnpj || "").replace(/\D/g, "") === digits,
    );
  };

  const runDuplicateCheck = async (
    rawValue: string,
    ignoreLocalId?: number,
    ignoreDbId?: string,
  ): Promise<DupState> => {
    const digits = (rawValue || "").replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) return null;
    if (findLocalDuplicate(digits, ignoreLocalId)) {
      return { found: true, isLocal: true };
    }
    // PF (sócio) pode ser contribuinte de mais de um cliente → não trata duplicidade
    // cross-cliente para CPF (nem bloqueia, nem avisa). PJ (CNPJ) segue 1-por-cliente.
    if (digits.length !== 14) {
      return null;
    }
    try {
      setCheckingDuplicate(true);
      const dup = await checkDuplicate(digits, ignoreDbId);
      if (dup) return { found: true, isLocal: false, clienteName: dup.cliente_nome };
      return null;
    } catch (err) {
      console.error("Erro ao verificar duplicidade de contribuinte:", err);
      return null;
    } finally {
      setCheckingDuplicate(false);
    }
  };

  /**
   * Cada campo grava direto no contribuinte da lista — não existe
   * "adicionar/aplicar" intermediário. Validação e gravação no banco
   * acontecem no "Salvar Alterações" do rodapé.
   */
  const updateEntity = (id: number, patch: Partial<DraftEntity>) => {
    setEntities(prev => prev.map(e => (e._id === id ? ({ ...e, ...patch } as DraftEntity) : e)));
  };

  /** Setter compatível com os hooks de consulta externa (CNPJ/CEP), aplicado a um contribuinte. */
  const entitySetter = (id: number) => (updater: any) => {
    setEntities(prev => prev.map(e => {
      if (e._id !== id) return e;
      return (typeof updater === "function" ? updater(e) : { ...e, ...updater }) as DraftEntity;
    }));
  };

  const handleEntityCnpjBlur = async (ent: DraftEntity, value: string) => {
    await cnpjLookup(value, entitySetter(ent._id) as any);
    const dup = await runDuplicateCheck(value, ent._id, ent._dbId);
    setEditDuplicate(dup);
    if (dup?.found) {
      toast.error(
        dup.isLocal
          ? "Contribuinte já cadastrado neste cliente"
          : `Contribuinte já cadastrado no cliente "${dup.clienteName ?? "—"}"`,
      );
    }
    if (ent.tipo_pessoa === "PF") {
      await applyCpfAutofill(value, ent, entitySetter(ent._id) as any);
    }
  };
  const handleEntityCepBlur = (ent: DraftEntity, value: string) => cepLookup(value, entitySetter(ent._id) as any);

  const startEditEntity = (ent: DraftEntity) => {
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    setEditingEntityId(ent._id);
    setEditDuplicate(null);
  };

  const createEntity = () => {
    // Vindo da visualização, entrar em edição faz parte do gesto: sem isto o
    // contribuinte nasceria numa tela travada.
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    const nova = {
      tipo_pessoa: "PJ", cpf_cnpj: "", nome_razao_social: "", nome_fantasia: "",
      situacao_inscricao_estadual: "", inscricao_estadual: "", cod_cnae: "", setor: "",
      simples_nacional: "", telefone: "", cep: "", logradouro: "", numero: "", complemento: "",
      bairro: "", municipio: "", uf: "", contribuinte_faturamento: false, atividade_principal: "",
      _id: Date.now() + Math.random(),
    } as unknown as DraftEntity;
    setEntities(prev => [...prev, nova]);
    setSelecionadoId(nova._id);
    setEditingEntityId(nova._id);
    setEditDuplicate(null);
  };

  const removeEntity = (id: number) => {
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    // A seleção vai para o vizinho antes da lista encolher, para o consultor
    // continuar no mesmo ponto em vez de ser jogado para o começo.
    setSelecionadoId(selecaoAposRemover(entities, id));
    setEntities(prev => prev.filter(e => e._id !== id));
    if (editingEntityId === id) setEditingEntityId(null);
  };

  const handleCopyFirstAddress = (targetId: number) => {
    const first = entities.find((e) => e._id !== targetId && e.cep?.trim());
    if (!first) {
      toast.warning("Nenhum outro contribuinte com endereço cadastrado");
      return;
    }
    updateEntity(targetId, {
      cep: first.cep, logradouro: first.logradouro, numero: first.numero,
      complemento: first.complemento, bairro: first.bairro, municipio: first.municipio, uf: first.uf,
    });
    toast.success(`Endereço copiado de "${first.nome_razao_social || "outro contribuinte"}"`);
  };

  const ent = entities.find((e) => e._id === selecaoEfetiva) ?? null;
  const isEditingThis = ent != null && editingEntityId === ent._id;
  const linhaEditavel = isEditingThis || escopoCliente;

  /** A frase da falta de um campo do item aberto, e as seções que acusam. */
  const camposDoItem = ent ? pendencias?.camposPorItem.get(ent._id) : undefined;
  const falta = (campo: string) => camposDoItem?.get(campo);
  const secoesPendentes = ent ? pendencias?.secoesPorItem.get(ent._id) : undefined;
  const secaoPendente = (numero: number) => secoesPendentes?.has(numero) ?? false;

  // As IEs vivem num mapa à parte, com chave do banco quando a linha já existe
  // e chave local enquanto ela é novidade.
  const chaveInscricoes = ent ? (ent._dbId || String(ent._id)) : "";
  const inscricoesDoItem = inscricoesMap[chaveInscricoes] || [];

  return (
    <ListaMestreDetalhe
      titulo={"Contribuintes (" + entities.length + ")"}
      acaoCriar={mostrarCriar && editingEntityId == null ? (
        <Button size="sm" onClick={createEntity} className={cn("gap-1.5 h-7 text-xs", acento.botao)}>
          <Plus size={14} /> Adicionar contribuinte
        </Button>
      ) : null}
      linhas={entities.map((e) => ({
        id: e._id,
        titulo: e.nome_razao_social?.trim() || "Novo contribuinte",
        subtitulo: e.cpf_cnpj || "sem documento",
        etiqueta: (
          <span className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-[10px]">{e.tipo_pessoa}</Badge>
            {e.contribuinte_faturamento && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">Faturamento</span>
            )}
            {e.simples_nacional === "optante" && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">Simples</span>
            )}
          </span>
        ),
        alterado: alterados.has(e._id),
        pendente: pendencias?.itens.has(e._id) ?? false,
      }))}
      selecionadoId={selecaoEfetiva}
      onSelecionar={setSelecionadoId}
      chaveDetalhe={selecaoEfetiva + ":" + (linhaEditavel ? "edicao" : "leitura")}
      vazio="Nenhum contribuinte cadastrado."
      cabecalhoDetalhe={ent ? (ent.nome_razao_social?.trim() || "Novo contribuinte") : null}
      acoesDetalhe={ent ? (
        <>
          {/*
            Excluir contribuinte sempre foi privilégio de admin, e assim segue.
            Quem não é admin vê o botão e recebe o motivo: escondê-lo faria a
            pessoa procurar por uma ação que existe e não é dela.
          */}
          {mostrarRemover && (
            isAdmin ? (
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon" variant="outline"
                        className="h-9 w-9 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        aria-label={"Remover " + (ent.nome_razao_social || "contribuinte")}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Remover contribuinte</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover contribuinte</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{ent.nome_razao_social?.trim() || "Este contribuinte"}" sai da lista. Ele só deixa de existir quando você salvar, e "Cancelar" desfaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeEntity(ent._id)}>
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon" variant="outline"
                    className="h-9 w-9 border-destructive/40 text-destructive opacity-60"
                    aria-label="Remover contribuinte (sem permissão)"
                    onClick={() => toast.warning("Você não tem permissão para excluir clientes/contribuintes, fale com a equipe Digital para realizar essa operação")}
                  >
                    <Trash2 size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Só a equipe Digital pode excluir contribuintes</TooltipContent>
              </Tooltip>
            )
          )}
          {isEditingThis ? (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingEntityId(null)}>
              <Check size={12} /> Pronto
            </Button>
          ) : (
            mostrarEditarPorLinha && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon" variant="outline" className="h-9 w-9"
                    aria-label={"Editar " + (ent.nome_razao_social || "contribuinte")}
                    onClick={() => startEditEntity(ent)}
                  >
                    <Pencil size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar contribuinte</TooltipContent>
              </Tooltip>
            )
          )}
        </>
      ) : null}
    >
      {ent && (
        <>
                  {!linhaEditavel && (
                    <ContribuinteLeitura contribuinte={ent} inscricoes={inscricoesDoItem} />
                  )}

                  {/* Inline edit mode */}
                  {linhaEditavel && (
                    <div className="space-y-6">
                    <SecaoFormulario
                      numero={1}
                      titulo="Identificação"
                      pendente={secaoPendente(1)}
                    >
                      <div className="flex flex-col gap-2.5">
                        {/* Tipo */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo</Label>
                          <div className="flex-1">
                            <Select value={ent.tipo_pessoa || "PJ"} onValueChange={(v) => updateEntity(ent._id, { tipo_pessoa: v, cpf_cnpj: "" })}>
                              <SelectTrigger className="h-8 max-w-[160px]"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="PJ">PJ</SelectItem><SelectItem value="PF">PF</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* CPF/CNPJ */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CPF/CNPJ<RequiredMark /></Label>
                          <div className="flex-1">
                            <div className="relative">
                              <Input
                                value={ent.cpf_cnpj || ""}
                                onChange={(e) => { updateEntity(ent._id, { cpf_cnpj: formatCpfCnpj(e.target.value, ent.tipo_pessoa || "PJ") }); setEditDuplicate(null); }}
                                onBlur={(e) => handleEntityCnpjBlur(ent, e.target.value)}
                                aria-invalid={editDuplicate?.found || !!falta('cpf_cnpj') || undefined}
                                className={cn("font-mono pr-8 h-8", (editDuplicate?.found || falta('cpf_cnpj')) && CLASSE_CAMPO_PENDENTE)}
                              />
                              {(cnpjLoading || checkingDuplicate) && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            <MarcaPendencia>{falta('cpf_cnpj')}</MarcaPendencia>
                            {editDuplicate?.found && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  Contribuinte já cadastrado{editDuplicate.isLocal ? " neste cliente" : ` no cliente "${editDuplicate.clienteName ?? "—"}"`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Razão Social. O blur arruma espaço e só: aqui o gatilho do banco achatava a caixa (B20). */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">{ent.tipo_pessoa === "PF" ? <>Nome completo<RequiredMark /></> : <>Razão Social<RequiredMark /></>}</Label>
                          <div className="flex-1">
                            <Input
                              value={ent.nome_razao_social || ""}
                              onChange={(e) => updateEntity(ent._id, { nome_razao_social: e.target.value })}
                              onBlur={(e) => updateEntity(ent._id, { nome_razao_social: normalizarNomeDigitado(e.target.value) })}
                              placeholder={ent.tipo_pessoa === "PF" ? "Nome completo do contribuinte" : "Nome Empresarial"}
                              aria-invalid={!!falta('nome_razao_social') || undefined}
                              className={cn("font-medium h-8", falta('nome_razao_social') && CLASSE_CAMPO_PENDENTE)}
                            />
                            <MarcaPendencia>{falta('nome_razao_social')}</MarcaPendencia>
                          </div>
                        </div>
                        {ent.tipo_pessoa !== "PF" && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome Fantasia</Label>
                            <div className="flex-1"><Input value={ent.nome_fantasia || ""} onChange={(e) => updateEntity(ent._id, { nome_fantasia: e.target.value })} onBlur={(e) => updateEntity(ent._id, { nome_fantasia: normalizarNomeDigitado(e.target.value) })} className="h-8" /></div>
                          </div>
                        )}
                        {/* Telefone */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                          <div className="flex-1"><Input value={ent.telefone || ""} onChange={(e) => updateEntity(ent._id, { telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" className="h-8" /></div>
                        </div>
                      </div>
                    </SecaoFormulario>

                    <SecaoFormulario
                      numero={2}
                      titulo="Endereço"
                      pendente={secaoPendente(2)}
                      acao={entities.length > 1 ? (
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleCopyFirstAddress(ent._id)}>
                          <Copy size={14} /> Copiar de outro
                        </Button>
                      ) : undefined}
                    >
                      <div className="flex flex-col gap-2.5">
                        {/* CEP */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CEP<RequiredMark /></Label>
                          <div className="flex-1">
                            <div className="relative max-w-[160px]">
                              <Input
                                value={ent.cep || ""}
                                onChange={(e) => updateEntity(ent._id, { cep: formatCep(e.target.value) })}
                                onBlur={(e) => handleEntityCepBlur(ent, e.target.value)}
                                aria-invalid={!!falta('cep') || undefined}
                                className={cn("font-mono pr-8 h-8", falta('cep') && CLASSE_CAMPO_PENDENTE)}
                              />
                              {cepLoading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            <MarcaPendencia>{falta('cep')}</MarcaPendencia>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Logradouro<RequiredMark /></Label>
                          <div className="flex-1">
                            <Input
                              value={ent.logradouro || ""}
                              onChange={(e) => updateEntity(ent._id, { logradouro: e.target.value })}
                              aria-invalid={!!falta('logradouro') || undefined}
                              className={cn("h-8", falta('logradouro') && CLASSE_CAMPO_PENDENTE)}
                            />
                            <MarcaPendencia>{falta('logradouro')}</MarcaPendencia>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Número</Label>
                          <div className="flex-1"><Input value={ent.numero || ""} onChange={(e) => updateEntity(ent._id, { numero: e.target.value })} className="h-8 max-w-[120px]" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Complemento</Label>
                          <div className="flex-1"><Input value={ent.complemento || ""} onChange={(e) => updateEntity(ent._id, { complemento: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Bairro<RequiredMark /></Label>
                          <div className="flex-1">
                            <Input
                              value={ent.bairro || ""}
                              onChange={(e) => updateEntity(ent._id, { bairro: e.target.value })}
                              aria-invalid={!!falta('bairro') || undefined}
                              className={cn("h-8", falta('bairro') && CLASSE_CAMPO_PENDENTE)}
                            />
                            <MarcaPendencia>{falta('bairro')}</MarcaPendencia>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Município<RequiredMark /></Label>
                          <div className="flex-1">
                            <Input
                              value={ent.municipio || ""}
                              onChange={(e) => updateEntity(ent._id, { municipio: e.target.value })}
                              aria-invalid={!!falta('municipio') || undefined}
                              className={cn("h-8", falta('municipio') && CLASSE_CAMPO_PENDENTE)}
                            />
                            <MarcaPendencia>{falta('municipio')}</MarcaPendencia>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">UF<RequiredMark /></Label>
                          <div className="flex-1">
                            <Input
                              value={ent.uf || ""}
                              onChange={(e) => updateEntity(ent._id, { uf: e.target.value })}
                              maxLength={2}
                              aria-invalid={!!falta('uf') || undefined}
                              className={cn("h-8 max-w-[120px]", falta('uf') && CLASSE_CAMPO_PENDENTE)}
                            />
                            <MarcaPendencia>{falta('uf')}</MarcaPendencia>
                          </div>
                        </div>
                      </div>
                    </SecaoFormulario>

                    <SecaoFormulario
                      numero={3}
                      titulo="Dados fiscais"
                      pendente={secaoPendente(3)}
                    >
                      <ContribuinteDadosFiscais
                        contribuinte={ent}
                        onChange={(patch) => updateEntity(ent._id, patch)}
                        inscricoes={inscricoesDoItem}
                        onInscricoesChange={(lista) => setInscricoesMap(prev => ({ ...prev, [chaveInscricoes]: lista }))}
                        falta={falta}
                      />
                    </SecaoFormulario>

                    {/* Só com a edição de um item em curso: em edição do cliente
                        inteiro não há o que concluir. */}
                    {isEditingThis && (
                      <div className="flex justify-end border-t pt-2">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditingEntityId(null)}><Check size={14} /> Pronto</Button>
                      </div>
                    )}
                    </div>
                  )}
        </>
      )}
    </ListaMestreDetalhe>
  );
}