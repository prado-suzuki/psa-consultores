/**
 * Audit log field formatting utilities.
 * Translates field names, resolves UUIDs, formats dates,
 * groups related fields and translates enum values.
 */

// ── Field name translations ──────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  assigned_to: 'Responsável',
  assigned_to_name: '__HIDDEN__', // grouped with assigned_to
  reviewer_id: 'Revisor',
  status: 'Status',
  priority: 'Prioridade',
  due_date: 'Data de Entrega',
  start_date: 'Data de Início',
  end_date: 'Data Final',
  due_time: 'Horário',
  title: 'Título',
  name: 'Nome',
  description: 'Descrição',
  category: 'Categoria',
  tags: 'Tags',
  project_id: 'Projeto',
  client_id: 'Cliente',
  external_client_id: 'Cliente Externo',
  contribuinte_id: 'Contribuinte',
  parent_task_id: 'Tarefa Pai',
  servico_id: 'Serviço Prestado',
  is_recurring: 'Recorrente',
  recurrence_type: 'Tipo de Recorrência',
  department: 'Departamento',
  objective: 'Objetivo',
  area_id: 'Área',
  estrutura_area_id: 'Área',
  responsible_id: 'Responsável',
  leader_id: 'Líder',
  member_ids: 'Membros',
  category_ids: 'Categorias',
  // Client cadastro fields
  categoria: 'Categoria',
  ativo: 'Ativo',
  fixo: 'Fixo',
  telefone: 'Telefone',
  municipio: 'Município',
  uf: 'UF',
  setor_cliente: 'Área do Negócio',
  regiao: 'Região',
  cpf_cnpj: 'CPF/CNPJ',
  nome_razao_social: 'Razão Social',
  nome_fantasia: 'Nome Fantasia',
  inscricao_estadual: 'Inscrição Estadual',
  cod_cnae: 'CNAE',
  simples_nacional: 'Simples Nacional',
  cargo: 'Cargo',
  email: 'E-mail',
  acesso_chamados: 'Acesso a Chamados',
  observacoes: 'Observações',
  numero_os: 'Número OS',
  valor_projeto: 'Valor do Projeto',
  numero_parcelas: 'Nº de Parcelas',
  valor_entrada: 'Entrada',
  situacao_projeto: 'Situação',
  data_emissao: 'Data de Emissão',
  data_inicio_projeto: 'Data Início',
  data_fim_projeto: 'Data Fim',
  tipo_pessoa: 'Tipo Pessoa',
  tipo_representante: 'Tipo',
  // ── Cadastros OSG (qualificação das partes / diagnóstico patrimonial) ──
  denominacao: 'Nome / Razão Social',
  nacionalidade: 'Nacionalidade',
  estado_civil: 'Estado Civil',
  regime_bens: 'Regime de Bens',
  data_nascimento: 'Data de Nascimento',
  genero: 'Gênero',
  profissao: 'Profissão',
  filiacao_pai: 'Filiação (pai)',
  filiacao_mae: 'Filiação (mãe)',
  documento_identidade_tipo: 'Documento de Identidade (tipo)',
  documento_identidade_numero: 'Documento de Identidade (nº)',
  documento_identidade_orgao: 'Órgão Expedidor',
  documento_identidade_uf: 'UF do Documento',
  endereco_logradouro: 'Logradouro',
  endereco_numero: 'Número',
  endereco_complemento: 'Complemento',
  endereco_bairro: 'Bairro',
  endereco_municipio: 'Município',
  endereco_uf: 'UF',
  endereco_cep: 'CEP',
  nire: 'NIRE',
  junta_comercial_uf: 'Junta Comercial (UF)',
  data_constituicao: 'Data de Constituição',
  objeto_social: 'Objeto Social',
  status_constituicao: 'Status da Constituição',
  tipo_empresa: 'Tipo de Empresa',
  conjuge_id: 'Cônjuge',
  // Quadro societário / administração
  quotas: 'Quotas',
  vlr_total: 'Valor Total',
  // Bem / matrícula / titularidade
  referencia_dp: 'Referência DP',
  tipo_bem: 'Tipo do Imóvel',
  vlr_contabil: 'Valor Contábil',
  vlr_contabil_ajustado: 'Valor Contábil Ajustado',
  vlr_benfeitorias: 'Valor de Benfeitorias',
  vlr_mercado: 'Valor de Mercado',
  ccir_codigo: 'CCIR',
  inscricao_municipal: 'Inscrição Municipal',
  area_construida_m2: 'Área Construída (m²)',
  status_integralizacao: 'Status de Integralização',
  numero: 'Número da Matrícula',
  livro: 'Livro',
  folha: 'Folha',
  data_matricula: 'Data da Matrícula',
  municipio_imovel: 'Município do Imóvel',
  uf_imovel: 'UF do Imóvel',
  area_documento: 'Área (documento)',
  area_real: 'Área (real)',
  area_unidade: 'Unidade de Área',
  confrontacoes_texto: 'Confrontações',
  descricao_psa_completa: 'Descrição',
  fracao: 'Fração',
  integralizador: 'Integralizador',
  tipo: 'Tipo',
  natureza: 'Natureza',
  pode_isoladamente: 'Pode Isoladamente',
  data_inicio: 'Data de Início',
  data_fim: 'Data de Fim',
  nome_completo: 'Nome do Cartório',
  comarca: 'Comarca',
  // ── Cadastros OSG (campos restantes dos *_DIFF_FIELDS) ──
  naturalidade_municipio: 'Naturalidade (município)',
  naturalidade_uf: 'Naturalidade (UF)',
  is_fundador: 'Fundador',
  descricao_outros: 'Descrição (outros)',
  vlr_imposto_anual: 'Imposto Anual',
  imposto_anual_exercicio: 'Exercício do Imposto',
  participa_estruturacao: 'Participa da Estruturação',
  motivo_nao_integralizacao: 'Motivo de Não Integralização',
  observacao: 'Observação',
  matricula_anterior_texto: 'Matrícula Anterior (texto)',
  area_explorada: 'Área Explorada',
  georreferenciado: 'Georreferenciado',
  georref_prejudica_transferencia: 'Georref. Prejudica Transferência',
  tipo_exploracao_posse: 'Tipo de Exploração/Posse',
  origem_descricao: 'Origem (descrição)',
  referencia: 'Referência',
  descricao: 'Descrição',
  credor_nome: 'Credor (nome)',
  data_validade: 'Data de Validade',
  vlr: 'Valor',
  area_afetada: 'Área Afetada',
  impede_transferencia: 'Impede Transferência',
  cancelado: 'Cancelado',
  // Relacionais (o valor é um uuid cru — sem lookup dedicado no v1, ver §8 do plano)
  pessoa_id: 'Pessoa',
  parente_pessoa_id: 'Parente',
  filiacao_pai_pessoa_id: 'Filiação (pai)',
  filiacao_mae_pessoa_id: 'Filiação (mãe)',
  pj_pessoa_id: 'Empresa',
  administrador_pessoa_id: 'Administrador',
  empresa_pessoa_id: 'Empresa',
  socio_pessoa_id: 'Sócio',
  empresa_destino_pessoa_id: 'PJ de Destino',
  titular_pessoa_id: 'Titular',
  credor_pessoa_id: 'Credor',
  bem_id: 'Bem',
  matricula_id: 'Matrícula',
  matricula_anterior_id: 'Matrícula Anterior',
  cartorio_id: 'Cartório',
  documento_tipo_id: 'Tipo do documento',
  solicitacao_item_id: 'Item da solicitação',
  cliente_id: 'Cliente',
};

