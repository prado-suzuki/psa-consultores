// "Modal da Paz" — detalhe do processo com progressive disclosure.
// Em vez de despejar tudo, organiza Etapas / Documentos / Sistemas /
// Responsáveis / Gargalos / Melhorias em seções expansíveis com contagem
// discreta. Etapas abre por padrão. Documentos/Sistemas/Responsáveis são
// agregados (únicos) a partir das etapas já enriquecidas com nomes.

import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ChevronDown, Cpu, FileCode2, FileText, Network, Pencil, Sparkles, Users, Waypoints, Workflow,
} from 'lucide-react';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import Modal from '@/components/equipe/mapa/Modal';
import type { Processo, Etapa } from '@/types';
import { normalizarComplexidade } from '@/components/equipe/mapa/cadastros/processoOpcoes';
import { useMapaExports } from '@/hooks/useMapaExports';

interface Props {
  aberto: boolean;
  processo: Processo | null;
  codigo: string;
  projetoNome?: string;
  etapas: Etapa[];
  gargalos: { id: string; nome: string }[];
  melhorias: { id: string; nome: string }[];
  mapearTo: string;
  onClose: () => void;
  onEditar: () => void;
}

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

interface SecaoProps {
  icone: ReactNode;
  cor: string;
  label: string;
  count: number;
  aberta: boolean;
  onToggle: () => void;
  children: ReactNode;
}
function Secao({ icone, cor, label, count, aberta, onToggle, children }: SecaoProps) {
  return (
    <div className={`processo-acc${aberta ? ' aberta' : ''}`}>
      <button type="button" className="processo-acc-head" onClick={onToggle} aria-expanded={aberta}>
        <span className="processo-acc-icone" style={{ color: cor, background: `${cor}1f` }}>{icone}</span>
        <span className="processo-acc-label">{label}</span>
        <span className="processo-acc-count">{count}</span>
        <ChevronDown size={17} className="processo-acc-chevron" />
      </button>
      <div className="processo-acc-body">
        <div className="processo-acc-body-inner">{children}</div>
      </div>
    </div>
  );
}

function Chips({ itens, vazio }: { itens: string[]; vazio: string }) {
  if (itens.length === 0) return <p className="processo-det-vazio">{vazio}</p>;
  return (
    <div className="processo-det-chips">
      {itens.map((x) => <span key={x} className="processo-det-chip">{x}</span>)}
    </div>
  );
}

