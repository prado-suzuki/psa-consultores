import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/ui/required-mark";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { TIPO_REPRESENTANTE_OPTIONS, formatPhone } from "./constants";
import type { DraftRepresentante } from "@/types/clientForm";
import FieldPair from "./FieldPair";
import { useAcentoArea } from "./acentoArea";
import ListaMestreDetalhe from "./ListaMestreDetalhe";
import SecaoFormulario from "./SecaoFormulario";
import MarcaPendencia, { CLASSE_CAMPO_PENDENTE, acessibilidadeObrigatorio } from "./MarcaPendencia";
import { idsAlterados, resolverSelecao, selecaoAposRemover } from "@/lib/listaMestreDetalhe";
import type { FocoPendencia, MapaPendencias } from "@/lib/camposObrigatorios";

const DISABLE_TOOLTIP =
  "Você não tem permissão para desabilitar acesso ao chamados, fale com a equipe Digital para realizar essa operação";

export interface RepresentantesTabProps {
  participants: DraftRepresentante[];
  setParticipants: React.Dispatch<React.SetStateAction<DraftRepresentante[]>>;
  isReadOnly: boolean;
  /** Ver ContratosTab: escopo de cliente destrava tudo, de item so a linha. */
  escopoEdicao?: 'cliente' | 'item' | null;
  onRequestItemEdit?: () => void;
  /** Os representantes como vieram do banco, para marcar na lista o que mudou. */
  representantesOriginais?: DraftRepresentante[];
  /** Faltas de preenchimento, já filtradas pela primeira tentativa de salvar. */
  pendencias?: MapaPendencias | null;
  /** Item a abrir quando o consultor clica no aviso de pendências do rodapé. */
  foco?: FocoPendencia | null;
}

