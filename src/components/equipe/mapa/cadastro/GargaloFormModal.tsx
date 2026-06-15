// Form unificado de Gargalo (criar/editar) — referência do padrão "Cadastro
// Puro". `gargalo === null` ⇒ criação; caso contrário, edição pré-preenchida.
// Só identidade: o vínculo gargalo↔etapa é feito no editor de etapas
// (Processos → Mapear), no mesmo padrão de documentos/sistemas/responsáveis.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import { dica } from '@/utils/tooltips';
import type { Gargalo } from '@/types';
import { useMelhoriasLista } from '@/hooks/useDominioListas';
import { useCreateGargalo, useUpdateGargalo } from '@/hooks/useGargalos';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';
import { GARGALO_ORIGEM_OPCOES } from '@/components/equipe/mapa/cadastros/gargaloOpcoes';

interface GargaloFormState {
  nome: string;
  descricao: string;
  origem: string;
  clusterId: string;
  melhoriaNomes: string[];
}

const FORM_VAZIO: GargaloFormState = {
  nome: '',
  descricao: '',
  origem: '',
  clusterId: '',
  melhoriaNomes: [],
};

// Rótulo curto da melhoria = título antes de " — " (descrições renomeadas).
function melhoriaLabel(desc: string): string {
  const i = desc.indexOf(' — ');
  if (i > 0) return desc.slice(0, i).trim();
  return desc.length > 50 ? `${desc.slice(0, 50)}…` : desc;
}

interface Props {
  aberto: boolean;
  /** Gargalo em edição, ou null para criação. */
  gargalo: Gargalo | null;
  onClose: () => void;
}

export default function GargaloFormModal({ aberto, gargalo, onClose }: Props) {
  const createGargalo = useCreateGargalo();
  const updateGargalo = useUpdateGargalo();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const { data: melhoriasList = [] } = useMelhoriasLista();

  const melhoriaNomeById = useMemo(
    () => new Map(melhoriasList.map(m => [m.id, melhoriaLabel(m.improvement_description)])),
    [melhoriasList]
  );
  const melhoriaIdByLabel = useMemo(
    () => new Map(melhoriasList.map(m => [melhoriaLabel(m.improvement_description), m.id])),
    [melhoriasList]
  );
  const melhoriaLabelOptions = useMemo(
    () => melhoriasList.map(m => melhoriaLabel(m.improvement_description)),
    [melhoriasList]
  );

  const melhoriaIdsToLabels = (ids: string[]) =>
    ids.map(id => melhoriaNomeById.get(id)).filter((n): n is string => Boolean(n));
  const melhoriaLabelsToIds = (labels: string[]) =>
    labels.map(l => melhoriaIdByLabel.get(l)).filter((id): id is string => Boolean(id));

  const [form, setForm] = useState<GargaloFormState>(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Hidratação "reset on open". As listas de domínio podem chegar depois do
  // modal abrir (ex.: fluxo ?focus= em carga fria) — por isso o efeito também
  // re-hidrata quando o mapa id↔nome fica pronto, mas NUNCA depois que o
  // usuário tocou no form (tocado), para não sobrescrever edições em curso.
  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; return; }
    if (tocado.current) return;
    if (gargalo) {
      setForm({
        nome: gargalo.nome,
        descricao: gargalo.descricao || '',
        origem: gargalo.origem || '',
        clusterId: gargalo.cluster_id || '',
        melhoriaNomes: melhoriaIdsToLabels(gargalo.melhorias || []),
      });
    } else {
      setForm(FORM_VAZIO);
    }
    setErro('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, gargalo, melhoriaNomeById]);

  const atualizar = (patch: Partial<GargaloFormState>) => {
    tocado.current = true;
    setForm(f => ({ ...f, ...patch }));
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Preencha o nome do gargalo.'); return; }
    setErro('');
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        origem: form.origem.trim(),
        cluster_id: form.clusterId || undefined,
        melhorias: melhoriaLabelsToIds(form.melhoriaNomes),
      };
      if (gargalo) {
        await updateGargalo.mutateAsync({ id: gargalo.id, old: gargalo, patch: payload });
        toast.success('Gargalo atualizado');
      } else {
        await createGargalo.mutateAsync(payload);
        toast.success('Gargalo criado');
      }
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  const etapasVinculadas = gargalo?.etapasOrigem || [];

  return (
    <Modal isOpen={aberto} onClose={onClose} tourId="modal-gargalo-form">
      <div className="modal modal-wide">
        <h2>{gargalo ? 'Editar Gargalo' : 'Novo Gargalo'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <div className="cadastro-form-row">
          <FormField label="Nome" error={erro} required tooltip={dica('gargalos.form.nome')} dataTour="modal-campo-1">
            <input
              type="text"
              value={form.nome}
              onChange={(e) => { atualizar({ nome: e.target.value }); if (erro) setErro(''); }}
              placeholder="Digite o nome do gargalo"
            />
          </FormField>
          <FormField label="Origem" tooltip={dica('gargalos.form.origem')} dataTour="modal-campo-2">
            <Select value={form.origem} onChange={(v) => atualizar({ origem: v })} options={GARGALO_ORIGEM_OPCOES} placeholder="Selecione..." />
          </FormField>
        </div>
        <FormField label="Descrição" tooltip={dica('gargalos.form.descricao')}>
          <textarea
            className="cadastro-form-textarea"
            value={form.descricao}
            onChange={(e) => atualizar({ descricao: e.target.value })}
            placeholder="Descreva o gargalo: onde aparece, o que trava, qual o impacto"
            rows={4}
          />
        </FormField>

        <div className="cadastro-form-secao">Vínculos</div>
        <div className="cadastro-form-row">
          <FormField label="Cluster" tooltip={dica('gargalos.form.cluster')}>
            <Select value={form.clusterId} onChange={(v) => atualizar({ clusterId: v })} options={CLUSTER_OPCOES} />
          </FormField>
          <div />
        </div>
        <FormField label="Melhorias vinculadas" tooltip={dica('gargalos.form.melhoria')}>
          <ChipSelector
            options={melhoriaLabelOptions}
            value={form.melhoriaNomes}
            onChange={(v) => atualizar({ melhoriaNomes: v as string[] })}
            addLabel="Adicionar melhoria"
          />
        </FormField>

        {gargalo && (
          <div className="cadastro-form-leitura">
            <div className="cadastro-form-leitura-label">Etapas onde se manifesta</div>
            {etapasVinculadas.length > 0 ? (
              <div className="tags">
                {etapasVinculadas.map((ref) => (
                  <span key={`${ref.etapaId}-${ref.scenario}`} className="tag">
                    {ref.processoNome ? `${ref.processoNome} · ` : ''}{ref.etapaNome || ref.etapaId}
                  </span>
                ))}
              </div>
            ) : (
              <p className="cadastro-form-leitura-vazio">Nenhuma etapa vinculada — este gargalo não aparece na Cascata.</p>
            )}
            <p className="cadastro-form-leitura-hint">
              O vínculo com etapas é feito no mapeamento do processo: <strong>Processos → Mapear → Editar Etapas → Gargalos</strong>.
            </p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" data-tour="modal-salvar" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
