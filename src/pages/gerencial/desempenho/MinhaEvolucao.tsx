import { useState, useEffect } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCiclosAvaliacao, useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useMinhaEvolucao } from '@/hooks/useMinhaEvolucao';
import { useComentarios, useCreateComentario, useUpdateComentario, useMarkComentarioRead } from '@/hooks/useComentariosAvaliacao';
import { useUpdateMetaProgress } from '@/hooks/useMetasDesempenho';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, MessageSquare, Send, Edit3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const classifLabels: Record<string, string> = { supera: 'Supera', atende: 'Atende', atende_parcialmente: 'Parcial', abaixo: 'Abaixo' };
const classifColors: Record<string, string> = { supera: '#065F46', atende: '#1E40AF', atende_parcialmente: '#92400E', abaixo: '#991B1B' };
const classifBgs: Record<string, string> = { supera: '#F0FDF4', atende: '#EFF6FF', atende_parcialmente: '#FFFBEB', abaixo: '#FFF8F8' };
const dimensaoLabels: Record<string, string> = { entrega: 'Entrega', impacto: 'Impacto', gestao: 'Gestao' };

const MinhaEvolucao = () => {
  const { user } = useAuth();
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const [selectedCicloId, setSelectedCicloId] = useState<string>('');
  const cicloId = selectedCicloId || cicloAtivo?.id || '';
  const { data: evolucao, isLoading } = useMinhaEvolucao(cicloId);
  const { data: comentariosLider } = useComentarios({ ciclo_id: cicloId, destinatario_id: user?.id, tipo: 'lider_para_membro' });
  const { data: meusPontosVista } = useComentarios({ ciclo_id: cicloId, destinatario_id: undefined, tipo: 'membro_ponto_vista' });
  const createComentario = useCreateComentario();
  const updateComentario = useUpdateComentario();
  const markRead = useMarkComentarioRead();
  const updateProgress = useUpdateMetaProgress();

  const [progressModal, setProgressModal] = useState<any>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressComment, setProgressComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [pontoVistaText, setPontoVistaText] = useState('');
  const [editingPonto, setEditingPonto] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();

  // Mark comments as read
  useEffect(() => {
    comentariosLider?.filter(c => !c.lido).forEach(c => markRead.mutate(c.id));
  }, [comentariosLider]);

  // Profiles for comment authors
  const { data: profiles } = useQuery({
    queryKey: ['profiles_for_comments'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as any[];
    },
  });
  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) ?? []);

  const handleProgressUpdate = () => {
    if (!progressModal) return;
    updateProgress.mutate({
      meta_id: progressModal.id,
      progresso_anterior: progressModal.progresso_atual,
      progresso_novo: progressValue,
      comentario: progressComment,
    }, { onSuccess: () => { setProgressModal(null); setProgressComment(''); } });
  };

  const handleReply = (autorId: string) => {
    if (!replyText.trim() || !cicloId || !user?.id) return;
    createComentario.mutate({
      ciclo_id: cicloId,
      autor_id: user.id,
      destinatario_id: autorId,
      tipo: 'membro_resposta',
      conteudo: replyText,
      visivel_para_membro: true,
    }, { onSuccess: () => { setReplyText(''); setReplyTo(null); } });
  };

  const handleAddPontoVista = () => {
    if (!pontoVistaText.trim() || !cicloId || !user?.id) return;
    createComentario.mutate({
      ciclo_id: cicloId,
      autor_id: user.id,
      destinatario_id: null,
      tipo: 'membro_ponto_vista',
      conteudo: pontoVistaText,
      visivel_para_membro: true,
    }, { onSuccess: () => setPontoVistaText('') });
  };

  const myPontosVista = (meusPontosVista ?? []).filter(c => c.autor_id === user?.id);
  const selectedCiclo = ciclos?.find(c => c.id === cicloId);
  const isCicloEncerrado = selectedCiclo?.status === 'encerrado';

  // PPR history chart
  const pprHistoryData = (evolucao?.ciclosEncerrados ?? []).map((c: any) => ({
    name: c.nome?.substring(0, 10) || '',
    ppr: 0, // Would need historical PPR data per cycle
  }));

  return (
    <BoardLayout title="Minha Evolucao" subtitle="Acompanhe seu desempenho">
      <div className="space-y-5">
        {/* Identity Header */}
        <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: 'linear-gradient(135deg, #5B6EF0, #8054F0)' }}>{initials}</div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{firstName} {lastName}</h2>
              <p className="text-slate-400 text-sm">Ciclo: {selectedCiclo?.nome || 'Nenhum selecionado'}</p>
            </div>
            {evolucao && (
              <div className="rounded-lg px-4 py-2 text-center" style={{ backgroundColor: classifBgs[evolucao.classificacaoProjetada] + '33' }}>
                <p className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: classifColors[evolucao.classificacaoProjetada] }}>{evolucao.pprCalculado}%</p>
                <p className="text-xs" style={{ color: classifColors[evolucao.classificacaoProjetada] }}>{classifLabels[evolucao.classificacaoProjetada]}</p>
              </div>
            )}
          </div>
          {evolucao && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'PPR', value: `${evolucao.pprCalculado}%` },
                { label: 'Total Metas', value: evolucao.metas.length },
                { label: 'Concluidas', value: evolucao.metasConcluidas },
                { label: 'Em Risco', value: evolucao.metasEmRisco },
                { label: 'Feedbacks', value: evolucao.feedbacks.length },
                { label: '1:1s', value: evolucao.reunioes.length },
              ].map((m, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cycle Selector */}
        <Select value={cicloId} onValueChange={setSelectedCicloId}>
          <SelectTrigger className="w-56 bg-white"><SelectValue placeholder="Selecionar ciclo" /></SelectTrigger>
          <SelectContent>{ciclos?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>

        {isLoading ? <Skeleton className="h-64" /> : (
          <>
            {/* My Goals */}
            <div className="board-card p-5">
              <div className="board-sec-title">Minhas Metas</div>
              <div className="space-y-2">
                {evolucao?.metas.map((m: any) => {
                  const barColor = m.progresso_atual >= 85 ? 'var(--board-green)' : m.progresso_atual >= 70 ? 'var(--board-amber)' : 'var(--board-red)';
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--board-border-s)' }}>
                      <Badge variant="outline" className="text-[10px] px-2 rounded-full border-0" style={{ backgroundColor: m.dimensao === 'entrega' ? 'rgba(59,130,246,0.12)' : m.dimensao === 'impacto' ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)', color: m.dimensao === 'entrega' ? '#3B82F6' : m.dimensao === 'impacto' ? '#10B981' : '#8B5CF6' }}>
                        {dimensaoLabels[m.dimensao] || m.dimensao}
                      </Badge>
                      <span className="flex-1 text-[12.5px] font-medium truncate" style={{ color: 'var(--board-t1)' }}>{m.titulo}</span>
                      <div className="w-24 h-1.5 rounded-full" style={{ backgroundColor: 'var(--board-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${m.progresso_atual}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="text-[11px] font-semibold w-8 text-right" style={{ color: barColor }}>{m.progresso_atual}%</span>
                      <span className="text-[11px]" style={{ color: 'var(--board-t4)' }}>{m.prazo || '--'}</span>
                      {!isCicloEncerrado && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setProgressModal(m); setProgressValue(m.progresso_atual); }}>
                          <TrendingUp className="h-3 w-3 mr-1" /> Atualizar
                        </Button>
                      )}
                    </div>
                  );
                })}
                {(!evolucao?.metas || evolucao.metas.length === 0) && <p className="text-sm text-center py-4" style={{ color: 'var(--board-t3)' }}>Nenhuma meta neste ciclo.</p>}
              </div>

              {/* PPR Calculation */}
              {evolucao && evolucao.metas.length > 0 && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--board-border-s)' }}>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--board-t3)' }}>PPR = Σ(Progresso × Peso) / Σ(Peso)</p>
                  <table className="w-full text-[12px]">
                    <thead><tr className="text-[10px] uppercase" style={{ color: 'var(--board-t4)' }}><th className="text-left py-1">Meta</th><th className="text-right">Peso</th><th className="text-right">Contribuicao</th></tr></thead>
                    <tbody>
                      {evolucao.metas.map((m: any) => (
                        <tr key={m.id} style={{ color: 'var(--board-t2)' }}><td className="py-1 truncate max-w-[200px]">{m.titulo}</td><td className="text-right">{m.peso}</td><td className="text-right">{Math.round(m.progresso_atual * (m.peso || 1)/ (evolucao.metas.reduce((a: number, x: any) => a + (x.peso || 1), 0)) )}%</td></tr>
                      ))}
                      <tr className="font-bold border-t" style={{ borderColor: 'var(--board-border)', color: 'var(--board-t1)' }}><td className="py-1">Total</td><td></td><td className="text-right" style={{ color: classifColors[evolucao.classificacaoProjetada] }}>{evolucao.pprCalculado}% — {classifLabels[evolucao.classificacaoProjetada]}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Leader Comments */}
            <div className="board-card p-5">
              <div className="board-sec-title flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Consideracoes do Lider</div>
              <div className="space-y-2">
                {comentariosLider?.map(c => {
                  const autor = profileMap.get(c.autor_id);
                  return (
                    <div key={c.id} className="p-3 rounded-lg" style={{ backgroundColor: !c.lido ? 'rgba(91,110,240,0.06)' : 'var(--board-border-s)', borderLeft: !c.lido ? '3px solid var(--board-indigo)' : 'none' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-medium" style={{ color: 'var(--board-t1)' }}>{autor?.first_name || 'Lider'} {autor?.last_name || ''}</span>
                        <span className="text-[10px]" style={{ color: 'var(--board-t4)' }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                      <p className="text-[12.5px]" style={{ color: 'var(--board-t2)' }}>{c.conteudo}</p>
                      {replyTo === c.id ? (
                        <div className="flex gap-2 mt-2">
                          <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Sua resposta..." className="text-xs" />
                          <Button size="sm" className="h-8" onClick={() => handleReply(c.autor_id)}><Send className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 text-xs mt-1" style={{ color: 'var(--board-indigo)' }} onClick={() => setReplyTo(c.id)}>Responder</Button>
                      )}
                    </div>
                  );
                })}
                {(!comentariosLider || comentariosLider.length === 0) && <p className="text-sm text-center py-4" style={{ color: 'var(--board-t3)' }}>Nenhum comentario do lider.</p>}
              </div>
            </div>

            {/* My Points of View */}
            <div className="board-card p-5">
              <div className="board-sec-title">Meus Pontos de Vista</div>
              {!isCicloEncerrado && (
                <div className="mb-3">
                  <Textarea value={pontoVistaText} onChange={e => setPontoVistaText(e.target.value)} placeholder="Adicionar ponto de vista ao ciclo — conquistas, contextos, bloqueadores..." className="text-xs mb-2" />
                  <Button size="sm" onClick={handleAddPontoVista} disabled={!pontoVistaText.trim()}>Enviar</Button>
                </div>
              )}
              <div className="space-y-2">
                {myPontosVista.map(c => (
                  <div key={c.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--board-border-s)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px]" style={{ color: 'var(--board-t4)' }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</span>
                      {!isCicloEncerrado && editingPonto !== c.id && (
                        <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => { setEditingPonto(c.id); setEditText(c.conteudo); }}><Edit3 className="h-3 w-3" /></Button>
                      )}
                    </div>
                    {editingPonto === c.id ? (
                      <div>
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="text-xs mb-2" />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={() => { updateComentario.mutate({ id: c.id, conteudo: editText }); setEditingPonto(null); }}>Salvar</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingPonto(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[12.5px]" style={{ color: 'var(--board-t2)' }}>{c.conteudo}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Feedbacks Received */}
            <div className="board-card p-5">
              <div className="board-sec-title">Feedbacks Recebidos</div>
              <div className="space-y-2">
                {evolucao?.feedbacks.map((f: any) => (
                  <div key={f.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--board-border-s)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-[10px] px-2 rounded-full border-0" style={{ backgroundColor: f.tipo === 'positivo' || f.tipo === 'reconhecimento' ? 'var(--board-green-s)' : 'var(--board-amber-s)', color: f.tipo === 'positivo' || f.tipo === 'reconhecimento' ? 'var(--board-green)' : 'var(--board-amber)' }}>{f.tipo}</Badge>
                      <span className="text-[10px]" style={{ color: 'var(--board-t4)' }}>{f.anonimo ? 'Anonimo' : (profileMap.get(f.de_usuario_id)?.first_name || 'Membro')}</span>
                    </div>
                    <p className="text-[12.5px]" style={{ color: 'var(--board-t2)' }}>{f.contexto}</p>
                  </div>
                ))}
                {(!evolucao?.feedbacks || evolucao.feedbacks.length === 0) && <p className="text-sm text-center py-4" style={{ color: 'var(--board-t3)' }}>Nenhum feedback recebido neste ciclo.</p>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Progress Modal */}
      <Dialog open={!!progressModal} onOpenChange={() => setProgressModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Atualizar Progresso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--board-t3)' }}>{progressModal?.titulo}</p>
            <div className="flex items-center gap-4">
              <Slider value={[progressValue]} onValueChange={([v]) => setProgressValue(v)} max={100} step={1} className="flex-1" />
              <Input type="number" className="w-20" value={progressValue} onChange={e => setProgressValue(Number(e.target.value))} min={0} max={100} />
            </div>
            <div><Label>Comentario *</Label><Textarea value={progressComment} onChange={e => setProgressComment(e.target.value)} placeholder="Descreva o avanco" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressModal(null)}>Cancelar</Button>
            <Button onClick={handleProgressUpdate} disabled={!progressComment || updateProgress.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardLayout>
  );
};

export default MinhaEvolucao;
