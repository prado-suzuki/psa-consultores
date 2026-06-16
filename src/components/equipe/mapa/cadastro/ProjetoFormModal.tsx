// Form unificado de Projeto (criar/editar) — padrão "Cadastro Puro".
// `projeto === null` ⇒ criação; caso contrário, edição pré-preenchida.
// Mesma casca do ProcessoDetalheModal (cabeçalho fixo + ações no topo).

import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { Popover } from '@/components/equipe/mapa/Tooltip';
import { useHoverPopover } from '@/components/equipe/mapa/useHoverPopover';
import { dica } from '@/utils/tooltips';
import { useCreateProjeto, useUpdateProjeto, type ProjetoInput } from '@/hooks/useProjetos';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';
import { JUSTIFICATIVAS_PROJETO, type JustificativaProjeto, type Projeto, type ProjetoStatus } from '@/types';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

const STATUS_SELECT_OPCOES = (['Mapeamento', 'Diagnóstico', 'Melhorias', 'ROI'] as ProjetoStatus[])
  .map(s => ({ value: s, label: s }));

interface ProjetoFormState {
  nome: string;
  clusterId: string;
  descricao: string;
  start_date: string;
  end_date: string;
  status: ProjetoStatus;
  justificativas: JustificativaProjeto[];
}
const EMPTY: ProjetoFormState = {
  nome: '', clusterId: '', descricao: '', start_date: '', end_date: '', status: 'Mapeamento', justificativas: [],
};

function JustificativaChip({ label, tooltip, selected, onToggle }: { label: string; tooltip: string; selected: boolean; onToggle: () => void }) {
  const id = useId();
  const { open, setOpen, pos, ref } = useHoverPopover<HTMLButtonElement>();
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? id : undefined}
        aria-pressed={selected}
        className={`justif-chip${selected ? ' ativa' : ''}`}
      >
        {label}
      </button>
      {open && pos && <Popover id={id} text={tooltip} pos={pos} className="tooltip-pop--wide" />}
    </>
  );
}

function JustificativaChips({ value, onChange }: { value: JustificativaProjeto[]; onChange: (next: JustificativaProjeto[]) => void }) {
  const toggle = (j: JustificativaProjeto) =>
    onChange(value.includes(j) ? value.filter(v => v !== j) : [...value, j]);
  return (
    <div className="justif-chips">
      {JUSTIFICATIVAS_PROJETO.map(opt => (
        <JustificativaChip key={opt.value} label={opt.label} tooltip={opt.tooltip} selected={value.includes(opt.value)} onToggle={() => toggle(opt.value)} />
      ))}
    </div>
  );
}

interface Props {
  aberto: boolean;
  projeto: Projeto | null;
  onClose: () => void;
}

export default function ProjetoFormModal({ aberto, projeto, onClose }: Props) {
  const createProjeto = useCreateProjeto();
  const updateProjeto = useUpdateProjeto();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();

  const [form, setForm] = useState<ProjetoFormState>(EMPTY);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);

  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; setConfirmSair(false); return; }
    if (tocado.current) return;
    if (projeto) {
      setForm({
        nome: projeto.name,
        clusterId: projeto.cluster_id || '',
        descricao: projeto.description || '',
        start_date: projeto.start_date || '',
        end_date: projeto.end_date || '',
        status: projeto.status || 'Mapeamento',
        justificativas: projeto.justificativas || [],
      });
    } else {
      setForm(EMPTY);
    }
    setErro('');
  }, [aberto, projeto]);

  const set = (patch: Partial<ProjetoFormState>) => { tocado.current = true; setForm(f => ({ ...f, ...patch })); };
  const requestClose = () => { if (tocado.current) setConfirmSair(true); else onClose(); };

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Preencha o nome do projeto.'); return; }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setErro('Data fim deve ser posterior à data início.');
      return;
    }
    setErro('');
    setSalvando(true);
    const payload: ProjetoInput = {
      name: form.nome.trim(),
      cluster_id: form.clusterId || undefined,
      description: form.descricao.trim(),
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      status: form.status,
      justificativas: form.justificativas.length ? form.justificativas : [],
    };
    try {
      if (projeto) {
        await updateProjeto.mutateAsync({ id: projeto.id, old: projeto, patch: payload });
        toast.success('Projeto atualizado');
      } else {
        await createProjeto.mutateAsync(payload);
        toast.success('Projeto criado');
      }
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-projeto-form">
      <div className="modal modal-wide processo-det processo-form">
        <header className="processo-det-head">
          <div className="processo-det-head-main">
            {projeto ? (
              <>
                <div className="processo-det-topo"><h2>{projeto.name}</h2></div>
                <p className="processo-form-sub">Editar projeto</p>
              </>
            ) : (
              <>
                <p className="processo-form-eyebrow">Cadastro</p>
                <h2>Novo Projeto</h2>
              </>
            )}
          </div>
          <div className="processo-det-acoes">
            <button className="btn-cancel" onClick={requestClose}>Cancelar</button>
            <button className="cadastro-cta" onClick={salvar} disabled={salvando} data-tour="modal-salvar">{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </header>

        <div className="processo-det-body">
          <div className="cadastro-form-secao">Identificação</div>
          <FormField label="Nome" error={erro} required tooltip={dica('projetos.form.nome')} dataTour="modal-campo-1">
            <input type="text" value={form.nome} onChange={(e) => { set({ nome: e.target.value }); if (erro) setErro(''); }} placeholder="Digite o nome do projeto" />
          </FormField>
          <div className="cadastro-form-row">
            <FormField label="Cluster" tooltip={dica('projetos.form.cluster')}>
              <Select value={form.clusterId} onChange={(v) => set({ clusterId: v })} options={CLUSTER_OPCOES} />
            </FormField>
            <FormField label="Status" tooltip={dica('projetos.form.status')} dataTour="modal-campo-2">
              <Select value={form.status} onChange={(v) => set({ status: v as ProjetoStatus })} options={STATUS_SELECT_OPCOES} />
            </FormField>
          </div>
          <FormField label="Justificativa do projeto" tooltip={dica('projetos.form.justificativas')}>
            <JustificativaChips value={form.justificativas} onChange={(next) => set({ justificativas: next })} />
          </FormField>
          <FormField label="Descrição (inclua o objetivo do projeto)" tooltip={dica('projetos.form.descricao')}>
            <textarea
              className="cadastro-form-textarea"
              value={form.descricao}
              onChange={(e) => set({ descricao: e.target.value })}
              placeholder="Ex: Padronizar a planilha-mestra do DP. Detalhe contexto, escopo e entregáveis."
              rows={4}
            />
          </FormField>

          <div className="cadastro-form-secao">Período</div>
          <div className="cadastro-form-row">
            <FormField label="Data início" tooltip={dica('projetos.form.start_date')}>
              <input type="date" value={form.start_date} onChange={(e) => { set({ start_date: e.target.value }); if (erro) setErro(''); }} />
            </FormField>
            <FormField label="Data fim" tooltip={dica('projetos.form.end_date')}>
              <input type="date" value={form.end_date} onChange={(e) => { set({ end_date: e.target.value }); if (erro) setErro(''); }} />
            </FormField>
          </div>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
      </div>
    </Modal>
  );
}
