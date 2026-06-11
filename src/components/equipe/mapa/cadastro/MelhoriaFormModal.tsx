// Form unificado de Melhoria (criar/editar) — padrão "Cadastro Puro".
// `melhoria === null` ⇒ criação; caso contrário, edição pré-preenchida.
// Os gargalos resolvidos são vínculo N:M editado na página de Gargalos;
// aqui aparecem só como leitura.

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import DecimalInput from '@/components/equipe/mapa/DecimalInput';
import { dica } from '@/utils/tooltips';
import { parseDecimal, formatDecimal, formatarMoeda, parseMoeda } from '@/utils/format';
import type { Melhoria, Responsavel, MelhoriaStatus, AcaoTd } from '@/types';
import { MELHORIA_STATUSES, ACOES_TD } from '@/types';
import { useCreateMelhoria, useUpdateMelhoria } from '@/hooks/useMelhorias';
import { useGargalosLista, useSistemasLista, useResponsaveisLista, useProcessosLista } from '@/hooks/useDominioListas';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';

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
                value={r.horas}
                onChange={(n) => handlers.changeHoras(index, String(n))}
                style={{ width: 90 }}
              />
              <button type="button" className="btn-chip-remove" onClick={() => handlers.remove(index)} aria-label={`Remover ${r.nome || 'item'}`}>&times;</button>
            </div>
          );
        })}
      </div>
      <div className="chip-selector-add" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn-chip-add" onClick={handlers.add}>{addLabel}</button>
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
}

