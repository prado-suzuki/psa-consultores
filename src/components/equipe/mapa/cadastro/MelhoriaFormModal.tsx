// Form unificado de Melhoria (criar/editar) — padrão "Cadastro Puro".
// `melhoria === null` ⇒ criação; caso contrário, edição pré-preenchida.
//
// Padrão-ouro: react-hook-form + zod nos campos escalares e UPDATE por DIFF
// (colunas só quando mudam; junções só quando tocadas). Os arrays dinâmicos
// (rateio de exec/treino, sistemas, ações) ficam em estado local — as junções
// são sincronizadas por diff pelo próprio hook (useMelhorias).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import DecimalInput from '@/components/equipe/mapa/DecimalInput';
import { dica } from '@/utils/tooltips';
import { parseDecimal, formatDecimal, formatarMoeda, parseMoeda } from '@/utils/format';
import type { Melhoria, Responsavel, MelhoriaStatus, AcaoTd } from '@/types';
import { IconTooltip } from '@/components/equipe/mapa/Tooltip';
import { MELHORIA_STATUSES, ACOES_TD } from '@/types';
import { useCreateMelhoria, useUpdateMelhoria } from '@/hooks/useMelhorias';
import { useSistemasLista, useResponsaveisLista } from '@/hooks/useDominioListas';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import ConfirmarDescarte from '@/components/equipe/mapa/ConfirmarDescarte';

type RateioRow = { nome: string; horas: number };

/** Editor de rateio: linhas [responsável, horas, remover] + botão Adicionar e total. */
function RateioEditor({
  arr, responsaveisList, handlers, addLabel = 'Adicionar',
}: {
  arr: RateioRow[];
  responsaveisList: Responsavel[];
  handlers: {
    add: () => void;
    changeNome: (index: number, nome: string) => void;
    changeHoras: (index: number, h: string) => void;
    remove: (index: number) => void;
  };
  addLabel?: string;
}) {
  const total = arr.reduce((s, r) => s + (Number(r.horas) || 0), 0);
  return (
    <>
      <div className="chip-list-editable">
        {arr.map((r, index) => {
          const otherNames = arr.filter((_, i) => i !== index).map(x => x.nome);
          return (
            <div key={index} className="chip-editable-row">
              <Select
                value={r.nome}
                onChange={(v) => handlers.changeNome(index, v)}
                options={responsaveisList.map((resp) => ({ value: resp.name, label: resp.name, disabled: otherNames.includes(resp.name) }))}
                placeholder="Selecione..."
              />
              <DecimalInput
                className="chip-vol-input"
                placeholder="Horas"
                title={dica('comum.horas')}
                value={r.horas}
                onChange={(n) => handlers.changeHoras(index, String(n))}
                style={{ width: 90 }}
              />
              <IconTooltip label={`Remover ${r.nome || 'item'}`} side="bottom">
                <button type="button" className="btn-chip-remove" onClick={() => handlers.remove(index)} aria-label={`Remover ${r.nome || 'item'}`}>&times;</button>
              </IconTooltip>
            </div>
          );
        })}
      </div>
      <div className="chip-selector-add" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <IconTooltip label={addLabel} side="bottom">
          <button type="button" className="btn-chip-add" onClick={handlers.add}>{addLabel}</button>
        </IconTooltip>
        {arr.length > 0 && (
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Total: <strong style={{ color: 'var(--accent-color)' }}>{formatDecimal(total, 'h')}</strong>
          </span>
        )}
      </div>
    </>
  );
}

interface Props {
  aberto: boolean;
  melhoria: Melhoria | null;
  onClose: () => void;
  onEditarGargalo?: (id: string) => void;
}

const schema = z.object({
  nome: z.string().trim().min(1, 'Preencha o nome da melhoria.'),
  clusterId: z.string().min(1, 'Selecione o cluster da melhoria.'),
  status: z.string(),
  custoExterno: z.string(),
});
type FormValues = z.infer<typeof schema>;
const EMPTY: FormValues = { nome: '', clusterId: '', status: 'Não iniciado', custoExterno: '' };

