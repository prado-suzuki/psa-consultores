// Painel "Gargalos & Melhorias" no nível do PROCESSO (grão = processo).
//   • gargalo → vínculo gargalo_processos (processo)
//   • melhoria → vínculo melhoria_processos (processo, direto)
// O vínculo gargalo↔melhoria (qual melhoria resolve qual gargalo) é editado nos
// formulários de cadastro de Gargalo/Melhoria, não aqui.
//
// Apresentacional: todo o estado/persistência vive no chamador (MapearProcessoPage).

import { AlertTriangle, Lightbulb, X } from 'lucide-react';
import Select from '@/components/equipe/mapa/Select';

export interface RelRef {
  id: string;
  nome: string;
}

interface Props {
  /** Gargalos vinculados a ESTE processo. */
  gargalos: RelRef[];
  /** Melhorias vinculadas a ESTE processo. */
  melhorias: RelRef[];
  /** Catálogo completo (MAPA) para os seletores "adicionar". */
  gargaloOptions: RelRef[];
  melhoriaOptions: RelRef[];
  onAddGargalo: (id: string) => void;
  onRemoveGargalo: (id: string) => void;
  onAddMelhoria: (id: string) => void;
  onRemoveMelhoria: (id: string) => void;
  onQuickAddGargalo: () => void;
  onQuickAddMelhoria: () => void;
}

export default function GargalosMelhoriasPanel({
  gargalos, melhorias, gargaloOptions, melhoriaOptions,
  onAddGargalo, onRemoveGargalo, onAddMelhoria, onRemoveMelhoria,
  onQuickAddGargalo, onQuickAddMelhoria,
}: Props) {
  const gargalosDisponiveis = gargaloOptions.filter(o => !gargalos.some(g => g.id === o.id));
  const melhoriasDisponiveis = melhoriaOptions.filter(o => !melhorias.some(m => m.id === o.id));

  return (
    <div className="mapear-gm-processo">
      {/* Gargalos do processo */}
      <div className="modal-section">
        <div className="modal-section-title">
          <AlertTriangle size={14} className="mapear-gm-garg-ic" /> Gargalos do processo
        </div>
        <p className="mapear-gm-hint">Problemas/gargalos que se manifestam neste processo.</p>
        <div className="mapear-gm-chips">
          {gargalos.length === 0 && <span className="mapear-vazio">Nenhum gargalo neste processo ainda.</span>}
          {gargalos.map(g => (
            <span key={g.id} className="mapear-chip amber">
              {g.nome}
              <button type="button" aria-label={`Remover gargalo ${g.nome}`} onClick={() => onRemoveGargalo(g.id)}>
                <X size={11} />
              </button>
            </span>
          ))}
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

      {/* Melhorias do processo */}
      <div className="modal-section">
        <div className="modal-section-title">
          <Lightbulb size={14} className="mapear-gm-melh-ic" /> Melhorias do processo
        </div>
        <p className="mapear-gm-hint">Melhorias/ações de TD que atacam este processo (entram no ROI).</p>
        <div className="mapear-gm-chips">
          {melhorias.length === 0 && <span className="mapear-vazio">Nenhuma melhoria neste processo ainda.</span>}
          {melhorias.map(m => (
            <span key={m.id} className="mapear-gm-chip">
              {m.nome}
              <button type="button" aria-label={`Remover melhoria ${m.nome}`} onClick={() => onRemoveMelhoria(m.id)}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="mapear-gm-add-garg">
          <Select
            value=""
            onChange={(v) => { if (v) onAddMelhoria(v); }}
            options={melhoriasDisponiveis.map(o => ({ value: o.id, label: o.nome }))}
            placeholder="+ Adicionar melhoria"
            compact
            footerAction={{ label: 'Cadastrar nova melhoria', onClick: onQuickAddMelhoria }}
          />
        </div>
      </div>
    </div>
  );
}
