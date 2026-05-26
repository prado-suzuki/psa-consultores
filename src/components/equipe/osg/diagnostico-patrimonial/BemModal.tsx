import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, FileText, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import {
  useUpsertBem,
  useMatriculasByBem,
  useDeleteMatricula,
  useSetMatriculaBem,
  TIPO_BEM_OPTIONS,
  type BemRow,
  type MatriculaRow,
  type TipoBem,
} from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQuadroSocietario';
import { MatriculaModal } from './MatriculaModal';
import { VincularMatriculaDialog } from './VincularMatriculaDialog';

const STATUS_INTEGRALIZACAO_OPTIONS = [
  'Pendente', 'Em análise', 'Aprovado', 'Integralizado', 'Recusado', 'Não se aplica',
];

interface BemModalProps {
  open: boolean;
  clienteId: string;
  bem: BemRow | null;
  pessoasCliente: PessoaRow[];
  onClose: () => void;
}

type DraftBem = {
  referencia_dp: string;
  tipo_bem: TipoBem;
  denominacao: string;
  vlr_contabil: string;
  vlr_contabil_ajustado: string;
  vlr_benfeitorias: string;
  vlr_mercado: string;
  vlr_imposto_anual: string;
  imposto_anual_exercicio: string;
  ccir_codigo: string;
  inscricao_municipal: string;
  status_integralizacao: string;
  empresa_destino_pessoa_id: string;
  participa_estruturacao: boolean;
  motivo_nao_integralizacao: string;
  observacao: string;
};

const emptyDraft = (): DraftBem => ({
  referencia_dp: '',
  tipo_bem: 'IR',
  denominacao: '',
  vlr_contabil: '',
  vlr_contabil_ajustado: '',
  vlr_benfeitorias: '',
  vlr_mercado: '',
  vlr_imposto_anual: '',
  imposto_anual_exercicio: '',
  ccir_codigo: '',
  inscricao_municipal: '',
  status_integralizacao: '',
  empresa_destino_pessoa_id: '',
  participa_estruturacao: true,
  motivo_nao_integralizacao: '',
  observacao: '',
});

const fromBem = (b: BemRow): DraftBem => ({
  referencia_dp: b.referencia_dp ?? '',
  tipo_bem: (b.tipo_bem as TipoBem) ?? 'IR',
  denominacao: b.denominacao ?? '',
  vlr_contabil: b.vlr_contabil != null ? String(b.vlr_contabil) : '',
  vlr_contabil_ajustado: b.vlr_contabil_ajustado != null ? String(b.vlr_contabil_ajustado) : '',
  vlr_benfeitorias: b.vlr_benfeitorias != null ? String(b.vlr_benfeitorias) : '',
  vlr_mercado: b.vlr_mercado != null ? String(b.vlr_mercado) : '',
  vlr_imposto_anual: b.vlr_imposto_anual != null ? String(b.vlr_imposto_anual) : '',
  imposto_anual_exercicio: b.imposto_anual_exercicio != null ? String(b.imposto_anual_exercicio) : '',
  ccir_codigo: b.ccir_codigo ?? '',
  inscricao_municipal: b.inscricao_municipal ?? '',
  status_integralizacao: b.status_integralizacao ?? '',
  empresa_destino_pessoa_id: b.empresa_destino_pessoa_id ?? '',
  participa_estruturacao: b.participa_estruturacao ?? true,
  motivo_nao_integralizacao: b.motivo_nao_integralizacao ?? '',
  observacao: b.observacao ?? '',
});

