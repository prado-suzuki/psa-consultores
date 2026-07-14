// Readout "Como Era" (AS-IS) de um processo — etapa por etapa, somente leitura.
// Espelha o retrato do MapearProcessoPage (mesmas classes `mapear-*`) para reuso
// na visão consolidada do detalhe do Projeto. Presentational puro (sem hooks).

import type { ReactNode } from 'react';
import type { Etapa, DocRef, ResponsavelEtapa } from '@/types';
import { formatDecimal } from '@/utils/format';

const EXEC_LABEL: Record<string, string> = {
  manual: 'Manual',
  semi_automatica: 'Semi-Automática',
  automatica: 'Automática',
};
const execLabel = (v?: string) => (v ? (EXEC_LABEL[v] ?? v) : '—');
const fmtPct = (v: number) => formatDecimal((v || 0) * 100);
const sumHoras = (arr?: ResponsavelEtapa[]) => (arr || []).reduce((s, r) => s + (r.horas || 0), 0);

function docChips(arr?: DocRef[]) {
  const itens = (arr || []).filter(d => d.nome?.trim());
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((d, i) => (
    <span key={`${d.nome}-${i}`} className="mapear-chip">
      {d.nome}{(d.volume || 0) > 0 && <em className="mapear-chip-vol">{formatDecimal(d.volume)}</em>}
    </span>
  ));
}
function pessoaChips(arr?: ResponsavelEtapa[]) {
  const itens = (arr || []).filter(r => r.nome?.trim());
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((r, i) => (
    <span key={`${r.nome}-${i}`} className="mapear-chip teal">
      {r.nome}{r.horas != null && <em className="mapear-chip-vol">{formatDecimal(r.horas || 0, 'h')}</em>}
    </span>
  ));
}
function sistemaChips(arr?: string[]) {
  const itens = (arr || []).filter(Boolean);
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((s, i) => <span key={`${s}-${i}`} className="mapear-chip indigo">{s}</span>);
}
function EtapaCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mapear-campo">
      <span className="mapear-campo-label">{label}</span>
      <div className="mapear-chips">{children}</div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mapear-metric">
      <span className="mapear-metric-label">{label}</span>
      <strong className="mapear-metric-val">{value}</strong>
    </div>
  );
}

export default function ComoEraLista({ etapas }: { etapas: Etapa[] }) {
  if (!etapas.length) return <p className="processo-det-vazio">Nenhuma etapa mapeada.</p>;
  return (
    <ol className="mapear-fluxo list-stagger">
      {etapas.map((e, i) => (
        <li key={e.id} className="mapear-etapa">
          <div className="mapear-etapa-top">
            <span className="mapear-etapa-num">{i + 1}</span>
            <h4 className="mapear-etapa-nome">{e.name}</h4>
            <span className="mapear-exec">{execLabel(e.execution)}</span>
          </div>
          {e.description && <p className="mapear-etapa-desc">{e.description}</p>}
          <div className="mapear-campos">
            <EtapaCampo label="Entrada">{docChips(e.docsEntrada)}</EtapaCampo>
            <EtapaCampo label="Saída">{docChips(e.docsSaida)}</EtapaCampo>
            <EtapaCampo label="Equipe">{pessoaChips(e.executadoPor)}</EtapaCampo>
            <EtapaCampo label="Sistemas">{sistemaChips(e.sistemas)}</EtapaCampo>
          </div>
          <div className="mapear-metrics">
            <Metric label="Horas/projeto" value={formatDecimal(sumHoras(e.executadoPor), 'h')} />
            <Metric label="Volume" value={formatDecimal(e.volume_per_process || 0)} />
            <Metric label="Erros" value={`${fmtPct(e.error_rate ?? 0)}%`} />
            <Metric label="Retrabalho" value={`${fmtPct(e.rework_rate)}%`} />
          </div>
        </li>
      ))}
    </ol>
  );
}
