import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { CHART_COLORS, STATUS_CHART_COLORS } from '@/constants/brandColors';
import logoPsa from '@/assets/logo-psa-dark.png';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  Sparkles, Filter, RefreshCw, FileDown, AlertTriangle, TrendingUp,
  Target, Clock, CheckCircle2, Gauge, Lightbulb, ShieldAlert,
  Calendar, Activity, DollarSign,
} from 'lucide-react';

interface Sprint { id: string; name: string; project_id: string | null; start_date: string; end_date: string; status: string | null; }
interface Project { id: string; name: string; }
interface Process { id: string; name: string; area: string | null; project_id: string | null; }
interface Deliverable {
  id: string;
  sprint_id: string | null;
  project_id: string | null;
  process_id: string | null;
  status: string | null;
  due_date: string;
  estimated_hours: number | null;
  completed_at: string | null;
  created_at: string | null;
  assigned_to: string | null;
}
interface Daily {
  id: string;
  date: string;
  sprint_id: string | null;
  project_id: string | null;
  process_id: string | null;
  blockers: string | null;
  user_id: string;
}

interface AnaliseIA {
  sintese_executiva: string;
  evolucao_entregas: string;
  tempo_vs_resultado: string;
  saudabilidade_sprint: string;
  aderencia_escopo: string;
  gastos_extras: string;
  riscos: string[];
  oportunidades: string[];
  recomendacoes: string[];
  nivel_risco: 'baixo' | 'medio' | 'alto';
  score_saude: number;
}

const ALL = '__ALL__';