// ── Status translations ──────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  review: 'Revisão',
  em_ajuste: 'Em Ajuste',
  done: 'Concluído',
  pending: 'A Fazer',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  waiting_client: 'Pendente Cliente',
  active: 'Ativo',
  inactive: 'Inativo',
  archived: 'Arquivado',
};

// ── Priority translations ────────────────────────────────────
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

// ── Recurrence translations ──────────────────────────────────
const RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

// ── Boolean translations ─────────────────────────────────────
const BOOL_LABELS: Record<string, string> = {
  true: 'Sim',
  false: 'Não',
};

// ── UUID detection ───────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Date detection (ISO date: YYYY-MM-DD) ────────────────────
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Fields whose UUID values should be resolved via lookup maps
const UUID_FIELDS: Record<string, string> = {
  assigned_to: 'profiles',
  reviewer_id: 'profiles',
  responsible_id: 'profiles',
  leader_id: 'profiles',
  project_id: 'projects',
  area_id: 'areas',
  estrutura_area_id: 'areas',
  client_id: 'clients',
  external_client_id: 'clients',
  contribuinte_id: 'contribuintes',
  servico_id: 'servicos',
  parent_task_id: 'tasks',
  performed_by: 'profiles',
};

// Fields whose array values contain UUIDs to resolve
const UUID_ARRAY_FIELDS: Record<string, string> = {
  member_ids: 'profiles',
  category_ids: 'servicos',
};