export default function ProcessoDetalheModal({
  aberto, processo, codigo, projetoNome, etapas, gargalos, melhorias, mapearTo, onClose, onEditar,
}: Props) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({ etapas: true });
  const toggle = (k: string) => setAbertas((s) => ({ ...s, [k]: !s[k] }));
  const exports = useMapaExports();

  if (!processo) return <Modal isOpen={aberto} onClose={onClose}><div /></Modal>;
  const pid = processo.id;

  const docs = uniq(etapas.flatMap(e => [...(e.docsEntrada || []), ...(e.docsSaida || [])].map(d => d.nome)));
  const sistemas = uniq(etapas.flatMap(e => e.sistemas || []));
  const responsaveis = uniq(etapas.flatMap(e => (e.executadoPor || []).map(r => r.nome)));
  const complexidade = normalizarComplexidade(processo.complexity_level);

  return (
    <Modal isOpen={aberto} onClose={onClose} tourId="modal-processo-detalhe">
      <div className="modal modal-wide processo-det">
        <header className="processo-det-head">
          <div className="processo-det-head-main">
            <div className="processo-det-topo">
              <span className="processo-code processo-code-lg">{codigo}</span>
              <h2>{processo.name}</h2>
            </div>
            <div className="processo-det-badges">
              {complexidade && <StatusBadge variant="roi">{complexidade}</StatusBadge>}
              {processo.evaluation_status && processo.evaluation_status !== 'Não avaliado' && (
                <StatusBadge variant="diagnostic">{processo.evaluation_status}</StatusBadge>
              )}
              {processo.volume_executions != null && <StatusBadge variant="accent">{processo.volume_executions} exec./ano</StatusBadge>}
              {projetoNome && <span className="processo-det-projeto">{projetoNome}</span>}
            </div>
          </div>
          <div className="processo-det-acoes">
            <button className="btn-cancel processo-det-editar" onClick={onEditar}>
              <Pencil size={14} /> Editar
            </button>
            <Link to={mapearTo} className="cadastro-cta" onClick={onClose} data-tour="modal-acao">
              <Waypoints size={16} strokeWidth={2.2} />
              <span>Mapear etapas</span>
            </Link>
          </div>
        </header>

        <div className="processo-det-body">
          <div className="processo-det-export" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', marginRight: 2 }}>Exportar</span>
            <button type="button" className="btn-cancel" onClick={() => exports.exportSopPdf(pid, 'era')} title="SOP em PDF (cenário atual)">
              <FileText size={14} /> SOP (PDF)
            </button>
            <button type="button" className="btn-cancel" onClick={() => exports.exportSopMd(pid, 'era')} title="SOP em Markdown — mesmo conteúdo do PDF (ideal para refinar o mapeamento)">
              <FileCode2 size={14} /> SOP (MD)
            </button>
            <button type="button" className="btn-cancel" onClick={() => exports.exportDiagramaMmd(pid)} title="Diagrama do processo (.mmd)">
              <Network size={14} /> Diagrama (.mmd)
            </button>
          </div>

          {processo.description && (
            <p className="processo-det-descricao">{processo.description}</p>
          )}

          <div className="processo-acc-grupo" data-tour="modal-tabs">
          <Secao icone={<Workflow size={16} />} cor="#0d9488" label="Etapas" count={etapas.length} aberta={!!abertas.etapas} onToggle={() => toggle('etapas')}>
            {etapas.length === 0 ? (
              <p className="processo-det-vazio">Nenhuma etapa mapeada ainda.</p>
            ) : (
              <ol className="processo-fluxo">
                {etapas.map((e, i) => (
                  <li key={e.id} className="processo-fluxo-item">
                    <span className="processo-fluxo-num">{i + 1}</span>
                    <span className="processo-fluxo-nome">{e.name}</span>
                  </li>
                ))}
              </ol>
            )}
          </Secao>

          <Secao icone={<FileText size={16} />} cor="#475569" label="Documentos" count={docs.length} aberta={!!abertas.documentos} onToggle={() => toggle('documentos')}>
            <Chips itens={docs} vazio="Nenhum documento vinculado às etapas." />
          </Secao>

          <Secao icone={<Cpu size={16} />} cor="#6366f1" label="Sistemas" count={sistemas.length} aberta={!!abertas.sistemas} onToggle={() => toggle('sistemas')}>
            <Chips itens={sistemas} vazio="Nenhum sistema vinculado às etapas." />
          </Secao>

          <Secao icone={<Users size={16} />} cor="#0d9488" label="Responsáveis" count={responsaveis.length} aberta={!!abertas.responsaveis} onToggle={() => toggle('responsaveis')}>
            <Chips itens={responsaveis} vazio="Nenhum responsável atribuído às etapas." />
          </Secao>

          <Secao icone={<AlertTriangle size={16} />} cor="#d97706" label="Gargalos" count={gargalos.length} aberta={!!abertas.gargalos} onToggle={() => toggle('gargalos')}>
            <Chips itens={gargalos.map(g => g.nome)} vazio="Nenhum gargalo identificado." />
          </Secao>

          <Secao icone={<Sparkles size={16} />} cor="#0d9488" label="Melhorias" count={melhorias.length} aberta={!!abertas.melhorias} onToggle={() => toggle('melhorias')}>
            <Chips itens={melhorias.map(m => m.nome)} vazio="Nenhuma melhoria planejada." />
          </Secao>
          </div>
        </div>
      </div>
    </Modal>
  );
}
