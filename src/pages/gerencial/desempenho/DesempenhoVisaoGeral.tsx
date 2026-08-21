import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCicloAtivo, useCiclosAvaliacao } from '@/hooks/useCiclosAvaliacao';
import { useDesempenhoOverview } from '@/hooks/useDesempenhoOverview';
import { useMetas } from '@/hooks/useMetasDesempenho';
import { useFeedbacks } from '@/hooks/useFeedbacksDesempenho';
import { useReunioes, useAllOpenItensAcao } from '@/hooks/useReunioes1a1';
import { useProfilesNomeMap, useProfilesNomeRows } from '@/hooks/useDomainProfiles';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInDays } from 'date-fns';
import { useBoardFilters } from '@/hooks/useBoardFilters';
import { BoardStatStrip } from '@/components/board/BoardStatStrip';
import { BoardChip } from '@/components/board/BoardChip';
import { useBoardReveal } from '@/hooks/useBoardReveal';
import { listarFalhas } from '@/lib/performanceOperacional';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { contextoBoardDesempenho } from '@/lib/agenteContextoDesempenho';

const DEFAULTS = { ciclo: '', area: 'todas', alertas: 'todos' };

type PprClassificacao = 'supera' | 'atende' | 'parcial' | 'abaixo';

interface PprMembro {
  id: string;
  name: string;
  initials: string;
  metas: number;
  metasAtivas: number;
  ppr: number;
  classificacao: PprClassificacao;
  fbCount: number;
  rnCount: number;
}

