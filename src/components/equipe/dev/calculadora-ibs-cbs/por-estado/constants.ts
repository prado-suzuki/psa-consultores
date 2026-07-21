import type { NaturezaDestino } from "@/lib/ibs-cbs/types";

export const CORES_POR_ESTADO = {
  interno: "#0D9488",
  interestadual: "#F2810A",
  exportacao: "#3478F5",
  anexoI: "#65A30D",
  neutral: "#3478F5",
};

export const CORES_NATUREZA: Record<NaturezaDestino, string> = {
  interno: CORES_POR_ESTADO.interno,
  interestadual: CORES_POR_ESTADO.interestadual,
  exportacao: CORES_POR_ESTADO.exportacao,
};

export const LABEL_NATUREZA: Record<NaturezaDestino, string> = {
  interno: "Interno (MT)",
  interestadual: "Interestadual",
  exportacao: "Exportação",
};
