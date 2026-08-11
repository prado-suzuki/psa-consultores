import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fieldCls, FieldSection, labelCls, subFormBoxCls } from '@/components/equipe/osg/formKit';
import {
  NATUREZAS_PARENTESCO, TIPOS_PARENTESCO,
} from '@/components/equipe/osg/qualificacao-das-partes/pessoa/parentescoOpcoes';
import {
  useDeleteParentesco, useParentescosByCliente, useUpsertParentesco,
  type ParentescoEnriched, type PessoaRow,
} from '@/hooks/useQualificacaoDasPartes';

const emptyDraft = () => ({ parenteId: '', tipo: '', natureza: '' });

interface ParentescoPanelProps {
  /** Pessoa dona dos vínculos. A lista só existe depois de a pessoa ter id. */
  pessoaId: string;
  clienteId: string;
  /** PFs do cliente, menos a própria pessoa. */
  candidates: PessoaRow[];
  number: string;
}

/**
 * Lista de vínculos de parentesco de uma pessoa.
 *
 * A seção antiga tinha um trio Parente/Tipo/Natureza e só um: pai entrava, mãe
 * sobrava no texto livre, e tio, avô ou segundo pai não tinham onde caber — o
 * que a tabela `parentesco` sempre admitiu (N linhas por pessoa). Aqui a seção
 * vira lista com adicionar/editar/remover, sem limite de quantidade nem de tipo,
 * no mesmo formato que Administradores já usa no modal de PJ: grava na hora, e
 * não junto do "Salvar alterações" da pessoa.
 */
export function ParentescoPanel({ pessoaId, clienteId, candidates, number }: ParentescoPanelProps) {
  const { data: todos = [], isLoading } = useParentescosByCliente(clienteId);
  const upsert = useUpsertParentesco();
  const deleteMutation = useDeleteParentesco();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const vinculos = todos.filter((vinculo) => vinculo.pessoa_id === pessoaId);
  const opcoes = candidates.filter((p) => p.id !== pessoaId || p.id === draft.parenteId);

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(emptyDraft());
  };
  const startEdit = (vinculo: ParentescoEnriched) => {
    setAdding(false);
    setEditingId(vinculo.id);
    setDraft({
      parenteId: vinculo.parente_pessoa_id,
      tipo: vinculo.tipo ?? '',
      natureza: vinculo.natureza ?? '',
    });
  };
  const save = () => {
    if (!draft.parenteId) return void toast.error('Selecione o parente');
    const repetido = vinculos.some((vinculo) => vinculo.id !== editingId
      && vinculo.parente_pessoa_id === draft.parenteId
      && (vinculo.tipo ?? '') === draft.tipo);
    if (repetido) return void toast.error('Este vínculo já está cadastrado para a mesma pessoa');
    const original = editingId ? vinculos.find((vinculo) => vinculo.id === editingId) ?? null : null;
    upsert.mutate({
      values: {
        pessoa_id: pessoaId,
        parente_pessoa_id: draft.parenteId,
        tipo: draft.tipo || null,
        natureza: draft.natureza || null,
      },
      original,
      clienteId,
    }, { onSuccess: cancelEdit });
  };
  const formOpen = adding || editingId !== null;

  return (
    <FieldSection
      number={number}
      title="Filiação e parentesco"
      hint={!isLoading && vinculos.length ? `${vinculos.length} vínculo(s)` : undefined}
    >
      <div className="space-y-2.5">
        {isLoading ? <p className="py-2 text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && vinculos.length === 0 && !formOpen ? (
          <p className="py-2 text-sm text-muted-foreground">Nenhum vínculo de parentesco cadastrado.</p>
        ) : null}
        {vinculos.length > 0 && (
          <div className="space-y-1.5">
            {vinculos.map((vinculo) => (
              <VinculoRow
                key={vinculo.id}
                vinculo={vinculo}
                isEditing={editingId === vinculo.id}
                onEdit={() => startEdit(vinculo)}
                onDelete={() => deleteMutation.mutate({ row: vinculo, clienteId })}
              />
            ))}
          </div>
        )}
        {formOpen ? (
          <div className={`${subFormBoxCls} space-y-3`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">
              {editingId ? 'Editar vínculo' : 'Novo vínculo'}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label className={labelCls}>Parente<RequiredMark /></Label>
                <Select value={draft.parenteId || undefined} onValueChange={(value) => setDraft((old) => ({ ...old, parenteId: value }))}>
                  <SelectTrigger className={fieldCls}>
                    <SelectValue placeholder={opcoes.length ? 'Selecione...' : 'Nenhuma outra PF cadastrada'} />
                  </SelectTrigger>
                  <SelectContent>{opcoes.map((p) => <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <OpcaoField label="Tipo" value={draft.tipo} options={TIPOS_PARENTESCO} onChange={(tipo) => setDraft((old) => ({ ...old, tipo }))} />
              <OpcaoField label="Natureza" value={draft.natureza} options={NATUREZAS_PARENTESCO} onChange={(natureza) => setDraft((old) => ({ ...old, natureza }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>Cancelar</Button>
              <Button type="button" size="sm" className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90" onClick={save} disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setAdding(true); }}
          >
            <Plus className="h-3.5 w-3.5" />Adicionar vínculo
          </Button>
        )}
      </div>
    </FieldSection>
  );
}

function OpcaoField({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelCls}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function VinculoRow({ vinculo, isEditing, onEdit, onDelete }: {
  vinculo: ParentescoEnriched; isEditing: boolean; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`rounded-md border px-3 py-2 ${isEditing ? 'border-osg-200 bg-osg-50' : 'bg-muted/30'}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{vinculo.parente_denominacao}</span>
            {vinculo.tipo && <Badge variant="outline" className="text-[10px]">{vinculo.tipo}</Badge>}
            {vinculo.natureza && <Badge variant="outline" className="text-[10px]">{vinculo.natureza}</Badge>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Remover o vínculo de parentesco com {vinculo.parente_denominacao}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Remover</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
