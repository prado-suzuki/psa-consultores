// Seletor compacto de etapas-origem para gargalo.
//
// UX:
//   - Display: chips pequenos com etapas selecionadas (× para remover) +
//     botão "+ Selecionar etapas" inline
//   - Click no botão → abre popover dropdown ancorado, com:
//       • busca textual
//       • lista de processos colapsados (<details>)
//       • etapas com checkbox pequeno (reset CSS agressivo)
//       • botão Fechar
//
// Reseta agressivamente o estilo dos <input type="checkbox"> internos para
// evitar herança dos estilos globais do app (que estavam tornando o
// checkbox uma barra azul gigante).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Etapa, Processo, GargaloEtapaRef } from '@/types';

interface Props {
  etapas: Etapa[];
  processos: Processo[];
  clusterId: string | null;
  value: GargaloEtapaRef[];
  onChange: (next: GargaloEtapaRef[]) => void;
}

// Reset CSS escopado ao seletor — evita estilos globais bagunçarem
// inputs/labels internos.
const RESET_STYLE = `
  .seo-popover input[type="checkbox"] {
    appearance: auto;
    -webkit-appearance: checkbox;
    width: 14px !important;
    height: 14px !important;
    min-width: 14px !important;
    max-width: 14px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 3px !important;
    background: #fff !important;
    cursor: pointer !important;
    box-shadow: none !important;
  }
  .seo-popover input[type="checkbox"]:focus {
    outline: 2px solid #93c5fd !important;
    outline-offset: 1px !important;
  }
  .seo-popover input[type="text"] {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    font-size: 0.82rem;
    box-sizing: border-box;
  }
  .seo-popover details > summary {
    list-style: none;
    cursor: pointer;
  }
  .seo-popover details > summary::-webkit-details-marker { display: none; }
  .seo-popover details > summary::before {
    content: '▸';
    display: inline-block;
    width: 14px;
    transition: transform 0.15s;
    color: #94a3b8;
  }
  .seo-popover details[open] > summary::before {
    transform: rotate(90deg);
  }
  .seo-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 8px;
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
    border-radius: 10px;
    font-size: 0.72rem;
    line-height: 1.3;
    max-width: 100%;
  }
  .seo-chip-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
  }
  .seo-chip-x {
    background: transparent;
    border: 0;
    color: #b91c1c;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 2px;
  }
`;