const DesempenhoVisaoGeral = () => {
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const { filters, setFilter } = useBoardFilters({ pageKey: 'desempenho-geral', defaults: DEFAULTS });
  const revealRef = useBoardReveal();
  const navigate = useNavigate();

  const cicloId = (filters.ciclo as string) || cicloAtivo?.id;
  const selectedCiclo = ciclos?.find(c => c.id === cicloId);
  const { data: overview, isLoading, isError: erroOverview } = useDesempenhoOverview(cicloId);
  const { data: metasIndividuais, isError: erroMetas } = useMetas({ ciclo_id: cicloId, nivel: 'individual' });
  const { data: feedbacks, isError: erroFeedbacks } = useFeedbacks({ ciclo_id: cicloId });
  const { data: reunioes, isError: erroReunioes } = useReunioes();
  const { data: openItems } = useAllOpenItensAcao();

  const { data: profiles } = useProfilesNomeMap('profiles_safe');
  const { data: profileRows } = useProfilesNomeRows('profiles_safe');

  const profileMap = useMemo(() => new Map(Object.entries(profiles ?? {})), [profiles]);
  const profileRowsMap = useMemo(() => new Map(profileRows?.map(profile => [profile.id, profile]) ?? []), [profileRows]);

  const pprPorMembro = useMemo<PprMembro[]>(() => {
    if (!metasIndividuais || !profiles) return [];
    const membrosComMetas = new Set(metasIndividuais.map(m => m.responsavel_id).filter((id): id is string => Boolean(id)));
    return Array.from(membrosComMetas).map(userId => {
      const profile = profileMap.get(userId);
      const profileRow = profileRowsMap.get(userId);
      if (profile === undefined || profileRow === undefined) return null;
      const metasMembro = metasIndividuais.filter(m => m.responsavel_id === userId);
      const somaPesos = metasMembro.reduce((a, m) => a + (m.peso ?? 1), 0);
      const somaProg = metasMembro.reduce((a, m) => a + ((m.progresso_atual ?? 0) * (m.peso ?? 1)), 0);
      const ppr = somaPesos > 0 ? Math.round(somaProg / somaPesos) : 0;
      const classificacao: PprClassificacao = ppr >= 100 ? 'supera' : ppr >= 85 ? 'atende' : ppr >= 70 ? 'parcial' : 'abaixo';
      const fbCount = feedbacks?.filter(f => f.para_usuario_id === userId).length ?? 0;
      const cicloReunioes = reunioes?.filter(r => r.membro_id === userId && (!cicloId || r.ciclo_id === cicloId)) ?? [];
      return {
        id: userId,
        name: profile,
        initials: `${profileRow.first_name?.[0] ?? ''}${profileRow.last_name?.[0] ?? ''}`.toUpperCase(),
        metas: metasMembro.length,
        metasAtivas: metasMembro.filter(m => m.status === 'ativa').length,
        ppr, classificacao, fbCount,
        rnCount: cicloReunioes.length,
      };
    }).filter((membro): membro is PprMembro => membro !== null).sort((a, b) => b.ppr - a.ppr);
  }, [metasIndividuais, profiles, feedbacks, reunioes, cicloId, profileMap, profileRowsMap]);

  const pctDecorrido = useMemo(() => {
    if (!selectedCiclo) return 0;
    const start = new Date(selectedCiclo.data_inicio).getTime();
    const end = new Date(selectedCiclo.data_fim).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [selectedCiclo]);

  const alerts = useMemo(() => {
    const list: { type: 'red' | 'amber' | 'blue'; title: string; desc: string; link: string }[] = [];
    metasIndividuais?.forEach(m => {
      if (m.status !== 'ativa' || !m.prazo) return;
      const daysLeft = Math.ceil((new Date(m.prazo).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 15 && daysLeft >= 0 && m.progresso_atual < 70) {
        const p = m.responsavel_id ? profileMap.get(m.responsavel_id) : null;
        list.push({ type: 'red', title: `${m.titulo} abaixo de 70% com prazo em ${daysLeft}d`, desc: `${p ?? ''} · ${m.progresso_atual}%`, link: '/equipe/board/desempenho/metas' });
      }
    });
    const membrosComMetas = new Set((metasIndividuais ?? []).map(m => m.responsavel_id).filter((id): id is string => Boolean(id)));
    membrosComMetas.forEach(mId => {
      const memberReunioes = reunioes?.filter(r => r.membro_id === mId) ?? [];
      const last = memberReunioes.sort((a, b) => new Date(b.data_reuniao).getTime() - new Date(a.data_reuniao).getTime())[0];
      if (!last || differenceInDays(new Date(), new Date(last.data_reuniao)) > 30) {
        const p = profileMap.get(mId);
        const days = last ? differenceInDays(new Date(), new Date(last.data_reuniao)) : 60;
        list.push({ type: 'amber', title: `${p ?? 'Membro'} sem 1:1 há ${days} dias`, desc: 'Progresso pode estar em risco', link: '/equipe/board/desempenho/1a1' });
      }
    });
    if (selectedCiclo?.data_analise_semestral) {
      const days = differenceInDays(new Date(selectedCiclo.data_analise_semestral), new Date());
      if (days <= 120 && days > -30) {
        list.push({ type: 'blue', title: `Análise semestral em ${days} dias`, desc: 'Preparar formulários com antecedência', link: '/equipe/board/desempenho/ciclos' });
      }
    }
    return list;
  }, [metasIndividuais, reunioes, selectedCiclo, profileMap]);

  const feedbacksByType = useMemo(() => {
    const reconhecimento = feedbacks?.filter(f => f.tipo === 'reconhecimento' || f.tipo === '360').length ?? 0;
    const desenvolvimento = feedbacks?.filter(f => f.tipo === 'desenvolvimento').length ?? 0;
    return { reconhecimento, desenvolvimento };
  }, [feedbacks]);

  const getClassifChipVariant = (c: string): 'ppr-s' | 'ppr-a' | 'ppr-p' | 'ppr-b' => c === 'supera' ? 'ppr-s' : c === 'atende' ? 'ppr-a' : c === 'parcial' ? 'ppr-p' : 'ppr-b';
  const getClassifLabel = (c: string) => c === 'supera' ? 'Supera' : c === 'atende' ? 'Atende' : c === 'parcial' ? 'Parcial' : 'Abaixo';
  const getPbColor = (pct: number) => pct >= 85 ? 'v4-pg' : pct >= 70 ? 'v4-pa' : 'v4-pr';
  const getTextColor = (pct: number) => pct >= 85 ? 'var(--board-v4-go)' : pct >= 70 ? 'var(--board-v4-warn)' : 'var(--board-v4-risk)';

  const reunioesNoCiclo = reunioes?.filter(r => !cicloId || r.ciclo_id === cicloId) ?? [];
  const membrosSem1a1 = pprPorMembro.filter(m => {
    const last = reunioes?.filter(r => r.membro_id === m.id).sort((a, b) => new Date(b.data_reuniao).getTime() - new Date(a.data_reuniao).getTime())[0];
    return !last || differenceInDays(new Date(), new Date(last.data_reuniao)) > 30;
  });
  const itensVencidos = (openItems ?? []).filter(i => i.prazo && new Date(i.prazo) < new Date()).length;

  // ── O que o Agente PSA lê desta tela ───────────────────────────────────
  // Montado INLINE de propósito: `useRegistrarContextoAgente` compara a
  // SERIALIZAÇÃO do snapshot, não a identidade do objeto, então um `useMemo`
  // com dez dependências aqui só adicionaria uma lista para esquecer de
  // atualizar. Os valores são os MESMOS que os blocos abaixo desenham.
  useRegistrarContextoAgente('board.desempenho', contextoBoardDesempenho({
    ciclo: {
      nome: selectedCiclo?.nome ?? null,
      status: selectedCiclo?.status ?? null,
      fim: selectedCiclo?.data_fim ?? null,
      pctDecorrido,
      analiseSemestral: selectedCiclo?.data_analise_semestral ?? null,
    },
    // `?? null` e nunca `?? 0`: consulta que não respondeu é "não apurado", e
    // zero metas é uma resposta diferente de "não sei quantas metas existem".
    totalMetas: overview?.totalMetas ?? null,
    metasConcluidas: overview?.metasConcluidas ?? null,
    metasEmRisco: metasIndividuais
      ? metasIndividuais.filter(m => m.progresso_atual < 70 && m.status === 'ativa').length
      : null,
    mediaProgresso: overview?.mediaProgresso ?? null,
    feedbacks: {
      total: overview?.totalFeedbacks ?? null,
      reconhecimento: feedbacksByType.reconhecimento,
      desenvolvimento: feedbacksByType.desenvolvimento,
    },
    reunioes: {
      noCiclo: reunioesNoCiclo.length,
      membrosSem1a1: membrosSem1a1.length,
      itensVencidos,
    },
    ppr: pprPorMembro.map(m => ({
      nome: m.name, ppr: m.ppr, classificacao: m.classificacao,
      metas: m.metas, metasAtivas: m.metasAtivas,
      feedbacks: m.fbCount, reunioes: m.rnCount,
    })),
    // Os alertas que o cartão removido desenhava. 'blue' era informativo.
    alertas: alerts.map(a => ({
      severidade: a.type === 'red' ? 'risco' as const
        : a.type === 'amber' ? 'atencao' as const
        : 'info' as const,
      titulo: a.title,
      detalhe: a.desc,
    })),
    falhas: listarFalhas([
      { rotulo: 'overview do ciclo', falhou: erroOverview },
      { rotulo: 'metas individuais', falhou: erroMetas },
      { rotulo: 'feedbacks', falhou: erroFeedbacks },
      { rotulo: '1:1s', falhou: erroReunioes },
    ]),
  }), isLoading);

  return (
    <BoardLayout title="Visão Geral" subtitle="Desempenho da equipe">
      <div ref={revealRef} style={{ background: 'var(--board-v4-page)' }}>
        {/* Header + Cycle selector */}
        <div className="pg-head" data-reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="pg-title">Desempenho da Equipe</div>
              <div className="pg-sub">
                {selectedCiclo ? selectedCiclo.nome : 'Carregando ciclo...'}
                {selectedCiclo?.status === 'em_andamento' ? ' · Em andamento' : ''}
              </div>
            </div>
            <select className="v3-fi" value={cicloId ?? ''} onChange={e => setFilter('ciclo', e.target.value)}>
              {ciclos?.map(c => (
                <option key={c.id} value={c.id}>{c.nome}{c.status === 'em_andamento' ? ' (Ativo)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-[80px] rounded-xl" /><Skeleton className="h-[100px] rounded-xl" /></div>
        ) : (
          <>
            {/* Cycle Bar */}
            <div className="v4-cyb" data-reveal>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div className="v4-cyb-n">{selectedCiclo?.nome ?? '—'}</div>
                <BoardChip variant="blue">{selectedCiclo?.status === 'em_andamento' ? 'Em andamento' : selectedCiclo?.status ?? ''}</BoardChip>
              </div>
              <div className="v4-cyb-m">
                Ciclo {selectedCiclo?.status === 'em_andamento' ? 'ativo' : ''} · {selectedCiclo ? Math.round(differenceInDays(new Date(selectedCiclo.data_fim), new Date(selectedCiclo.data_inicio)) / 30) : 0} meses
                {selectedCiclo?.data_analise_semestral ? ` · Análise semestral em ${selectedCiclo.data_analise_semestral}` : ''}
              </div>
              <div className="v4-cyb-pb"><div className="v4-cyb-pbf" style={{ width: `${pctDecorrido}%` }} /></div>
              <div className="v4-cyb-bt">
                <span>{pctDecorrido}% decorrido</span>
                <span>{overview?.totalMetas ?? 0} metas cadastradas</span>
                <span>Encerramento: {selectedCiclo?.data_fim ?? '—'}</span>
              </div>
            </div>

            {/* Stat Strip */}
            <BoardStatStrip
              cols={4}
              items={[
                {
                  value: overview?.totalMetas ?? 0, label: 'Total de Metas', color: 'var(--board-v4-accent)',
                  dots: [
                    { color: 'var(--board-v4-go)', text: `${(overview?.totalMetas ?? 0) - (overview?.metasConcluidas ?? 0)} ativas` },
                    { color: 'var(--board-v4-go)', text: `${overview?.metasConcluidas ?? 0} concluídas` },
                    { color: 'var(--board-v4-risk)', text: `${metasIndividuais?.filter(m => m.progresso_atual < 70 && m.status === 'ativa').length ?? 0} em risco` },
                  ],
                },
                {
                  value: overview?.mediaProgresso ?? 0, suffix: '%', label: 'Média Progresso', color: 'var(--board-v4-warn)',
                  pill: {
                    text: (overview?.mediaProgresso ?? 0) >= 85 ? 'Dentro da meta' : (overview?.mediaProgresso ?? 0) >= 70 ? 'Em progresso' : 'Atenção',
                    variant: (overview?.mediaProgresso ?? 0) >= 85 ? 'up' : (overview?.mediaProgresso ?? 0) >= 70 ? 'neutral' : 'down',
                  },
                  barValue: overview?.mediaProgresso ?? 0,
                },
                {
                  value: overview?.totalFeedbacks ?? 0, label: 'Feedbacks no Ciclo', color: 'var(--board-v4-purple)',
                  dots: [
                    { color: 'var(--board-v4-go)', text: `${feedbacksByType.reconhecimento} reconhecimentos` },
                    { color: 'var(--board-v4-warn)', text: `${feedbacksByType.desenvolvimento} desenvolvimento` },
                  ],
                },
                {
                  value: reunioesNoCiclo.length, label: '1:1s Realizados', color: 'var(--board-v4-cyan)',
                  dots: [
                    ...(membrosSem1a1.length > 0 ? [{ color: 'var(--board-v4-risk)', text: `${membrosSem1a1.length} sem 1:1` }] : []),
                    ...(itensVencidos > 0 ? [{ color: 'var(--board-v4-warn)', text: `${itensVencidos} itens vencidos` }] : []),
                  ],
                },
              ]}
            />

            {/* REMOVIDO (21/08): "Análise IA do Ciclo" e "Alertas que Requerem
                Ação" eram dois cartões no meio da grade. A análise por IA virou
                conversa com o Agente PSA e os alertas viraram a faixa "Exige
                decisão" DENTRO do painel dele -- os dois no ícone ao lado do
                título, com ponto colorido quando há risco ou falha de
                carregamento. O cálculo de `alerts` continua aqui: ele alimenta
                o snapshot publicado acima, que é o que o painel desenha. */}

            {/* Member Cards */}
            <div className="v4-slabel" data-reveal>Progresso Individual — Ciclo Atual</div>
            <div className="v4-g3">
              {pprPorMembro.map(m => (
                <div
                  key={m.id}
                  className={`v4-mc${m.classificacao === 'parcial' || m.classificacao === 'abaixo' ? ' v4-mc-warn' : ''}`}
                  onClick={() => navigate(`/equipe/board/desempenho/minha-evolucao?membro=${m.id}`)}
                  data-reveal
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 11 }}>
                    <div className="v4-av v4-av-lg" /* Cor CHEIA por classificacao, e nao gradiente: os quatro gradientes
                       eram o indigo/roxo do design antigo do Board (#4B63F7, #6B46E8,
                       #3478F5), fora da paleta desde 21/08. Letra branca em cima, medida:
                       6,7:1 no acento escuro, 8,0:1 no azul, 5,2:1 no ink4, 7,7:1 no
                       carmim escuro. */
                    style={{ background: m.classificacao === 'supera' ? 'var(--bd-accent-d)' : m.classificacao === 'atende' ? 'var(--bd-blue)' : m.classificacao === 'parcial' ? 'var(--bd-ink4)' : 'var(--bd-risk-d)' }}>{m.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--board-v4-ink)' }}>{m.name}</div>
                      <div style={{ fontSize: 10.5, color: m.classificacao === 'parcial' || m.classificacao === 'abaixo' ? 'var(--board-v4-warn)' : 'var(--board-v4-ink3)', marginTop: 1 }}>
                        {m.classificacao === 'parcial' || m.classificacao === 'abaixo' ? 'Atenção necessária' : `${m.metas} metas`}
                      </div>
                    </div>
                    <BoardChip variant={getClassifChipVariant(m.classificacao)}>{getClassifLabel(m.classificacao)}</BoardChip>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--board-v4-ink3)', marginBottom: 4 }}>
                      <span>Progresso geral</span>
                      <span style={{ fontWeight: 700, color: getTextColor(m.ppr) }}>{m.ppr}%</span>
                    </div>
                    <div className="v4-pb v4-pb6"><div className={`v4-pbf ${getPbColor(m.ppr)}`} style={{ width: `${Math.min(m.ppr, 100)}%` }} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--board-v4-accent)' }}>{m.metasAtivas}/{m.metas}</span>
                      <span style={{ fontSize: 9.5, color: 'var(--board-v4-ink4)' }}>Metas</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--board-v4-purple)' }}>{m.fbCount}</span>
                      <span style={{ fontSize: 9.5, color: 'var(--board-v4-ink4)' }}>Feedbacks</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--board-v4-cyan)' }}>{m.rnCount}</span>
                      <span style={{ fontSize: 9.5, color: 'var(--board-v4-ink4)' }}>1:1s</span>
                    </div>
                  </div>
                </div>
              ))}
              {pprPorMembro.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>Nenhuma meta individual neste ciclo.</div>}
            </div>
          </>
        )}
      </div>
    </BoardLayout>
  );
};

export default DesempenhoVisaoGeral;
