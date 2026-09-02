// Form unificado de Sistema (criar/editar) — padrão "Cadastro Puro".
// `sistema === null` ⇒ criação; caso contrário, edição pré-preenchida.
//
// Piloto do padrão-ouro de formulário: react-hook-form + zod (validação por
// schema) e UPDATE por DIFF (envia só os campos que mudaram, via dirtyFields),
// em vez de mandar o objeto inteiro. Layout, campos, regras (cluster obrigatório,
// dedup, rateio) e hooks são os mesmos — muda só o "encanamento" do form.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import { DicaIcon } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { formatarMoeda, parseMoeda } from '@/utils/format';
import type { Sistema } from '@/types';
import { useCreateSistema, useUpdateSistema, useSistemas, type SistemaPatch, type RateioInput } from '@/hooks/useSistemas';
import { useClusters } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { ORIGEM_OPCOES } from '@/components/equipe/mapa/cadastros/sistemaOpcoes';
import { clusterInicial } from '@/utils/etapaEditor';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

interface Props {
  aberto: boolean;
  sistema: Sistema | null;
  /** Cluster sugerido de início ao CRIAR (ex.: o cluster DO PROCESSO em edição) —
   * recebe 100% do rateio por padrão, com precedência sobre o filtro global. */
  clusterIdInicial?: string;
  /** Chamado com o sistema criado (ex.: pra pré-selecionar no cadastro rápido). */
  onCreated?: (sistema: Sistema) => void;
  onClose: () => void;
}

const schema = z.object({
  nome: z.string().trim().min(1, 'Preencha o nome do sistema.'),
  origem: z.string(),
  descricao: z.string(),
  custo: z.string(),
});
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { nome: '', origem: 'Interno', descricao: '', custo: '' };

