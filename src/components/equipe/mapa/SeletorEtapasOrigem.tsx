// Seletor hierárquico de etapas para definir as etapas-origem de um gargalo.
//
// UX:
//   • Busca textual livre (filtra processo + etapa por nome)
//   • Lista agrupada por processo, com <details> expansível
//   • Checkbox por etapa — múltipla seleção
//   • Mostra etapas já selecionadas em "chips" no topo (com X para remover)
//   • Filtra automaticamente pelo cluster do gargalo (props.clusterId)
//
// Output: array de GargaloEtapaRef com {etapaId, scenario, etapaNome, processoNome, ...}

import { useMemo, useState } from 'react';
import type { Etapa, Processo, GargaloEtapaRef } from '@/types';

interface Props {
  etapas: Etapa[];
  processos: Processo[];
  clusterId: string | null;
  value: GargaloEtapaRef[];
  onChange: (next: GargaloEtapaRef[]) => void;
}

export default function SeletorEtapasOrigem({
  etapas,
  processos,
  clusterId,
  value,
  onChange,
}: Props) {
  const [busca, setBusca] = useState('');

  // Map processo → nome (e filtra por cluster se houver)
  const procFiltrados = useMemo(() => {
    if (!clusterId) return processos;
    type ProcessoComCluster = Processo & { cluster_id?: string | null };
    return processos.filter((p) => (p as ProcessoComCluster).cluster_id === clusterId);
  }, [processos, clusterId]);

  const procIdsFiltrados = useMemo(() => new Set(procFiltrados.map((p) => p.id)), [procFiltrados]);
  const procNomeById = useMemo(() => new Map(procFiltrados.map((p) => [p.id, p.name])), [procFiltrados]);

  // Etapas do escopo + busca
  const buscaNorm = busca.trim().toLowerCase();
  const etapasNoEscopo = useMemo(() => {
    return etapas.filter((e) => procIdsFiltrados.has(e.process_id));
  }, [etapas, procIdsFiltrados]);

  const etapasFiltradas = useMemo(() => {
    if (!buscaNorm) return etapasNoEscopo;
    return etapasNoEscopo.filter((e) => {
      const procNome = procNomeById.get(e.process_id) ?? '';
      return e.name.toLowerCase().includes(buscaNorm) || procNome.toLowerCase().includes(buscaNorm);
    });
  }, [etapasNoEscopo, buscaNorm, procNomeById]);

  // Agrupa etapas por processo, ordena
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
    const procOrdenados = procFiltrados
      .filter((p) => m.has(p.id))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return procOrdenados.map((p) => ({ processo: p, etapas: m.get(p.id) ?? [] }));
  }, [etapasFiltradas, procFiltrados]);

  // Set de etapas já selecionadas (key = etapaId::scenario)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Selecionadas (chips) */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {value.map((ref) => (
            <span
              key={selectedKey(ref)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: 4,
                fontSize: '0.78rem',
              }}
            >
              {ref.processoNome && <span style={{ opacity: 0.7 }}>{ref.processoNome} · </span>}
              {ref.etapaNome ?? ref.etapaId}
              <button
                type="button"
                onClick={() => removeEtapa(ref)}
                style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#b91c1c', fontSize: '1rem', padding: 0, lineHeight: 1 }}
                title="Remover"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Busca */}
      <input
        type="text"
        placeholder={clusterId ? 'Buscar etapa ou processo...' : 'Selecione o cluster do gargalo primeiro'}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        disabled={!clusterId}
        style={{
          padding: '8px 10px',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          fontSize: '0.88rem',
        }}
      />

      {/* Lista agrupada por processo */}
      <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
        {!clusterId ? (
          <div style={{ padding: 16, color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
            Selecione o cluster do gargalo para listar as etapas disponíveis.
          </div>
        ) : grupos.length === 0 ? (
          <div style={{ padding: 16, color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
            {buscaNorm ? 'Nenhuma etapa corresponde à busca.' : 'Nenhum processo encontrado para este cluster.'}
          </div>
        ) : (
          grupos.map(({ processo, etapas }) => (
            <details key={processo.id} open={!!buscaNorm} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <summary
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: '#f8fafc',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  userSelect: 'none',
                }}
              >
                {processo.name} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem' }}>({etapas.length} etapas)</span>
              </summary>
              <div style={{ padding: '4px 0' }}>
                {etapas.map((e) => {
                  const checked = selectedSet.has(`${e.id}::AS-IS`);
                  return (
                    <label
                      key={e.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 16px 6px 28px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        background: checked ? '#fef2f2' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEtapa(e)}
                      />
                      <span style={{ color: '#475569', fontSize: '0.75rem', minWidth: 18 }}>{e.stage_order ?? '·'}.</span>
                      <span>{e.name}</span>
                    </label>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
