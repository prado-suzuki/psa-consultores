import { useState } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useDecisoesData, type MembroDecisao } from '@/hooks/useDecisoesData';
import { useRegistrarDecisaoMetas } from '@/hooks/useDomainDesempenhoDecisoes';
import { useCreateComentario } from '@/hooks/useComentariosAvaliacao';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, DollarSign, AlertTriangle, CheckCircle, RefreshCw, type LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardDecisoes } from '@/lib/agenteContextoDesempenho';

interface AiRecommendation {
  membro_id: string;
  tipo_recomendacao?: string;
  justificativa?: string;
  percentual_reajuste_sugerido?: number;
}

interface AiResult {
  recomendacoes?: AiRecommendation[];
  sintese?: string;
}

/**
 * Cada recomendacao tem QUATRO tons, e nao dois, porque o cartao e o chip
 * pedem coisas diferentes: o fundo e area grande (tint), o traco e borda, e a
 * LETRA do chip precisa do degrau escuro para passar AA sobre o proprio tint.
 *
 * Antes eram dois hexadecimais de estoque do Tailwind por linha (emerald 50/300,
 * amber 50/300, red 50/300, slate 50/200) e o chip nascia de `border + '33'` --
 * concatenacao de alfa em hexadecimal, que e o truque que impedia a cor de vir
 * de token. Numa tela do Board, que agora veste o teal da marca, essas quatro
 * familias eram quatro paletas estranhas a tela.
 */
const recStyles: Record<string, { bg: string; border: string; chipBg: string; chipTxt: string; icon: LucideIcon; label: string }> = {
  promocao: { bg: 'var(--bd-go-t)', border: 'hsl(175 82% 29% / .3)', chipBg: 'var(--bd-go-t)', chipTxt: 'var(--bd-go-d)', icon: Star, label: 'Promocao' },
  reajuste: { bg: 'var(--bd-warn-t)', border: 'hsl(36 91% 43% / .32)', chipBg: 'var(--bd-warn-t)', chipTxt: 'var(--bd-warn-d)', icon: DollarSign, label: 'Reajuste' },
  acompanhamento: { bg: 'var(--bd-risk-t)', border: 'hsl(353 63% 51% / .3)', chipBg: 'var(--bd-risk-t)', chipTxt: 'var(--bd-risk-d)', icon: AlertTriangle, label: 'Acompanhamento' },
  manter: { bg: 'var(--bd-surface2)', border: 'var(--bd-line)', chipBg: 'var(--bd-surface2)', chipTxt: 'var(--bd-ink3)', icon: CheckCircle, label: 'Manter' },
};

const classifLabels: Record<string, string> = { supera: 'Supera', atende: 'Atende', atende_parcialmente: 'Parcial', abaixo: 'Abaixo' };
const classifColors: Record<string, string> = { supera: 'var(--board-green)', atende: 'var(--board-blue)', atende_parcialmente: 'var(--board-amber)', abaixo: 'var(--board-red)' };

