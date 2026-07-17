// Modelo PURO do SOP — fonte ÚNICA de texto e valores compartilhada pelo PDF
// (SopDocument), pelo Markdown (sopMarkdown) e pelo script de extração. Sem JSX,
// sem import de asset: pode rodar no browser e em node (bun).
//
// Princípio: toda a derivação/dedup/formatação acontece AQUI uma única vez, de
// modo que o PDF e o MD exibam EXATAMENTE o mesmo texto e os mesmos valores.

import type {
  Processo, Projeto, Etapa, Documento, Sistema, Responsavel, Gargalo, Melhoria,
} from '@/types';
import { fmtPercent, joinDocs, joinPeople, todayBR } from './helpers';
import { gargalosDoProcesso, melhoriaIdsDoProcesso } from '../gargaloMelhorias';

export type SOPMode = 'era' | 'ficou';

export interface SopModelInput {
  processo: Processo;
  etapas: Etapa[];
  /** Etapas do cenário TO-BE (linhas próprias). No modo 'ficou', quando o processo
   *  NÃO tem `.ficou` (pareado) e há etapas TO-BE, o modelo é montado a partir
   *  desta lista (modelo por-cenário). Ausente ⇒ comportamento legado (`.ficou`). */
  etapasFuturo?: Etapa[];
  documentos: Documento[];
  sistemas: Sistema[];
  responsaveis: Responsavel[];
  gargalos: Gargalo[];
  melhorias?: Melhoria[];
  projeto?: Projeto | null;
  mode: SOPMode;
}

export interface SopModelGargalo {
  nome: string;
  descricao: string;
  origem: string;
}

export interface SopModelEtapa {
  ordem: number;            // 1-based
  nome: string;
  descricao: string;        // '' quando ausente
  execucao: string;         // já com fallback '—'
  executadoPor: string;     // joinPeople
  sistemas: string;         // nomes resolvidos · juntos, ou '—'
  docsEntrada: string;      // joinDocs
  docsSaida: string;        // joinDocs
  taxaRetrabalho: string;   // fmtPercent
  gargalos: SopModelGargalo[];
}

export interface SopModel {
  scenarioLabel: string;
  isFicou: boolean;
  data: string;
  projetoNome: string;      // '' quando ausente
  clusterNome: string;      // '' quando ausente
  identificacao: {
    nome: string;
    descricao: string;
    entregavel: string;
    frequencia: string;
    complexidade: string;
  };
  etapas: SopModelEtapa[];
  sistemas: { nome: string; descricao: string }[];
  docsEntrada: { nome: string; tipo: string; origem: string }[];
  docsSaida: { nome: string; tipo: string; origem: string }[];
  responsaveis: { nome: string; cargo: string; custoHora: string }[];
  gargalos: SopModelGargalo[];   // nível do processo, só As-Is
  melhorias: { titulo: string; status: string; acoes: string }[]; // só To-Be
}

const dash = (s: string | null | undefined): string => (s && s.trim() ? s : '—');

