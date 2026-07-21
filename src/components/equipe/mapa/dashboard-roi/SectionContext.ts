import { createContext, useContext } from 'react';
import type { Etapa, Gargalo, Melhoria, Processo, Responsavel, Sistema } from '@/types';
import type { RoiAgregado } from '@/utils/roiCalculator';

export interface DashboardRoiAggregate extends RoiAgregado {
  qtdProjetos:number; qtdProcessos:number; qtdEtapas:number; qtdGargalos:number;
  qtdMelhorias:number; qtdSistemas:number; qtdSistemasNovos:number;
  qtdSistemasAposMelhorias:number; qtdDocumentos:number; qtdResponsaveis:number;
}
export interface DashboardRoiSectionModel {
  v: DashboardRoiAggregate;
  horizonte: 12|24|36; horizonteFator:number; periodoSufixo:string; periodoSlash:string;
  economiaHorizonte:number; resultadoLiquidoHorizonte:number; roiDisp:boolean;
  roiHorizonte:number; roiHorizonteTxt:string; paybackTxt:string; pctRealizado:number;
  topCustoProc?: RoiAgregado['porProcesso'][number]; topHorasProc?: RoiAgregado['porProcesso'][number];
  topCategoria?: {label:string;atual:number;otimizado:number;cor:string};
  custosCategoria:{label:string;atual:number;otimizado:number;cor:string}[];
  investimentoComposicao:{label:string;valor:number;cor:string}[];
  statusMelhoriasFunnel:{label:string;valor:number;cor:string}[];
  gargalosPorOrigem:{label:string;valor:number;cor:string}[];
  topEtapas:{id:string;nome:string;process_id:string;horas:number;custo:number}[];
  etapasFiltradas:Etapa[]; etapasFuturoFiltradas:Etapa[]; gargalosFiltrados:Gargalo[]; processosFiltrados:Processo[];
  melhorias:Melhoria[]; sistemas:Sistema[]; responsaveis:Responsavel[];
  procNomeById:Map<string,string>; filtroProcesso:string;
}
export const DashboardRoiContext=createContext<DashboardRoiSectionModel|null>(null);
export function useDashboardRoiSections() { const value=useContext(DashboardRoiContext); if(!value) throw new Error('DashboardRoiSectionProvider ausente'); return value; }
