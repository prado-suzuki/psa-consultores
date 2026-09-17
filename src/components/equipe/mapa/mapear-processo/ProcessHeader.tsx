import { ArrowLeft, FileCode2, FileText, GitCompare, Network, Settings2 } from 'lucide-react';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import TourTrigger from '@/components/equipe/mapa/tour/TourTrigger';
import type { Processo } from '@/types';
import { ButtonTooltip } from '@/components/ui/button-tooltip';

interface Props {
  processo: Processo;
  etapasCount: number;
  temFicou: boolean;
  onVoltar: () => void;
  onEditarProcesso: () => void;
  onSop: (mode: 'era' | 'ficou') => void;
  onComparativo: () => void;
  onMarkdown: (mode: 'era' | 'ficou') => void;
  onMarkdownComparativo: () => void;
  onDiagrama: (mode: 'era' | 'ficou') => void;
}

export function ProcessHeader({ processo, etapasCount, temFicou, onVoltar, onEditarProcesso, onSop, onComparativo, onMarkdown, onMarkdownComparativo, onDiagrama }: Props) {
  return <>
    <div className="mapear-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <ButtonTooltip text="Voltar à listagem de processos">
        <button aria-label="Voltar à listagem de processos" className="mapear-voltar" onClick={onVoltar}><ArrowLeft size={16} strokeWidth={2.2} /><span>Processos</span></button>
      </ButtonTooltip>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TourTrigger dataTour="help" /><ButtonTooltip text="Editar este processo">
        <button aria-label="Editar este processo" className="mapear-voltar" onClick={onEditarProcesso}><Settings2 size={15} strokeWidth={2.2} /><span>Editar processo</span></button>
      </ButtonTooltip></div>
    </div>
    <div className="mapear-header">
      <span className="cadastro-eyebrow"><span className="cadastro-eyebrow-dot" aria-hidden="true" />Mapeamento</span>
      <h1 className="mapear-title">{processo.name}</h1>
      {processo.description && <p className="mapear-desc">{processo.description}</p>}
      <div className="mapear-badges">
        {processo.evaluation_status && processo.evaluation_status !== 'Não avaliado' && <StatusBadge variant="diagnostic">{processo.evaluation_status}</StatusBadge>}
        <span className={`mapear-etapas-chip${etapasCount === 0 ? ' vazio' : ''}`}>{etapasCount === 0 ? 'Sem etapas ainda' : `${etapasCount} ${etapasCount === 1 ? 'etapa mapeada' : 'etapas mapeadas'}`}</span>
      </div>
    </div>
    <div className="mapear-downloads" role="group" aria-label="Exportar documentos do processo">
      <span className="mapear-downloads-label">Exportar</span>
      <ButtonTooltip text="Baixar SOP — Como Era (cenário atual)">
        <button aria-label="Baixar SOP — Como Era (cenário atual)" className="mapear-dl-btn" onClick={() => onSop('era')}><FileText size={15} strokeWidth={2.1} /><span>SOP (antes)</span></button>
      </ButtonTooltip>
      <ButtonTooltip text="Baixar SOP — Como Ficou (cenário projetado)">
        <button aria-label="Baixar SOP — Como Ficou (cenário projetado)" className="mapear-dl-btn" onClick={() => onSop('ficou')}><FileText size={15} strokeWidth={2.1} /><span>SOP (como ficou)</span></button>
      </ButtonTooltip>
      <ButtonTooltip text="Baixar SOP comparativo Como Era × Como Ficou, lado a lado, com ganhos por etapa e ROI consolidado">
        <button aria-label="Baixar SOP comparativo Como Era × Como Ficou, lado a lado, com ganhos por etapa e ROI consolidado" className="mapear-dl-btn" onClick={onComparativo}><GitCompare size={15} strokeWidth={2.1} /><span>SOP (comparativo)</span></button>
      </ButtonTooltip>
      <ButtonTooltip text="Baixar SOP em Markdown — Como Era (mesmo conteúdo do PDF; ideal para refinar o mapeamento)">
        <button aria-label="Baixar SOP em Markdown — Como Era (mesmo conteúdo do PDF; ideal para refinar o mapeamento)" className="mapear-dl-btn" onClick={() => onMarkdown('era')}><FileCode2 size={15} strokeWidth={2.1} /><span>SOP MD (antes)</span></button>
      </ButtonTooltip>
      <ButtonTooltip text="Baixar SOP em Markdown — Como Ficou (cenário projetado)">
        <button aria-label="Baixar SOP em Markdown — Como Ficou (cenário projetado)" className="mapear-dl-btn" onClick={() => onMarkdown('ficou')}><FileCode2 size={15} strokeWidth={2.1} /><span>SOP MD (como ficou)</span></button>
      </ButtonTooltip>
      <ButtonTooltip text="Baixar SOP comparativo em Markdown (mesmo conteúdo do PDF comparativo)">
        <button aria-label="Baixar SOP comparativo em Markdown (mesmo conteúdo do PDF comparativo)" className="mapear-dl-btn" onClick={onMarkdownComparativo}><FileCode2 size={15} strokeWidth={2.1} /><span>SOP MD (comparativo)</span></button>
      </ButtonTooltip>
      <ButtonTooltip text="Visualizar e baixar o diagrama de ligações do processo — Como Era (cenário atual)">
        <button aria-label="Visualizar e baixar o diagrama de ligações do processo — Como Era (cenário atual)" className="mapear-dl-btn" onClick={() => onDiagrama('era')}><Network size={15} strokeWidth={2.1} /><span>Diagrama (antes)</span></button>
      </ButtonTooltip>
      {temFicou && <ButtonTooltip text="Visualizar e baixar o diagrama de ligações do processo — Como Ficou (cenário projetado)">
        <button aria-label="Visualizar e baixar o diagrama de ligações do processo — Como Ficou (cenário projetado)" className="mapear-dl-btn" onClick={() => onDiagrama('ficou')}><Network size={15} strokeWidth={2.1} /><span>Diagrama (como ficou)</span></button>
      </ButtonTooltip>}
    </div>
  </>;
}