const DesempenhoDecisoes = () => {
  const { user } = useAuth();
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: membros, isLoading } = useDecisoesData(cicloAtivo?.id);
  const registrarDecisaoMetas = useRegistrarDecisaoMetas();
  const createComentario = useCreateComentario();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [confirmModal, setConfirmModal] = useState<MembroDecisao | null>(null);
  const [confirmForm, setConfirmForm] = useState({ tipo: 'manter', cargo: '', percentual: '', dataVigencia: '', observacoes: '' });

  const handleGenerateAI = async () => {
    if (!cicloAtivo?.id) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-recomendacoes-pessoas', { body: { ciclo_id: cicloAtivo.id } });
      if (error) throw error;
      setAiResult(data);
    } catch (error: unknown) {
      toast({ title: 'Erro ao gerar recomendacoes', description: (error as { message?: string }).message, variant: 'destructive' });
    }
    setAiLoading(false);
  };

  const handleConfirm = async () => {
    if (!confirmModal || !cicloAtivo?.id) return;
    const decisao = confirmForm.tipo === 'promocao' ? 'promover' : confirmForm.tipo === 'reajuste' ? 'reajustar' : 'manter';
    await registrarDecisaoMetas.mutateAsync({
      cicloId: cicloAtivo.id,
      responsavelId: confirmModal.membro_id,
      decisao,
    });
    // Create comment
    if (confirmForm.observacoes) {
      createComentario.mutate({
        ciclo_id: cicloAtivo.id,
        autor_id: user?.id || '',
        destinatario_id: confirmModal.membro_id,
        tipo: 'lider_para_membro',
        conteudo: confirmForm.observacoes,
        visivel_para_membro: false,
      });
    }
    toast({ title: 'Decisao registrada' });
    setConfirmModal(null);
    setConfirmForm({ tipo: 'manter', cargo: '', percentual: '', dataVigencia: '', observacoes: '' });
  };

  const getAiRec = (membroId: string) => aiResult?.recomendacoes?.find((r) => r.membro_id === membroId);

  // ── O que o Agente PSA lê desta tela ───────────────────────────────────
  // Percentual de reajuste sugerido NÃO vai no snapshot, de propósito -- ver a
  // nota em `contextoBoardDecisoes`.
  useRegistrarContextoAgente('board.desempenho.decisoes', contextoBoardDecisoes({
    ciclo: cicloAtivo?.nome ?? null,
    sintese: aiResult?.sintese ?? null,
    // `null` e não `[]`: a consulta que ainda não respondeu não pode chegar
    // como "nenhuma pessoa no ciclo".
    membros: membros
      ? membros.map((m) => {
        const rec = getAiRec(m.membro_id);
        return {
          nome: `${m.first_name} ${m.last_name}`.trim(),
          ppr: m.ppr,
          classificacao: m.classificacao,
          metas: m.totalMetas,
          metasConcluidas: m.metasConcluidas,
          feedbacksPositivos: m.feedbacksPositivos,
          feedbacksDesenvolvimento: m.feedbacksDesenvolvimento,
          recomendacao: m.recomendacao_decisao,
          justificativa: rec?.justificativa ?? null,
        };
      })
      : null,
    falhas: [],
  }), isLoading);

  return (
    <BoardLayout title="Decisoes" subtitle="Recomendacoes de IA para promocao, reajuste e acompanhamento">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-bold" style={{ fontFamily: "'Instrument Sans', sans-serif", color: 'var(--board-t1)' }}>Decisoes de Pessoas</h2>
            <p className="text-[12.5px]" style={{ color: 'var(--board-t3)' }}>Recomendacoes baseadas nos dados do ciclo {cicloAtivo?.nome || ''}</p>
          </div>
          <Button onClick={handleGenerateAI} disabled={aiLoading || !cicloAtivo} size="sm">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${aiLoading ? 'animate-spin' : ''}`} /> {aiLoading ? 'Gerando...' : 'Gerar Recomendacoes'}
          </Button>
        </div>

        {/* REMOVIDO (21/08): o cartão "Sintese de Recomendacoes" era um bloco
            de análise de IA no meio da tela. A síntese continua sendo gerada
            pelo botão acima -- é ela que preenche a justificativa de cada
            linha -- mas o TEXTO dela passou a viver no snapshot publicado para
            o Agente PSA, no ícone ao lado do título, rotulado como texto de
            modelo e não como número apurado da tela. */}

        {isLoading ? <Skeleton className="h-64" /> : (
          <div className="space-y-3">
            {membros?.map(m => {
              const aiRec = getAiRec(m.membro_id);
              const tipo = aiRec?.tipo_recomendacao || (m.ppr >= 100 ? 'promocao' : m.ppr >= 85 ? 'manter' : m.ppr >= 70 ? 'reajuste' : 'acompanhamento');
              const style = recStyles[tipo] || recStyles.manter;
              const RecIcon = style.icon;
              return (
                <div key={m.membro_id} className="rounded-xl p-4 transition-all" style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <RecIcon className="h-4 w-4" style={{ color: style.chipTxt }} />
                    <div className="w-[28px] h-[28px] rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--bd-accent-d)' }}>
                      {(m.first_name?.[0] ?? '') + (m.last_name?.[0] ?? '')}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--board-t1)' }}>{m.first_name} {m.last_name}</p>
                    </div>
                    <Badge className="board-chip" style={{ background: style.chipBg, color: style.chipTxt, border: `1px solid ${style.border}` }}>{style.label}</Badge>
                  </div>
                  {aiRec?.justificativa && <p className="text-[12px] mb-3" style={{ color: 'var(--board-t2)' }}>{aiRec.justificativa}</p>}
                  <div className="flex items-center gap-4 text-[11px] mb-3" style={{ color: 'var(--board-t3)' }}>
                    <span>PPR: <strong style={{ color: classifColors[m.classificacao] }}>{m.ppr}%</strong></span>
                    <span>Classif: <strong style={{ color: classifColors[m.classificacao] }}>{classifLabels[m.classificacao]}</strong></span>
                    <span>Metas: {m.metasConcluidas}/{m.totalMetas}</span>
                    <span>FB+: {m.feedbacksPositivos}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => { setConfirmModal(m); setConfirmForm({ tipo: tipo === 'promocao' ? 'promocao' : tipo === 'reajuste' ? 'reajuste' : 'manter', cargo: '', percentual: aiRec?.percentual_reajuste_sugerido?.toString() || '', dataVigencia: '', observacoes: '' }); }}>
                      Confirmar decisao
                    </Button>
                    {!m.recomendacao_decisao && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" style={{ color: 'var(--board-t3)' }}>Ignorar</Button>
                    )}
                    {m.recomendacao_decisao && <Badge className="board-chip" style={{ background: 'var(--board-green-s)', color: 'var(--board-green)' }}>Decidido: {m.recomendacao_decisao}</Badge>}
                  </div>
                </div>
              );
            })}
            {(!membros || membros.length === 0) && <p className="text-sm text-center py-8" style={{ color: 'var(--board-t3)' }}>Nenhum membro com metas no ciclo ativo.</p>}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={!!confirmModal} onOpenChange={() => setConfirmModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar Decisao — {confirmModal?.first_name} {confirmModal?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={confirmForm.tipo} onValueChange={v => setConfirmForm({ ...confirmForm, tipo: v })}>
              <div className="flex items-center gap-2"><RadioGroupItem value="promocao" id="d-prom" /><Label htmlFor="d-prom">Promocao</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="reajuste" id="d-reaj" /><Label htmlFor="d-reaj">Reajuste</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="manter" id="d-manter" /><Label htmlFor="d-manter">Sem acao</Label></div>
            </RadioGroup>
            {confirmForm.tipo === 'promocao' && <div><Label>Novo cargo</Label><Input value={confirmForm.cargo} onChange={e => setConfirmForm({ ...confirmForm, cargo: e.target.value })} /></div>}
            {confirmForm.tipo === 'reajuste' && <div><Label>Percentual de reajuste (%)</Label><Input type="number" value={confirmForm.percentual} onChange={e => setConfirmForm({ ...confirmForm, percentual: e.target.value })} /></div>}
            <div><Label>Data de vigencia</Label><Input type="date" value={confirmForm.dataVigencia} onChange={e => setConfirmForm({ ...confirmForm, dataVigencia: e.target.value })} /></div>
            <div><Label>Observacoes internas</Label><Textarea value={confirmForm.observacoes} onChange={e => setConfirmForm({ ...confirmForm, observacoes: e.target.value })} placeholder="Nao visivel ao membro" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModal(null)}>Cancelar</Button>
            <Button onClick={handleConfirm}>Confirmar e registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardLayout>
  );
};

export default DesempenhoDecisoes;
