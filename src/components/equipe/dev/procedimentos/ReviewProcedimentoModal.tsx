import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, X, Plus, BarChart3 } from 'lucide-react';
import { Procedimento, useConfirmProcedimento, useUpdateProcedimento, useRetryProcedimento } from '@/hooks/useProcedimentos';

const PROCESSOS = [
  'EFD', 'XMLs', 'PERDCOMP', 'Selic', 'IBS/CBS',
  'Balancetes', 'PIS/COFINS', 'Cruzamento de Dados', 'Correções SPED',
];

const PROCESSO_COLORS: Record<string, string> = {
  'EFD': '#3B82F6', 'XMLs': '#8B5CF6', 'PERDCOMP': '#10B981', 'Selic': '#06B6D4',
  'IBS/CBS': '#F59E0B', 'Balancetes': '#EC4899', 'PIS/COFINS': '#6366F1',
  'Cruzamento de Dados': '#D97706', 'Correções SPED': '#EF4444',
};

const COMPLEXIDADE_CONFIG = {
  simples: { label: 'Simples', color: '#10B981' },
  intermediario: { label: 'Intermediário', color: '#F59E0B' },
  avancado: { label: 'Avançado', color: '#EF4444' },
};

interface ReviewProcedimentoModalProps {
  procedimento: Procedimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewProcedimentoModal({ procedimento, open, onOpenChange }: ReviewProcedimentoModalProps) {
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [etapas, setEtapas] = useState<string[]>([]);
  const [processos, setProcessos] = useState<string[]>([]);
  const [complexidade, setComplexidade] = useState<string>('intermediario');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newEtapa, setNewEtapa] = useState('');

  const confirmMutation = useConfirmProcedimento();
  const updateMutation = useUpdateProcedimento();
  const retryMutation = useRetryProcedimento();

  useEffect(() => {
    if (procedimento) {
      setTitulo(procedimento.ai_titulo || '');
      setResumo(procedimento.ai_resumo || '');
      setEtapas(Array.isArray(procedimento.ai_etapas) ? [...procedimento.ai_etapas] : []);
      setProcessos([...(procedimento.processos_associados || [])]);
      setComplexidade(procedimento.ai_complexidade || 'intermediario');
      setTags(Array.isArray(procedimento.ai_tags) ? [...procedimento.ai_tags] : []);
    }
  }, [procedimento]);

  if (!procedimento) return null;

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync({
      id: procedimento.id,
      updates: {
        ai_titulo: titulo,
        ai_resumo: resumo,
        ai_etapas: etapas as any,
        processos_associados: processos,
        ai_complexidade: complexidade as any,
        ai_tags: tags,
      },
    });
    onOpenChange(false);
  };

  const handleRegenerate = async () => {
    await retryMutation.mutateAsync(procedimento.id);
    onOpenChange(false);
  };

  const handleManual = () => {
    setTitulo('');
    setResumo('');
    setEtapas([]);
    setTags([]);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const addEtapa = () => {
    if (newEtapa.trim()) {
      setEtapas([...etapas, newEtapa.trim()]);
      setNewEtapa('');
    }
  };

  const complexConfig = complexidade ? COMPLEXIDADE_CONFIG[complexidade as keyof typeof COMPLEXIDADE_CONFIG] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar e Confirmar Procedimento</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-2">
          {/* Preview Column (40%) */}
          <div className="md:col-span-2 bg-slate-50 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Preview</h4>
            <div className="flex flex-wrap gap-1.5">
              {processos.map((proc) => {
                const color = PROCESSO_COLORS[proc] || '#6B7280';
                return (
                  <span key={proc} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}26`, color }}>
                    {proc}
                  </span>
                );
              })}
            </div>
            <h3 className="text-base font-semibold text-slate-900">{titulo || 'Sem título'}</h3>
            <p className="text-[13px] text-slate-500">{resumo || 'Sem resumo'}</p>
            {etapas.length > 0 && (
              <ul className="space-y-1">
                {etapas.map((e, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 flex-shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            )}
            {complexConfig && (
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" style={{ color: complexConfig.color }} />
                <span className="text-xs font-medium" style={{ color: complexConfig.color }}>{complexConfig.label}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600">{t}</span>
              ))}
            </div>
          </div>

          {/* Form Column (60%) */}
          <div className="md:col-span-3 space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div>
              <Label>Resumo ({resumo.length}/300)</Label>
              <Textarea value={resumo} onChange={(e) => setResumo(e.target.value.slice(0, 300))} maxLength={300} />
            </div>

            {/* Etapas */}
            <div>
              <Label>Etapas-chave</Label>
              <div className="space-y-1 mt-1">
                {etapas.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-slate-700">{i + 1}. {e}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEtapas(etapas.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="Nova etapa" value={newEtapa} onChange={(e) => setNewEtapa(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEtapa())} />
                  <Button size="sm" variant="outline" onClick={addEtapa}><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>

            {/* Processos */}
            <div>
              <Label>Processos associados</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PROCESSOS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={processos.includes(p)} onCheckedChange={() => setProcessos(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            {/* Complexidade */}
            <div>
              <Label>Complexidade</Label>
              <RadioGroup value={complexidade} onValueChange={setComplexidade} className="flex gap-4 mt-1">
                {Object.entries(COMPLEXIDADE_CONFIG).map(([key, cfg]) => (
                  <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <RadioGroupItem value={key} />
                    <span style={{ color: cfg.color }}>{cfg.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs gap-1">
                    {t}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input placeholder="Nova tag + Enter" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="outline" onClick={handleManual}>Preencher manualmente</Button>
          <Button variant="outline" onClick={handleRegenerate} disabled={retryMutation.isPending}>
            {retryMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Solicitar regeneração
          </Button>
          <Button onClick={handleConfirm} disabled={confirmMutation.isPending || !titulo.trim()}>
            {confirmMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Confirmar e publicar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
