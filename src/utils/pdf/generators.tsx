// API pública dos geradores de PDF do MAPA. Substitui os antigos
// `sopGenerator.ts` e `sopComparativoGenerator.ts` mantendo a mesma assinatura
// — então a MapearProcessoPage não precisa mudar a forma de chamar.
//
// Usa `@react-pdf/renderer.pdf(<Document />).toBlob()` para renderizar e
// dispara o download via URL.createObjectURL + <a download>.

import { pdf } from '@react-pdf/renderer';
import type {
  Processo, Etapa, Documento, Sistema, Responsavel, Gargalo, Melhoria, Projeto,
} from '@/types';
import type { RoiAgregado } from '@/utils/roiCalculator';
import type { DiagnosticoRoi } from '@/utils/diagnosticoRoi';
import { SopDocument, type SOPMode } from './SopDocument';
import { SopComparativoDocument } from './SopComparativoDocument';

export type { SOPMode };

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Liberar a URL no próximo tick — alguns browsers exigem que a referência
  // ainda esteja viva quando o click() retorna.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface GenerateSopOptions {
  /** Se true, retorna o blob em vez de fazer download. */
  returnBlob?: boolean;
}

/**
 * Gera o SOP simples (Cenário As-Is OU To-Be) e dispara download.
 * Mantém a mesma assinatura do gerador legado.
 */
export async function generateSOP(
  processo: Processo,
  etapas: Etapa[],
  documentos: Documento[],
  sistemas: Sistema[],
  responsaveis: Responsavel[],
  gargalos: Gargalo[],
  melhorias: Melhoria[] = [],
  mode: SOPMode = 'era',
  options: GenerateSopOptions = {},
): Promise<Blob | void> {
  const instance = pdf(
    <SopDocument
      processo={processo}
      etapas={etapas}
      documentos={documentos}
      sistemas={sistemas}
      responsaveis={responsaveis}
      gargalos={gargalos}
      melhorias={melhorias}
      mode={mode}
    />,
  );
  const blob = await instance.toBlob();
  if (options.returnBlob) return blob;
  const sufixo = mode === 'ficou' ? '_COMO_FICOU' : '';
  const filename = `SOP_${processo.id}${sufixo}_${new Date().toISOString().slice(0, 10)}.pdf`;
  downloadBlob(blob, filename);
}

export interface GenerateSopComparativoInput {
  processo: Processo;
  etapas: Etapa[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  projeto: Projeto | null;
  roi: RoiAgregado;
  diagnostico: DiagnosticoRoi;
  /** Horizonte (em meses) para os KPIs do sumário. Padrão 24. */
  horizonteMeses?: number;
}

/**
 * Gera o SOP Comparativo (Sumário Executivo + páginas Era×Ficou) e dispara
 * download. Mantém a mesma assinatura do gerador legado.
 */
export async function generateSOPComparativo(input: GenerateSopComparativoInput): Promise<void> {
  const instance = pdf(
    <SopComparativoDocument
      processo={input.processo}
      etapas={input.etapas}
      sistemas={input.sistemas}
      responsaveis={input.responsaveis}
      gargalos={input.gargalos}
      melhorias={input.melhorias}
      projeto={input.projeto}
      roi={input.roi}
      diagnostico={input.diagnostico}
      horizonteMeses={input.horizonteMeses ?? 24}
    />,
  );
  const blob = await instance.toBlob();
  const filename = `SOP_COMPARATIVO_${input.processo.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
  downloadBlob(blob, filename);
}
