import type { Etapa, Documento, Sistema, Responsavel, DocRef, ResponsavelEtapa } from '../types';

const toArr = (v: unknown): unknown[] =>
  Array.isArray(v) ? v : v ? [v] : [];

function resolveIds(ids: string[], map: Map<string, string>): string[] {
  return ids.map((v) => map.get(v) ?? v);
}

function enrichDocRefs(refs: unknown, docById: Map<string, string>): DocRef[] {
  if (!Array.isArray(refs)) return [];
  return (refs as Array<DocRef | string | { documentoId?: string; nome?: string; volume?: number }>).map((r) => {
    if (typeof r === 'string') {
      return { nome: r, volume: 0 };
    }
    const documentoId = r.documentoId;
    const nome = r.nome || (documentoId ? docById.get(documentoId) : undefined) || '';
    return {
      documentoId,
      nome,
      volume: typeof r.volume === 'number' ? r.volume : 0,
    };
  });
}

function enrichResponsavelEtapas(refs: unknown, respById: Map<string, string>): ResponsavelEtapa[] {
  if (!Array.isArray(refs)) return [];
  return (refs as unknown[]).map((r) => {
    if (typeof r === 'string') {
      return { responsavelId: r, nome: respById.get(r) ?? r, horas: 0 };
    }
    const obj = r as Partial<ResponsavelEtapa>;
    const responsavelId = obj.responsavelId;
    const nome = obj.nome || (responsavelId ? respById.get(responsavelId) : undefined) || '';
    return {
      responsavelId,
      nome,
      horas: typeof obj.horas === 'number' ? obj.horas : 0,
    };
  });
}

export function enrichEtapas(
  rawEtapas: Etapa[],
  documentos: Documento[],
  sistemas: Sistema[],
  responsaveis: Responsavel[]
): Etapa[] {
  const docById = new Map(documentos.map((d) => [d.id, d.nome]));
  const sisById = new Map(sistemas.map((s) => [s.id, s.nome]));
  const respById = new Map(responsaveis.map((r) => [r.id, r.name]));

  return rawEtapas.map((e) => {
    const enriched: Etapa = {
      ...e,
      executadoPor: enrichResponsavelEtapas(e.executadoPor, respById),
      sistemas: resolveIds(toArr(e.sistemas).map(String), sisById),
      docsEntrada: enrichDocRefs(e.docsEntrada, docById),
      docsSaida: enrichDocRefs(e.docsSaida, docById),
      volumeMensal: e.volumeMensal ?? e.volume_per_process ?? 0,
    };
    // Espelha a resolução de ids→nomes no cenário "Como Ficou" (sistemas e docs)
    // para a UI não exibir ids crus. Na gravação o backend reconverte por nome.
    if (e.ficou) {
      enriched.ficou = {
        ...e.ficou,
        sistemas: resolveIds(toArr(e.ficou.sistemas).map(String), sisById),
        docsEntrada: enrichDocRefs(e.ficou.docsEntrada, docById),
        docsSaida: enrichDocRefs(e.ficou.docsSaida, docById),
      };
    }
    return enriched;
  });
}