export default function MelhoriaFormModal({ aberto, melhoria, onClose }: Props) {
  const createMelhoria = useCreateMelhoria();
  const updateMelhoria = useUpdateMelhoria();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const { data: gargalosList = [] } = useGargalosLista();
  const { data: sistemasList = [] } = useSistemasLista();
  const { data: responsaveisList = [] } = useResponsaveisLista();
  const { data: processosList = [] } = useProcessosLista();

  const processoNomeById = useMemo(() => new Map(processosList.map(p => [p.id, p.name])), [processosList]);
  const processoIdByNome = useMemo(() => new Map(processosList.map(p => [p.name, p.id])), [processosList]);
  const sistemaNomeById = useMemo(() => new Map(sistemasList.map(s => [s.id, s.nome])), [sistemasList]);
  const sistemaIdByNome = useMemo(() => new Map(sistemasList.map(s => [s.nome, s.id])), [sistemasList]);
  const gargaloNomeById = useMemo(() => new Map(gargalosList.map(g => [g.id, g.nome])), [gargalosList]);
  const processoOptionsOrdenado = useMemo(
    () => [...processosList].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [processosList],
  );
  const statusOptions = MELHORIA_STATUSES.map(s => ({ value: s, label: s }));

  const idsToNames = (ids: string[]) => ids.map(id => processoNomeById.get(id)).filter((n): n is string => Boolean(n));
  const namesToIds = (names: string[]) => names.map(n => processoIdByNome.get(n)).filter((id): id is string => Boolean(id));
  const sistemaIdsToNames = (ids: string[]) => ids.map(id => sistemaNomeById.get(id)).filter((n): n is string => Boolean(n));
  const sistemaNamesToIds = (names: string[]) => names.map(n => sistemaIdByNome.get(n)).filter((id): id is string => Boolean(id));

  const [nome, setNome] = useState('');
  const [status, setStatus] = useState<MelhoriaStatus>('Não iniciado');
  const [clusterId, setClusterId] = useState('');
  const [processosNomes, setProcessosNomes] = useState<string[]>([]);
  const [sistemas, setSistemas] = useState<string[]>([]);
  const [executadoPor, setExecutadoPor] = useState<RateioRow[]>([]);
  const [treinamentoPor, setTreinamentoPor] = useState<RateioRow[]>([]);
  const [acoesTd, setAcoesTd] = useState<AcaoTd[]>([]);
  const [custoExternoUnico, setCustoExternoUnico] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Hidratação "reset on open"; re-hidrata quando os mapas id↔nome ficam
  // prontos (carga fria via ?focus=), mas nunca depois de o usuário tocar.
  const tocado = useRef(false);
  useEffect(() => {
    if (!aberto) { tocado.current = false; return; }
    if (tocado.current) return;
    if (melhoria) {
      setNome(melhoria.improvement_description);
      setStatus((melhoria.improvement_status as MelhoriaStatus) || 'Não iniciado');
      setClusterId(melhoria.cluster_id || '');
      setProcessosNomes(idsToNames(melhoria.processos || []));
      setSistemas(sistemaIdsToNames(melhoria.sistemas || []));
      setAcoesTd([...(melhoria.acoesTd || [])]);
      setExecutadoPor((melhoria.executadoPor || []).map(r => ({ ...r })));
      // Migração: melhoria legada só com scalar training_hours vira UMA entrada
      // órfã (sem responsável), que o usuário pode atribuir depois.
      const treinoSeed: RateioRow[] = melhoria.treinamentoPor && melhoria.treinamentoPor.length > 0
        ? melhoria.treinamentoPor.map(r => ({ ...r }))
        : ((melhoria.training_hours ?? 0) > 0 ? [{ nome: '', horas: melhoria.training_hours ?? 0 }] : []);
      setTreinamentoPor(treinoSeed);
      setCustoExternoUnico(melhoria.one_time_external_cost ? formatarMoeda(melhoria.one_time_external_cost) : '');
    } else {
      setNome(''); setStatus('Não iniciado'); setClusterId('');
      setProcessosNomes([]); setSistemas([]); setAcoesTd([]);
      setExecutadoPor([]); setTreinamentoPor([]); setCustoExternoUnico('');
    }
    setErro('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, melhoria, processoNomeById, sistemaNomeById]);

  const touch = () => { tocado.current = true; };

  const makeRateioHandlers = (arr: RateioRow[], setArr: (v: RateioRow[]) => void) => ({
    add: () => { touch(); setArr([...arr, { nome: '', horas: 0 }]); },
    changeNome: (index: number, n: string) => {
      if (!n) return;
      if (arr.filter((_, i) => i !== index).some(r => r.nome === n)) return;
      touch();
      const next = [...arr]; next[index] = { ...next[index], nome: n }; setArr(next);
    },
    changeHoras: (index: number, horasStr: string) => {
      touch();
      const next = [...arr]; next[index] = { ...next[index], horas: parseDecimal(horasStr) }; setArr(next);
    },
    remove: (index: number) => { touch(); setArr(arr.filter((_, i) => i !== index)); },
  });

  const rateioExec = makeRateioHandlers(executadoPor, setExecutadoPor);
  const rateioTreino = makeRateioHandlers(treinamentoPor, setTreinamentoPor);
  const sumHoras = (arr: { horas: number }[]) => arr.reduce((s, r) => s + (Number(r.horas) || 0), 0);

  const gargalosDaMelhoria = melhoria
    ? (melhoria.gargalos ?? []).map(id => ({ id, nome: gargaloNomeById.get(id) || id }))
    : [];

  const salvar = async () => {
    if (!nome.trim()) { setErro('Preencha o nome da melhoria.'); return; }
    setErro('');
    setSalvando(true);
    const treinoLimpo = treinamentoPor.filter(r => r.nome?.trim());
    const payload = {
      improvement_description: nome.trim(),
      improvement_status: status,
      cluster_id: clusterId || undefined,
      processos: namesToIds(processosNomes),
      sistemas: sistemaNamesToIds(sistemas),
      acoesTd,
      executadoPor: executadoPor.filter(r => r.nome?.trim()),
      treinamentoPor: treinoLimpo,
      training_hours: sumHoras(treinoLimpo),
      one_time_external_cost: parseMoeda(custoExternoUnico),
    };
    try {
      if (melhoria) {
        await updateMelhoria.mutateAsync({ id: melhoria.id, old: melhoria, patch: payload });
        toast.success('Melhoria atualizada');
      } else {
        await createMelhoria.mutateAsync(payload);
        toast.success('Melhoria criada');
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
        <h2>{melhoria ? 'Editar Melhoria' : 'Nova Melhoria'}</h2>

        <div className="cadastro-form-secao">Identificação</div>
        <FormField label="Nome" error={erro} required tooltip={dica('melhorias.form.nome')}>
          <input
            type="text"
            value={nome}
            onChange={(e) => { touch(); setNome(e.target.value); if (erro) setErro(''); }}
            placeholder="Digite o nome da melhoria"
          />
        </FormField>
        <div className="cadastro-form-row">
          <FormField label="Status" tooltip={dica('melhorias.form.status')}>
            <Select value={status} onChange={(v) => { touch(); setStatus(v as MelhoriaStatus); }} options={statusOptions} />
          </FormField>
          <FormField label="Cluster" tooltip={dica('melhorias.form.cluster')}>
            <Select value={clusterId} onChange={(v) => { touch(); setClusterId(v); }} options={CLUSTER_OPCOES} />
          </FormField>
        </div>

        <div className="cadastro-form-secao">Escopo</div>
        <FormField label="Processos atendidos" tooltip={dica('melhorias.form.processos')}>
          <ChipSelector
            options={processoOptionsOrdenado.map((p) => p.name)}
            value={processosNomes}
            onChange={(v) => { touch(); setProcessosNomes(v as string[]); }}
            addLabel="Adicionar processo"
          />
        </FormField>
        <FormField label="Ações TD" tooltip={dica('melhorias.form.acoesTd')}>
          <ChipSelector
            options={ACOES_TD as unknown as string[]}
            value={acoesTd}
            onChange={(v) => { touch(); setAcoesTd(v as AcaoTd[]); }}
            addLabel="Adicionar ação"
          />
        </FormField>
        {melhoria && gargalosDaMelhoria.length > 0 ? (
          <div className="cadastro-form-leitura">
            <div className="cadastro-form-leitura-label">Gargalos resolvidos</div>
            <div className="tags">
              {gargalosDaMelhoria.map(g => (<span key={g.id} className="tag tag-etapa">{g.nome}</span>))}
            </div>
            <p className="cadastro-form-leitura-hint">
              O vínculo gargalo↔melhoria é editado na página <strong>Gargalos</strong> (campo "Melhorias vinculadas").
            </p>
          </div>
        ) : (
          <p className="cadastro-form-hint-inline">
            <strong>Gargalos resolvidos</strong> são vinculados na página de <strong>Gargalos</strong> — a melhoria aparece automaticamente nos gargalos que a referenciam.
          </p>
        )}

        <div className="cadastro-form-secao">Sistemas</div>
        <FormField label="Sistemas desenvolvidos/utilizados" tooltip={dica('melhorias.form.sistemas')}>
          <ChipSelector
            options={sistemasList.map((s) => s.nome)}
            value={sistemas}
            onChange={(v) => { touch(); setSistemas(v as string[]); }}
          />
        </FormField>
        {sistemas.filter(Boolean).length > 0 && (
          <p className="cadastro-form-hint-inline">
            O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.
          </p>
        )}

        <div className="cadastro-form-secao">Investimento</div>
        <FormField label="Custo externo único (R$)" tooltip={dica('melhorias.form.custoExternoUnico')}>
          <input type="text" value={custoExternoUnico} onChange={(e) => { touch(); setCustoExternoUnico(e.target.value); }} placeholder="Ex: R$ 3.000,00" />
        </FormField>
        <FormField label="Executado por (rateio em horas)" tooltip={dica('melhorias.form.executadoPor')}>
          <RateioEditor arr={executadoPor} responsaveisList={responsaveisList} handlers={rateioExec} />
        </FormField>
        <FormField label="Horas de treinamento (rateio por responsável)" tooltip={dica('melhorias.form.treinamentoPor')}>
          <RateioEditor arr={treinamentoPor} responsaveisList={responsaveisList} handlers={rateioTreino} />
        </FormField>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-save" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
