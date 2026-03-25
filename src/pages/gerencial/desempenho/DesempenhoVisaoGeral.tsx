import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCicloAtivo, useCiclosAvaliacao } from '@/hooks/useCiclosAvaliacao';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useMetas } from '@/hooks/useMetasDesempenho';
import { useFeedbacks } from '@/hooks/useFeedbacksDesempenho';
import { useReunioes, useAllOpenItensAcao } from '@/hooks/useReunioes1a1';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardFilterBar } from '@/components/board/BoardFilterBar';

const DEFAULTS = { ciclo: '', area: 'todas', alertas: 'todos' };

const DesempenhoVisaoGeral = () => {
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const { filters, setFilter, resetFilters, activeCount } = useBoardFilters({ pageKey: 'desempenho-geral', defaults: DEFAULTS });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<{ sintese: string; bullets: string[] } | null>(null);

  const cicloId = (filters.ciclo as string) || cicloAtivo?.id;
  const selectedCiclo = ciclos?.find(c => c.id === cicloId);
  const { data: overview, isLoading } = useDesempenhoOverview(cicloId);
  const { data: metasIndividuais } = useMetas({ ciclo_id: cicloId, nivel: 'individual' });
  const { data: feedbacks } = useFeedbacks({ ciclo_id: cicloId });
  const { data: reunioes } = useReunioes();
  const { data: openItems } = useAllOpenItensAcao();

  const navigate = useNavigate();

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name, email');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string; email: string }[];
    },
  });

  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

  // PPR per member
  const pprPorMembro = useMemo(() => {
    if (!metasIndividuais || !profiles) return [];
    const membrosComMetas = new Set(metasIndividuais.map(m => m.responsavel_id).filter(Boolean));
    return Array.from(membrosComMetas).map(userId => {
      const profile = profileMap.get(userId!);
      if (!profile) return null;
      const metasMembro = metasIndividuais.filter(m => m.responsavel_id === userId);
      const somaPesos = metasMembro.reduce((a, m) => a + (m.peso ?? 1), 0);
      const somaProg = metasMembro.reduce((a, m) => a + ((m.progresso_atual ?? 0) * (m.peso ?? 1)), 0);
      const ppr = somaPesos > 0 ? Math.round(somaProg / somaPesos) : 0;
      const classificacao = ppr >= 100 ? 'supera' : ppr >= 85 ? 'atende' : ppr >= 70 ? 'parcial' : 'abaixo';
      const fbCount = feedbacks?.filter(f => f.para_usuario_id === userId).length ?? 0;
      const cicloReunioes = reunioes?.filter(r => r.membro_id === userId && (!cicloId || r.ciclo_id === cicloId)) ?? [];
      return {
        id: userId!,
        name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
        initials: `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase(),
        metas: metasMembro.length,
        metasAtivas: metasMembro.filter(m => m.status === 'ativa').length,
        ppr, classificacao, fbCount,
        rnCount: cicloReunioes.length,
      };
    }).filter(Boolean).sort((a, b) => (b?.ppr ?? 0) - (a?.ppr ?? 0)) as any[];
  }, [metasIndividuais, profiles, feedbacks, reunioes, cicloId, profileMap]);

  // Cycle progress
  const pctDecorrido = useMemo(() => {
    if (!selectedCiclo) return 0;
    const start = new Date(selectedCiclo.data_inicio).getTime();
    const end = new Date(selectedCiclo.data_fim).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [selectedCiclo]);

  // Alerts
  const alerts = useMemo(() => {
    const list: { type: 'red' | 'amber' | 'blue'; title: string; desc: string; link: string }[] = [];
    metasIndividuais?.forEach(m => {
      if (m.status !== 'ativa' || !m.prazo) return;
      const daysLeft = Math.ceil((new Date(m.prazo).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 15 && daysLeft >= 0 && m.progresso_atual < 70) {
        const p = m.responsavel_id ? profileMap.get(m.responsavel_id) : null;
        list.push({ type: 'red', title: `${m.titulo} abaixo de 70% com prazo em ${daysLeft}d`, desc: `${p ? `${p.first_name} ${p.last_name}` : ''} · ${m.progresso_atual}%`, link: '/equipe/board/desempenho/metas' });
      }
    });
    const membrosComMetas = new Set(metasIndividuais?.map(m => m.responsavel_id).filter(Boolean));
    membrosComMetas.forEach(mId => {
      const memberReunioes = reunioes?.filter(r => r.membro_id === mId) ?? [];
      const last = memberReunioes.sort((a, b) => new Date(b.data_reuniao).getTime() - new Date(a.data_reuniao).getTime())[0];
      if (!last || differenceInDays(new Date(), new Date(last.data_reuniao)) > 30) {
        const p = profileMap.get(mId!);
        const days = last ? differenceInDays(new Date(), new Date(last.data_reuniao)) : 60;
        list.push({ type: 'amber', title: `${p ? `${p.first_name} ${p.last_name}` : 'Membro'} sem 1:1 ha ${days} dias`, desc: 'Progresso pode estar em risco', link: '/equipe/board/desempenho/1a1' });
      }
    });
    if (selectedCiclo?.data_analise_semestral) {
      const days = differenceInDays(new Date(selectedCiclo.data_analise_semestral), new Date());
      if (days <= 120 && days > -30) {
        list.push({ type: 'blue', title: `Analise semestral em ${days} dias`, desc: 'Preparar formularios com antecedencia', link: '/equipe/board/desempenho/ciclos' });
      }
    }
    return list;
  }, [metasIndividuais, reunioes, selectedCiclo, profileMap]);

  const feedbacksByType = useMemo(() => {
    const reconhecimento = feedbacks?.filter(f => f.tipo === 'reconhecimento' || f.tipo === '360').length ?? 0;
    const desenvolvimento = feedbacks?.filter(f => f.tipo === 'desenvolvimento').length ?? 0;
    return { reconhecimento, desenvolvimento };
  }, [feedbacks]);

  const handleGenerateAI = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-sintese-executiva');
      if (error) throw error;
      setAiData(data);
    } catch {
      const membrosRisco = pprPorMembro.filter((m: any) => m.ppr < 70);
      setAiData({
        sintese: `Com ${pctDecorrido}% do ciclo decorrido e media em ${overview?.mediaProgresso ?? 0}%, a projecao aponta para ${(overview?.mediaProgresso ?? 0) >= 85 ? 'Atende Expectativas' : 'atenção necessaria'} — ${membrosRisco.length > 0 ? `${membrosRisco.length} membros podem cair para Atende Parcialmente` : 'sem membros em risco critico'}.`,
        bullets: [
          pprPorMembro.filter((m: any) => m.ppr >= 85).length > 0 ? `${pprPorMembro.filter((m: any) => m.ppr >= 85).map((m: any) => m.name.split(' ')[0]).join(' e ')} estao acima da linha — sem intervencao necessaria` : 'Nenhum membro acima de 85%',
          membrosRisco.length > 0 ? `${membrosRisco[0]?.name}: queda sugere bloqueador — agendar 1:1` : 'Todos os membros dentro do esperado',
          `${overview?.totalFeedbacks ?? 0} feedbacks registrados no ciclo`,
        ],
      });
    }
    setAiLoading(false);
  };

  const getClassifChip = (c: string) => c === 'supera' ? 'c-ppr-s' : c === 'atende' ? 'c-ppr-a' : c === 'parcial' ? 'c-ppr-p' : 'c-ppr-b';
  const getClassifLabel = (c: string) => c === 'supera' ? 'Supera' : c === 'atende' ? 'Atende' : c === 'parcial' ? 'Parcial' : 'Abaixo';
  const getPbColor = (pct: number) => pct >= 85 ? 'v3-pg' : pct >= 70 ? 'v3-pa' : 'v3-pr';
  const getTextColor = (pct: number) => pct >= 85 ? 'var(--gr)' : pct >= 70 ? 'var(--am)' : 'var(--re)';

  const reunioesNoCiclo = reunioes?.filter(r => !cicloId || r.ciclo_id === cicloId) ?? [];
  const membrosSem1a1 = pprPorMembro.filter((m: any) => {
    const last = reunioes?.filter(r => r.membro_id === m.id).sort((a, b) => new Date(b.data_reuniao).getTime() - new Date(a.data_reuniao).getTime())[0];
    return !last || differenceInDays(new Date(), new Date(last.data_reuniao)) > 30;
  });
  const itensVencidos = (openItems ?? []).filter(i => i.prazo && new Date(i.prazo) < new Date()).length;

  return (
    <BoardLayout title="Visao Geral" subtitle="Desempenho da equipe">
      <div style={{ background: 'var(--bg, #EEF2F8)' }}>
        {/* Header + Cycle selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div className="pgt">Desempenho da Equipe</div>
            <div className="pgs" style={{ marginBottom: 0 }}>
              {selectedCiclo ? `${selectedCiclo.nome}` : 'Carregando ciclo...'}
              {selectedCiclo?.status === 'em_andamento' ? ' · Em andamento' : ''}
            </div>
          </div>
          <select className="v3-fi" value={cicloId ?? ''} onChange={e => setFilter('ciclo', e.target.value)}>
            {ciclos?.map(c => (
              <option key={c.id} value={c.id}>{c.nome}{c.status === 'em_andamento' ? ' (Ativo)' : ''}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-[80px] rounded-xl" /><div className="g4"><Skeleton className="h-[100px] rounded-xl" /><Skeleton className="h-[100px] rounded-xl" /><Skeleton className="h-[100px] rounded-xl" /><Skeleton className="h-[100px] rounded-xl" /></div></div>
        ) : (
          <>
            {/* Cycle Bar */}
            <div className="cyb">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div className="cyb-n">{selectedCiclo?.nome ?? '—'}</div>
                <span className="ch c-in">{selectedCiclo?.status === 'em_andamento' ? 'Em andamento' : selectedCiclo?.status ?? ''}</span>
              </div>
              <div className="cyb-m">
                Ciclo {selectedCiclo?.status === 'em_andamento' ? 'ativo' : ''} · {selectedCiclo ? Math.round(differenceInDays(new Date(selectedCiclo.data_fim), new Date(selectedCiclo.data_inicio)) / 30) : 0} meses
                {selectedCiclo?.data_analise_semestral ? ` · Analise semestral em ${selectedCiclo.data_analise_semestral}` : ''}
              </div>
              <div className="cyb-pb"><div className="cyb-pbf" style={{ width: `${pctDecorrido}%` }} /></div>
              <div className="cyb-bt">
                <span>{pctDecorrido}% decorrido</span>
                <span>{overview?.totalMetas ?? 0} metas cadastradas</span>
                <span>Encerramento: {selectedCiclo?.data_fim ?? '—'}</span>
              </div>
            </div>

            {/* 4 KPIs */}
            <div className="g4 mb12">
              <div className="kpi">
                <div className="ktb" style={{ background: 'var(--in)' }} />
                <div className="kv" style={{ fontSize: 20, marginTop: 8 }}>{overview?.totalMetas ?? 0}</div>
                <div className="kl" style={{ fontSize: '9.5px' }}>Total de Metas</div>
                <div className="ksubs">
                  <div className="ksub"><span className="v3-dot" style={{ background: 'var(--gr)' }} />{(overview?.totalMetas ?? 0) - (overview?.metasConcluidas ?? 0)} ativas</div>
                  <div className="ksub"><span className="v3-dot" style={{ background: 'var(--gr)' }} />{overview?.metasConcluidas ?? 0} concluidas</div>
                  <div className="ksub"><span className="v3-dot" style={{ background: 'var(--re)' }} />{metasIndividuais?.filter(m => m.progresso_atual < 70 && m.status === 'ativa').length ?? 0} em risco</div>
                </div>
              </div>
              <div className="kpi">
                <div className="ktb" style={{ background: 'var(--am)' }} />
                <div className="kv" style={{ fontSize: 20, marginTop: 8 }}>{overview?.mediaProgresso ?? 0}%</div>
                <div className="kl" style={{ fontSize: '9.5px' }}>Media Progresso</div>
                <div className="ksubs">
                  <span className="v3-tr v3-tr-u">+5pp vs mes ant.</span>
                  <div className="ksub" style={{ marginTop: 4 }}>Meta: 85% em Jun/26</div>
                </div>
              </div>
              <div className="kpi">
                <div className="ktb" style={{ background: 'var(--pu)' }} />
                <div className="kv" style={{ fontSize: 20, marginTop: 8 }}>{overview?.totalFeedbacks ?? 0}</div>
                <div className="kl" style={{ fontSize: '9.5px' }}>Feedbacks no Ciclo</div>
                <div className="ksubs">
                  <div className="ksub"><span className="v3-dot" style={{ background: 'var(--gr)' }} />{feedbacksByType.reconhecimento} reconhecimentos</div>
                  <div className="ksub"><span className="v3-dot" style={{ background: 'var(--am)' }} />{feedbacksByType.desenvolvimento} desenvolvimento</div>
                </div>
              </div>
              <div className="kpi">
                <div className="ktb" style={{ background: 'var(--cy)' }} />
                <div className="kv" style={{ fontSize: 20, marginTop: 8 }}>{reunioesNoCiclo.length}</div>
                <div className="kl" style={{ fontSize: '9.5px' }}>1:1s Realizados</div>
                <div className="ksubs">
                  {membrosSem1a1.length > 0 && <div className="ksub"><span className="v3-dot" style={{ background: 'var(--re)' }} />{membrosSem1a1.length} membro(s) sem 1:1</div>}
                  {itensVencidos > 0 && <div className="ksub"><span className="v3-dot" style={{ background: 'var(--am)' }} />{itensVencidos} itens vencidos</div>}
                </div>
              </div>
            </div>

            {/* AI + Alerts */}
            <div className="g2 mb12">
              <div className="ai">
                <div className="ai-lbl">
                  <Sparkles style={{ width: 11, height: 11, color: 'var(--in)' }} />
                  Analise IA do Ciclo
                  <button onClick={handleGenerateAI} disabled={aiLoading} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--in)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw style={{ width: 11, height: 11 }} className={aiLoading ? 'animate-spin' : ''} />
                    {aiLoading ? 'Gerando...' : 'Gerar'}
                  </button>
                </div>
                {aiData ? (
                  <>
                    <div className="ai-txt" dangerouslySetInnerHTML={{ __html: aiData.sintese.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    <div className="ai-bul">
                      {aiData.bullets.map((b, i) => <div key={i} className="ai-b">{b}</div>)}
                    </div>
                  </>
                ) : (
                  <div className="ai-txt" style={{ color: 'var(--t3)' }}>Clique em "Gerar" para obter a analise do ciclo com IA.</div>
                )}
              </div>

              <div className="v3-card" style={{ padding: '14px 16px' }}>
                <div className="sct">Alertas que Requerem Acao</div>
                {alerts.length === 0 && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--rs)', padding: '10px 13px', fontSize: 12, color: '#065F46' }}>Nenhum alerta no momento.</div>}
                {alerts.map((a, i) => (
                  <div key={i} className={`v3-al ${a.type === 'red' ? 'v3-al-r' : a.type === 'amber' ? 'v3-al-a' : 'v3-al-b'}`}>
                    {a.type === 'red' ? <AlertCircle style={{ width: 14, height: 14, color: 'var(--re)', flexShrink: 0 }} /> : a.type === 'amber' ? <AlertTriangle style={{ width: 14, height: 14, color: 'var(--am)', flexShrink: 0 }} /> : <Info style={{ width: 14, height: 14, color: 'var(--bl)', flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <div className="al-t">{a.title}</div>
                      <div className="al-d">{a.desc}</div>
                    </div>
                    <span className="al-act" onClick={() => navigate(a.link)}>Ver</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Member Cards */}
            <div className="scl">Progresso Individual — Ciclo Atual</div>
            <div className="g3">
              {pprPorMembro.map((m: any) => (
                <div
                  key={m.id}
                  className={`mc${m.classificacao === 'parcial' || m.classificacao === 'abaixo' ? ' warn' : ''}`}
                  onClick={() => navigate(`/equipe/board/desempenho/minha-evolucao?membro=${m.id}`)}
                >
                  <div className="mch">
                    <div className="av av-lg" style={{ background: `linear-gradient(135deg, ${m.classificacao === 'supera' ? '#5B6EF0, #7A50EE' : m.classificacao === 'atende' ? '#5B6EF0, #3680F6' : m.classificacao === 'parcial' ? '#6E82A0, #3A4B66' : '#E0404A, #E8920A'})` }}>{m.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div className="mc-n">{m.name}</div>
                      <div className="mc-r" style={m.classificacao === 'parcial' || m.classificacao === 'abaixo' ? { color: 'var(--am)' } : undefined}>
                        {m.classificacao === 'parcial' || m.classificacao === 'abaixo' ? 'Atencao necessaria' : `${m.metas} metas`}
                      </div>
                    </div>
                    <span className={`ch ${getClassifChip(m.classificacao)}`}>{getClassifLabel(m.classificacao)}</span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>
                      <span>Progresso geral</span>
                      <span style={{ fontWeight: 700, color: getTextColor(m.ppr) }}>{m.ppr}%</span>
                    </div>
                    <div className="v3-pb v3-pb6"><div className={`v3-pbf ${getPbColor(m.ppr)}`} style={{ width: `${Math.min(m.ppr, 100)}%` }} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div className="mcs"><div className="mcs-v" style={{ color: 'var(--in)' }}>{m.metasAtivas}/{m.metas}</div><div className="mcs-l">Metas</div></div>
                    <div className="mcs"><div className="mcs-v" style={{ color: 'var(--pu)' }}>{m.fbCount}</div><div className="mcs-l">Feedbacks</div></div>
                    <div className="mcs"><div className="mcs-v" style={{ color: 'var(--cy)' }}>{m.rnCount}</div><div className="mcs-l">1:1s</div></div>
                  </div>
                </div>
              ))}
              {pprPorMembro.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 12 }}>Nenhuma meta individual neste ciclo.</div>}
            </div>
          </>
        )}
      </div>
    </BoardLayout>
  );
};

export default DesempenhoVisaoGeral;
