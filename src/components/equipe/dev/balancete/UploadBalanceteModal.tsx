import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApiAuth } from '@/hooks/useApiAuth';
import { TABLE_NAMES, getApiUrl } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthYearPicker, monthYearToDateString } from '@/components/ui/month-year-picker';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2, AlertCircle } from 'lucide-react';

interface UploadBalanceteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadBalanceteModal = ({ open, onOpenChange }: UploadBalanceteModalProps) => {
  const { user } = useAuth();
  const { fetchWithAuth } = useApiAuth();

  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState<{ month: number; year: number } | null>(null);
  const [periodoFim, setPeriodoFim] = useState<{ month: number; year: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detalhamento, setDetalhamento] = useState<boolean | null>(null);
  const [showDetalhamentoPrompt, setShowDetalhamentoPrompt] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch clientes
  const { data: clientes } = useQuery({
    queryKey: ['upload-balancete-clientes', TABLE_NAMES.cliente],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAMES.cliente)
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch contribuintes filtered by client
  const { data: contribuintes } = useQuery({
    queryKey: ['upload-balancete-contribuintes', TABLE_NAMES.contribuinte, clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAMES.contribuinte)
        .select('id, nome_razao_social')
        .eq('cliente_id', clienteId)
        .order('nome_razao_social');
      if (error) throw error;
      return data;
    },
    enabled: open && !!clienteId,
  });

  // Fetch config when contribuinte changes
  useEffect(() => {
    if (!contribuinteId) {
      setDetalhamento(null);
      setShowDetalhamentoPrompt(false);
      return;
    }

    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('contribuinte_bal_config')
        .select('balancete_detalhamento')
        .eq('id_contribuinte', contribuinteId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar config:', error);
        setDetalhamento(null);
        setShowDetalhamentoPrompt(false);
        return;
      }

      if (data && data.balancete_detalhamento !== null) {
        setDetalhamento(data.balancete_detalhamento);
        setShowDetalhamentoPrompt(false);
      } else {
        setDetalhamento(null);
        setShowDetalhamentoPrompt(true);
      }
    };

    fetchConfig();
  }, [contribuinteId]);

  const handleDetalhamentoChoice = async (value: boolean) => {
    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from('contribuinte_bal_config')
        .upsert(
          { id_contribuinte: contribuinteId, balancete_detalhamento: value },
          { onConflict: 'id_contribuinte' }
        );
      if (error) throw error;
      setDetalhamento(value);
      setShowDetalhamentoPrompt(false);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar configuração', description: err.message, variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const resetForm = () => {
    setClienteId('');
    setContribuinteId('');
    setPeriodoInicio(null);
    setPeriodoFim(null);
    setFile(null);
    setDetalhamento(null);
    setShowDetalhamentoPrompt(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    if (!contribuinteId || !periodoInicio || !periodoFim || !file || detalhamento === null) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id_contribuinte', contribuinteId);
      formData.append('periodo_inicio', monthYearToDateString(periodoInicio, 'start'));
      formData.append('periodo_fim', monthYearToDateString(periodoFim, 'end'));
      formData.append('adicionado_por', user?.email || '');
      formData.append('detalhamento', String(detalhamento));
      formData.append('file', file);

      const response = await fetchWithAuth(getApiUrl('/api/v1/contabil/balancetes'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        const message = typeof detail === 'object' && detail?.error_message
          ? detail.error_message
          : typeof detail === 'string'
            ? detail
            : `Erro ${response.status}`;
        throw new Error(message);
      }

      toast({ title: 'Balancete enviado com sucesso!' });
      handleClose(false);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar balancete', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = contribuinteId && periodoInicio && periodoFim && file && detalhamento !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Balancete</DialogTitle>
          <DialogDescription>Selecione o contribuinte, período e o arquivo para upload.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContribuinteId(''); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contribuinte */}
          <div className="space-y-2">
            <Label>Contribuinte</Label>
            <Select value={contribuinteId} onValueChange={setContribuinteId} disabled={!clienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o contribuinte" /></SelectTrigger>
              <SelectContent>
                {contribuintes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detalhamento - prompt de primeira vez */}
          {showDetalhamentoPrompt && contribuinteId && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  O balancete deste contribuinte possui detalhamento?
                </p>
              </div>
              <div className="flex gap-2 ml-6">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingConfig}
                  onClick={() => handleDetalhamentoChoice(true)}
                  className="text-xs"
                >
                  Sim
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingConfig}
                  onClick={() => handleDetalhamentoChoice(false)}
                  className="text-xs"
                >
                  Não
                </Button>
                {savingConfig && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          )}

          {/* Detalhamento - switch normal */}
          {detalhamento !== null && contribuinteId && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="detalhamento-switch" className="text-sm">Detalhamento</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{detalhamento ? 'Sim' : 'Não'}</span>
                <Switch
                  id="detalhamento-switch"
                  checked={detalhamento}
                  onCheckedChange={setDetalhamento}
                />
              </div>
            </div>
          )}

          {/* Período Início */}
          <div className="space-y-2">
            <Label>Período Início</Label>
            <MonthYearPicker value={periodoInicio} onChange={setPeriodoInicio} placeholder="Mês/Ano início" />
          </div>

          {/* Período Fim */}
          <div className="space-y-2">
            <Label>Período Fim</Label>
            <MonthYearPicker value={periodoFim} onChange={setPeriodoFim} placeholder="Mês/Ano fim" />
          </div>

          {/* Arquivo */}
          <div className="space-y-2">
            <Label>Arquivo (.xlsx, .xls)</Label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
            </div>
            {file && <p className="text-xs text-slate-500">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