export default function MelhoriaFormModal({ aberto, melhoria, onClose }: Props) {
  const createMelhoria = useCreateMelhoria();
  const updateMelhoria = useUpdateMelhoria();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const { cluster: fCluster } = useClusterGlobal();
  const { data: sistemasList = [] } = useSistemasLista();
  const { data: responsaveisList = [] } = useResponsaveisLista();

  const sistemaNomeById = useMemo(() => new Map(sistemasList.map(s => [s.id, s.nome])), [sistemasList]);
  const sistemaIdByNome = useMemo(() => new Map(sistemasList.map(s => [s.nome, s.id])), [sistemasList]);
  const respNomeById = useMemo(() => new Map(responsaveisList.map(r => [r.id, r.name])), [responsaveisList]);
  const respIdByNome = useMemo(() => new Map(responsaveisList.map(r => [r.name, r.id])), [responsaveisList]);
  const statusOptions = MELHORIA_STATUSES.map(s => ({ value: s, label: s }));

  const sistemaIdsToNames = (ids: string[]) => ids.map(id => sistemaNomeById.get(id)).filter((n): n is string => Boolean(n));
  const sistemaNamesToIds = (names: string[]) => names.map(n => sistemaIdByNome.get(n)).filter((id): id is string => Boolean(id));

  const {
    handleSubmit, control, reset, setError,
    formState: { errors, dirtyFields, isDirty, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  // Arrays dinâmicos + flag de "vínculos tocados" (estado local; junções via hook).
  const [sistemas, setSistemas] = useState<string[]>([]);
  const [executadoPor, setExecutadoPor] = useState<RateioRow[]>([]);
  const [treinamentoPor, setTreinamentoPor] = useState<RateioRow[]>([]);
  const [acoesTd, setAcoesTd] = useState<AcaoTd[]>([]);
  const [vinculosTocados, setVinculosTocados] = useState(false);
  const [confirmSair, setConfirmSair] = useState(false);

  const hidratado = useRef(false);
  useEffect(() => {
    if (!aberto) { hidratado.current = false; setConfirmSair(false); return; }
    if (hidratado.current) return;
    // Hidrata UMA vez, mas só depois que os catálogos referenciados carregarem —
    // senão os nomes de responsável/sistema resolveriam pra vazio. O effect
    // re-roda quando as listas chegam (deps sistemaNomeById/respNomeById).
    if (melhoria) {
      const precisaResp = ((melhoria.executadoPor?.length ?? 0) > 0 || (melhoria.treinamentoPor?.length ?? 0) > 0) && responsaveisList.length === 0;
      const precisaSis = (melhoria.sistemas?.length ?? 0) > 0 && sistemasList.length === 0;
      if (precisaResp || precisaSis) return;
    }
    hidratado.current = true;
    const toRateio = (r: { responsavelId?: string; nome?: string; horas: number }): RateioRow =>
      ({ nome: r.nome || respNomeById.get(r.responsavelId ?? '') || '', horas: r.horas });
    if (melhoria) {
      reset({
        nome: melhoria.improvement_description,
        clusterId: melhoria.cluster_id || '',
        status: (melhoria.improvement_status as MelhoriaStatus) || 'Não iniciado',
        custoExterno: melhoria.one_time_external_cost ? formatarMoeda(melhoria.one_time_external_cost) : '',
      });
      setSistemas(sistemaIdsToNames(melhoria.sistemas || []));
      setAcoesTd([...(melhoria.acoesTd || [])]);
      setExecutadoPor((melhoria.executadoPor || []).map(toRateio));
      const treinoSeed: RateioRow[] = melhoria.treinamentoPor && melhoria.treinamentoPor.length > 0
        ? melhoria.treinamentoPor.map(toRateio)
        : ((melhoria.training_hours ?? 0) > 0 ? [{ nome: '', horas: melhoria.training_hours ?? 0 }] : []);
      setTreinamentoPor(treinoSeed);
    } else {
      reset({ ...EMPTY, clusterId: fCluster || '' });
      setSistemas([]); setAcoesTd([]); setExecutadoPor([]); setTreinamentoPor([]);
    }
    setVinculosTocados(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, melhoria, sistemaNomeById, respNomeById, fCluster, reset]);

  const requestClose = () => { if (isDirty || vinculosTocados) setConfirmSair(true); else onClose(); };

  const makeRateioHandlers = (arr: RateioRow[], setArr: (v: RateioRow[]) => void) => ({
    add: () => { setVinculosTocados(true); setArr([...arr, { nome: '', horas: 0 }]); },
    changeNome: (index: number, n: string) => {
      if (!n) return;
      if (arr.filter((_, i) => i !== index).some(r => r.nome === n)) return;
      setVinculosTocados(true);
      const next = [...arr]; next[index] = { ...next[index], nome: n }; setArr(next);
    },
    changeHoras: (index: number, horasStr: string) => {
      setVinculosTocados(true);
      const next = [...arr]; next[index] = { ...next[index], horas: parseDecimal(horasStr) }; setArr(next);
    },
    remove: (index: number) => { setVinculosTocados(true); setArr(arr.filter((_, i) => i !== index)); },
  });

  const rateioExec = makeRateioHandlers(executadoPor, setExecutadoPor);
  const rateioTreino = makeRateioHandlers(treinamentoPor, setTreinamentoPor);
  const sumHoras = (arr: { horas: number }[]) => arr.reduce((s, r) => s + (Number(r.horas) || 0), 0);

  // Resolve nome→id p/ persistir em melhoria_responsaveis (o editor opera por nome).
  const toResp = (arr: RateioRow[]) => arr
    .filter(r => r.nome?.trim())
    .map(r => ({ responsavelId: respIdByNome.get(r.nome), nome: r.nome, horas: r.horas }));

  const onSubmit = async (v: FormValues) => {
    try {
      const execLimpo = toResp(executadoPor);
      const treinoLimpo = toResp(treinamentoPor);
      if (melhoria) {
        // UPDATE por DIFF: colunas só quando mudam; junções só quando tocadas.
        const patch: Partial<Melhoria> = {};
        if (dirtyFields.nome) patch.improvement_description = v.nome.trim();
        if (dirtyFields.status) patch.improvement_status = v.status as MelhoriaStatus;
        if (dirtyFields.clusterId) patch.cluster_id = v.clusterId;
        if (dirtyFields.custoExterno) patch.one_time_external_cost = parseMoeda(v.custoExterno);
        if (vinculosTocados) {
          patch.sistemas = sistemaNamesToIds(sistemas);
          patch.acoesTd = acoesTd;
          patch.executadoPor = execLimpo;
          patch.treinamentoPor = treinoLimpo;
          patch.training_hours = sumHoras(treinoLimpo);
        }
        if (Object.keys(patch).length > 0) {
          await updateMelhoria.mutateAsync({ id: melhoria.id, old: melhoria, patch });
        }
        toast.success('Melhoria atualizada');
      } else {
        await createMelhoria.mutateAsync({
          improvement_description: v.nome.trim(),
          improvement_status: v.status as MelhoriaStatus,
          cluster_id: v.clusterId,
          sistemas: sistemaNamesToIds(sistemas),
          acoesTd,
          executadoPor: execLimpo,
          treinamentoPor: treinoLimpo,
          training_hours: sumHoras(treinoLimpo),
          one_time_external_cost: parseMoeda(v.custoExterno),
        });
        toast.success('Melhoria criada');
      }
      onClose();
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Modal isOpen={aberto} onClose={requestClose} tourId="modal-melhoria-form">
      <form className="modal modal-wide" onSubmit={handleSubmit(onSubmit)}>
        <h2>{melhoria ? 'Editar Melhoria' : 'Nova Melhoria'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <FormField label="Nome" error={errors.nome?.message || errors.root?.message} required tooltip={dica('melhorias.form.nome')} dataTour="modal-campo-1">
          <input type="text" {...control.register('nome')} placeholder="Digite o nome da melhoria" />
        </FormField>
        <div className="cadastro-form-row">
          <FormField label="Status" tooltip={dica('melhorias.form.status')}>
            <Controller name="status" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={statusOptions} />
            )} />
          </FormField>
          <FormField label="Cluster" required error={errors.clusterId?.message} tooltip={dica('melhorias.form.cluster')}>
            <Controller name="clusterId" control={control} render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} options={CLUSTER_OPCOES} hasError={!!errors.clusterId} />
            )} />
          </FormField>
        </div>

        <div className="cadastro-form-secao">Escopo</div>
        <FormField label="Ações TD" tooltip={dica('melhorias.form.acoesTd')} dataTour="modal-campo-2">
          <ChipSelector
            options={ACOES_TD as unknown as string[]}
            value={acoesTd}
            onChange={(v) => { setVinculosTocados(true); setAcoesTd(v as AcaoTd[]); }}
            addLabel="Adicionar ação"
          />
        </FormField>
        <div className="cadastro-form-secao">Sistemas</div>
        <FormField label="Sistemas desenvolvidos/utilizados" tooltip={dica('melhorias.form.sistemas')}>
          <ChipSelector
            options={sistemasList.map((s) => s.nome)}
            value={sistemas}
            onChange={(v) => { setVinculosTocados(true); setSistemas(v as string[]); }}
          />
        </FormField>
        {sistemas.filter(Boolean).length > 0 && (
          <p className="cadastro-form-hint-inline">
            O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.
          </p>
        )}

        <div className="cadastro-form-secao">Investimento</div>
        <FormField label="Custo externo único (R$)" tooltip={dica('melhorias.form.custoExternoUnico')}>
          <input type="text" {...control.register('custoExterno')} placeholder="Ex: R$ 3.000,00" />
        </FormField>
        <FormField label="Executado por (rateio em horas)" tooltip={dica('melhorias.form.executadoPor')}>
          <RateioEditor arr={executadoPor} responsaveisList={responsaveisList} handlers={rateioExec} />
        </FormField>
        <FormField label="Horas de treinamento (rateio por responsável)" tooltip={dica('melhorias.form.treinamentoPor')}>
          <RateioEditor arr={treinamentoPor} responsaveisList={responsaveisList} handlers={rateioTreino} />
        </FormField>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={requestClose}>Cancelar</button>
          <button type="submit" className="btn-save" data-tour="modal-salvar" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
        </div>
        <ConfirmarDescarte open={confirmSair} onContinuar={() => setConfirmSair(false)} onDescartar={() => { setConfirmSair(false); onClose(); }} />
      </form>
    </Modal>
  );
}
