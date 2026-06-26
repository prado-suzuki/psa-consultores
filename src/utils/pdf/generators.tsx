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
import { calcularRoi, type RoiAgregado } from '@/utils/roiCalculator';
import { diagnosticarRoi, type DiagnosticoRoi } from '@/utils/diagnosticoRoi';
import { gargalosDoProcesso } from '@/utils/gargaloMelhorias';
import { slugFilename } from '@/utils/slugify';
import { makeZip, type ZipEntry } from '@/utils/zip';
import { buildProcessDiagram } from '../processDiagram';
import { SopDocument, type SOPMode } from './SopDocument';
import { SopComparativoDocument } from './SopComparativoDocument';
import { buildSopMarkdown } from './sopMarkdown';
import { buildSopComparativoMarkdown, type SopComparativoMarkdownInput } from './sopComparativoMarkdown';
import type { SopModelInput } from './sopModel';

export type { SOPMode };

const today = () => new Date().toISOString().slice(0, 10);

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

function downloadText(content: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

export interface GenerateSopOptions {
  /** Se true, retorna o blob em vez de fazer download. */
  returnBlob?: boolean;
  /** Projeto do processo — vai para a capa (nome + cluster). */
  projeto?: Projeto | null;
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
      projeto={options.projeto ?? null}
      mode={mode}
    />,
  );
  const blob = await instance.toBlob();
  if (options.returnBlob) return blob;
  const sufixo = mode === 'ficou' ? '_COMO_FICOU' : '';
  const slug = slugFilename(processo.name, processo.id);
  const filename = `SOP_${slug}${sufixo}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
 * Gera o SOP Comparativo (Sumário Executivo + páginas Era×Ficou). Por padrão
 * dispara download; com `returnBlob` devolve o Blob (usado no ZIP do projeto).
 */
export async function generateSOPComparativo(
  input: GenerateSopComparativoInput,
  options: { returnBlob?: boolean } = {},
): Promise<Blob | void> {
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
  if (options.returnBlob) return blob;
  const slug = slugFilename(input.processo.name, input.processo.id);
  const filename = `SOP_COMPARATIVO_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`;
  downloadBlob(blob, filename);
}

// ════════════════════════════════════════════════════════════════════════
//  Markdown — MESMO texto/valores do PDF (ambos consomem buildSopModel).
// ════════════════════════════════════════════════════════════════════════

/** SOP em Markdown (As-Is OU To-Be). Retorna a string se `returnString`. */
export function generateSopMarkdown(
  input: SopModelInput,
  opts: { returnString?: boolean } = {},
): string | void {
  const md = buildSopMarkdown(input);
  if (opts.returnString) return md;
  const sufixo = input.mode === 'ficou' ? '_COMO_FICOU' : '';
  const slug = slugFilename(input.processo.name, input.processo.id);
  downloadText(md, `SOP_${slug}${sufixo}_${today()}.md`, 'text/markdown;charset=utf-8');
}

/** SOP Comparativo em Markdown. Retorna a string se `returnString`. */
export function generateSopComparativoMarkdown(
  input: SopComparativoMarkdownInput,
  opts: { returnString?: boolean } = {},
): string | void {
  const md = buildSopComparativoMarkdown(input);
  if (opts.returnString) return md;
  const slug = slugFilename(input.processo.name, input.processo.id);
  downloadText(md, `SOP_COMPARATIVO_${slug}_${today()}.md`, 'text/markdown;charset=utf-8');
}

// ════════════════════════════════════════════════════════════════════════
//  Diagrama (.mmd) — download direto do código Mermaid.
// ════════════════════════════════════════════════════════════════════════

export type DiagramaInput = Parameters<typeof buildProcessDiagram>[0];

/** Baixa o diagrama Mermaid (.mmd). Retorna o código se `returnString`. */
export function generateDiagramaMmd(
  input: DiagramaInput,
  opts: { returnString?: boolean } = {},
): string | void {
  const code = buildProcessDiagram(input);
  if (opts.returnString) return code;
  const sufixo = input.mode === 'ficou' ? '_COMO_FICOU' : '';
  const slug = slugFilename(input.processo.name, input.processo.id);
  downloadText(code, `Diagrama_${slug}${sufixo}_${today()}.mmd`, 'text/plain;charset=utf-8');
}

// ════════════════════════════════════════════════════════════════════════
//  Export consolidado de PROJETO — ZIP com 1 conjunto de arquivos por processo.
// ════════════════════════════════════════════════════════════════════════

export interface GenerateProjetoZipInput {
  projeto: Projeto;
  processos: Processo[];                 // processos do projeto
  etapasByProcesso: Map<string, Etapa[]>; // etapas (enriquecidas) por process_id
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  /** Todos os projetos — necessário ao calcularRoi (rateio de sistemas por cluster). */
  projetos: Projeto[];
}

/**
 * Gera um .zip do projeto, por processo, na estrutura:
 *   <processo>/como-era/    SOP_as-is.pdf · SOP_as-is.md · Diagrama.mmd
 *   <processo>/como-ficou/  SOP_to-be.pdf · SOP_to-be.md · Diagrama.mmd   (se há cenário projetado)
 *   <processo>/comparativo/ SOP_comparativo.pdf · SOP_comparativo.md      (se há cenário projetado)
 *
 * As duas pastas de cenário trazem os três tipos (PDF, MD, MMD). O conteúdo é o
 * MESMO dos geradores individuais (mesma fonte buildSopModel / buildProcessDiagram).
 */
export async function generateProjetoZip(input: GenerateProjetoZipInput): Promise<void> {
  const { projeto, processos, etapasByProcesso, documentos, sistemas, responsaveis, gargalos, melhorias, projetos } = input;
  const entries: ZipEntry[] = [];

  for (const processo of processos) {
    const etapas = etapasByProcesso.get(processo.id) ?? [];
    const slug = slugFilename(processo.name, processo.id);
    const common = { processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, projeto };
    const base = (mode: SOPMode): SopModelInput => ({ ...common, mode });

    // ── como-era ── SOP As-Is (pdf+md) + Diagrama As-Is (.mmd)
    const pdfEra = await (generateSOP(processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, 'era', { returnBlob: true, projeto }) as Promise<Blob>);
    entries.push({ name: `${slug}/como-era/SOP_as-is.pdf`, data: new Uint8Array(await pdfEra.arrayBuffer()) });
    entries.push({ name: `${slug}/como-era/SOP_as-is.md`, data: buildSopMarkdown(base('era')) });
    entries.push({ name: `${slug}/como-era/Diagrama.mmd`, data: buildProcessDiagram({ ...common, mode: 'era' }) });

    // ── como-ficou + comparativo ── só quando há cenário projetado
    if (etapas.some(e => e.ficou)) {
      const pdfFicou = await (generateSOP(processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, 'ficou', { returnBlob: true, projeto }) as Promise<Blob>);
      entries.push({ name: `${slug}/como-ficou/SOP_to-be.pdf`, data: new Uint8Array(await pdfFicou.arrayBuffer()) });
      entries.push({ name: `${slug}/como-ficou/SOP_to-be.md`, data: buildSopMarkdown(base('ficou')) });
      entries.push({ name: `${slug}/como-ficou/Diagrama.mmd`, data: buildProcessDiagram({ ...common, mode: 'ficou' }) });

      // Comparativo — roi/diagnostico como na MapearProcessoPage/useMapaExports.
      const roi = calcularRoi({ processos: [processo], etapas, responsaveis, sistemas, gargalos, melhorias, projetos });
      const diagnostico = diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias);
      const compInput = {
        processo, etapas, sistemas, responsaveis,
        gargalos: gargalosDoProcesso(gargalos, processo.id),
        melhorias, projeto, roi, diagnostico, horizonteMeses: 24,
      };
      const pdfComp = await (generateSOPComparativo(compInput, { returnBlob: true }) as Promise<Blob>);
      entries.push({ name: `${slug}/comparativo/SOP_comparativo.pdf`, data: new Uint8Array(await pdfComp.arrayBuffer()) });
      entries.push({ name: `${slug}/comparativo/SOP_comparativo.md`, data: buildSopComparativoMarkdown(compInput) });
    }
  }

  const zipBytes = makeZip(entries);
  const projSlug = slugFilename(projeto.name, projeto.id);
  downloadBlob(new Blob([zipBytes as BlobPart], { type: 'application/zip' }), `Projeto_${projSlug}_${today()}.zip`);
}