// Fields that contain dates
const DATE_FIELDS = new Set([
  'due_date', 'start_date', 'end_date',
  // Cadastros OSG (colunas date, formato ISO YYYY-MM-DD)
  'data_nascimento', 'data_constituicao', 'data_matricula',
  'data_inicio', 'data_fim', 'data_validade',
]);

// Fields that contain enum values
const ENUM_FIELDS: Record<string, Record<string, string>> = {
  status: STATUS_LABELS,
  priority: PRIORITY_LABELS,
  recurrence_type: RECURRENCE_LABELS,
};

// Fields that contain booleans
const BOOLEAN_FIELDS = new Set([
  'is_recurring', 'ativo', 'acesso_chamados', 'contribuinte_faturamento',
  // Cadastros OSG
  'is_fundador', 'participa_estruturacao', 'pode_isoladamente', 'integralizador',
  'georref_prejudica_transferencia', 'impede_transferencia', 'cancelado',
]);

export interface LookupMaps {
  profiles: Record<string, string>;
  projects: Record<string, string>;
  areas: Record<string, string>;
  clients: Record<string, string>;
  contribuintes: Record<string, string>;
  servicos: Record<string, string>;
  tasks: Record<string, string>;
}

export interface FormattedChange {
  label: string;
  oldValue: string;
  newValue: string;
}

function formatDate(val: string): string {
  const [y, m, d] = val.split('-');
  return `${d}/${m}/${y}`;
}

function formatValue(
  field: string,
  val: unknown,
  lookups: LookupMaps,
): string {
  if (val === null || val === undefined || val === '') return '(vazio)';

  const str = String(val);

  // Boolean fields
  if (BOOLEAN_FIELDS.has(field)) {
    return BOOL_LABELS[str] ?? str;
  }

  // Enum fields
  if (ENUM_FIELDS[field]) {
    return ENUM_FIELDS[field][str] ?? str;
  }

  // Date fields
  if (DATE_FIELDS.has(field) && ISO_DATE_REGEX.test(str)) {
    return formatDate(str);
  }

  // UUID resolution
  if (UUID_FIELDS[field] && UUID_REGEX.test(str)) {
    const mapKey = UUID_FIELDS[field] as keyof LookupMaps;
    return lookups[mapKey]?.[str] ?? str;
  }

  // UUID arrays (member_ids, category_ids)
  if (UUID_ARRAY_FIELDS[field] && Array.isArray(val)) {
    const mapKey = UUID_ARRAY_FIELDS[field] as keyof LookupMaps;
    const resolved = val.map(v => UUID_REGEX.test(String(v)) ? (lookups[mapKey]?.[String(v)] ?? String(v)) : String(v));
    return resolved.length > 0 ? resolved.join(', ') : '(vazio)';
  }

  // Tags (arrays)
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(', ') : '(vazio)';
  }

  return str;
}

/**
 * Transform raw changed_fields into a user-friendly list.
 */
export function formatChangedFields(
  changedFields: Record<string, { old: unknown; new: unknown }>,
  lookups: LookupMaps,
): FormattedChange[] {
  const entries = { ...changedFields };
  const result: FormattedChange[] = [];

  // ── Group assigned_to + assigned_to_name ───────────────────
  if ('assigned_to' in entries && 'assigned_to_name' in entries) {
    const nameEntry = entries['assigned_to_name'];
    result.push({
      label: 'Responsável',
      oldValue: formatValue('assigned_to_name', nameEntry.old, lookups),
      newValue: formatValue('assigned_to_name', nameEntry.new, lookups),
    });
    delete entries['assigned_to'];
    delete entries['assigned_to_name'];
  }

  // ── Process remaining fields ───────────────────────────────
  for (const [field, vals] of Object.entries(entries)) {
    // Skip hidden fields
    if (FIELD_LABELS[field] === '__HIDDEN__') continue;

    const oldFormatted = formatValue(field, vals.old, lookups);
    const newFormatted = formatValue(field, vals.new, lookups);

    // Skip if both are empty or identical
    if (oldFormatted === newFormatted) continue;

    const label = FIELD_LABELS[field] ?? field;
    result.push({ label, oldValue: oldFormatted, newValue: newFormatted });
  }

  return result;
}
