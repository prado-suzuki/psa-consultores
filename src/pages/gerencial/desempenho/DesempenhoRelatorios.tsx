import { useState } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCiclosAvaliacao, useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useRelatorios } from '@/hooks/useRelatoriosGerados';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Sparkles, Download, RefreshCw, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoLabels: Record<string, string> = {
  avaliacao_completa: 'Avaliacao Completa',
  resumo_executivo: 'Resumo Executivo',
  recomendacao_bonus: 'Recomendacao de Bonus',
  historico_evolucao: 'Historico de Evolucao',
};

const recColors: Record<string, { bg: string; color: string }> = {
  promocao: { bg: '#ECFDF5', color: '#065F46' },
  reajuste: { bg: '#FFFBEB', color: '#92400E' },
  manter: { bg: '#F1F5F9', color: '#475569' },
};

const DesempenhoRelatorios = () => {
  const { user } = useAuth();
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const [selectedMembro, setSelectedMembro] = useState('');
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('avaliacao_completa');
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);

  const cicloId = selectedCiclo || cicloAtivo?.id || '';

  const { data: profiles } = useQuery({
    queryKey: ['profiles_for_reports'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as any[];
    },
  });

  const { data: historico } = useRelatorios({ membro_id: selectedMembro || undefined, ciclo_id: cicloId || undefined });

  const handleGenerate = async () => {
    if (!selectedMembro || !cicloId) { toast({ title: 'Selecione membro e ciclo', variant: 'destructive' }); return; }
    setGenerating(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-relatorio-individual', {
        body: { member_id: selectedMembro, ciclo_id: cicloId, tipo: selectedTipo },
      });
      if (error) throw error;
      setReport(data);
    } catch (e: any) {
      toast({ title: 'Erro ao gerar relatorio', description: e.message, variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handleLoad = (r: any) => {
    try {
      const parsed = JSON.parse(r.conteudo_ia);
      setReport(parsed);
    } catch { toast({ title: 'Erro ao carregar relatorio', variant: 'destructive' }); }
  };

  const selectedProfile = profiles?.find((p: any) => p.id === selectedMembro);

  return (
    <BoardLayout title="Relatorios" subtitle="Geracao de relatorios com IA">
      <div className="space-y-5">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-52">
            <Select value={selectedMembro} onValueChange={setSelectedMembro}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Selecionar membro" /></SelectTrigger>
              <SelectContent>{profiles?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={cicloId} onValueChange={setSelectedCiclo}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Ciclo" /></SelectTrigger>
              <SelectContent>{ciclos?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-52">
            <Select value={selectedTipo} onValueChange={setSelectedTipo}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generating || !selectedMembro}>
            <Sparkles className={`h-3.5 w-3.5 mr-1 ${generating ? 'animate-spin' : ''}`} /> {generating ? 'Gerando...' : 'Gerar com IA'}
          </Button>
          {report && <Button variant="outline" disabled><Download className="h-3.5 w-3.5 mr-1" /> Exportar PDF</Button>}
        </div>

        {/* History */}
        {historico && historico.length > 0 && (
          <div className="board-card p-4">
            <div className="board-sec-label">Relatorios anteriores</div>
            <div className="space-y-1">
              {historico.filter(r => r.status === 'pronto').slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F7FAFF] transition-colors">
                  <FileText className="h-3.5 w-3.5" style={{ color: 'var(--board-t4)' }} />
                  <span className="text-[12px] flex-1" style={{ color: 'var(--board-t2)' }}>{tipoLabels[r.tipo]}</span>
                  <span className="text-[11px]" style={{ color: 'var(--board-t4)' }}><Clock className="h-3 w-3 inline mr-1" />{format(new Date(r.gerado_em), "dd/MM/yy HH:mm")}</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleLoad(r)}>Carregar</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {generating && (
          <div className="board-card p-8 text-center">
            <Skeleton className="h-6 w-48 mx-auto mb-3" />
            <Skeleton className="h-4 w-64 mx-auto mb-2" />
            <Skeleton className="h-32 w-full mb-2" />
            <Skeleton className="h-24 w-full" />
            <p className="text-[12px] mt-4" style={{ color: 'var(--board-t3)' }}>Gerando relatorio com IA...</p>
          </div>
        )}

        {/* Report Panel */}
        {report && !generating && (
          <div className="board-card overflow-hidden">
            {/* Report Header */}
            <div className="p-6" style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white" style={{ background: 'linear-gradient(135deg, #5B6EF0, #8054F0)' }}>
                  {(selectedProfile?.first_name?.[0] ?? '') + (selectedProfile?.last_name?.[0] ?? '')}
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-lg font-bold">{selectedProfile?.first_name} {selectedProfile?.last_name}</h3>
                  <p className="text-slate-400 text-sm">{ciclos?.find(c => c.id === cicloId)?.nome} · {format(new Date(), "dd/MM/yyyy")}</p>
                </div>
                {report.ppr !== undefined && (
                  <div className="text-right">
                    <p className="text-white text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{report.ppr}%</p>
                    <p className="text-slate-400 text-xs">PPR Calculado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Report Body */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-5">
                {report.dimensoes && report.dimensoes.length > 0 && (
                  <div>
                    <h4 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--board-t1)' }}>Desempenho por Dimensao</h4>
                    <table className="w-full board-table">
                      <thead><tr><th>Dimensao</th><th>Peso</th><th>Progresso</th><th>%</th></tr></thead>
                      <tbody>
                        {report.dimensoes.map((d: any, i: number) => (
                          <tr key={i}><td>{d.dimensao}</td><td>{d.peso}</td><td><div className="w-full h-1.5 rounded-full bg-[#E8EFF7]"><div className="h-full rounded-full bg-[var(--board-indigo)]" style={{ width: `${d.progresso}%` }} /></div></td><td>{d.progresso}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {report.resumo && (
                  <div>
                    <h4 className="text-[13px] font-semibold mb-2" style={{ color: 'var(--board-t1)' }}>Resumo</h4>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--board-t2)' }}>{report.resumo}</p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                {report.pontos_fortes && (
                  <div className="rounded-lg p-4" style={{ background: 'rgba(91,110,240,0.06)' }}>
                    <h4 className="text-[13px] font-semibold mb-2" style={{ color: 'var(--board-indigo)' }}>Pontos Fortes</h4>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--board-t2)' }}>{report.pontos_fortes}</p>
                  </div>
                )}
                {report.pontos_desenvolvimento && (
                  <div className="rounded-lg p-4" style={{ background: 'rgba(232,147,10,0.06)' }}>
                    <h4 className="text-[13px] font-semibold mb-2" style={{ color: 'var(--board-amber)' }}>Pontos de Desenvolvimento</h4>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--board-t2)' }}>{report.pontos_desenvolvimento}</p>
                  </div>
                )}
                {report.recomendacao_rh && (
                  <div className="rounded-lg p-4" style={{ background: recColors[report.tipo_recomendacao]?.bg || '#F1F5F9' }}>
                    <h4 className="text-[13px] font-semibold mb-2" style={{ color: recColors[report.tipo_recomendacao]?.color || '#475569' }}>Recomendacao de RH</h4>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--board-t2)' }}>{report.recomendacao_rh}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 text-[10px] border-t" style={{ borderColor: 'var(--board-border)', color: 'var(--board-t4)' }}>
              Gerado em {format(new Date(), "dd/MM/yyyy HH:mm")} · {ciclos?.find(c => c.id === cicloId)?.nome} · {user?.user_metadata?.first_name} {user?.user_metadata?.last_name} · Documento interno — uso restrito a lideranca
            </div>
          </div>
        )}
      </div>
    </BoardLayout>
  );
};

export default DesempenhoRelatorios;
