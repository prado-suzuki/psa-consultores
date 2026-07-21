import type {
  Etapa,
  Gargalo,
  Melhoria,
  Processo,
  ProcessSnapshot,
  Responsavel,
  Sistema,
} from '@/types';
import type { DiagnosticoRoi } from '@/utils/diagnosticoRoi';
import type { RoiProcesso } from '@/utils/roiCalculator';

export interface WizardRoiProps {
  processo: Processo | undefined;
  etapas: Etapa[];
  etapasFuturo?: Etapa[];
  responsaveis: Responsavel[];
  sistemas: Sistema[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  onSnapshotCriado: (snap: ProcessSnapshot) => void;
  onEditarEtapas?: (etapaId?: string) => void;
}

export type Passo = 1 | 2 | 3 | 4 | 5;

export interface EtapaBreakdown {
  id: string;
  nome: string;
  horasExec: number;
  horasFicou: number;
  custoExec: number;
  custoFicou: number;
  error_rate: number;
  taxaErrosFicou: number;
  taxaRetrab: number;
  taxaRetrabFicou: number;
  custoRetrabExec: number;
  custoRetrabExecFicou: number;
}

export interface IndicadoresRoi {
  annual_cost: number;
  annual_hours: number;
  annual_savings: number;
  roi_percent: number;
  payback_months: number;
  hours_freed: number;
  investment: number;
}

export interface WizardRoiViewModel {
  diag: DiagnosticoRoi;
  calc: RoiProcesso | undefined;
  ann: number;
  custoHM: number;
  respById: Map<string, Responsavel>;
  etapasBreakdown: EtapaBreakdown[];
  sistemasUsados: Sistema[];
  melhoriasRelevantes: Melhoria[];
}
