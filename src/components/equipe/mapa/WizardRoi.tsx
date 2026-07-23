// Wizard executivo de ROI standalone.
// Mantém a orquestração local; apresentação e modelo vivem em wizard-roi/.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ItemDiagnostico } from '@/utils/diagnosticoRoi';
import { diagnosticarRoi } from '@/utils/diagnosticoRoi';
import { calcularRoi, execucoesAnuais } from '@/utils/roiCalculator';
import { useCreateSnapshot, useSnapshots } from '@/hooks/useSnapshots';
import {
  criarBreakdownEtapas,
  custoHorarioMedio,
  indicadoresAtuais,
  melhoriasDoProcesso,
  sistemasUsadosNasEtapas,
} from '@/lib/wizardRoiModel';
import { editarItemDiagnostico } from '@/components/equipe/mapa/wizard-roi/navigation';
import type { Passo, WizardRoiProps } from '@/components/equipe/mapa/wizard-roi/types';
import { WizardBody, WizardFooter, WizardHeader, WizardProgress, WizardStepper } from '@/components/equipe/mapa/wizard-roi/WizardChrome';
import { StepDiagnostico } from '@/components/equipe/mapa/wizard-roi/StepDiagnostico';
import { StepEquipeHoras } from '@/components/equipe/mapa/wizard-roi/StepEquipeHoras';
import { StepQualidade } from '@/components/equipe/mapa/wizard-roi/StepQualidade';
import { StepSistemasInvestimento } from '@/components/equipe/mapa/wizard-roi/StepSistemasInvestimento';
import { StepPrevia } from '@/components/equipe/mapa/wizard-roi/StepPrevia';

export default function WizardRoi({
  processo,
  etapas,
  etapasFuturo = [],
  responsaveis,
  sistemas,
  gargalos,
  melhorias,
  onSnapshotCriado,
  onEditarEtapas,
}: WizardRoiProps) {
  const navigate = useNavigate();
  const [passo, setPasso] = useState<Passo>(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [snapshotSelecionado, setSnapshotSelecionado] = useState<'ao-vivo' | string>('ao-vivo');
  const snapshotsQuery = useSnapshots(processo?.id);
  const createSnapshotMutation = useCreateSnapshot();

  useEffect(() => {
    setPasso(1);
    setErro('');
    setSnapshotSelecionado('ao-vivo');
  }, [processo?.id]);

  const snapshotsProcesso = useMemo(
    () => [...(snapshotsQuery.data ?? [])].sort((a, b) => a.snapshot_at.localeCompare(b.snapshot_at)),
    [snapshotsQuery.data],
  );
  const diag = useMemo(
    () => processo ? diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias) : null,
    [processo, etapas, responsaveis, sistemas, gargalos, melhorias],
  );
  const calc = useMemo(
    () => processo ? calcularRoi({ processos: [processo], etapas, etapasFuturo, responsaveis, sistemas, gargalos, melhorias }).porProcesso[0] : undefined,
    [processo, etapas, etapasFuturo, responsaveis, sistemas, gargalos, melhorias],
  );
  const respById = useMemo(() => new Map(responsaveis.map(responsavel => [responsavel.id, responsavel])), [responsaveis]);
  const custoHM = custoHorarioMedio(responsaveis);
  const etapasBreakdown = useMemo(
    () => criarBreakdownEtapas(etapas, respById, custoHM, etapasFuturo),
    [etapas, respById, custoHM, etapasFuturo],
  );
  const sistemasUsados = useMemo(() => sistemasUsadosNasEtapas([...etapas, ...etapasFuturo], sistemas), [etapas, etapasFuturo, sistemas]);
  const melhoriasRelevantes = useMemo(() => melhoriasDoProcesso(processo, melhorias), [processo, melhorias]);

  if (!processo || !diag) return null;

  const ann = execucoesAnuais(processo);
  const snapAtivo = snapshotSelecionado !== 'ao-vivo'
    ? snapshotsProcesso.find(snapshot => snapshot.id === snapshotSelecionado)
    : undefined;
  const indicadores = snapAtivo ? {
    annual_cost: snapAtivo.annual_cost,
    annual_hours: snapAtivo.annual_hours,
    annual_savings: snapAtivo.annual_savings,
    roi_percent: snapAtivo.roi_percent,
    payback_months: snapAtivo.payback_months,
    hours_freed: snapAtivo.hours_freed,
    investment: snapAtivo.investment,
  } : indicadoresAtuais(calc);
  const visualizandoHistorico = !!snapAtivo;

  const irPara = (novoPasso: Passo) => {
    setErro('');
    setPasso(novoPasso);
  };
  const handleEditarItem = (item: ItemDiagnostico) => editarItemDiagnostico(item, navigate, onEditarEtapas);
  const salvarMensuracao = async () => {
    setSalvando(true);
    setErro('');
    try {
      const snapshot = await createSnapshotMutation.mutateAsync({
        process_id: processo.id,
        annual_cost: calc?.custoAnual ?? 0,
        annual_hours: calc?.horasAnual ?? 0,
        annual_savings: calc?.economiaAnual ?? 0,
        roi_percent: calc?.roiPercentual ?? 0,
        payback_months: calc?.paybackMeses ?? 0,
        hours_freed: calc?.horasLiberadas ?? 0,
        investment: calc?.investimento ?? 0,
      });
      setSnapshotSelecionado('ao-vivo');
      onSnapshotCriado(snapshot);
    } catch (error) {
      setErro(error instanceof Error ? error.message : String(error));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="roi-config-shell">
      <WizardHeader processoNome={processo.name} passo={passo} />
      <WizardProgress progresso={diag.progresso} />
      <WizardStepper passo={passo} irPara={irPara} />
      <WizardBody>
        {passo === 1 && <StepDiagnostico diag={diag} onEditarItem={handleEditarItem} />}
        {passo === 2 && <StepEquipeHoras processo={processo} calc={calc} ann={ann} etapas={etapasBreakdown} />}
        {passo === 3 && <StepQualidade calc={calc} ann={ann} etapas={etapasBreakdown} />}
        {passo === 4 && <StepSistemasInvestimento calc={calc} sistemas={sistemasUsados} melhorias={melhoriasRelevantes} custoHM={custoHM} respById={respById} />}
        {passo === 5 && <StepPrevia snapshots={snapshotsProcesso} snapshotSelecionado={snapshotSelecionado} onSelecionarSnapshot={setSnapshotSelecionado} snapAtivo={snapAtivo} indicadores={indicadores} diag={diag} calc={calc} ann={ann} erro={erro} />}
      </WizardBody>
      <WizardFooter passo={passo} irPara={irPara} salvando={salvando} visualizandoHistorico={visualizandoHistorico} podeCalcular={diag.podeCalcular} onSalvar={salvarMensuracao} />
    </div>
  );
}
