import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import { FieldSection, fieldCls, labelCls, switchBoxCls, textareaCls } from '@/components/equipe/osg/formKit';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteImpedimento, useImpedimentosByMatricula, useUpsertImpedimento, type ImpedimentoEnriched, type ImpedimentoRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { areaStep, clampAreaInput, formatAreaUnidade } from '@/components/equipe/osg/diagnostico-patrimonial/areaUtils';

const TIPOS = ['Hipoteca', 'Penhora', 'Arrolamento Fiscal', 'Indisponibilidade', 'Servidão', 'Reserva Legal', 'APP', 'Usufruto', 'Cláusula de Inalienabilidade', 'Cessão Fiduciária', 'Outro'];
type Draft = { tipo: string; referencia: string; descricao: string; credor_pessoa_id: string; credor_nome: string; data_constituicao: string; data_validade: string; vlr: string; area_afetada: string; impede_transferencia: boolean; cancelado: boolean };
const emptyDraft = (): Draft => ({ tipo: 'Hipoteca', referencia: '', descricao: '', credor_pessoa_id: '', credor_nome: '', data_constituicao: '', data_validade: '', vlr: '', area_afetada: '', impede_transferencia: false, cancelado: false });

export function ImpedimentosPanel({ matriculaId, areaUnidade, pessoasCliente }: { matriculaId: string; areaUnidade: string; pessoasCliente: PessoaRow[] }) {
  const { data: impedimentos = [], isLoading } = useImpedimentosByMatricula(matriculaId);
  const upsert = useUpsertImpedimento();
  const deleteMutation = useDeleteImpedimento();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const closeForm = () => { setEditingId(null); setAdding(false); setDraft(emptyDraft()); };
  const edit = (item: ImpedimentoRow) => {
    setAdding(false); setEditingId(item.id);
    setDraft({ tipo: item.tipo, referencia: item.referencia ?? '', descricao: item.descricao ?? '', credor_pessoa_id: item.credor_pessoa_id ?? '', credor_nome: item.credor_nome ?? '', data_constituicao: item.data_constituicao ?? '', data_validade: item.data_validade ?? '', vlr: item.vlr != null ? String(item.vlr) : '', area_afetada: item.area_afetada != null ? String(item.area_afetada) : '', impede_transferencia: item.impede_transferencia, cancelado: item.cancelado });
  };
  const save = () => {
    if (!draft.tipo.trim()) { toast.error('Selecione o tipo'); return; }
    const nullify = (value: string) => value.trim() ? value : null;
    const toNum = (value: string) => value.trim() && !Number.isNaN(Number(value)) ? Number(value) : null;
    const original = editingId ? impedimentos.find((item) => item.id === editingId) ?? null : null;
    upsert.mutate({ values: { matricula_id: matriculaId, tipo: draft.tipo, referencia: nullify(draft.referencia), descricao: nullify(draft.descricao), credor_pessoa_id: draft.credor_pessoa_id || null, credor_nome: nullify(draft.credor_nome), data_constituicao: nullify(draft.data_constituicao), data_validade: nullify(draft.data_validade), vlr: toNum(draft.vlr), area_afetada: toNum(draft.area_afetada), impede_transferencia: draft.impede_transferencia, cancelado: draft.cancelado }, original }, { onSuccess: closeForm });
  };
  const formOpen = adding || editingId != null;
  return <FieldSection number="01" title="Impedimentos" hint={!isLoading && impedimentos.length ? `${impedimentos.length} registro(s)` : undefined}>
    <div className="space-y-2.5">
      {isLoading ? <p className="py-2 text-sm text-muted-foreground">Carregando...</p>
        : impedimentos.length === 0 && !formOpen ? <p className="py-2 text-sm text-muted-foreground">Nenhum impedimento cadastrado para esta matrícula.</p>
        : <div className="space-y-1.5">{impedimentos.map((item) => <ImpedimentoItem key={item.id} item={item} areaUnidade={areaUnidade} editing={editingId === item.id} onEdit={() => edit(item)} onDelete={() => deleteMutation.mutate(item)} />)}</div>}
      {formOpen ? <div className="space-y-3 rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">{editingId ? 'Editar impedimento' : 'Novo impedimento'}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Tipo" required><Select value={draft.tipo} onValueChange={(v) => set('tipo', v)}><SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger><SelectContent>{TIPOS.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Referência"><Input value={draft.referencia} onChange={(e) => set('referencia', e.target.value)} placeholder="R-X/Av-Y" className={`${fieldCls} font-mono`} /></Field>
          <Field label="Valor (R$)"><CurrencyInput value={draft.vlr} onChange={(v) => set('vlr', v)} className={`${fieldCls} font-mono`} /></Field>
          <Field label="Credor (PSA)"><Select value={draft.credor_pessoa_id || undefined} onValueChange={(v) => set('credor_pessoa_id', v)}><SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{pessoasCliente.map((p) => <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>)}</SelectContent></Select></Field>
          <div className="space-y-1.5 md:col-span-2"><Label className={labelCls}>Credor (texto livre)</Label><Input value={draft.credor_nome} onChange={(e) => set('credor_nome', e.target.value)} placeholder="Quando o credor não estiver cadastrado" className={fieldCls} /></div>
          <Field label="Data constituição"><DateFieldWithInput value={draft.data_constituicao} onChange={(v) => set('data_constituicao', v)} /></Field>
          <Field label="Data validade"><DateFieldWithInput value={draft.data_validade} onChange={(v) => set('data_validade', v)} /></Field>
          <Field label={`Área afetada (${formatAreaUnidade(areaUnidade)})`}><Input type="number" step={areaStep(areaUnidade)} value={draft.area_afetada} onChange={(e) => set('area_afetada', clampAreaInput(e.target.value, areaUnidade))} className={`${fieldCls} font-mono`} /></Field>
          <div className="space-y-1.5 md:col-span-3"><Label className={labelCls}>Descrição</Label><Textarea value={draft.descricao} onChange={(e) => set('descricao', e.target.value)} className={`min-h-[60px] ${textareaCls}`} /></div>
          <div className={switchBoxCls}><Switch checked={draft.impede_transferencia} onCheckedChange={(v) => set('impede_transferencia', v)} /><Label className="text-sm">Impede transferência</Label></div>
          <div className={switchBoxCls}><Switch checked={draft.cancelado} onCheckedChange={(v) => set('cancelado', v)} /><Label className="text-sm">Cancelado</Label></div>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={closeForm}>Cancelar</Button><Button type="button" size="sm" className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90" onClick={save} disabled={upsert.isPending}>{upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{editingId ? 'Salvar' : 'Adicionar'}</Button></div>
      </div> : <Button type="button" variant="ghost" size="sm" className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700" onClick={() => { setEditingId(null); setDraft(emptyDraft()); setAdding(true); }}><Plus className="h-3.5 w-3.5" />Adicionar impedimento</Button>}
    </div>
  </FieldSection>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="space-y-1.5"><Label className={labelCls}>{label}{required && <RequiredMark />}</Label>{children}</div>; }

function ImpedimentoItem({ item, areaUnidade, editing, onEdit, onDelete }: { item: ImpedimentoEnriched; areaUnidade: string; editing: boolean; onEdit: () => void; onDelete: () => void }) {
  const money = item.vlr == null ? null : item.vlr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <div className={`rounded-md border px-3 py-2 ${editing ? 'border-osg-200 bg-osg-50' : 'bg-muted/30'} ${item.cancelado ? 'opacity-60' : ''}`}><div className="flex items-start gap-2"><div className="min-w-0 flex-1 space-y-1">
    <div className="flex flex-wrap items-center gap-2"><Badge variant="default" className="text-[10px]">{item.tipo}</Badge>{item.referencia && <Badge variant="outline" className="text-[10px] font-mono">{item.referencia}</Badge>}{item.impede_transferencia && <Badge variant="destructive" className="text-[10px]">Impede transferência</Badge>}{item.cancelado && <Badge variant="secondary" className="text-[10px]">Cancelado</Badge>}</div>
    {item.credor_denominacao && <p className="text-xs"><span className="text-muted-foreground">Credor:</span> <span className="font-medium">{item.credor_denominacao}</span></p>}{item.descricao && <p className="line-clamp-2 text-xs text-muted-foreground">{item.descricao}</p>}
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">{money && <span>Valor: <span className="font-mono">{money}</span></span>}{item.area_afetada != null && <span>Área: <span className="font-mono">{item.area_afetada} {formatAreaUnidade(areaUnidade)}</span></span>}{item.data_constituicao && <span>Constituído: {new Date(item.data_constituicao).toLocaleDateString('pt-BR')}</span>}{item.data_validade && <span>Validade: {new Date(item.data_validade).toLocaleDateString('pt-BR')}</span>}</div>
  </div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button><AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover impedimento?</AlertDialogTitle><AlertDialogDescription>Remover este impedimento ({item.tipo}) da matrícula.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div></div>;
}
