import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Pencil, Plus, PackageSearch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRegrasNCM } from '@/hooks/useRegrasNCM';
import { useSetoresCliente } from '@/hooks/useSetorCliente';
import { RegraFormSheet } from './RegraFormSheet';
import type { Database } from '@/integrations/supabase/types';

type RegraNCMRow = Database['public']['Tables']['pis_cofins_regra']['Row'];
type ModalMode = 'view' | 'edit' | 'create';

const formatYYYYMM = (val: number | null | undefined) => {
  if (!val) return null;
  const y = Math.floor(val / 100);
  const m = val % 100;
  return `${String(m).padStart(2, '0')}/${y}`;
};

interface NcmRegrasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ncm: string | null;
}

/* ── Card colapsável de regra ── */
const RegraCard = ({
  regra,
  setorNome,
  onEdit,
}: {
  regra: RegraNCMRow;
  setorNome: string;
  onEdit: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <span className="text-sm font-medium truncate">{setorNome}</span>
              <Badge variant="outline" className="font-mono text-[11px] shrink-0">
                CST {regra.cst_pis}
              </Badge>
              {regra.permite_credito === 'S' ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[11px] shrink-0">
                  Crédito
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[11px] shrink-0">
                  Sem crédito
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Descrição CST" value={regra.desc_cst} />
              <Field label="Tipo de Crédito" value={regra.tipo_credito} />
              <Field label="Base Legal" value={regra.base_legal} />
              <div />
              <Field label="Vigência Início" value={formatYYYYMM(regra.data_vigencia_inicio)} />
              <Field label="Vigência Fim" value={formatYYYYMM(regra.data_vigencia_fim)} />
              <Field label="Observações" value={regra.observacoes} />
            </div>

            {((regra as any).updated_at || (regra as any).updated_by) && (
              <div className="border-t pt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                {(regra as any).updated_at && (
                  <span>Atualizado em {format(new Date((regra as any).updated_at), 'dd/MM/yyyy HH:mm')}</span>
                )}
                {(regra as any).updated_by && <span>por {(regra as any).updated_by}</span>}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50"
                onClick={onEdit}
              >
                <Pencil size={14} /> Editar
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <p className="text-sm mt-0.5">{value || '—'}</p>
  </div>
);

/* ── Modal principal ── */
export const NcmRegrasModal = ({ open, onOpenChange, ncm }: NcmRegrasModalProps) => {
  const { regras, isLoading, createRegra, updateRegra } = useRegrasNCM();
  const { data: setores = [] } = useSetoresCliente();

  const setorMap = useMemo(
    () => Object.fromEntries(setores.map((s) => [s.id, s])),
    [setores],
  );

  const filtered = useMemo(
    () => (ncm ? regras.filter((r) => r.cod_ncm === ncm) : []),
    [regras, ncm],
  );

  // RegraFormSheet state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<ModalMode>('create');
  const [formRegra, setFormRegra] = useState<RegraNCMRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = () => {
    setFormRegra(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const openEdit = (regra: RegraNCMRow) => {
    setFormRegra(regra);
    setFormMode('view');
    setFormOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      if (formMode === 'create') {
        await createRegra.mutateAsync({ ...values, cod_ncm: ncm ?? values.cod_ncm });
      } else if (formMode === 'edit' && formRegra) {
        await updateRegra.mutateAsync({ id: formRegra.id, ...values });
      }
      setFormOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-teal-600" />
              Regras NCM {ncm}
            </DialogTitle>
            <DialogDescription>
              {filtered.length === 0 && !isLoading
                ? 'Nenhuma regra cadastrada para este NCM.'
                : `${filtered.length} regra(s) encontrada(s) no mapa fiscal.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando regras…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <PackageSearch className="h-10 w-10 opacity-40" />
                <p className="text-sm">Nenhuma regra para o NCM <code className="font-mono font-semibold text-foreground">{ncm}</code></p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50 mt-2"
                  onClick={openCreate}
                >
                  <Plus size={14} /> Adicionar Regra
                </Button>
              </div>
            ) : (
              filtered.map((regra) => (
                <RegraCard
                  key={regra.id}
                  regra={regra}
                  setorNome={setorMap[regra.id_segmento ?? '']?.nome ?? 'Sem setor'}
                  onEdit={() => openEdit(regra)}
                />
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <DialogFooter className="pt-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50"
                onClick={openCreate}
              >
                <Plus size={14} /> Adicionar Regra
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <RegraFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        regra={formRegra}
        mode={formMode}
        onModeChange={setFormMode}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        setores={setores}
        setorMap={setorMap}
      />
    </>
  );
};
