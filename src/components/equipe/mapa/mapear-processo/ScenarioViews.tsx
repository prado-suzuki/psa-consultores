import type { ReactNode } from 'react';
import { Layers, Pencil } from 'lucide-react';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import type { DocRef, Etapa, ResponsavelEtapa } from '@/types';
import { formatDecimal } from '@/utils/format';
import { sumHorasEtapa } from '@/lib/mapearProcessoModel';

const EXEC_LABEL: Record<string, string> = {
  manual: 'Manual',
  semi_automatica: 'Semi-automática',
  automatica: 'Automática',
};

const execLabel = (valor?: string) => valor ? (EXEC_LABEL[valor] ?? valor) : '—';
const fmtPct = (valor: number) => formatDecimal((valor || 0) * 100);

function docChips(itens?: DocRef[]) {
  const preenchidos = (itens || []).filter(item => item.nome?.trim());
  if (!preenchidos.length) return <span className="mapear-vazio">—</span>;
  return preenchidos.map((item, index) => (
    <span key={`${item.nome}-${index}`} className="mapear-chip">
      {item.nome}{(item.volume || 0) > 0 && <em className="mapear-chip-vol">{formatDecimal(item.volume)}</em>}
    </span>
  ));
}

function pessoaChips(itens?: ResponsavelEtapa[]) {
  const preenchidos = (itens || []).filter(item => item.nome?.trim());
  if (!preenchidos.length) return <span className="mapear-vazio">—</span>;
  return preenchidos.map((item, index) => (
    <span key={`${item.nome}-${index}`} className="mapear-chip teal">
      {item.nome}{item.horas != null && <em className="mapear-chip-vol">{formatDecimal(item.horas || 0, 'h')}</em>}
    </span>
  ));
}

function sistemaChips(itens?: string[]) {
  const preenchidos = (itens || []).filter(Boolean);
  if (!preenchidos.length) return <span className="mapear-vazio">—</span>;
  return preenchidos.map((item, index) => <span key={`${item}-${index}`} className="mapear-chip indigo">{item}</span>);
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mapear-campo"><span className="mapear-campo-label">{label}</span><div className="mapear-chips">{children}</div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="mapear-metric"><span className="mapear-metric-label">{label}</span><strong className="mapear-metric-val">{value}</strong></div>;
}

function TabHead({ titulo, subtitulo, onEditar }: { titulo: string; subtitulo: string; onEditar: () => void }) {
  return (
    <div className="mapear-tab-head">
      <div className="mapear-tab-head-txt"><h3 className="mapear-tab-titulo">{titulo}</h3><p className="mapear-tab-sub">{subtitulo}</p></div>
      <button className="cadastro-cta" onClick={onEditar} title="Abrir o editor de etapas"><Pencil size={15} strokeWidth={2.2} /><span>Editar etapas</span></button>
    </div>
  );
}

function EtapaCard({ etapa, index, scenario, onEditar }: { etapa: Etapa; index: number; scenario: 'era' | 'ficou'; onEditar: (id: string) => void }) {
  const ficou = scenario === 'ficou' ? etapa.ficou : undefined;
  const descricao = ficou?.description ?? etapa.description;
  const execution = ficou?.execution ?? etapa.execution;
  const volume = ficou?.volume_per_process ?? etapa.volume_per_process;
  const retrabalho = ficou?.rework_rate ?? etapa.rework_rate;
  const executores = ficou?.executadoPor ?? etapa.executadoPor;
  const sistemas = ficou?.sistemas ?? etapa.sistemas;
  const entrada = ficou?.docsEntrada ?? etapa.docsEntrada;
  const saida = ficou?.docsSaida ?? etapa.docsSaida;
  const horas = sumHorasEtapa(etapa, scenario === 'ficou');
  return (
    <li className="mapear-etapa mapear-etapa-clicavel" role="button" tabIndex={0} title="Clique para editar esta etapa" style={{ cursor: 'pointer' }}
      onClick={() => onEditar(etapa.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onEditar(etapa.id); } }}>
      <div className="mapear-etapa-top"><span className="mapear-etapa-num">{index + 1}</span><h4 className="mapear-etapa-nome">{etapa.name}</h4><span className="mapear-exec">{execLabel(execution)}</span></div>
      {descricao && <p className="mapear-etapa-desc">{descricao}</p>}
      <div className="mapear-campos"><Campo label="Entrada">{docChips(entrada)}</Campo><Campo label="Saída">{docChips(saida)}</Campo><Campo label="Equipe">{pessoaChips(executores)}</Campo><Campo label="Sistemas">{sistemaChips(sistemas)}</Campo></div>
      <div className="mapear-metrics">
        <Metric label="Horas/projeto" value={scenario === 'ficou' && horas <= 0 ? 'Não definido' : formatDecimal(horas, 'h')} />
        <Metric label="Volume" value={formatDecimal(volume || 0)} />
        {scenario === 'era' && <Metric label="Erros" value={`${fmtPct(etapa.error_rate ?? 0)}%`} />}
        <Metric label="Retrabalho" value={scenario === 'ficou' && retrabalho == null ? 'Não definido' : `${fmtPct(retrabalho ?? 0)}%`} />
      </div>
    </li>
  );
}

export function ScenarioView({ scenario, etapas, onEditar }: { scenario: 'era' | 'ficou'; etapas: Etapa[]; onEditar: (id?: string) => void }) {
  const era = scenario === 'era';
  return (
    <div className="mapear-tab-content">
      <TabHead titulo={era ? 'Como era' : 'Como ficou'} subtitulo={era ? 'O retrato atual do processo, etapa por etapa.' : 'O cenário projetado depois das melhorias.'} onEditar={() => onEditar()} />
      {etapas.length === 0 ? (
        <EmptyStateCadastro icone={<Layers size={32} strokeWidth={1.8} />} titulo={era ? 'Comece a mapear' : 'Nada para projetar ainda'}
          texto={era ? 'Este processo ainda não tem etapas. Adicione a primeira e descreva como o trabalho acontece hoje.' : "Mapeie o 'Como era' primeiro. Depois, projete aqui como cada etapa fica após as melhorias."}
          ctaLabel={era ? 'Mapear primeira etapa' : 'Editar etapas'} onCta={() => onEditar()} />
      ) : <ol className="mapear-fluxo list-stagger">{etapas.map((etapa, index) => <EtapaCard key={etapa.id} etapa={etapa} index={index} scenario={scenario} onEditar={onEditar} />)}</ol>}
    </div>
  );
}
