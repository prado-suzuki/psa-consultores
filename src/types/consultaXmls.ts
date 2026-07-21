export interface NFeParty {
  CNPJ: string;
  xNome: string;
  IE: string;
  UF: string;
}

export interface NFeRecord {
  chave_nfe: string;
  cUF: number;
  natOp: string;
  mod: string;
  serie: number;
  nNF: string;
  dhEmi: string | null;
  tpNF: number;
  contItens: number;
  vlrTotal: number;
  tipo_mov: string;
  emit: NFeParty;
  dest: NFeParty;
  produtos?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface CTeActor {
  CNPJ: string | null;
  CPF: string | null;
  IE: string | null;
  xNome: string;
  xFant: string | null;
  UF: string;
  cMun: number;
  xMun?: string | null;
  ISUF?: string | null;
  [key: string]: unknown;
}

export interface CTeRecord {
  chave_cte: string;
  cCT: number;
  cfop: string;
  natOp: string;
  mod: string;
  serie: number;
  nCT: number;
  dEmi: string | null;
  tpEmis: number;
  tpCTe: number;
  modal: string;
  tpServ: number;
  cMunIni: number;
  xMunIni: string;
  cMunFim: number;
  xMunFim: string;
  vTPrest: number;
  vRec: number;
  vCarga: number | null;
  proPred: string | null;
  emit: CTeActor;
  dest: CTeActor;
  tomador: CTeActor & { toma: number };
  icms: Record<string, string | number | null>;
  infAdic: { xObs: string | null; infAdFisco: string | null };
  docs_nfe: string[];
  medidas: Array<{ cUnid: string; tpMed: string; qCarga: number }>;
  rems?: CTeActor[];
  rem?: CTeActor;
  expeds?: CTeActor[];
  exped?: CTeActor;
  recebs?: CTeActor[];
  receb?: CTeActor;
  [key: string]: unknown;
}

export interface XmlApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export type DocumentoXml = "nfe" | "cte";
export type TipoDocumentoXml = DocumentoXml | "todos" | "";
export type TipoMovimentoXml = "Entrada" | "Saida" | "";

export interface ConsultaXmlFilters {
  contribuinteId: string;
  startDate: string;
  endDate: string;
  currentPage: number;
  tipoMov: TipoMovimentoXml;
  emitente: string;
  destinatario: string;
  chaveAcesso: string;
  committedChave: string;
  tipoDocumento: TipoDocumentoXml;
  searchTriggered: boolean;
}

export interface ExportDialogProps {
  data: NFeRecord[];
  cteData?: CTeRecord[];
  tipoDocumento: Exclude<TipoDocumentoXml, "">;
  totalRecords: number;
  start_date: string;
  end_date: string;
  disabled?: boolean;
  contribuinteId?: string;
  tipoMov?: string;
  emitente?: string;
  destinatario?: string;
}
