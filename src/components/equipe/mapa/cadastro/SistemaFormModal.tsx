// Form unificado de Sistema (criar/editar) — padrão "Cadastro Puro".
// `sistema === null` ⇒ criação; caso contrário, edição pré-preenchida.
// O rateio por cluster só aparece na edição (mesma regra do fluxo legado).

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { dica } from '@/utils/tooltips';
import { formatarMoeda, parseMoeda } from '@/utils/format';
import type { Sistema } from '@/types';
import { useCreateSistema, useUpdateSistema } from '@/hooks/useSistemas';
import { useClusters } from '@/hooks/useClusters';
import { ORIGEM_OPCOES } from '@/components/equipe/mapa/cadastros/sistemaOpcoes';

interface Props {
  aberto: boolean;
  sistema: Sistema | null;
  onClose: () => void;
}

export default function SistemaFormModal({ aberto, sistema, onClose }: Props) {
  const createSistema = useCreateSistema();
  const updateSistema = useUpdateSistema();
  const { data: clustersList = [] } = useClusters();
  const CLUSTERS_DISPONIVEIS = useMemo(
    () => clustersList.filter(c => c.ativo).map(c => c.nome),
    [clustersList],
  );

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [variavel, setVariavel] = useState('');
  const [clustersRateio, setClustersRateio] = useState<Record<string, number>>({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Hidratação "reset on open" — não sobrescreve edições em curso (tocado).
  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; return; }
    if (tocado.current) return;
    if (sistema) {
      setNome(sistema.nome);
      setDescricao(sistema.descricao || '');
      setOrigem(sistema.origem || 'Interno');
      setVariavel(formatarMoeda(sistema.custo_variavel_por_uso));
      setClustersRateio(Object.fromEntries((sistema.clustersRateio || []).map(c => [c.cluster, c.rateio])));
    } else {
      setNome(''); setDescricao(''); setOrigem('Interno'); setVariavel(''); setClustersRateio({});
    }
    setErro('');
  }, [aberto, sistema]);

  const touch = () => { tocado.current = true; };

  const salvar = async () => {
    if (!nome.trim()) { setErro('Preencha o nome do sistema.'); return; }
    setErro('');
    setSalvando(true);
    try {
      if (sistema) {
        const rateio = Object.entries(clustersRateio)
          .filter(([, r]) => r != null && r !== 100)
          .map(([cluster, rateio]) => ({ cluster, rateio }));
        await updateSistema.mutateAsync({
          id: sistema.id,
          old: sistema,
          patch: {
            nome: nome.trim(),
            descricao: descricao.trim(),
            origem,
            custo_variavel_por_uso: parseMoeda(variavel),
            clustersRateio: rateio,
          },
        });
        toast.success('Sistema atualizado');
      } else {
        await createSistema.mutateAsync({
          nome: nome.trim(),
          descricao: descricao.trim(),
          origem,
          custo_licenca_mensal: 0,
          custo_variavel_por_uso: parseMoeda(variavel),
        });
        toast.success('Sistema criado');
      }
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={aberto} onClose={onClose}>
      <div className="modal modal-wide">
        <h2>{sistema ? 'Editar Sistema' : 'Novo Sistema'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <div className="cadastro-form-row">
          <FormField label="Nome" error={erro} required tooltip={dica('sistemas.form.nome')}>
            <input
              type="text"
              value={nome}
              onChange={(e) => { touch(); setNome(e.target.value); if (erro) setErro(''); }}
              placeholder="Digite o nome do sistema"
            />
          </FormField>
          <FormField label="Origem" tooltip={dica('sistemas.form.origem')}>
            <Select value={origem} onChange={(v) => { touch(); setOrigem(v); }} options={ORIGEM_OPCOES} />
          </FormField>
        </div>
        <FormField label="Descrição" tooltip={dica('sistemas.form.descricao')}>
          <textarea
            className="cadastro-form-textarea"
            value={descricao}
            onChange={(e) => { touch(); setDescricao(e.target.value); }}
            placeholder="Para que serve o sistema e como ele entra no processo"
            rows={4}
          />
        </FormField>

        <div className="cadastro-form-secao">Custo</div>
        <div className="cadastro-form-row">
          <FormField label="Custo mensal" tooltip={dica('sistemas.form.custoVariavel')}>
            <input
              type="text"
              value={variavel}
              onChange={(e) => { touch(); setVariavel(e.target.value); }}
              placeholder="Ex: R$ 500,00 / mês"
            />
          </FormField>
          <div />
        </div>

        {sistema && CLUSTERS_DISPONIVEIS.length > 0 && (
          <>
            <div className="cadastro-form-secao">Rateio por cluster</div>
            <div className="cadastro-form-leitura">
              <p className="cadastro-form-leitura-hint" style={{ margin: '0 0 12px' }}>
                Quanto do custo é atribuído a cada cluster (0–100%). Não definido = 100%. Multiplica o custo recorrente no ROI.
              </p>
              {CLUSTERS_DISPONIVEIS.map(c => {
                const r = clustersRateio[c] ?? 100;
                return (
                  <div key={c} className="cadastro-rateio-row">
                    <span className="cadastro-rateio-nome">{c}</span>
                    <input
                      type="range" min={0} max={100} step={5} value={r}
                      onChange={(ev) => { touch(); setClustersRateio(prev => ({ ...prev, [c]: Number(ev.target.value) })); }}
                      aria-label={`Rateio de ${c}`}
                    />
                    <span className="cadastro-rateio-val">{r}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
