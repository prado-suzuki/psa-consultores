// Types for client form draft items — extracted from NewClientModal

import type { AreaKey } from '@/config/areaCategories';

export interface DraftEntity {
  _id: number;
  _dbId?: string;
  tipo_pessoa: string;
  cpf_cnpj: string;
  nome_razao_social: string;
  nome_fantasia: string;
  situacao_inscricao_estadual: string;
  inscricao_estadual: string;
  cod_cnae: string;
  setor: string;
  simples_nacional: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  contribuinte_faturamento: boolean;
  atividade_principal: string;
}

export interface InscricaoIE {
  _tempId: number;
  _dbId?: string;
  situacao: string;
  numero_ie: string;
  uf: string;
}

export interface DraftRepresentante {
  _id: number;
  _dbId?: string;
  nome: string;
  tipo_representante: string;
  cargo: string;
  email: string;
  telefone: string;
  observacoes: string;
  acesso_chamados: boolean;
}

/** @deprecated Use DraftRepresentante */
export type DraftParticipant = DraftRepresentante;

export interface DraftProdutoContratado {
  _id: number;
  _dbId?: string;
  produto_segmento_id: string;
  horas_contratadas?: number;
}

export interface DraftOrdemServico {
  _id: number;
  _dbId?: string;
  ordem_servico: string;
  data_emissao: string;
  data_inicio_projeto: string;
  data_fim_projeto: string;
  /** Total do contrato — não o valor da parcela. */
  valor_projeto: number;
  /**
   * Parcelas do contrato, do contrato inteiro e não do exercício: 24 parcelas
   * que atravessam dois anos são UMA OS com 24. `null` = não informado, que é
   * o estado das OS cadastradas antes deste campo. 1 = pagamento único.
   */
  numero_parcelas: number | null;
  /** Entrada paga fora do parcelamento. 0 quando não houver. */
  valor_entrada: number;
  valor_reembolso_km: number;
  valor_reembolso_refeicao: number;
  situacao_projeto: string;
  observacoes_projeto: string;
  id_servico: string;
  /** @deprecated Legado — usar produtos_contratados */
  id_produto_segmento: string;
  produtos_contratados: DraftProdutoContratado[];
  distribuicao_receita: Array<{ id_centro_custo: string; percentual_rateio: number; _dbId?: string }>;
  cluster_id: string;
  /** Contribuinte que recebe a nota desta OS. Vazio quando ainda não escolhido. */
  contribuinte_id: string;
  setor_cliente: string;
  setor_cliente_id: string;
  regiao: string;
}

/** @deprecated Use DraftOrdemServico */
export type DraftContract = DraftOrdemServico;

export interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClienteId?: string | null;
  readOnly?: boolean;
  canEdit?: boolean;
  /** Área que abriu o modal — define o glifo de carregamento (ver `AreaLoader`). */
  area?: AreaKey;
}