export default function SistemaFormModal({ aberto, sistema, clusterIdInicial, onCreated, onClose }: Props) {
  const createSistema = useCreateSistema();
  const updateSistema = useUpdateSistema();
  const { data: clustersList = [] } = useClusters();
  const { cluster: fCluster } = useClusterGlobal();
  const { data: sistemas = [] } = useSistemas();
  const CLUSTERS_DISPONIVEIS = useMemo(() => clustersList.filter(c => c.ativo).map(c => c.nome), [clustersList]);

  const {
    register, handleSubmit, control, reset, watch, setError,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  // Rateio por cluster: estado à parte (dinâmico, edição-only, sincroniza em sistema_clusters).
  const [clustersRateio, setClustersRateio] = useState<Record<string, number>>({});
  const [rateioTocado, setRateioTocado] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);

  // Hidratação "reset on open" — uma vez por abertura (não sobrescreve edição em curso).
  const hidratado = useRef(false);
  useEffect(() => {
    if (!aberto) { hidratado.current = false; setConfirmSair(false); return; }
    if (hidratado.current) return;
    hidratado.current = true;
    if (sistema) {
      reset({
        nome: sistema.nome, origem: sistema.origem || 'Interno',
        descricao: sistema.descricao || '', custo: formatarMoeda(sistema.custo_variavel_por_uso),
      });
      setClustersRateio(Object.fromEntries((sistema.clustersRateio || []).map(c => [c.cluster, c.rateio])));
    } else {
      reset(EMPTY);
      // Novo sistema: 100% no cluster DO PROCESSO (cadastro rápido) ou, na falta,
      // no filtro global — sempre editável.
      const clusterSeed = clusterInicial(clusterIdInicial, fCluster);
      const nomeAtual = clustersList.find(c => c.id === clusterSeed)?.nome;
      setClustersRateio(nomeAtual ? { [nomeAtual]: 100 } : {});
    }
    setRateioTocado(false);
  }, [aberto, sistema, clusterIdInicial, fCluster, clustersList, reset]);

  const nome = watch('nome');

  // Participação = clusters com rateio > 0. O cluster "primário" (maior %) é o que
  // vira `sistema_clusters.cluster_id` (ainda usado p/ resolução/dedup/filtro).
  const participacoes = useMemo(
    () => Object.entries(clustersRateio).filter(([, r]) => (r ?? 0) > 0),
    [clustersRateio],
  );
  const totalRateio = participacoes.reduce((acc, [, r]) => acc + r, 0);
  const clusterPrimarioId = useMemo(() => {
    if (!participacoes.length) return null;
    const nomeTop = [...participacoes].sort((a, b) => b[1] - a[1])[0][0];
    return clustersList.find(c => c.nome === nomeTop)?.id ?? null;
  }, [participacoes, clustersList]);

  // Duplicidade ao vivo: mesmo nome participando do MESMO cluster primário.
  const duplicado = useMemo(() => {
    const n = (nome || '').trim().toLowerCase();
    if (!n) return null;
    return sistemas.find(s =>
      s.id !== sistema?.id &&
      (s.nome || '').trim().toLowerCase() === n &&
      (s.cluster_id ?? null) === clusterPrimarioId,
    ) || null;
  }, [sistemas, nome, clusterPrimarioId, sistema]);

  const requestClose = () => { if (isDirty || rateioTocado) setConfirmSair(true); else onClose(); };

  const buildRateios = (): RateioInput[] =>
    participacoes
      .map(([nomeCluster, rateio]) => {
        const cl = clustersList.find(c => c.nome === nomeCluster);
        return cl ? { clusterId: cl.id, rateio } : null;
      })
      .filter((r): r is RateioInput => r != null);

  const onSubmit = async (v: FormValues) => {
    if (duplicado) { setError('nome', { message: `Já existe "${duplicado.nome}" neste cluster.` }); return; }
    if (!clusterPrimarioId) { setError('root', { message: 'Defina a participação: pelo menos um cluster com rateio > 0.' }); return; }
    if (CLUSTERS_DISPONIVEIS.length > 0 && totalRateio !== 100) { setError('root', { message: 'O rateio por cluster precisa somar 100%.' }); return; }
    try {
      const rateios = buildRateios();
      if (sistema) {
        // UPDATE por DIFF: campos alterados (dirtyFields) + rateio (sempre). O
        // cluster_id (derivado do rateio) só entra se o primário mudou de fato.
        const patch: SistemaPatch = { rateios };
        if (dirtyFields.nome) patch.nome = v.nome.trim();
        if (dirtyFields.descricao) patch.descricao = v.descricao.trim();
        if (dirtyFields.origem) patch.origem = v.origem;
        if (dirtyFields.custo) patch.custo_variavel_por_uso = parseMoeda(v.custo);
        if (clusterPrimarioId !== (sistema.cluster_id ?? null)) patch.cluster_id = clusterPrimarioId;
        await updateSistema.mutateAsync({ id: sistema.id, old: sistema, patch });
        toast.success('Sistema atualizado');
      } else {
        const created = await createSistema.mutateAsync({
          nome: v.nome.trim(), descricao: v.descricao.trim(), origem: v.origem,
          custo_licenca_mensal: 0, custo_variavel_por_uso: parseMoeda(v.custo),
          cluster_id: clusterPrimarioId, rateios,
        });
        toast.success('Sistema criado');
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-sistema-form">
      <form className="modal modal-wide" onSubmit={handleSubmit(onSubmit)}>
        <h2>{sistema ? 'Editar Sistema' : 'Novo Sistema'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <div className="cadastro-form-row">
          <FormField label="Nome" error={errors.nome?.message || errors.root?.message} required tooltip={dica('sistemas.form.nome')} dataTour="modal-campo-1">
            <input type="text" {...register('nome')} placeholder="Digite o nome do sistema" />
          </FormField>
          <FormField label="Origem" tooltip={dica('sistemas.form.origem')}>
            <Controller name="origem" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={ORIGEM_OPCOES} />
            )} />
          </FormField>
        </div>
        {duplicado && (
          <div role="alert" style={{ color: '#b45309', fontSize: '0.8rem', margin: '-4px 0 8px' }}>
            Já existe <strong>{duplicado.nome}</strong> neste cluster — talvez você queira usar o existente em vez de criar outro.
          </div>
        )}
        <FormField label="Descrição" tooltip={dica('sistemas.form.descricao')}>
          <textarea className="cadastro-form-textarea" {...register('descricao')} placeholder="Para que serve o sistema e como ele entra no processo" rows={4} />
        </FormField>

        <div className="cadastro-form-secao">Custo</div>
        <div className="cadastro-form-row">
          <FormField label="Custo mensal" tooltip={dica('sistemas.form.custoVariavel')} dataTour="modal-campo-2">
            <input type="text" {...register('custo')} placeholder="Ex: R$ 500,00 / mês" />
          </FormField>
          <div />
        </div>

        {CLUSTERS_DISPONIVEIS.length > 0 && (
          <>
            <div className="cadastro-form-secao">
              Clusters e rateio <DicaIcon text={dica('comum.rateioSecao')} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'hsl(var(--slate-500))', margin: '-2px 0 8px' }}>
              De quais clusters o sistema faz parte e quanto do custo vai pra cada um. Quem fica em 0% não participa; a soma <strong>precisa dar 100%</strong> para salvar.
            </div>
            <div className="cadastro-form-leitura">
              {CLUSTERS_DISPONIVEIS.map(c => {
                const r = clustersRateio[c] ?? 0;
                return (
                  <div key={c} className="cadastro-rateio-row" title={`Rateio do custo para ${c}: ${r}%`}>
                    <span className="cadastro-rateio-nome">{c}</span>
                    <input
                      type="range" min={0} max={100} step={5} value={r}
                      onChange={(ev) => {
                        // Cap: a soma nunca passa de 100% — o slider vai só até o que sobra.
                        const desejado = Number(ev.target.value);
                        const outros = totalRateio - (clustersRateio[c] ?? 0);
                        const permitido = Math.max(0, Math.min(desejado, 100 - outros));
                        setRateioTocado(true);
                        setClustersRateio(prev => ({ ...prev, [c]: permitido }));
                      }}
                      aria-label={`Rateio de ${c}`}
                    />
                    <span className="cadastro-rateio-val">{r}%</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'right', marginTop: 4, color: totalRateio === 100 ? 'hsl(var(--primary))' : '#b45309' }}>
              Total: {totalRateio}%{totalRateio === 100 ? ' ✓' : ' — precisa somar 100% para salvar'}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={requestClose}>Cancelar</button>
          <button type="submit" className="btn-save" data-tour="modal-salvar" disabled={isSubmitting || !!duplicado || (CLUSTERS_DISPONIVEIS.length > 0 && totalRateio !== 100)}>{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
      </form>
    </Modal>
  );
}
