// Types for client form draft items — extracted from NewClientModal

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

export interface DraftParticipant {
  _id: number;
  _dbId?: string;
  nome: string;
  tipo_participante: string;
  cargo: string;
  email: string;
  telefone: string;
  observacoes: string;
  acesso_chamados: boolean;
}

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
  valor_projeto: number;
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
}

/** @deprecated Use DraftOrdemServico */
export type DraftContract = DraftOrdemServico;

export interface NewClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClienteId?: string | null;
  readOnly?: boolean;
}
