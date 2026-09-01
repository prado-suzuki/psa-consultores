import React from 'react';
import { BoardCard } from './ui/BoardCard';
import { BoardChip } from './BoardChip';
import type { SaudeOsg } from '@/lib/boardDiretoria';

interface BoardOsgSaudeProps {
  osg: SaudeOsg | null;
  /** Motivo de o cluster OSG não ter sido encontrado/carregado. */
  motivoAusencia?: string;
  onClick?: () => void;
}

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const Numero: React.FC<{
  valor: React.ReactNode;
  rotulo: string;
  motivo?: string;
  cor?: string;
}> = ({ valor, rotulo, motivo, cor }) => (
  <div style={{ minWidth: 108 }}>
    <div style={{
      fontFamily: "'Instrument Sans', sans-serif", fontSize: 22, fontWeight: 700,
      letterSpacing: '-.035em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
      color: cor ?? 'var(--bd-ink)',
    }}>
      {valor}
    </div>
    <div style={{ fontSize: 10.5, color: 'var(--bd-ink3)', marginTop: 3 }}>{rotulo}</div>
    {motivo && <div style={{ fontSize: 10, color: 'var(--bd-ink3)', marginTop: 2, opacity: 0.85 }}>{motivo}</div>}
  </div>
);

/**
 * Saúde da OSG — um card de ÁREA, não um dashboard replicado (28/08).
 *
 * A área tem meta de 30 clientes/ano, time montado e resultado abaixo da meta.
 * A leitura que o card precisa deixar no ar é a correlação, não os números
 * soltos: se as ferramentas reduziram tempo e o time continuou do mesmo
 * tamanho SEM a demanda crescer, o buraco aumenta — capacidade ociosa custa
 * folha. Por isso captação, time, ticket e FTE liberado vivem no mesmo card.
 *
 * O que não está no cadastro sai como "—" com o motivo do lado: senioridade
 * (não há vínculo pessoa ↔ cargo) e folha por área (não existe campo).
 */
export const BoardOsgSaude: React.FC<BoardOsgSaudeProps> = ({ osg, motivoAusencia, onClick }) => {
  if (!osg) {
    return (
      <BoardCard title="Saúde da OSG" subtitle="Captação, time e capacidade">
        <div style={{ fontSize: 12, color: 'var(--bd-ink3)' }}>
          {motivoAusencia ?? 'cluster OSG não encontrado na estrutura'}
        </div>
      </BoardCard>
    );
  }

  const faltaParaMeta = osg.captadosAno === null ? null : osg.metaClientesAno - osg.captadosAno;
  const corCaptacao = osg.captadosAno === null
    ? 'var(--bd-ink3)'
    : osg.captadosAno >= osg.metaClientesAno ? 'var(--bd-go)' : 'var(--bd-risk-d)';
  // A frase da reunião, calculada: horas devolvidas com o mesmo time e sem
  // demanda nova é capacidade parada, não ganho.
  const gapCapacidade = osg.fteLiberado !== null && osg.headcount !== null
    && (osg.variacaoReceitaPct === null || osg.variacaoReceitaPct <= 0);

  return (
    <BoardCard
      title="Saúde da OSG"
      subtitle="Captação, time e capacidade · ano corrente vs anterior"
      actions={
        faltaParaMeta !== null && faltaParaMeta > 0
          ? <BoardChip variant="risk">{faltaParaMeta} clientes para a meta</BoardChip>
          : undefined
      }
      note={
        gapCapacidade
          ? `As ferramentas devolveram ${osg.fteLiberado?.toFixed(1)} FTE e o time seguiu com ${osg.headcount} pessoas sem a receita crescer: o gap da área aumenta, não diminui. Senioridade: ${osg.motivos.seniores}.`
          : `Senioridade: ${osg.motivos.seniores}. Folha: ${osg.motivos.folha}.`
      }
    >
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap',
        paddingBottom: 14, marginBottom: 12, borderBottom: '1px solid var(--bd-line2)',
      }}>
        <Numero
          valor={osg.captadosAno === null ? '—' : `${osg.captadosAno}/${osg.metaClientesAno}`}
          rotulo="Clientes captados no ano · meta 30"
          cor={corCaptacao}
          motivo={osg.captadosAno === null ? 'sem OS com data de início na área' : undefined}
        />
        <Numero
          valor={osg.captadosAnoAnterior === null ? '—' : osg.captadosAnoAnterior}
          rotulo="Captados no ano anterior"
        />
        <Numero
          valor={osg.headcount === null ? '—' : osg.headcount}
          rotulo="Pessoas nas equipes da área"
          motivo={osg.headcount === null ? 'estrutura não carregada' : undefined}
        />
        <Numero valor="—" rotulo="Sêniores" motivo="sem cargo no cadastro de pessoas" />
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Numero
          valor={osg.ticketMedio === null ? '—' : brl(osg.ticketMedio)}
          rotulo="Ticket médio por OS"
        />
        <Numero valor={brl(osg.receitaAno)} rotulo="Receita do ano" />
        <Numero
          valor={
            osg.variacaoReceitaPct === null
              ? '—'
              : `${osg.variacaoReceitaPct >= 0 ? '+' : ''}${Math.round(osg.variacaoReceitaPct)}%`
          }
          rotulo="Vs ano anterior"
          cor={
            osg.variacaoReceitaPct === null
              ? 'var(--bd-ink3)'
              : osg.variacaoReceitaPct >= 0 ? 'var(--bd-go)' : 'var(--bd-risk-d)'
          }
          motivo={osg.variacaoReceitaPct === null ? 'sem base no ano anterior' : undefined}
        />
        <Numero
          valor={osg.fteLiberado === null ? '—' : `${osg.fteLiberado.toFixed(1)} FTE`}
          rotulo={
            osg.horasReduzidasMes === null
              ? 'Capacidade liberada pelas ferramentas'
              : `Capacidade liberada · ${Math.round(osg.horasReduzidasMes)}h/mês`
          }
          motivo={osg.fteLiberado === null ? 'sem horas medidas nas melhorias da área' : undefined}
        />
        <Numero valor="—" rotulo="Folha da área" motivo="sem campo de folha" />
      </div>
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          style={{
            marginTop: 12, fontSize: 11, color: 'var(--bd-accent)', background: 'transparent',
            border: 'none', padding: 0, cursor: 'pointer',
          }}
        >
          ver clientes e OS da área →
        </button>
      )}
    </BoardCard>
  );
};
