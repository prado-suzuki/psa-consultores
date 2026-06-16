// Painel "Gargalos & Melhorias" do editor de etapas — modelo gargalo-cêntrico:
// cada gargalo da etapa é um card separado e tem seu próprio "+ Melhoria"
// (as melhorias que o resolvem ficam listadas dentro do card, em verde).
//   • gargalo → vínculo gargalo_etapas (por etapa)
//   • melhoria sob um gargalo → vínculo gargalo_melhorias + entra no processo
//
// Apresentacional: todo o estado vive no chamador (MapearProcessoPage), que
// persiste no "Salvar todas".

import { AlertTriangle, X } from 'lucide-react';
import Select from '@/components/equipe/mapa/Select';

export interface RelRef {
  id: string;
  nome: string;
}

interface Props {
  /** Gargalos da etapa ativa. */
  gargalos: RelRef[];
  /** melhoriaId → gargaloIds que ela resolve. */
  linksByMelhoria: Record<string, string[]>;
  /** Catálogo completo (MAPA) para os seletores "adicionar". */
  gargaloOptions: RelRef[];
  melhoriaOptions: RelRef[];
  onAddGargalo: (id: string) => void;
  onRemoveGargalo: (id: string) => void;
  onLinkMelhoria: (gargaloId: string, melhoriaId: string) => void;
  onUnlinkMelhoria: (gargaloId: string, melhoriaId: string) => void;
  onQuickAddGargalo: () => void;
  onQuickAddMelhoria: (gargaloId: string) => void;
}

export default function GargalosMelhoriasPanel({
  gargalos, linksByMelhoria, gargaloOptions, melhoriaOptions,
  onAddGargalo, onRemoveGargalo, onLinkMelhoria, onUnlinkMelhoria,
  onQuickAddGargalo, onQuickAddMelhoria,
}: Props) {
  const resolve = (mid: string, gid: string) => (linksByMelhoria[mid] ?? []).includes(gid);
  const gargalosDisponiveis = gargaloOptions.filter(o => !gargalos.some(g => g.id === o.id));

  return (
    <div className="modal-section">
      <div className="modal-section-title">Gargalos &amp; Melhorias</div>
      <p className="mapear-gm-hint">Para cada gargalo desta etapa, registre as melhorias que o resolvem.</p>

      <div className="mapear-gm-list">
        {gargalos.length === 0 && <span className="mapear-vazio">Nenhum gargalo nesta etapa ainda.</span>}
        {gargalos.map(g => {
          const vinculadas = melhoriaOptions.filter(m => resolve(m.id, g.id));
          const disponiveis = melhoriaOptions.filter(m => !resolve(m.id, g.id));
          return (
            <div key={g.id} className="mapear-gm-card">
              <div className="mapear-gm-card-head">
                <AlertTriangle size={14} className="mapear-gm-garg-ic" />
                <span className="mapear-gm-garg-nome">{g.nome}</span>
                <button type="button" className="mapear-gm-x" aria-label={`Remover gargalo ${g.nome}`} onClick={() => onRemoveGargalo(g.id)}>
                  <X size={14} />
                </button>
              </div>
              <div className="mapear-gm-card-body">
                <span className="mapear-gm-label">Melhorias que resolvem</span>
                <div className="mapear-gm-chips">
                  {vinculadas.length === 0 && <span className="mapear-vazio">Nenhuma melhoria vinculada ainda.</span>}
                  {vinculadas.map(m => (
                    <span key={m.id} className="mapear-gm-chip">
                      {m.nome}
                      <button type="button" aria-label={`Desvincular ${m.nome}`} onClick={() => onUnlinkMelhoria(g.id, m.id)}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mapear-gm-add">
                  <Select
                    value=""
                    onChange={(v) => { if (v) onLinkMelhoria(g.id, v); }}
                    options={disponiveis.map(m => ({ value: m.id, label: m.nome }))}
                    placeholder="+ Melhoria"
                    compact
                    footerAction={{ label: 'Cadastrar nova melhoria', onClick: () => onQuickAddMelhoria(g.id) }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mapear-gm-add-garg">
        <Select
          value=""
          onChange={(v) => { if (v) onAddGargalo(v); }}
          options={gargalosDisponiveis.map(o => ({ value: o.id, label: o.nome }))}
          placeholder="+ Adicionar gargalo"
          compact
          footerAction={{ label: 'Cadastrar novo gargalo', onClick: onQuickAddGargalo }}
        />
      </div>
    </div>
  );
}
