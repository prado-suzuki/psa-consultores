// Form unificado de Sistema (criar/editar) — padrão "Cadastro Puro".
// `sistema === null` ⇒ criação; caso contrário, edição pré-preenchida.
// O rateio por cluster só aparece na edição (mesma regra do fluxo legado).

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { DicaIcon } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { formatarMoeda, parseMoeda } from '@/utils/format';
import type { Sistema } from '@/types';
import { useCreateSistema, useUpdateSistema, useSistemas } from '@/hooks/useSistemas';
import { useClusters } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { ORIGEM_OPCOES } from '@/components/equipe/mapa/cadastros/sistemaOpcoes';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

interface Props {
  aberto: boolean;
  sistema: Sistema | null;
  onClose: () => void;
}

export default function SistemaFormModal({ aberto, sistema, onClose }: Props) {
  const createSistema = useCreateSistema();
  const updateSistema = useUpdateSistema();
  const { data: clustersList = [] } = useClusters();
  const { cluster: fCluster } = useClusterGlobal();
  const { data: sistemas = [] } = useSistemas();
  const CLUSTERS_DISPONIVEIS = useMemo(
    () => clustersList.filter(c => c.ativo).map(c => c.nome),
    [clustersList],
  );
  const CLUSTER_OPCOES = useMemo(
    () => clustersList.filter(c => c.ativo).map(c => ({ value: c.id, label: c.nome })),
    [clustersList],
  );

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [variavel, setVariavel] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [clustersRateio, setClustersRateio] = useState<Record<string, number>>({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);

  // Hidratação "reset on open" — não sobrescreve edições em curso (tocado).
  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; setConfirmSair(false); return; }
    if (tocado.current) return;
    if (sistema) {
      setNome(sistema.nome);
      setDescricao(sistema.descricao || '');
      setOrigem(sistema.origem || 'Interno');
      setVariavel(formatarMoeda(sistema.custo_variavel_por_uso));
      setClusterId(sistema.cluster_id || '');
      setClustersRateio(Object.fromEntries((sistema.clustersRateio || []).map(c => [c.cluster, c.rateio])));
    } else {
      setNome(''); setDescricao(''); setOrigem('Interno'); setVariavel(''); setClustersRateio({});
      setClusterId(fCluster || '');   // pré-carrega o cluster do filtro global (editável)
    }
    setErro('');
  }, [aberto, sistema, fCluster]);

  const touch = () => { tocado.current = true; };
  const requestClose = () => { if (tocado.current) setConfirmSair(true); else onClose(); };

  // 3.5 — duplicidade detectada ao vivo: mesmo nome no mesmo cluster (ignora o próprio na edição).
  const duplicado = useMemo(() => {
    const n = nome.trim().toLowerCase();
    if (!n) return null;
    return sistemas.find(s =>
      s.id !== sistema?.id &&
      (s.nome || '').trim().toLowerCase() === n &&
      (s.cluster_id ?? null) === (clusterId || null),
    ) || null;
  }, [sistemas, nome, clusterId, sistema]);

  const salvar = async () => {
    if (!nome.trim()) { setErro('Preencha o nome do sistema.'); return; }
    if (!clusterId) { setErro('Selecione o cluster do sistema.'); return; }
    if (duplicado) { setErro(`Já existe "${duplicado.nome}" neste cluster.`); return; }
    setErro('');
    setSalvando(true);
    try {
      if (sistema) {
        // Rateio por cluster (slider é chaveado por NOME) → converte p/ id e
        // persiste em sistema_clusters via syncSistemaClusters no hook.
        const rateios = Object.entries(clustersRateio)
          .map(([nomeCluster, rateio]) => {
            const cl = clustersList.find(c => c.nome === nomeCluster);
            return cl ? { clusterId: cl.id, rateio } : null;
          })
          .filter((r): r is { clusterId: string; rateio: number } => r != null);
        await updateSistema.mutateAsync({
          id: sistema.id,
          old: sistema,
          patch: {
            nome: nome.trim(),
            descricao: descricao.trim(),
            origem,
            custo_variavel_por_uso: parseMoeda(variavel),
            cluster_id: clusterId,
            rateios,
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
          cluster_id: clusterId,
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
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-sistema-form">
      <div className="modal modal-wide">
        <h2>{sistema ? 'Editar Sistema' : 'Novo Sistema'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <div className="cadastro-form-row">
          <FormField label="Nome" error={erro} required tooltip={dica('sistemas.form.nome')} dataTour="modal-campo-1">
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
        {duplicado && (
          <div role="alert" style={{ color: '#b45309', fontSize: '0.8rem', margin: '-4px 0 8px' }}>
            Já existe <strong>{duplicado.nome}</strong> neste cluster — talvez você queira usar o existente em vez de criar outro.
          </div>
        )}
        <div className="cadastro-form-row">
          <FormField label="Cluster" required>
            <Select
              value={clusterId}
              onChange={(v) => { touch(); setClusterId(v); }}
              options={CLUSTER_OPCOES}
              placeholder="Selecione o cluster..."
              hasError={!clusterId && !!erro}
            />
          </FormField>
          <div />
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
          <FormField label="Custo mensal" tooltip={dica('sistemas.form.custoVariavel')} dataTour="modal-campo-2">
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
            <div className="cadastro-form-secao">
              Rateio por cluster <DicaIcon text={dica('comum.rateioSecao')} />
            </div>
            <div className="cadastro-form-leitura">
              {CLUSTERS_DISPONIVEIS.map(c => {
                const r = clustersRateio[c] ?? 100;
                return (
                  <div key={c} className="cadastro-rateio-row" title={`Rateio do custo para ${c}: ${r}%`}>
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
          <button className="btn-cancel" onClick={requestClose}>Cancelar</button>
          <button className="btn-save" data-tour="modal-salvar" onClick={salvar} disabled={salvando || !!duplicado}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
      </div>
    </Modal>
  );
}
