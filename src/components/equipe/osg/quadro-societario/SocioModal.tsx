import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { fieldCls, labelCls, FieldSection } from '@/components/equipe/osg/formKit';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useUpsertSocio, type SocioEnriched } from '@/hooks/useQuadroSocietario';

interface SocioModalProps {
  open: boolean;
  empresaPessoaId: string;
  empresaDenominacao: string;
  socio: SocioEnriched | null;
  pessoasCliente: PessoaRow[];
  sociosExistentes: SocioEnriched[];
  onClose: () => void;
}

type DraftSocio = {
  socioId: string;
  quotas: string;
  vlrTotal: string; // string numérica com ponto decimal (padrão CurrencyInput)
};

const emptyDraft = (): DraftSocio => ({ socioId: '', quotas: '', vlrTotal: '' });

const fromSocio = (s: SocioEnriched): DraftSocio => ({
  socioId: s.socio_pessoa_id,
  quotas: s.quotas != null ? String(s.quotas) : '',
  vlrTotal: s.vlr_total != null ? String(s.vlr_total) : '',
});

export function SocioModal({
  open, empresaPessoaId, empresaDenominacao, socio, pessoasCliente, sociosExistentes, onClose,
}: SocioModalProps) {
  const [draft, setDraft] = useState<DraftSocio>(emptyDraft);
  const upsert = useUpsertSocio();

  const initialDraftRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const initial = socio ? fromSocio(socio) : emptyDraft();
    setDraft(initial);
    initialDraftRef.current = JSON.stringify(initial);
  }, [open, socio]);

  const isEdit = !!socio?.id;
  const isDirty = JSON.stringify(draft) !== initialDraftRef.current;
  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  // Sócio pode ser PF ou PJ (PJ sócia é o caso comum: Participações é sócia da
  // Agro), mas nunca a própria empresa.
  const candidates = pessoasCliente.filter((p) => p.id !== empresaPessoaId);

  const handleSave = () => {
    if (!draft.socioId) {
      toast.error('Selecione o sócio');
      return;
    }
    if (draft.socioId === empresaPessoaId) {
      toast.error('A empresa não pode ser sócia de si mesma');
      return;
    }
    const duplicado = sociosExistentes.some(
      (s) => s.socio_pessoa_id === draft.socioId && s.id !== socio?.id,
    );
    if (duplicado) {
      toast.error('Este sócio já está no quadro desta empresa');
      return;
    }
    const quotas = draft.quotas.trim() ? Number(draft.quotas) : null;
    if (quotas != null && (!Number.isInteger(quotas) || quotas < 0)) {
      toast.error('Quotas deve ser um número inteiro maior ou igual a zero');
      return;
    }
    const vlrTotal = draft.vlrTotal.trim() ? Number(draft.vlrTotal) : null;
    if (vlrTotal != null && (!Number.isFinite(vlrTotal) || vlrTotal < 0)) {
      toast.error('Valor total inválido');
      return;
    }

    const entityName = candidates.find((p) => p.id === draft.socioId)?.denominacao ?? 'sócio';

    upsert.mutate(
      {
        values: {
          empresa_pessoa_id: empresaPessoaId,
          socio_pessoa_id: draft.socioId,
          quotas,
          vlr_total: vlrTotal,
        },
        original: socio,
        entityName,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <div className="shrink-0 bg-background px-6 pt-5">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                {isEdit ? 'Editar sócio' : 'Vincular sócio'}
                <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">
                  {empresaDenominacao}
                </span>
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FieldSection number="01" title="Sócio">
              <div className="space-y-1.5">
                <Label className={labelCls}>Sócio (PF ou PJ)<RequiredMark /></Label>
                <Select
                  value={draft.socioId || undefined}
                  onValueChange={(v) => setDraft((prev) => ({ ...prev, socioId: v }))}
                >
                  <SelectTrigger className={fieldCls}>
                    <SelectValue
                      placeholder={candidates.length ? 'Selecione...' : 'Nenhuma pessoa cadastrada'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.denominacao}{p.cpf_cnpj ? ` (${p.cpf_cnpj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FieldSection>

            <FieldSection number="02" title="Participação">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Quotas</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.quotas}
                    onChange={(e) => setDraft((prev) => ({ ...prev, quotas: e.target.value }))}
                    placeholder="0"
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Valor total (R$)</Label>
                  <CurrencyInput
                    value={draft.vlrTotal}
                    onChange={(raw) => setDraft((prev) => ({ ...prev, vlrTotal: raw }))}
                    className={fieldCls}
                  />
                </div>
              </div>
            </FieldSection>
          </div>

          <DialogFooter className="shrink-0 border-t border-osg-100 bg-background px-6 py-3.5">
            <Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={upsert.isPending}
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
            >
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Salvar alterações' : 'Vincular sócio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesAlert {...alertProps} />
    </>
  );
}