export function BemModal({ open, clienteId, bem, pessoasCliente, onClose }: BemModalProps) {
  const [draft, setDraft] = useState<DraftBem>(emptyDraft);
  const upsert = useUpsertBem();
  const { data: matriculas = [], isLoading: loadingMatriculas } = useMatriculasByBem(bem?.id ?? null);
  const deleteMatricula = useDeleteMatricula();
  const setMatriculaBem = useSetMatriculaBem();

  const [matriculaModal, setMatriculaModal] = useState<{ open: boolean; matricula: MatriculaRow | null }>({
    open: false, matricula: null,
  });
  const [vincularOpen, setVincularOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(bem ? fromBem(bem) : emptyDraft());
  }, [open, bem]);

  const isEdit = !!bem?.id;
  const isImovel = draft.tipo_bem === 'IR' || draft.tipo_bem === 'IB';
  const isImovelRural = draft.tipo_bem === 'IR';

  const setField = <K extends keyof DraftBem>(field: K, value: DraftBem[K]) => {
    setDraft((p) => ({ ...p, [field]: value }));
  };

  const pjs = useMemo(
    () => pessoasCliente.filter((p) => p.tipo_pessoa === 'PJ'),
    [pessoasCliente],
  );

  const handleSave = () => {
    if (!draft.referencia_dp.trim()) {
      toast.error('Referência DP é obrigatória');
      return;
    }
    if (!draft.denominacao.trim()) {
      toast.error('Denominação é obrigatória');
      return;
    }
    if (!draft.vlr_contabil.trim() || isNaN(Number(draft.vlr_contabil))) {
      toast.error('Valor contábil é obrigatório');
      return;
    }
    if (!draft.vlr_mercado.trim() || isNaN(Number(draft.vlr_mercado))) {
      toast.error('Valor de mercado é obrigatório');
      return;
    }

    const nullify = (v: string) => (v.trim() ? v : null);
    const toNum = (v: string) => (v.trim() && !isNaN(Number(v)) ? Number(v) : null);
    const toInt = (v: string) => (v.trim() && !isNaN(parseInt(v, 10)) ? parseInt(v, 10) : null);

    const values = {
      cliente_id: clienteId,
      referencia_dp: draft.referencia_dp.trim(),
      tipo_bem: draft.tipo_bem,
      denominacao: draft.denominacao.trim(),
      vlr_contabil: Number(draft.vlr_contabil),
      vlr_contabil_ajustado: toNum(draft.vlr_contabil_ajustado),
      vlr_benfeitorias: toNum(draft.vlr_benfeitorias),
      vlr_mercado: Number(draft.vlr_mercado),
      vlr_imposto_anual: toNum(draft.vlr_imposto_anual),
      imposto_anual_exercicio: toInt(draft.imposto_anual_exercicio),
      ccir_codigo: isImovelRural ? nullify(draft.ccir_codigo) : null,
      inscricao_municipal: draft.tipo_bem === 'IB' ? nullify(draft.inscricao_municipal) : null,
      status_integralizacao: nullify(draft.status_integralizacao),
      empresa_destino_pessoa_id: draft.empresa_destino_pessoa_id || null,
      participa_estruturacao: draft.participa_estruturacao,
      motivo_nao_integralizacao: !draft.participa_estruturacao ? nullify(draft.motivo_nao_integralizacao) : null,
      observacao: nullify(draft.observacao),
    };

    upsert.mutate(
      { values, original: bem },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `Editar bem — ${bem?.referencia_dp}` : 'Novo bem'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Referência DP<RequiredMark />
                </Label>
                <Input
                  value={draft.referencia_dp}
                  onChange={(e) => setField('referencia_dp', e.target.value)}
                  placeholder="ex: IR-01"
                  className="h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Tipo de bem<RequiredMark />
                </Label>
                <Select
                  value={draft.tipo_bem}
                  onValueChange={(v: TipoBem) => setField('tipo_bem', v)}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_BEM_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="font-mono mr-2">{o.value}</span>{o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex items-end gap-2">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={draft.participa_estruturacao}
                    onCheckedChange={(v) => setField('participa_estruturacao', v)}
                  />
                  <Label className="text-sm">Participa da estruturação</Label>
                </div>
              </div>
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Denominação<RequiredMark />
                </Label>
                <Input
                  value={draft.denominacao}
                  onChange={(e) => setField('denominacao', e.target.value)}
                  placeholder="Nome do bem / fazenda / propriedade"
                  className="h-9"
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Valores</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Vlr. contábil<RequiredMark />
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.vlr_contabil}
                    onChange={(e) => setField('vlr_contabil', e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Vlr. contábil ajustado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.vlr_contabil_ajustado}
                    onChange={(e) => setField('vlr_contabil_ajustado', e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Vlr. benfeitorias</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.vlr_benfeitorias}
                    onChange={(e) => setField('vlr_benfeitorias', e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Vlr. mercado<RequiredMark />
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.vlr_mercado}
                    onChange={(e) => setField('vlr_mercado', e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {isImovelRural ? 'ITR anual' : draft.tipo_bem === 'IB' ? 'IPTU anual' : 'Imposto anual'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.vlr_imposto_anual}
                    onChange={(e) => setField('vlr_imposto_anual', e.target.value)}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Exercício</Label>
                  <Input
                    type="number"
                    value={draft.imposto_anual_exercicio}
                    onChange={(e) => setField('imposto_anual_exercicio', e.target.value)}
                    placeholder="ex: 2025"
                    className="h-9 font-mono"
                  />
                </div>
              </div>
            </div>

            {isImovel && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Cadastros oficiais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {isImovelRural && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">CCIR</Label>
                        <Input
                          value={draft.ccir_codigo}
                          onChange={(e) => setField('ccir_codigo', e.target.value)}
                          className="h-9 font-mono"
                        />
                      </div>
                    )}
                    {draft.tipo_bem === 'IB' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Inscrição municipal</Label>
                        <Input
                          value={draft.inscricao_municipal}
                          onChange={(e) => setField('inscricao_municipal', e.target.value)}
                          className="h-9 font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Integralização</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Status integralização</Label>
                  <Select
                    value={draft.status_integralizacao || undefined}
                    onValueChange={(v) => setField('status_integralizacao', v)}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {STATUS_INTEGRALIZACAO_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">PJ de destino</Label>
                  <Select
                    value={draft.empresa_destino_pessoa_id || undefined}
                    onValueChange={(v) => setField('empresa_destino_pessoa_id', v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={pjs.length ? 'Selecione...' : 'Cadastre uma PJ no Quadro Societário'} />
                    </SelectTrigger>
                    <SelectContent>
                      {pjs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.denominacao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!draft.participa_estruturacao && (
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Motivo de não integralização
                    </Label>
                    <Textarea
                      value={draft.motivo_nao_integralizacao}
                      onChange={(e) => setField('motivo_nao_integralizacao', e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Observação</Label>
              <Textarea
                value={draft.observacao}
                onChange={(e) => setField('observacao', e.target.value)}
                className="min-h-[60px]"
              />
            </div>

            {isImovel && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">
                      Matrículas ({matriculas.length})
                    </h4>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!isEdit}
                        onClick={() => setVincularOpen(true)}
                      >
                        <Link2 className="h-3.5 w-3.5" /> Vincular existente
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!isEdit}
                        onClick={() => setMatriculaModal({ open: true, matricula: null })}
                      >
                        <Plus className="h-3.5 w-3.5" /> Nova matrícula
                      </Button>
                    </div>
                  </div>
                  {!isEdit ? (
                    <p className="text-xs text-muted-foreground italic">
                      Salve o bem primeiro para cadastrar matrículas.
                    </p>
                  ) : loadingMatriculas ? (
                    <p className="text-xs text-muted-foreground">Carregando...</p>
                  ) : matriculas.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center text-muted-foreground text-sm">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhuma matrícula cadastrada.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-1.5">
                      {matriculas.map((m) => (
                        <MatriculaCard
                          key={m.id}
                          matricula={m}
                          onEdit={() => setMatriculaModal({ open: true, matricula: m })}
                          onUnlink={() => setMatriculaBem.mutate({ matricula: m, bemId: null })}
                          onDelete={() => deleteMatricula.mutate(m)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={upsert.isPending}>Cancelar</Button>
            <Button onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Salvar alterações' : 'Cadastrar bem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bem && (
        <MatriculaModal
          open={matriculaModal.open}
          bemId={bem.id}
          bemTipo={bem.tipo_bem}
          matricula={matriculaModal.matricula}
          pessoasCliente={pessoasCliente}
          matriculasDoBem={matriculas}
          onClose={() => setMatriculaModal({ open: false, matricula: null })}
        />
      )}

      {bem && (
        <VincularMatriculaDialog
          open={vincularOpen}
          bemId={bem.id}
          clienteId={clienteId}
          onClose={() => setVincularOpen(false)}
        />
      )}
    </>
  );
}

interface MatriculaCardProps {
  matricula: MatriculaRow;
  onEdit: () => void;
  onUnlink: () => void;
  onDelete: () => void;
}

function MatriculaCard({ matricula, onEdit, onUnlink, onDelete }: MatriculaCardProps) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 flex items-start gap-2">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-[10px] font-mono">Mat. {matricula.numero}</Badge>
          <span className="text-sm text-muted-foreground">
            {matricula.municipio_imovel}/{matricula.uf_imovel}
          </span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Área doc: <span className="font-mono">{matricula.area_documento} {matricula.area_unidade}</span></span>
          <span>Área real: <span className="font-mono">{matricula.area_real} {matricula.area_unidade}</span></span>
          {matricula.georreferenciado && (
            <span>Georref: <span className="font-medium">{matricula.georreferenciado}</span></span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7" title="Desvincular do bem">
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desvincular matrícula?</AlertDialogTitle>
              <AlertDialogDescription>
                A matrícula {matricula.numero} será desvinculada deste bem e voltará ao estado órfã
                (sem bem). Ela não será excluída — titulares e impedimentos são preservados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onUnlink}>Desvincular</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover matrícula?</AlertDialogTitle>
              <AlertDialogDescription>
                Remover a matrícula {matricula.numero}? Os titulares e impedimentos vinculados também serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onDelete}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