export default function RepresentantesTab({
  participants, setParticipants,
  isReadOnly,
  escopoEdicao,
  onRequestItemEdit,
  representantesOriginais,
  pendencias,
  foco,
}: RepresentantesTabProps) {
  const { isAdmin } = useAuth();
  const acento = useAcentoArea();
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);

  const escopoCliente = !isReadOnly && escopoEdicao !== 'item';
  /** O lápis por linha e a porta de entrada do escopo de item, so na leitura. */
  const mostrarEditarPorLinha = isReadOnly ? !!onRequestItemEdit : escopoEdicao === 'item';
  /**
   * Adicionar: onde já dá para editar, e na visualização de quem pode entrar em
   * edição — a mesma regra da lixeira. A condição anterior sumia com o botão
   * depois do primeiro uso, porque adicionar tira a tela da visualização e põe o
   * escopo em 'item'. Quem impede acrescentar linha com outra aberta é o
   * `editingParticipantId == null` no `acaoCriar`.
   */
  const mostrarCriar = !isReadOnly || !!onRequestItemEdit;
  /** A lixeira vale nas duas frentes: vendo o representante ou com ele aberto. */
  const mostrarRemover = !isReadOnly || !!onRequestItemEdit;

  // Mantem sempre algo selecionado, inclusive quando a lista chega depois.
  const selecaoEfetiva = resolverSelecao(participants, selecionadoId);
  useEffect(() => {
    if (selecaoEfetiva !== selecionadoId) setSelecionadoId(selecaoEfetiva);
  }, [selecaoEfetiva, selecionadoId]);

  // O aviso do rodapé manda abrir um item específico. Só reage à mudança do
  // pedido: se dependesse da seleção, escolher outro item na lista seria
  // desfeito no mesmo instante.
  useEffect(() => {
    if (foco?.itemId != null) setSelecionadoId(foco.itemId);
  }, [foco]);

  const alterados = useMemo(
    () => idsAlterados(participants, representantesOriginais ?? []),
    [participants, representantesOriginais],
  );

  // Captura o estado original (do banco) de `acesso_chamados` por _dbId.
  // Usado para travar o toggle quando o registro JÁ TINHA acesso habilitado e o usuário não é admin.
  const originalAcessoByDbId = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    for (const p of participants) {
      if (p._dbId && !originalAcessoByDbId.current.has(p._dbId)) {
        originalAcessoByDbId.current.set(p._dbId, !!p.acesso_chamados);
      }
    }
  }, [participants]);

  const isAcessoLockedFor = (p: Pick<DraftRepresentante, '_dbId'>): boolean => {
    if (isAdmin) return false;
    if (!p._dbId) return false;
    return originalAcessoByDbId.current.get(p._dbId) === true;
  };

  /**
   * Cada campo grava direto no representante da lista — sem "adicionar/aplicar".
   * A validação e a gravação no banco acontecem no "Salvar Alterações" do rodapé.
   */
  const updateParticipant = (id: number, patch: Partial<DraftRepresentante>) => {
    setParticipants(prev => prev.map(p => (p._id === id ? ({ ...p, ...patch } as DraftRepresentante) : p)));
  };

  const createParticipant = () => {
    // Vindo da visualização, entrar em edição faz parte do gesto: sem isto o
    // representante nasceria numa tela travada.
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    const novo = {
      nome: "", tipo_representante: "", cargo: "", email: "", telefone: "", observacoes: "",
      acesso_chamados: false, _id: Date.now() + Math.random(),
    } as DraftRepresentante;
    setParticipants(prev => [...prev, novo]);
    setSelecionadoId(novo._id);
    setEditingParticipantId(novo._id);
  };

  const removeParticipant = (id: number) => {
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    // A seleção vai para o vizinho antes da lista encolher, para o consultor
    // continuar no mesmo ponto em vez de ser jogado para o começo.
    setSelecionadoId(selecaoAposRemover(participants, id));
    setParticipants(prev => prev.filter(p => p._id !== id));
    if (editingParticipantId === id) setEditingParticipantId(null);
  };

  const part = participants.find((p) => p._id === selecaoEfetiva) ?? null;
  const isEditingThis = part != null && editingParticipantId === part._id;
  const linhaEditavel = isEditingThis || escopoCliente;
  const acessoTravado = part != null && isAcessoLockedFor(part);

  /** A frase da falta de um campo do item aberto, e as seções que acusam. */
  const camposDoItem = part ? pendencias?.camposPorItem.get(part._id) : undefined;
  const falta = (campo: string) => camposDoItem?.get(campo);
  /** Id da frase da falta, para o campo apontar. Leva o item, porque a mesma
   *  aba renderiza um representante por vez mas o id precisa ser único na página. */
  const idFalta = (campo: string) => `pend-rep-${part?._id}-${campo}`;
  const secoesPendentes = part ? pendencias?.secoesPorItem.get(part._id) : undefined;
  const secaoPendente = (numero: number) => secoesPendentes?.has(numero) ?? false;

  return (
    <ListaMestreDetalhe
      titulo={`Representantes (${participants.length})`}
      acaoCriar={mostrarCriar && editingParticipantId == null ? (
        <Button size="sm" onClick={createParticipant} className={cn("gap-1.5 h-7 text-xs", acento.botao)}>
          <Plus size={14} /> Adicionar representante
        </Button>
      ) : null}
      linhas={participants.map((p) => ({
        id: p._id,
        titulo: p.nome?.trim() || "Novo representante",
        subtitulo: p.tipo_representante || "sem cargo",
        etiqueta: p.acesso_chamados ? (
          <Badge variant="outline" className="text-[10px]">Chamados</Badge>
        ) : undefined,
        alterado: alterados.has(p._id),
        pendente: pendencias?.itens.has(p._id) ?? false,
      }))}
      selecionadoId={selecaoEfetiva}
      onSelecionar={setSelecionadoId}
      chaveDetalhe={`${selecaoEfetiva}:${linhaEditavel ? "edicao" : "leitura"}`}
      vazio="Nenhum representante cadastrado."
      cabecalhoDetalhe={part ? (part.nome?.trim() || "Novo representante") : null}
      acoesDetalhe={part ? (
        <>
          {mostrarRemover && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon" variant="outline"
                      className="h-9 w-9 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      aria-label={`Remover ${part.nome?.trim() || 'representante'}`}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Remover representante</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover representante</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{part.nome?.trim() || "Este representante"}" sai da lista. Ele só deixa de existir quando você salvar, e "Cancelar" desfaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeParticipant(part._id)}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isEditingThis ? (
            <Button size="sm" variant="outline" className={cn('gap-1.5 text-xs', acento.botaoSuave)} onClick={() => setEditingParticipantId(null)}>
              <Check size={12} /> Pronto
            </Button>
          ) : (
            mostrarEditarPorLinha && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon" variant="outline" className="h-9 w-9"
                    aria-label={`Editar ${part.nome?.trim() || 'representante'}`}
                    onClick={() => {
                      if (isReadOnly) {
                        if (!onRequestItemEdit) return;
                        onRequestItemEdit();
                      }
                      setEditingParticipantId(part._id);
                    }}
                  >
                    <Pencil size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar representante</TooltipContent>
              </Tooltip>
            )
          )}
        </>
      ) : null}
    >
      {part && !linhaEditavel && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 [&>*]:min-w-0">
          <FieldPair label="Nome" value={part.nome} />
          <FieldPair label="Cargo/função" value={part.tipo_representante} />
          <FieldPair label="Email" value={part.email} />
          <FieldPair label="Telefone" value={part.telefone} />
          <FieldPair label="Acesso a Chamados" value={part.acesso_chamados ? "Sim" : "Não"} />
          {part.observacoes && (
            <div className="col-span-2 min-w-0">
              <FieldPair label="Observações" value={part.observacoes} />
            </div>
          )}
        </div>
      )}

      {part && linhaEditavel && (
        <div className="space-y-6">
          <SecaoFormulario numero={1} titulo="Identificação" pendente={secaoPendente(1)}>
          <div className="flex flex-col gap-2.5">
          <div className="flex flex-row items-start gap-4">
            <Label className="w-48 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">Nome <RequiredMark /></Label>
            <div className="min-w-0 flex-1">
              <Input
                autoFocus
                value={part.nome || ""}
                onChange={(e) => updateParticipant(part._id, { nome: e.target.value })}
                placeholder="Nome do contato"
                {...acessibilidadeObrigatorio(idFalta('nome'), falta('nome'))}
                className={cn("h-8", falta('nome') && CLASSE_CAMPO_PENDENTE)}
              />
              <MarcaPendencia id={idFalta('nome')}>{falta('nome')}</MarcaPendencia>
            </div>
          </div>

          <div className="flex flex-row items-start gap-4">
            <Label className="w-48 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">Cargo/função <RequiredMark /></Label>
            <div className="min-w-0 flex-1">
              <Select
                value={part.tipo_representante || "__none__"}
                onValueChange={(v) => updateParticipant(part._id, { tipo_representante: v === "__none__" ? "" : v })}
              >
                <SelectTrigger
                  {...acessibilidadeObrigatorio(idFalta('tipo_representante'), falta('tipo_representante'))}
                  className={cn("h-8", falta('tipo_representante') && CLASSE_CAMPO_PENDENTE)}
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione...</SelectItem>
                  {TIPO_REPRESENTANTE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
              <MarcaPendencia id={idFalta('tipo_representante')}>{falta('tipo_representante')}</MarcaPendencia>
            </div>
          </div>
          </div>
          </SecaoFormulario>

          <SecaoFormulario numero={2} titulo="Contato" pendente={secaoPendente(2)}>
          <div className="flex flex-col gap-2.5">
          <div className="flex flex-row items-start gap-4">
            <Label className="w-48 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">Email <RequiredMark /></Label>
            <div className="min-w-0 flex-1">
              <Input
                value={part.email || ""}
                onChange={(e) => updateParticipant(part._id, { email: e.target.value })}
                {...acessibilidadeObrigatorio(idFalta('email'), falta('email'))}
                className={cn("h-8", falta('email') && CLASSE_CAMPO_PENDENTE)}
              />
              <MarcaPendencia id={idFalta('email')}>{falta('email')}</MarcaPendencia>
            </div>
          </div>

          <div className="flex flex-row items-start gap-4">
            <Label className="w-48 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">Telefone</Label>
            <div className="min-w-0 flex-1">
              <Input
                value={part.telefone || ""}
                onChange={(e) => updateParticipant(part._id, { telefone: formatPhone(e.target.value) })}
                // Telefone não é obrigatório aqui: só ganha marca quando o valor
                // digitado é curto demais, então `aria-required` fica de fora.
                {...acessibilidadeObrigatorio(idFalta('telefone'), falta('telefone'), false)}
                className={cn("h-8", falta('telefone') && CLASSE_CAMPO_PENDENTE)}
              />
              <MarcaPendencia id={idFalta('telefone')}>{falta('telefone')}</MarcaPendencia>
            </div>
          </div>
          </div>
          </SecaoFormulario>

          <SecaoFormulario numero={3} titulo="Acesso e observações" pendente={secaoPendente(3)}>
          <div className="flex flex-col gap-2.5">
          <div className="flex flex-row items-center gap-4">
            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Acesso Chamados</Label>
            <div className="min-w-0 flex-1">
              <div className="flex h-8 items-center gap-2">
                {acessoTravado ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-not-allowed select-none items-center gap-2 opacity-50" aria-disabled>
                          <Switch checked={part.acesso_chamados ?? false} disabled tabIndex={-1} className="pointer-events-none" />
                          <span className="text-sm">{part.acesso_chamados ? "Ativado" : "Desativado"}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">{DISABLE_TOOLTIP}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <>
                    <Switch checked={part.acesso_chamados ?? false} onCheckedChange={(c) => updateParticipant(part._id, { acesso_chamados: c })} />
                    <span className="text-sm">{part.acesso_chamados ? "Ativado" : "Desativado"}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-row items-start gap-4">
            <Label className="w-48 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">Observações</Label>
            <div className="min-w-0 flex-1">
              <Textarea
                value={part.observacoes || ""}
                onChange={(e) => updateParticipant(part._id, { observacoes: e.target.value })}
                placeholder="Observações sobre o representante (mín. 20 caracteres se preenchido)..."
                {...acessibilidadeObrigatorio(idFalta('observacoes'), falta('observacoes'), false)}
                className={cn("min-h-[60px]", falta('observacoes') && CLASSE_CAMPO_PENDENTE)}
              />
              <MarcaPendencia id={idFalta('observacoes')}>{falta('observacoes')}</MarcaPendencia>
            </div>
          </div>
          </div>
          </SecaoFormulario>

          {/* Só com a edição de um item em curso: em edição do cliente inteiro
              não há o que concluir, e o botão viraria enfeite que não faz nada. */}
          {isEditingThis && (
            <div className="flex justify-end border-t pt-2">
              <Button size="sm" variant="outline" className={cn('gap-1.5', acento.botaoSuave)} onClick={() => setEditingParticipantId(null)}>
                <Check size={14} /> Pronto
              </Button>
            </div>
          )}
        </div>
      )}
    </ListaMestreDetalhe>
  );
}
