// Form unificado de Processo (criar/editar) — padrão "Cadastro Puro".
// `processo === null` ⇒ criação; caso contrário, edição pré-preenchida.
// Usa a MESMA casca do ProcessoDetalheModal (cabeçalho fixo com identidade +
// ações no topo, corpo rolável) para os dois modais conversarem visualmente.
// O mapeamento de etapas/ROI vive em /processos/:id/mapear — aqui só metadados.

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import type { Processo, FrequenciaProcesso, StatusAvaliacao } from '@/types';
import { useProjetosLista } from '@/hooks/useDominioListas';
import { useCreateProcesso, useUpdateProcesso } from '@/hooks/useProcessos';
import {
  FREQUENCIA_OPCOES, STATUS_AVALIACAO_OPCOES, COMPLEXIDADE_OPCOES, normalizarComplexidade,
} from '@/components/equipe/mapa/cadastros/processoOpcoes';

interface Props {
  aberto: boolean;
  processo: Processo | null;
  /** Código visual do processo (ex.: P5.01) — exibido no cabeçalho, como no detalhe. */
  codigo?: string;
  onClose: () => void;
}

export default function ProcessoFormModal({ aberto, processo, codigo, onClose }: Props) {
  const createProcesso = useCreateProcesso();
  const updateProcesso = useUpdateProcesso();
  const { data: projetos = [] } = useProjetosLista();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [projetoId, setProjetoId] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [statusAvaliacao, setStatusAvaliacao] = useState<StatusAvaliacao>('Não avaliado');
  const [complexidade, setComplexidade] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; return; }
    if (tocado.current) return;
    if (processo) {
      setNome(processo.name);
      setDescricao(processo.description || '');
      setProjetoId(processo.project_id || '');
      setFrequencia(processo.frequency || '');
      setStatusAvaliacao(processo.evaluation_status || 'Não avaliado');
      setComplexidade(normalizarComplexidade(processo.complexity_level));
    } else {
      setNome(''); setDescricao(''); setProjetoId(''); setFrequencia('');
      setStatusAvaliacao('Não avaliado'); setComplexidade('');
    }
    setErro('');
  }, [aberto, processo]);

  const touch = () => { tocado.current = true; };

  const salvar = async () => {
    if (!nome.trim()) { setErro('Preencha o nome do processo.'); return; }
    if (!projetoId) { setErro('Vincule o processo a um projeto.'); return; }
    setErro('');
    setSalvando(true);
    const payload = {
      name: nome.trim(),
      description: descricao.trim(),
      project_id: projetoId,
      frequency: (frequencia || undefined) as FrequenciaProcesso | undefined,
      evaluation_status: statusAvaliacao,
      complexity_level: normalizarComplexidade(complexidade) || undefined,
    };
    try {
      if (processo) {
        await updateProcesso.mutateAsync({ id: processo.id, old: processo, patch: payload });
        toast.success('Processo atualizado');
      } else {
        await createProcesso.mutateAsync(payload);
        toast.success('Processo criado');
      }
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={aberto} onClose={onClose} tourId="modal-processo-form">
      <div className="modal modal-wide processo-det processo-form">
        <header className="processo-det-head">
          <div className="processo-det-head-main">
            {processo ? (
              <>
                <div className="processo-det-topo">
                  {codigo && <span className="processo-code processo-code-lg">{codigo}</span>}
                  <h2>{processo.name}</h2>
                </div>
                <p className="processo-form-sub">Editar processo</p>
              </>
            ) : (
              <>
                <p className="processo-form-eyebrow">Cadastro</p>
                <h2>Novo Processo</h2>
              </>
            )}
          </div>
          <div className="processo-det-acoes">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="cadastro-cta" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </header>

        <div className="processo-det-body">
          <div className="cadastro-form-secao">Identificação</div>
          <FormField label="Nome" error={erro} required tooltip={dica('processos.form.nome')}>
            <input
              type="text"
              value={nome}
              onChange={(e) => { touch(); setNome(e.target.value); if (erro) setErro(''); }}
              placeholder="Digite o nome do processo"
            />
          </FormField>
          <FormField label="Descrição" tooltip={dica('processos.form.descricao')}>
            <textarea
              className="cadastro-form-textarea"
              value={descricao}
              onChange={(e) => { touch(); setDescricao(e.target.value); }}
              placeholder="O que o processo faz e onde se encaixa"
              rows={4}
            />
          </FormField>

          <div className="cadastro-form-secao">Classificação</div>
          <FormField label="Projeto" required tooltip={dica('processos.form.projeto')}>
            <Select
              value={projetoId}
              onChange={(v) => { touch(); setProjetoId(v); if (erro) setErro(''); }}
              options={projetos.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Selecione o projeto..."
            />
          </FormField>
          <div className="cadastro-form-row">
            <FormField label="Frequência" tooltip={dica('processos.form.frequency')}>
              <Select value={frequencia} onChange={(v) => { touch(); setFrequencia(v); }} options={FREQUENCIA_OPCOES} />
            </FormField>
            <FormField label="Complexidade" tooltip={dica('processos.form.complexity_level')}>
              <Select
                value={normalizarComplexidade(complexidade)}
                onChange={(v) => { touch(); setComplexidade(normalizarComplexidade(v)); }}
                options={COMPLEXIDADE_OPCOES}
              />
            </FormField>
          </div>
          <div className="cadastro-form-row">
            <FormField label="Status de avaliação" tooltip={dica('processos.form.evaluation_status')}>
              <Select value={statusAvaliacao} onChange={(v) => { touch(); setStatusAvaliacao(v as StatusAvaliacao); }} options={STATUS_AVALIACAO_OPCOES} />
            </FormField>
            <div />
          </div>
        </div>
      </div>
    </Modal>
  );
}
