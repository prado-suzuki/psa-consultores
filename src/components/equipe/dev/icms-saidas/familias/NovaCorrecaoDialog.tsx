import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import {
  useCreateCorrecaoIcms,
  type FamiliaCorrecao,
} from '@/hooks/useCorrecoesIcms';

interface NovaCorrecaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familia: FamiliaCorrecao;
  contribuinteId: string;
}

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'competencia' | 'textarea';
  required?: boolean;
  /** Onde salvar — 'top' = coluna dedicada da tabela; 'campos' = jsonb */
  target: 'top' | 'campos';
  /** Nome canônico no jsonb (quando target=campos) */
  canon?: string;
}

const FIELDS: Record<FamiliaCorrecao, FieldDef[]> = {
  acucar: [
    { key: 'data_lancamento', label: 'Data', type: 'date', required: true, target: 'top' },
    { key: 'descricao', label: 'Descrição', type: 'textarea', required: true, target: 'top' },
    { key: 'produto', label: 'Produto', type: 'text', target: 'top' },
    { key: 'aliquota', label: 'Alíquota (%)', type: 'number', target: 'campos', canon: 'ALIQUOTA' },
    { key: 'valor', label: 'Valor', type: 'number', target: 'campos', canon: 'VALOR_MERCADORIA' },
    { key: 'credito', label: 'Crédito', type: 'number', target: 'campos', canon: 'VALOR_CREDITO' },
    { key: 'fundes', label: 'FUNDES 6%', type: 'number', target: 'campos', canon: 'FUNDES' },
    { key: 'funded', label: 'FUNDED 1%', type: 'number', target: 'campos', canon: 'FUNDED' },
  ],
  etanol_interestado: [
    { key: 'competencia', label: 'Competência', type: 'competencia', required: true, target: 'top' },
    { key: 'data_lancamento', label: 'Data', type: 'date', required: true, target: 'top' },
    { key: 'descricao', label: 'Descrição', type: 'textarea', required: true, target: 'top' },
    { key: 'produto', label: 'Produto', type: 'text', target: 'top' },
    { key: 'icms_12', label: 'ICMS 12%', type: 'number', target: 'campos', canon: 'ICMS_12' },
    { key: 'valor', label: 'Valor', type: 'number', target: 'campos', canon: 'VALOR_MERCADORIA' },
    { key: 'icms', label: 'ICMS', type: 'number', target: 'campos', canon: 'VALOR_ICMS' },
    {
      key: 'credito_outor',
      label: 'Crédito Outor. 73,3333% / 0,21/L',
      type: 'number',
      target: 'campos',
      canon: 'CREDITO_OUTORGADO',
    },
    { key: 'fundeic', label: 'FUNDEIC 1%', type: 'number', target: 'campos', canon: 'FUNDEIC' },
    { key: 'funded', label: 'FUNDED 1%', type: 'number', target: 'campos', canon: 'FUNDED' },
  ],
  biodiesel: [
    { key: 'competencia', label: 'Competência', type: 'competencia', required: true, target: 'top' },
    { key: 'data_lancamento', label: 'Data', type: 'date', required: true, target: 'top' },
    { key: 'descricao', label: 'Descrição', type: 'textarea', required: true, target: 'top' },
    { key: 'produto', label: 'Produto', type: 'text', target: 'top' },
    {
      key: 'credito_outor',
      label: 'Crédito Outor. 85%',
      type: 'number',
      target: 'campos',
      canon: 'CREDITO_OUTORGADO',
    },
    { key: 'icms_devido', label: 'ICMS Devido', type: 'number', target: 'campos', canon: 'ICMS_DEVIDO' },
    { key: 'fundeic', label: 'FUNDEIC 1%', type: 'number', target: 'campos', canon: 'FUNDEIC' },
    { key: 'funded', label: 'FUNDED 1%', type: 'number', target: 'campos', canon: 'FUNDED' },
  ],
};

const FAMILIA_LABEL: Record<FamiliaCorrecao, string> = {
  acucar: 'Açúcar',
  etanol_interestado: 'Etanol Interestadual',
  biodiesel: 'Biodiesel',
};

const parseNumberBR = (raw: string): number | null => {
  if (!raw) return null;
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

export function NovaCorrecaoDialog({
  open,
  onOpenChange,
  familia,
  contribuinteId,
}: NovaCorrecaoDialogProps) {
  const { toast } = useToast();
  const fields = FIELDS[familia];
  const [values, setValues] = useState<Record<string, string>>({});
  const create = useCreateCorrecaoIcms();

  const handleClose = () => {
    if (create.isPending) return;
    onOpenChange(false);
    setValues({});
  };

  const setField = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    // Validação básica
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        toast({
          title: 'Campo obrigatório',
          description: `Preencha o campo "${f.label}".`,
          variant: 'destructive',
        });
        return;
      }
    }

    const top: Record<string, string | null> = {
      contribuinte_id: contribuinteId,
      data_lancamento: '',
      descricao: '',
      produto: null,
      competencia: null,
    };
    const campos: Record<string, number | null> = {};

    fields.forEach((f) => {
      const raw = values[f.key]?.trim() ?? '';
      if (f.target === 'top') {
        top[f.key] = raw || null;
      } else if (f.canon) {
        campos[f.canon] = raw ? parseNumberBR(raw) : null;
      }
    });

    try {
      await create.mutateAsync({
        contribuinte_id: contribuinteId,
        familia,
        data_lancamento: String(top.data_lancamento),
        competencia: top.competencia ?? null,
        descricao: String(top.descricao),
        produto: top.produto,
        campos,
      });
      toast({ title: 'Correção adicionada com sucesso.' });
      onOpenChange(false);
      setValues({});
    } catch (err) {
      toast({
        title: 'Erro ao salvar correção',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova correção — {FAMILIA_LABEL[familia]}</DialogTitle>
          <DialogDescription>
            O lançamento será adicionado à tabela detalhada e somado ao Resumo Mensal do mês correspondente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {fields.map((f) => {
            const isFull = f.type === 'textarea';
            return (
              <div key={f.key} className={isFull ? 'sm:col-span-2' : undefined}>
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {f.label}
                  {f.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    value={values[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
                ) : f.type === 'date' ? (
                  <Input
                    type="date"
                    value={values[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="mt-1"
                  />
                ) : f.type === 'competencia' ? (
                  <Input
                    type="month"
                    value={values[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="mt-1"
                  />
                ) : f.type === 'number' ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={values[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="mt-1 font-mono text-right"
                  />
                ) : (
                  <Input
                    type="text"
                    value={values[f.key] ?? ''}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="mt-1"
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar correção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