const AnaliseInteligente = () => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [dailys, setDailys] = useState<Daily[]>([]);
  const [improvements, setImprovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sprintFilter, setSprintFilter] = useState(ALL);
  const [projectFilter, setProjectFilter] = useState(ALL);
  const [processFilter, setProcessFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  const loadLogo = useCallback(async () => {
    try {
      const res = await fetch(logoPsa);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => setLogoBase64(reader.result as string);
      reader.readAsDataURL(blob);
    } catch {
      // silent fail — PDF still works
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sprintsRes, projectsRes, processesRes, deliverablesRes, dailysRes, improvRes] = await Promise.all([
        supabase.from('sprints').select('id, name, project_id, start_date, end_date, status').order('start_date', { ascending: false }),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('processes').select('id, name, area, project_id').order('name'),
        supabase.from('sprint_deliverables').select('id, sprint_id, project_id, process_id, status, due_date, estimated_hours, completed_at, created_at, assigned_to'),
        supabase.from('daily_standups').select('id, date, sprint_id, project_id, process_id, blockers, user_id').order('date', { ascending: false }).limit(800),
        supabase.from('process_improvements').select('sprint_deliverable_id, cost_saved_monthly, time_saved_hours, evaluation_status').eq('evaluation_status', 'completed'),
      ]);

      setSprints(sprintsRes.data ?? []);
      setProjects(projectsRes.data ?? []);
      setProcesses(processesRes.data ?? []);
      setDeliverables(deliverablesRes.data ?? []);
      setDailys(dailysRes.data ?? []);
      setImprovements(improvRes.data ?? []);
    } catch (e) {
      console.error('Erro carregando dados:', e);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogo();
    fetchAll();
  }, [loadLogo, fetchAll]);

  // Realtime updates on sprints + dailys + deliverables
  useEffect(() => {
    const channel = supabase
      .channel('analise-inteligente-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_standups' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprint_deliverables' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // Aplica filtros nos dados brutos (para charts e KPIs locais)
  const filtered = useMemo(() => {
    const inDateRange = (date: string | null) => {
      if (!date) return true;
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    };

    const sprintsF = sprints.filter(s => {
      if (sprintFilter !== ALL && s.id !== sprintFilter) return false;
      if (projectFilter !== ALL && s.project_id !== projectFilter) return false;
      if (startDate && s.end_date < startDate) return false;
      if (endDate && s.start_date > endDate) return false;
      return true;
    });

    const sprintIds = new Set(sprintsF.map(s => s.id));

    const deliverablesF = deliverables.filter(d => {
      if (sprintFilter !== ALL && d.sprint_id !== sprintFilter) return false;
      if (projectFilter !== ALL && d.project_id !== projectFilter) return false;
      if (processFilter !== ALL && d.process_id !== processFilter) return false;
      if (sprintFilter === ALL && d.sprint_id && !sprintIds.has(d.sprint_id) && (startDate || endDate || projectFilter !== ALL)) return false;
      if (!inDateRange(d.due_date)) return false;
      return true;
    });

    const dailysF = dailys.filter(d => {
      if (!inDateRange(d.date)) return false;
      if (sprintFilter !== ALL && d.sprint_id !== sprintFilter) return false;
      if (projectFilter !== ALL && d.project_id !== projectFilter) return false;
      if (processFilter !== ALL && d.process_id !== processFilter) return false;
      return true;
    });

    return { sprintsF, deliverablesF, dailysF };
  }, [sprints, deliverables, dailys, sprintFilter, projectFilter, processFilter, startDate, endDate]);

  // KPIs locais (atualizam instantaneamente conforme filtros)
  const kpis = useMemo(() => {
    const { sprintsF, deliverablesF, dailysF } = filtered;
    const totalDel = deliverablesF.length;
    const completed = deliverablesF.filter(d => d.status === 'completed').length;
    const inProgress = deliverablesF.filter(d => d.status === 'in_progress').length;
    const pending = deliverablesF.filter(d => d.status === 'pending').length;
    const today = new Date().toISOString().split('T')[0];
    const overdue = deliverablesF.filter(d => d.due_date && d.due_date < today && d.status !== 'completed').length;
    const rate = totalDel > 0 ? Math.round((completed / totalDel) * 100) : 0;
    const hours = deliverablesF.reduce((s, d) => s + (Number(d.estimated_hours) || 0), 0);
    const blockers = dailysF.filter(d => d.blockers && d.blockers.trim().length > 0).length;

    const deliverableIds = new Set(deliverablesF.map(d => d.id));
    const linkedImpr = improvements.filter(i => i.sprint_deliverable_id && deliverableIds.has(i.sprint_deliverable_id));
    const savings = linkedImpr.reduce((s, i) => s + (Number(i.cost_saved_monthly) || 0), 0);
    const timeSaved = linkedImpr.reduce((s, i) => s + (Number(i.time_saved_hours) || 0), 0);

    const HOURLY = 150;
    const extraCost = overdue * HOURLY * 4;

    const scopeCreep = deliverablesF.filter(d => {
      if (!d.sprint_id || !d.created_at) return false;
      const sp = sprintsF.find(s => s.id === d.sprint_id);
      if (!sp) return false;
      return new Date(d.created_at).getTime() - new Date(sp.start_date).getTime() > 24 * 60 * 60 * 1000;
    }).length;

    const deliveryComp = rate;
    const blockerComp = Math.max(0, 100 - (blockers / Math.max(sprintsF.length, 1)) * 20);
    const scopeComp = Math.max(0, 100 - (scopeCreep / Math.max(totalDel, 1)) * 100);
    const overdueComp = Math.max(0, 100 - (overdue / Math.max(totalDel, 1)) * 100);
    const score = Math.round((deliveryComp + blockerComp + scopeComp + overdueComp) / 4);

    return {
      totalSprints: sprintsF.length,
      activeSprints: sprintsF.filter(s => s.status === 'active').length,
      completedSprints: sprintsF.filter(s => s.status === 'completed').length,
      totalDel, completed, inProgress, pending, overdue, rate, hours,
      totalDailys: dailysF.length, blockers,
      savings, timeSaved, extraCost, scopeCreep, score,
    };
  }, [filtered, improvements]);

  // Chart: entregas por semana (evolução)
  const entregasPorSemana = useMemo(() => {
    const map = new Map<string, { semana: string; concluidas: number; total: number }>();
    filtered.deliverablesF.forEach(d => {
      const dateStr = d.completed_at ? d.completed_at.split('T')[0] : d.due_date;
      if (!dateStr) return;
      const dt = new Date(dateStr);
      const year = dt.getFullYear();
      const onejan = new Date(year, 0, 1);
      const week = Math.ceil((((dt.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { semana: key, concluidas: 0, total: 0 });
      const bucket = map.get(key)!;
      bucket.total += 1;
      if (d.status === 'completed') bucket.concluidas += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.semana.localeCompare(b.semana)).slice(-12);
  }, [filtered]);

  // Chart: distribuição de status
  const statusData = useMemo(() => ([
    { name: 'Concluído', value: kpis.completed, color: STATUS_CHART_COLORS.completed },
    { name: 'Em Progresso', value: kpis.inProgress, color: STATUS_CHART_COLORS.in_progress },
    { name: 'Pendente', value: kpis.pending, color: STATUS_CHART_COLORS.pending },
    { name: 'Atrasado', value: kpis.overdue, color: '#ef4444' },
  ].filter(d => d.value > 0)), [kpis]);

  // Chart: horas por sprint
  const horasPorSprint = useMemo(() => {
    return filtered.sprintsF.slice(0, 8).map(s => {
      const hrs = filtered.deliverablesF
        .filter(d => d.sprint_id === s.id)
        .reduce((sum, d) => sum + (Number(d.estimated_hours) || 0), 0);
      return { sprint: s.name.length > 18 ? s.name.substring(0, 18) + '…' : s.name, horas: Math.round(hrs) };
    });
  }, [filtered]);

  // Chart: dailys/bloqueios por semana
  const dailysPorSemana = useMemo(() => {
    const map = new Map<string, { semana: string; dailys: number; bloqueios: number }>();
    filtered.dailysF.forEach(d => {
      const dt = new Date(d.date);
      const year = dt.getFullYear();
      const onejan = new Date(year, 0, 1);
      const week = Math.ceil((((dt.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { semana: key, dailys: 0, bloqueios: 0 });
      const b = map.get(key)!;
      b.dailys += 1;
      if (d.blockers && d.blockers.trim()) b.bloqueios += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.semana.localeCompare(b.semana)).slice(-12);
  }, [filtered]);

  const scoreColor = kpis.score >= 75 ? 'text-emerald-600' : kpis.score >= 50 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = kpis.score >= 75 ? '#10b981' : kpis.score >= 50 ? '#f59e0b' : '#ef4444';

  const handleAnalisar = async () => {
    setAnalyzing(true);
    setAnalise(null);
    try {
      const { data, error } = await supabase.functions.invoke('analise-inteligente-sprints', {
        body: {
          start_date: startDate || null,
          end_date: endDate || null,
          sprint_id: sprintFilter !== ALL ? sprintFilter : null,
          project_id: projectFilter !== ALL ? projectFilter : null,
          process_id: processFilter !== ALL ? processFilter : null,
          category: categoryFilter !== ALL ? categoryFilter : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalise(data.analise);
      toast({ title: 'Análise gerada', description: 'Insights estratégicos atualizados.' });
    } catch (e: any) {
      console.error('Erro na análise:', e);
      toast({
        title: 'Erro ao gerar análise',
        description: e.message || 'Falha inesperada.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClearFilters = () => {
    setStartDate(''); setEndDate('');
    setSprintFilter(ALL); setProjectFilter(ALL);
    setProcessFilter(ALL); setCategoryFilter(ALL);
  };

  const exportarPDF = () => {
    const w = window.open('', '_blank');
    if (!w) {
      toast({ title: 'Bloqueado', description: 'Permita pop-ups para exportar o PDF.', variant: 'destructive' });
      return;
    }

    const nivelRiscoColor = analise?.nivel_risco === 'baixo' ? '#10b981'
      : analise?.nivel_risco === 'medio' ? '#f59e0b' : '#ef4444';
    const periodo = `${startDate || 'Início'} a ${endDate || 'Hoje'}`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Análise Inteligente — Sprints & Dailys</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e293b; background: white; font-size: 10px; line-height: 1.4; padding: 8px; }
  .page { max-width: 100%; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 3px solid #0d9488; margin-bottom: 10px; }
  .header h1 { font-size: 18px; color: #0d9488; font-weight: 700; }
  .header .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
  .header .logo { height: 40px; }
  .grid-kpi { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 10px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background: #f8fafc; }
  .kpi-label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
  .kpi-value { font-size: 14px; font-weight: 700; color: #0d9488; margin-top: 2px; }
  .kpi-sub { font-size: 8px; color: #94a3b8; }
  .section { margin-bottom: 8px; }
  .section-title { font-size: 11px; font-weight: 600; color: #0d9488; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 4px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background: white; }
  .card-title { font-size: 9px; font-weight: 600; color: #334155; margin-bottom: 3px; }
  .card-text { font-size: 9px; color: #475569; line-height: 1.45; }
  .list { list-style: none; }
  .list li { padding: 2px 0; font-size: 9px; color: #475569; padding-left: 10px; position: relative; }
  .list li:before { content: '•'; color: #0d9488; position: absolute; left: 2px; font-weight: bold; }
  .risk-badge { display: inline-block; padding: 2px 6px; border-radius: 8px; font-size: 8px; font-weight: 600; text-transform: uppercase; color: white; background: ${nivelRiscoColor}; }
  .score-big { font-size: 28px; font-weight: 700; color: ${scoreBg}; }
  .score-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .score-fill { height: 100%; width: ${kpis.score}%; background: ${scoreBg}; }
  .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 7px; color: #94a3b8; text-align: center; }
  .sintese { padding: 8px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-left: 3px solid #0d9488; border-radius: 4px; font-size: 9.5px; color: #0f766e; font-weight: 500; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>Análise Inteligente — Sprints & Dailys</h1>
      <div class="subtitle">PSA Consultores · Digital Rotina · Período: ${periodo}</div>
    </div>
    ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="PSA" />` : ''}
  </div>

  <div class="grid-kpi">
    <div class="kpi"><div class="kpi-label">Score Saúde</div><div class="kpi-value" style="color:${scoreBg}">${kpis.score}/100</div><div class="kpi-sub">Sprint + Projeto</div></div>
    <div class="kpi"><div class="kpi-label">Taxa Entrega</div><div class="kpi-value">${kpis.rate}%</div><div class="kpi-sub">${kpis.completed}/${kpis.totalDel} entregues</div></div>
    <div class="kpi"><div class="kpi-label">Atrasados</div><div class="kpi-value" style="color:#ef4444">${kpis.overdue}</div><div class="kpi-sub">Itens vencidos</div></div>
    <div class="kpi"><div class="kpi-label">Bloqueios</div><div class="kpi-value" style="color:#f59e0b">${kpis.blockers}</div><div class="kpi-sub">Em ${kpis.totalDailys} dailys</div></div>
    <div class="kpi"><div class="kpi-label">Scope Creep</div><div class="kpi-value">${kpis.scopeCreep}</div><div class="kpi-sub">Itens fora do escopo inicial</div></div>
    <div class="kpi"><div class="kpi-label">Gasto Extra</div><div class="kpi-value" style="color:#ef4444">R$ ${kpis.extraCost.toLocaleString('pt-BR')}</div><div class="kpi-sub">Estimado</div></div>
  </div>

  ${analise ? `
  <div class="section">
    <div class="sintese"><strong>Síntese Executiva:</strong> ${analise.sintese_executiva}</div>
  </div>

  <div class="section">
    <div class="three-col">
      <div class="card">
        <div class="card-title">📈 Evolução das Entregas</div>
        <div class="card-text">${analise.evolucao_entregas}</div>
      </div>
      <div class="card">
        <div class="card-title">⏱️ Tempo vs Resultado</div>
        <div class="card-text">${analise.tempo_vs_resultado}</div>
      </div>
      <div class="card">
        <div class="card-title">💚 Saudabilidade</div>
        <div class="card-text">${analise.saudabilidade_sprint}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="two-col">
      <div class="card">
        <div class="card-title">🎯 Aderência ao Escopo</div>
        <div class="card-text">${analise.aderencia_escopo}</div>
      </div>
      <div class="card">
        <div class="card-title">💸 Gastos Extras</div>
        <div class="card-text">${analise.gastos_extras}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="three-col">
      <div class="card">
        <div class="card-title" style="color:#ef4444">⚠️ Riscos <span class="risk-badge">${analise.nivel_risco}</span></div>
        <ul class="list">${analise.riscos.slice(0, 4).map(r => `<li>${r}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <div class="card-title" style="color:#f59e0b">💡 Oportunidades</div>
        <ul class="list">${analise.oportunidades.slice(0, 4).map(o => `<li>${o}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <div class="card-title" style="color:#0d9488">✅ Recomendações</div>
        <ul class="list">${analise.recomendacoes.slice(0, 5).map(r => `<li>${r}</li>`).join('')}</ul>
      </div>
    </div>
  </div>
  ` : `<div class="section"><div class="card"><div class="card-text" style="text-align:center;color:#94a3b8;padding:10px">Clique em "Gerar Análise IA" no dashboard para incluir a análise estratégica neste relatório.</div></div></div>`}

  <div class="footer">
    Gerado em ${new Date().toLocaleString('pt-BR')} · PSA Consultores · Digital Rotina · Análise alimentada por Claude AI
  </div>
</div>
<script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body>
</html>`;

    w.document.write(html);
    w.document.close();
  };

  const nivelRiscoBadge = () => {
    if (!analise) return null;
    const cfg = {
      baixo: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Risco Baixo' },
      medio: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Risco Médio' },
      alto: { bg: 'bg-red-100', text: 'text-red-700', label: 'Risco Alto' },
    }[analise.nivel_risco];
    return <Badge className={`${cfg.bg} ${cfg.text} border-0`}>{cfg.label}</Badge>;
  };

  return (
    <EquipeLayout
      title="Análise Inteligente"
      subtitle="Dashboard estratégico de Sprints & Dailys (powered by Claude AI)"
      headerActions={
        <div className="flex gap-2">
          <Button onClick={handleAnalisar} disabled={analyzing} className="bg-primary hover:bg-primary/90">
            {analyzing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {analyzing ? 'Analisando…' : 'Gerar Análise IA'}
          </Button>
          <Button variant="outline" onClick={exportarPDF} className="border-teal-600 text-teal-600 hover:bg-teal-50">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Filter className="h-4 w-4 text-teal-600" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data início</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Data fim</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Sprint</Label>
                <Select value={sprintFilter} onValueChange={setSprintFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas as sprints</SelectItem>
                    {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Projeto</Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os projetos</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Processo</Label>
                <Select value={processFilter} onValueChange={setProcessFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os processos</SelectItem>
                    {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Categoria (área)</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {Array.from(new Set(processes.map(p => p.area).filter(Boolean))).map(area => (
                      <SelectItem key={area!} value={area!}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-slate-500">
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-teal-600" />
          </div>
        ) : (
          <>
            {/* KPIs Principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Gauge className="h-4 w-4 text-teal-600" />
                    <span className="text-xs text-slate-500">Saúde</span>
                  </div>
                  <div className={`text-2xl font-bold ${scoreColor}`}>{kpis.score}<span className="text-sm text-slate-400">/100</span></div>
                  <Progress value={kpis.score} className="h-1 mt-2" />
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-4 w-4 text-teal-600" />
                    <span className="text-xs text-slate-500">Taxa Entrega</span>
                  </div>
                  <div className="text-2xl font-bold text-teal-700">{kpis.rate}%</div>
                  <p className="text-xs text-slate-400 mt-1">{kpis.completed}/{kpis.totalDel}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-slate-500">Atrasados</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{kpis.overdue}</div>
                  <p className="text-xs text-slate-400 mt-1">itens vencidos</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-slate-500">Bloqueios</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{kpis.blockers}</div>
                  <p className="text-xs text-slate-400 mt-1">em {kpis.totalDailys} dailys</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-slate-500">Scope Creep</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{kpis.scopeCreep}</div>
                  <p className="text-xs text-slate-400 mt-1">fora do planejado</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-slate-500">Gasto Extra</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">R$ {(kpis.extraCost / 1000).toFixed(1)}k</div>
                  <p className="text-xs text-slate-400 mt-1">estimado</p>
                </CardContent>
              </Card>
            </div>

            {/* Análise IA */}
            {analise && (
              <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-teal-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-teal-600" />
                      Análise Estratégica (Claude AI)
                    </CardTitle>
                    {nivelRiscoBadge()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-white/80 rounded-md border-l-4 border-teal-500">
                    <p className="text-sm text-teal-900 font-medium">{analise.sintese_executiva}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white/70 p-3 rounded-md border border-slate-200">
                      <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-teal-600" /> Evolução das Entregas
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{analise.evolucao_entregas}</p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-md border border-slate-200">
                      <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-teal-600" /> Tempo vs Resultado
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{analise.tempo_vs_resultado}</p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-md border border-slate-200">
                      <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-teal-600" /> Saudabilidade
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{analise.saudabilidade_sprint}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white/70 p-3 rounded-md border border-slate-200">
                      <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Target className="h-3 w-3 text-blue-600" /> Aderência ao Escopo
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{analise.aderencia_escopo}</p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-md border border-slate-200">
                      <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-red-600" /> Gastos Extras
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{analise.gastos_extras}</p>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-red-50/70 p-3 rounded-md border border-red-100">
                      <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Riscos
                      </h4>
                      <ul className="space-y-1 text-xs text-red-800">
                        {analise.riscos.map((r, i) => <li key={i} className="flex gap-1"><span>•</span><span>{r}</span></li>)}
                      </ul>
                    </div>
                    <div className="bg-amber-50/70 p-3 rounded-md border border-amber-100">
                      <h4 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" /> Oportunidades
                      </h4>
                      <ul className="space-y-1 text-xs text-amber-800">
                        {analise.oportunidades.map((o, i) => <li key={i} className="flex gap-1"><span>•</span><span>{o}</span></li>)}
                      </ul>
                    </div>
                    <div className="bg-teal-50/70 p-3 rounded-md border border-teal-100">
                      <h4 className="text-xs font-semibold text-teal-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Recomendações
                      </h4>
                      <ul className="space-y-1 text-xs text-teal-800">
                        {analise.recomendacoes.map((r, i) => <li key={i} className="flex gap-1"><span>•</span><span>{r}</span></li>)}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-600" />
                    Evolução de Entregas (Semanal)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={entregasPorSemana}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="total" stroke={CHART_COLORS[1]} strokeWidth={2} name="Total" />
                      <Line type="monotone" dataKey="concluidas" stroke={CHART_COLORS[0]} strokeWidth={2} name="Concluídas" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    Status dos Entregáveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-teal-600" />
                    Horas Estimadas por Sprint
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={horasPorSprint}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="sprint" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="horas" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Dailys & Bloqueios (Semanal)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dailysPorSemana}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="dailys" fill={CHART_COLORS[1]} name="Dailys" />
                      <Bar dataKey="bloqueios" fill="#f59e0b" name="Bloqueios" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {!analise && (
              <Card className="border-dashed border-teal-300 bg-teal-50/50">
                <CardContent className="py-8 text-center">
                  <Sparkles className="h-10 w-10 text-teal-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-teal-900 mb-1">Gerar análise estratégica</h3>
                  <p className="text-sm text-teal-700 mb-4 max-w-md mx-auto">
                    Clique em <strong>"Gerar Análise IA"</strong> para produzir insights cruzados sobre evolução, saudabilidade, aderência ao escopo e gastos extras — alimentado por Claude AI.
                  </p>
                  <Button onClick={handleAnalisar} disabled={analyzing} className="bg-teal-600 hover:bg-teal-700">
                    {analyzing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {analyzing ? 'Analisando…' : 'Gerar Análise Agora'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </EquipeLayout>
  );
};

export default AnaliseInteligente;