export default function SeletorEtapasOrigem({
  etapas,
  processos,
  clusterId,
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Filtra processos do cluster
  const procFiltrados = useMemo(() => {
    if (!clusterId) return processos;
    type ProcessoComCluster = Processo & { cluster_id?: string | null };
    return processos.filter((p) => (p as ProcessoComCluster).cluster_id === clusterId);
  }, [processos, clusterId]);

  const procIdsFiltrados = useMemo(() => new Set(procFiltrados.map((p) => p.id)), [procFiltrados]);
  const procNomeById = useMemo(() => new Map(procFiltrados.map((p) => [p.id, p.name])), [procFiltrados]);

  const buscaNorm = busca.trim().toLowerCase();
  const etapasNoEscopo = useMemo(
    () => etapas.filter((e) => procIdsFiltrados.has(e.process_id)),
    [etapas, procIdsFiltrados],
  );

  const etapasFiltradas = useMemo(() => {
    if (!buscaNorm) return etapasNoEscopo;
    return etapasNoEscopo.filter((e) => {
      const procNome = procNomeById.get(e.process_id) ?? '';
      return e.name.toLowerCase().includes(buscaNorm) || procNome.toLowerCase().includes(buscaNorm);
    });
  }, [etapasNoEscopo, buscaNorm, procNomeById]);

  const grupos = useMemo(() => {
    const m = new Map<string, Etapa[]>();
    for (const e of etapasFiltradas) {
      const arr = m.get(e.process_id) ?? [];
      arr.push(e);
      m.set(e.process_id, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));
    }
    return procFiltrados
      .filter((p) => m.has(p.id))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((p) => ({ processo: p, etapas: m.get(p.id) ?? [] }));
  }, [etapasFiltradas, procFiltrados]);

  // Fecha popover ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onClickFora(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, [open]);

  const selectedKey = (r: { etapaId: string; scenario: string }) => `${r.etapaId}::${r.scenario}`;
  const selectedSet = useMemo(() => new Set(value.map(selectedKey)), [value]);

  function toggleEtapa(etapa: Etapa) {
    const key = `${etapa.id}::AS-IS`;
    if (selectedSet.has(key)) {
      onChange(value.filter((r) => !(r.etapaId === etapa.id && r.scenario === 'AS-IS')));
    } else {
      const ref: GargaloEtapaRef = {
        etapaId: etapa.id,
        scenario: 'AS-IS',
        etapaNome: etapa.name,
        stage_order: etapa.stage_order ?? undefined,
        processo_id: etapa.process_id,
        processoNome: procNomeById.get(etapa.process_id) ?? undefined,
      };
      onChange([...value, ref]);
    }
  }

  function removeEtapa(ref: GargaloEtapaRef) {
    onChange(value.filter((r) => !(r.etapaId === ref.etapaId && r.scenario === ref.scenario)));
  }

  return (
    <div className="seo-wrapper" style={{ position: 'relative' }}>
      <style>{RESET_STYLE}</style>

      {/* Display: chips compactas + botão */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: 6,
          minHeight: 36,
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          background: '#fff',
          alignItems: 'center',
        }}
      >
        {value.length === 0 && (
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '2px 6px' }}>
            Nenhuma etapa selecionada
          </span>
        )}
        {value.map((ref) => (
          <span key={selectedKey(ref)} className="seo-chip" title={`${ref.processoNome ?? ''} · ${ref.etapaNome ?? ref.etapaId}`}>
            <span className="seo-chip-text">
              {ref.processoNome ? `${ref.processoNome.split(' ')[0]} · ` : ''}{ref.etapaNome ?? ref.etapaId}
            </span>
            <button
              type="button"
              className="seo-chip-x"
              onClick={() => removeEtapa(ref)}
              title="Remover"
            >
              ×
            </button>
          </span>
        ))}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!clusterId}
          style={{
            padding: '4px 10px',
            background: clusterId ? '#0f172a' : '#cbd5e1',
            color: '#fff',
            border: 0,
            borderRadius: 4,
            fontSize: '0.75rem',
            cursor: clusterId ? 'pointer' : 'not-allowed',
            marginLeft: 'auto',
          }}
        >
          {open ? '✕ Fechar' : '+ Selecionar etapas'}
        </button>
      </div>

      {!clusterId && (
        <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
          Selecione o cluster do gargalo primeiro para habilitar a seleção de etapas.
        </p>
      )}

      {/* Popover */}
      {open && clusterId && (
        <div
          ref={popoverRef}
          className="seo-popover"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
            zIndex: 1000,
            maxHeight: 380,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>
            <input
              type="text"
              placeholder="Buscar etapa ou processo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {grupos.length === 0 ? (
              <div style={{ padding: 16, color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center' }}>
                {buscaNorm ? 'Nenhuma etapa corresponde à busca.' : 'Nenhum processo neste cluster.'}
              </div>
            ) : (
              grupos.map(({ processo, etapas }) => (
                <details key={processo.id} open={!!buscaNorm}>
                  <summary
                    style={{
                      padding: '6px 12px',
                      background: '#f8fafc',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      color: '#0f172a',
                      userSelect: 'none',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {processo.name}{' '}
                    <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.7rem' }}>
                      ({etapas.length})
                    </span>
                  </summary>
                  <div>
                    {etapas.map((e) => {
                      const checked = selectedSet.has(`${e.id}::AS-IS`);
                      return (
                        <label
                          key={e.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 12px 4px 28px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            background: checked ? '#fef2f2' : 'transparent',
                            borderBottom: '1px solid #f8fafc',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEtapa(e)}
                          />
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem', minWidth: 16 }}>
                            {e.stage_order ?? '·'}.
                          </span>
                          <span style={{ flex: 1 }}>{e.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              ))
            )}
          </div>
          <div style={{ padding: 6, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {value.length} selecionada{value.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: '4px 12px',
                background: '#0f172a',
                color: '#fff',
                border: 0,
                borderRadius: 4,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
