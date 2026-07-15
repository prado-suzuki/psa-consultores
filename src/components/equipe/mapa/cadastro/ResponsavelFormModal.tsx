// Form unificado de Responsável (criar/editar) — padrão "Cadastro Puro".
// `responsavel === null` ⇒ criação; caso contrário, edição pré-preenchida.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import { parseMoeda } from '@/utils/format';
import { clusterInicial } from '@/utils/etapaEditor';
import type { Responsavel } from '@/types';
import { useCreateResponsavel, useUpdateResponsavel } from '@/hooks/useResponsaveis';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';
import { TIPO_OPCOES } from '@/components/equipe/mapa/cadastros/responsavelOpcoes';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

interface Props {
  aberto: boolean;
  responsavel: Responsavel | null;
  /** Cluster sugerido de início ao CRIAR (ex.: o cluster DO PROCESSO em edição). */
  clusterIdInicial?: string;
  /** Chamado com o responsável criado (ex.: pra pré-selecionar no cadastro rápido). */
  onCreated?: (resp: Responsavel) => void;
  onClose: () => void;
}

export default function ResponsavelFormModal({ aberto, responsavel, clusterIdInicial, onCreated, onClose }: Props) {
  const createResp = useCreateResponsavel();
  const updateResp = useUpdateResponsavel();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();

  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [custoHora, setCustoHora] = useState('');
  const [tipo, setTipo] = useState('Interno');
  const [clusterId, setClusterId] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);

  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; setConfirmSair(false); return; }
    if (tocado.current) return;
    if (responsavel) {
      setNome(responsavel.name);
      setCargo(responsavel.level || '');
      setCategoria(responsavel.category || '');
      setCustoHora(responsavel.hourly_rate ? String(responsavel.hourly_rate).replace('.', ',') : '');
      setTipo(responsavel.type === 'Externo' ? 'Externo' : 'Interno');
      setClusterId(responsavel.cluster_id || '');
    } else {
      setNome(''); setCargo(''); setCategoria(''); setCustoHora(''); setTipo('Interno'); setClusterId(clusterInicial(clusterIdInicial));
    }
    setErro('');
  }, [aberto, responsavel, clusterIdInicial]);

  const touch = () => { tocado.current = true; };
  const requestClose = () => { if (tocado.current) setConfirmSair(true); else onClose(); };

  const salvar = async () => {
    if (!nome.trim()) { setErro('Preencha o nome do responsável.'); return; }
    setErro('');
    setSalvando(true);
    const payload = {
      name: nome.trim(),
      level: cargo.trim(),
      category: categoria.trim() || undefined,
      hourly_rate: parseMoeda(custoHora),
      type: tipo,
      cluster_id: clusterId || undefined,
    };
    try {
      if (responsavel) {
        await updateResp.mutateAsync({ id: responsavel.id, old: responsavel, patch: payload });
        toast.success('Responsável atualizado');
      } else {
        const created = await createResp.mutateAsync(payload);
        toast.success('Responsável criado');
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-responsavel-form">
      <div className="modal modal-wide">
        <h2>{responsavel ? 'Editar Responsável' : 'Novo Responsável'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <div className="cadastro-form-row">
          <FormField label="Nome" error={erro} required tooltip={dica('responsaveis.form.nome')} dataTour="modal-campo-1">
            <input
              type="text"
              value={nome}
              onChange={(e) => { touch(); setNome(e.target.value); if (erro) setErro(''); }}
              placeholder="Digite o nome do responsável"
            />
          </FormField>
          <FormField label="Cargo" tooltip={dica('responsaveis.form.cargo')}>
            <input type="text" value={cargo} onChange={(e) => { touch(); setCargo(e.target.value); }} placeholder="Digite o cargo" />
          </FormField>
        </div>
        <div className="cadastro-form-row">
          <FormField label="Categoria" tooltip="Senioridade do cargo (ex.: Pleno, Júnior, Sênior).">
            <input type="text" value={categoria} onChange={(e) => { touch(); setCategoria(e.target.value); }} placeholder="Ex: Pleno, Júnior, Sênior" />
          </FormField>
          <FormField label="Tipo" tooltip={dica('responsaveis.form.tipo')}>
            <Select value={tipo} onChange={(v) => { touch(); setTipo(v); }} options={TIPO_OPCOES} />
          </FormField>
        </div>

        <div className="cadastro-form-secao">Vínculo & custo</div>
        <div className="cadastro-form-row">
          <FormField label="Cluster" tooltip={dica('responsaveis.form.cluster')}>
            <Select value={clusterId} onChange={(v) => { touch(); setClusterId(v); }} options={CLUSTER_OPCOES} />
          </FormField>
          <FormField label="Custo por hora trabalhada (R$)" tooltip={dica('responsaveis.form.hourly_rate')} dataTour="modal-campo-2">
            <input type="text" value={custoHora} onChange={(e) => { touch(); setCustoHora(e.target.value); }} placeholder="Ex: 90,00" />
          </FormField>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={requestClose}>Cancelar</button>
          <button className="btn-save" data-tour="modal-salvar" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
      </div>
    </Modal>
  );
}
