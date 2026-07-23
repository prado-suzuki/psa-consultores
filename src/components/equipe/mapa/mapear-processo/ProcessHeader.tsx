import { ArrowLeft, FileCode2, FileText, GitCompare, Network, Settings2 } from 'lucide-react';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import TourTrigger from '@/components/equipe/mapa/tour/TourTrigger';
import type { Processo } from '@/types';

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
      <button className="mapear-voltar" onClick={onVoltar} title="Voltar à listagem de processos"><ArrowLeft size={16} strokeWidth={2.2} /><span>Processos</span></button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TourTrigger dataTour="help" /><button className="mapear-voltar" onClick={onEditarProcesso} title="Editar este processo"><Settings2 size={15} strokeWidth={2.2} /><span>Editar processo</span></button></div>
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
      <button className="mapear-dl-btn" onClick={() => onSop('era')} title="Baixar SOP — Como Era (cenário atual)"><FileText size={15} strokeWidth={2.1} /><span>SOP (antes)</span></button>
      <button className="mapear-dl-btn" onClick={() => onSop('ficou')} title="Baixar SOP — Como Ficou (cenário projetado)"><FileText size={15} strokeWidth={2.1} /><span>SOP (como ficou)</span></button>
      <button className="mapear-dl-btn" onClick={onComparativo} title="Baixar SOP comparativo Como Era × Como Ficou, lado a lado, com ganhos por etapa e ROI consolidado"><GitCompare size={15} strokeWidth={2.1} /><span>SOP (comparativo)</span></button>
      <button className="mapear-dl-btn" onClick={() => onMarkdown('era')} title="Baixar SOP em Markdown — Como Era (mesmo conteúdo do PDF; ideal para refinar o mapeamento)"><FileCode2 size={15} strokeWidth={2.1} /><span>SOP MD (antes)</span></button>
      <button className="mapear-dl-btn" onClick={() => onMarkdown('ficou')} title="Baixar SOP em Markdown — Como Ficou (cenário projetado)"><FileCode2 size={15} strokeWidth={2.1} /><span>SOP MD (como ficou)</span></button>
      <button className="mapear-dl-btn" onClick={onMarkdownComparativo} title="Baixar SOP comparativo em Markdown (mesmo conteúdo do PDF comparativo)"><FileCode2 size={15} strokeWidth={2.1} /><span>SOP MD (comparativo)</span></button>
      <button className="mapear-dl-btn" onClick={() => onDiagrama('era')} title="Visualizar e baixar o diagrama de ligações do processo — Como Era (cenário atual)"><Network size={15} strokeWidth={2.1} /><span>Diagrama (antes)</span></button>
      {temFicou && <button className="mapear-dl-btn" onClick={() => onDiagrama('ficou')} title="Visualizar e baixar o diagrama de ligações do processo — Como Ficou (cenário projetado)"><Network size={15} strokeWidth={2.1} /><span>Diagrama (como ficou)</span></button>}
    </div>
  </>;
}