function fmtCustoHora(rate?: number | null): string {
  return rate
    ? `R$ ${rate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : '—';
}

/**
 * Constrói o modelo do SOP a partir das entidades já hidratadas (mesma entrada
 * do SopDocument). Espelha 1:1 a lógica de derivação que antes vivia inline no
 * componente PDF.
 */
export function buildSopModel(input: SopModelInput): SopModel {
  const { processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias = [], projeto, mode } = input;
  const isFicou = mode === 'ficou';
  const scenarioLabel = isFicou ? 'Cenário Otimizado · To-Be' : 'Cenário Atual · As-Is';

  // Modelo por-cenário: no 'ficou', sem `.ficou` (pareado) e com etapas TO-BE,
  // o SOP é montado a partir da lista TO-BE (cujos dados vêm no nível-topo — o
  // `?? e.X` dos leitores abaixo já resolve, pois a etapa TO-BE não tem `.ficou`).
  const usarLista = isFicou && !etapas.some(e => e.ficou != null) && (input.etapasFuturo?.length ?? 0) > 0;
  const etapasBase = usarLista ? (input.etapasFuturo as Etapa[]) : etapas;

  const gargaloById = new Map(gargalos.map(g => [g.id, g]));
  const melhoriaIdsProc = melhoriaIdsDoProcesso(melhorias, processo.id);
  const procMelhorias = isFicou ? melhorias.filter(m => melhoriaIdsProc.has(m.id)) : [];
  // Gargalos no nível do PROCESSO (mesma fonte do diagrama). Só no As-Is.
  const procGargalos = isFicou ? [] : gargalosDoProcesso(gargalos, processo.id);

  const sisOf = (e: Etapa) => ((isFicou ? (e.ficou?.sistemas ?? e.sistemas) : e.sistemas) || []);
  const docsEntOf = (e: Etapa) => ((isFicou ? (e.ficou?.docsEntrada ?? e.docsEntrada) : e.docsEntrada) || []);
  const docsSaiOf = (e: Etapa) => ((isFicou ? (e.ficou?.docsSaida ?? e.docsSaida) : e.docsSaida) || []);

  // Tabelas agregadas (Documentos / Sistemas / Responsáveis) — mesmo cenário.
  const docEntradaNames = new Set<string>();
  etapasBase.forEach(e => docsEntOf(e).forEach(d => docEntradaNames.add(typeof d === 'string' ? d : d.nome)));
  const docsEntrada = documentos
    .filter(d => docEntradaNames.has(d.nome))
    .map(d => ({ nome: d.nome, tipo: dash(d.tipo), origem: dash(d.origem) }));

  const docSaidaNames = new Set<string>();
  etapasBase.forEach(e => docsSaiOf(e).forEach(d => docSaidaNames.add(typeof d === 'string' ? d : d.nome)));
  const docsSaida = documentos
    .filter(d => docSaidaNames.has(d.nome))
    .map(d => ({ nome: d.nome, tipo: dash(d.tipo), origem: dash(d.origem) }));

  const sisKeys = new Set<string>();
  etapasBase.forEach(e => sisOf(e).forEach(s => sisKeys.add(s)));
  // Dedup por nome (evita "WhatsApp" duplicado quando há 2 registros homônimos).
  const seenSisNome = new Set<string>();
  const sistemasList = sistemas
    .filter(s => sisKeys.has(s.id) || sisKeys.has(s.nome))
    .filter(s => {
      if (seenSisNome.has(s.nome)) return false;
      seenSisNome.add(s.nome);
      return true;
    })
    .map(s => ({ nome: s.nome, descricao: dash(s.descricao) }));

  const respNames = new Set<string>();
  etapasBase.forEach(e => {
    const exec = (isFicou ? (e.ficou?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];
    exec.forEach(r => r.nome && respNames.add(r.nome));
  });
  const responsaveisList = responsaveis
    .filter(r => respNames.has(r.name))
    .map(r => ({ nome: r.name, cargo: dash(r.level), custoHora: fmtCustoHora(r.hourly_rate) }));

  // Nome do sistema resolvido por id OU nome (mesma regra do PDF).
  const sisNome = (s: string) => sistemas.find(x => x.id === s || x.nome === s)?.nome ?? s;

  const etapasModel: SopModelEtapa[] = etapasBase.map((e, i) => {
    const f = isFicou ? e.ficou : null;
    const descricao = (isFicou ? (f?.description ?? e.description) : e.description) || '';
    const execution = (isFicou ? (f?.execution ?? e.execution) : e.execution) || '';
    const exec = (isFicou ? (f?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];
    const sisEtapa = sisOf(e);
    const taxa = (isFicou ? (f?.rework_rate ?? e.rework_rate) : e.rework_rate) ?? 0;
    const gargalosDaEtapa = isFicou
      ? []
      : (e.gargalos || []).map(id => gargaloById.get(id)).filter((g): g is Gargalo => Boolean(g));
    return {
      ordem: i + 1,
      nome: e.name,
      descricao,
      execucao: dash(execution),
      executadoPor: joinPeople(exec),
      sistemas: sisEtapa.map(sisNome).join(' · ') || '—',
      docsEntrada: joinDocs(docsEntOf(e)),
      docsSaida: joinDocs(docsSaiOf(e)),
      taxaRetrabalho: fmtPercent(taxa),
      gargalos: gargalosDaEtapa.map(g => ({ nome: g.nome, descricao: g.descricao || '', origem: g.origem || '' })),
    };
  });

  return {
    scenarioLabel,
    isFicou,
    data: todayBR(),
    projetoNome: projeto?.name || '',
    clusterNome: projeto?.clusterName || '',
    identificacao: {
      nome: processo.name,
      descricao: processo.description || '',
      entregavel: processo.deliverable || '',
      frequencia: processo.frequency || '',
      complexidade: processo.complexity_level || '',
    },
    etapas: etapasModel,
    sistemas: sistemasList,
    docsEntrada,
    docsSaida,
    responsaveis: responsaveisList,
    gargalos: procGargalos.map(g => ({ nome: g.nome, descricao: g.descricao || '', origem: g.origem || '' })),
    melhorias: procMelhorias.map(m => ({
      titulo: m.improvement_description,
      status: m.improvement_status || '',
      acoes: (m.acoesTd && m.acoesTd.length) ? m.acoesTd.join(' · ') : '',
    })),
  };
}
