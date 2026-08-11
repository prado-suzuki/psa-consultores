import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { fieldCls, FieldSection, labelCls, subFormBoxCls, textareaCls } from '@/components/equipe/osg/formKit';
import {
  descreverExcecao, descreverPoderes, EXIGENCIAS, lerPoderes, poderesParaGravar, poderesVazios,
  type ExigenciaAssinatura, type PoderesAdministracao,
} from '@/components/equipe/osg/qualificacao-das-partes/pessoa/poderesAdministracao';
import {
  useAdministracaoByPj, useDeleteAdministracao, useUpsertAdministracao,
  type AdministracaoEnriched, type PessoaRow,
} from '@/hooks/useQualificacaoDasPartes';

const CARGOS = ['Administrador', 'Sócio-Administrador', 'Diretor', 'Presidente'];
const emptyAdmin = () => ({
  administradorId: '', cargo: '', dataInicio: '', dataFim: '', poderes: poderesVazios(),
});

interface AdministracaoPanelProps {
  pjPessoaId: string;
  pessoasCliente: PessoaRow[];
}

export function AdministracaoPanel({ pjPessoaId, pessoasCliente }: AdministracaoPanelProps) {
  const { data: administradores = [], isLoading } = useAdministracaoByPj(pjPessoaId);
  const upsert = useUpsertAdministracao();
  const deleteMutation = useDeleteAdministracao();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyAdmin);
  const candidates = pessoasCliente.filter((p) => p.tipo_pessoa === 'PF' || p.id === draft.administradorId);

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraft(emptyAdmin());
  };
  const startEdit = (administracao: AdministracaoEnriched) => {
    setAdding(false);
    setEditingId(administracao.id);
    setDraft({
      administradorId: administracao.administrador_pessoa_id,
      cargo: administracao.cargo ?? '',
      dataInicio: administracao.data_inicio ?? '',
      dataFim: administracao.data_fim ?? '',
      poderes: lerPoderes(administracao.poderes, administracao.pode_isoladamente),
    });
  };
  const save = () => {
    if (!draft.administradorId) return void toast.error('Selecione o administrador');
    if (draft.dataInicio && draft.dataFim && draft.dataFim < draft.dataInicio) {
      return void toast.error('Data fim deve ser igual ou posterior à data início');
    }
    if (draft.poderes.excecoes.some((excecao) => !excecao.atos.trim())) {
      return void toast.error('Descreva os atos de cada exceção ou remova a linha em branco');
    }
    const original = editingId ? administradores.find((item) => item.id === editingId) ?? null : null;
    const entityName = pessoasCliente.find((p) => p.id === draft.administradorId)?.denominacao ?? 'administrador';
    // `pode_isoladamente` continua sendo escrito porque o gerador de documentos e
    // a auditoria ainda leem a coluna antiga; `poderesParaGravar` mantém as duas
    // em sincronia a partir de uma fonte só.
    const { poderes, pode_isoladamente } = poderesParaGravar(draft.poderes);
    upsert.mutate({
      values: {
        pj_pessoa_id: pjPessoaId, administrador_pessoa_id: draft.administradorId,
        cargo: draft.cargo.trim() || null, pode_isoladamente, poderes,
        data_inicio: draft.dataInicio || null, data_fim: draft.dataFim || null,
      },
      original,
      entityName,
    }, { onSuccess: cancelEdit });
  };
  const setPoderes = (patch: Partial<PoderesAdministracao>) =>
    setDraft((old) => ({ ...old, poderes: { ...old.poderes, ...patch } }));
  const formOpen = adding || editingId !== null;

  return (
    <FieldSection number="01" title="Administradores" hint={!isLoading && administradores.length ? `${administradores.length} vínculo(s)` : undefined}>
      <div className="space-y-2.5">
        {isLoading ? <p className="py-2 text-sm text-muted-foreground">Carregando...</p> : null}
        {!isLoading && administradores.length === 0 && !formOpen ? (
          <p className="py-2 text-sm text-muted-foreground">Nenhum administrador vinculado a esta empresa.</p>
        ) : null}
        {administradores.length > 0 && (
          <div className="space-y-1.5">
            {administradores.map((administracao) => (
              <AdministradorRow
                key={administracao.id}
                administracao={administracao}
                isEditing={editingId === administracao.id}
                onEdit={() => startEdit(administracao)}
                onDelete={() => deleteMutation.mutate({ row: administracao, entityName: administracao.administrador_denominacao })}
              />
            ))}
          </div>
        )}
        {formOpen ? (
          <div className={`${subFormBoxCls} space-y-3`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">{editingId ? 'Editar administrador' : 'Novo administrador'}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={labelCls}>Administrador<RequiredMark /></Label>
                <Select value={draft.administradorId || undefined} onValueChange={(value) => setDraft((old) => ({ ...old, administradorId: value }))}>
                  <SelectTrigger className={fieldCls}><SelectValue placeholder={candidates.length ? 'Selecione...' : 'Nenhuma PF cadastrada'} /></SelectTrigger>
                  <SelectContent>{candidates.map((p) => <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Cargo</Label>
                <Select value={draft.cargo || undefined} onValueChange={(value) => setDraft((old) => ({ ...old, cargo: value }))}>
                  <SelectTrigger className={fieldCls}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{CARGOS.map((cargo) => <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DateField label="Data início" value={draft.dataInicio} onChange={(value) => setDraft((old) => ({ ...old, dataInicio: value }))} />
              <DateField label="Data fim" value={draft.dataFim} onChange={(value) => setDraft((old) => ({ ...old, dataFim: value }))} />
              <div className="md:col-span-2">
                <PoderesFields poderes={draft.poderes} onChange={setPoderes} />
              </div>
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
          <Button type="button" variant="ghost" size="sm" className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700" onClick={() => { setEditingId(null); setDraft(emptyAdmin()); setAdding(true); }}>
            <Plus className="h-3.5 w-3.5" />Adicionar administrador
          </Button>
        )}
      </div>
    </FieldSection>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label className={labelCls}>{label}</Label><Input type="date" value={value} onChange={(event) => onChange(event.target.value)} className={fieldCls} /></div>;
}

/**
 * Poderes: regra geral + exceções por tipo de ato + observação.
 *
 * O sim/não anterior ("pode assinar isoladamente") não tinha onde guardar o caso
 * comum — "administra sozinho, mas os atos da cláusula sexta exigem as duas
 * assinaturas" —, então a limitação sumia do cadastro e reaparecia escrita à mão
 * na conferência do documento. Cada exceção é uma linha própria para que o
 * gerador possa percorrê-las; a observação é a saída para o que não couber.
 */
function PoderesFields({ poderes, onChange }: {
  poderes: PoderesAdministracao; onChange: (patch: Partial<PoderesAdministracao>) => void;
}) {
  const setExcecao = (index: number, patch: Partial<PoderesAdministracao['excecoes'][number]>) =>
    onChange({ excecoes: poderes.excecoes.map((item, i) => (i === index ? { ...item, ...patch } : item)) });

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5">
        <Label className={labelCls}>Forma de assinatura</Label>
        <Select value={poderes.forma} onValueChange={(value) => onChange({ forma: value as ExigenciaAssinatura })}>
          <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
          <SelectContent>{EXIGENCIAS.map((opcao) => <SelectItem key={opcao.value} value={opcao.value}>{opcao.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className={labelCls}>Exceções por tipo de ato</Label>
        {poderes.excecoes.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Sem exceções: a forma acima vale para todos os atos.</p>
        )}
        {poderes.excecoes.map((excecao, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={excecao.atos}
              onChange={(event) => setExcecao(index, { atos: event.target.value })}
              placeholder="Atos (ex.: alienar imóveis, avalizar, atos da cláusula sexta)"
              className={`${fieldCls} flex-1`}
            />
            <Select value={excecao.exigencia} onValueChange={(value) => setExcecao(index, { exigencia: value as ExigenciaAssinatura })}>
              <SelectTrigger className={`${fieldCls} w-56 shrink-0`} aria-label={`Exigência da exceção ${index + 1}`}><SelectValue /></SelectTrigger>
              <SelectContent>{EXIGENCIAS.map((opcao) => <SelectItem key={opcao.value} value={opcao.value}>{opcao.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button
              type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive"
              aria-label={`Remover exceção ${index + 1}`}
              onClick={() => onChange({ excecoes: poderes.excecoes.filter((_, i) => i !== index) })}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button" variant="ghost" size="sm"
          className="h-8 w-full justify-start gap-1.5 border border-dashed border-osg-200 text-muted-foreground hover:text-osg-700"
          onClick={() => onChange({ excecoes: [...poderes.excecoes, { atos: '', exigencia: 'conjunta' }] })}
        >
          <Plus className="h-3.5 w-3.5" />Adicionar exceção
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className={labelCls}>Observação sobre os poderes</Label>
        <Textarea
          value={poderes.observacao}
          onChange={(event) => onChange({ observacao: event.target.value })}
          placeholder="O que a estrutura acima não descreve (limites de valor, vigência de mandato, remissões a cláusulas)."
          className={`min-h-[64px] ${textareaCls}`}
        />
      </div>
    </div>
  );
}

function AdministradorRow({ administracao, isEditing, onEdit, onDelete }: {
  administracao: AdministracaoEnriched; isEditing: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const formatData = (date: string) => { const [year, month, day] = date.split('-'); return `${day}/${month}/${year}`; };
  const vigente = !administracao.data_fim || administracao.data_fim >= new Date().toISOString().slice(0, 10);
  const poderes = lerPoderes(administracao.poderes, administracao.pode_isoladamente);
  return (
    <div className={`rounded-md border px-3 py-2 ${isEditing ? 'border-osg-200 bg-osg-50' : 'bg-muted/30'} ${!vigente ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{administracao.administrador_denominacao}</span>
            {administracao.cargo && <Badge variant="outline" className="text-[10px]">{administracao.cargo}</Badge>}
            <Badge variant={poderes.forma === 'isolada' ? 'default' : 'secondary'} className="text-[10px]">{descreverPoderes(poderes)}</Badge>
            <Badge variant={vigente ? 'default' : 'outline'} className="text-[10px]">{vigente ? 'Vigente' : 'Encerrada'}</Badge>
          </div>
          {poderes.excecoes.length > 0 && <ul className="text-xs text-muted-foreground">
            {poderes.excecoes.map((excecao, index) => <li key={index}>{descreverExcecao(excecao)}</li>)}
          </ul>}
          {poderes.observacao && <p className="text-xs text-muted-foreground">{poderes.observacao}</p>}
          {(administracao.data_inicio || administracao.data_fim) && <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {administracao.data_inicio && <span>Início: {formatData(administracao.data_inicio)}</span>}
            {administracao.data_fim && <span>Fim: {formatData(administracao.data_fim)}</span>}
          </div>}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <AlertDialog><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover administrador?</AlertDialogTitle><AlertDialogDescription>Remover o vínculo de {administracao.administrador_denominacao} como administrador(a) desta empresa.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Remover</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
