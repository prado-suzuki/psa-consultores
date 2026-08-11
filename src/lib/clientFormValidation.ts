// Validações do cadastro de cliente (NewClientModal) — funções puras.
//
// Ficam separadas porque o save precisa distinguir dois casos: o que o usuário
// acabou de mexer (barra o salvamento) e o que já estava incompleto no banco
// (só avisa). Sem essa distinção, ajustar uma OS ficava refém de um
// contribuinte legado sem CEP em outra aba. Ver `isSameRecord`.

import type { DraftEntity, InscricaoIE, DraftRepresentante, DraftOrdemServico } from '@/types/clientForm';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Comparação estrutural com ordem de chaves normalizada.
 *
 * Usada para decidir se o usuário mexeu num registro. Erra sempre para o lado
 * seguro: uma diferença só de formato acusa "mudou" e a validação roda; o que
 * não pode acontecer é o contrário (dar "igual" para algo que o usuário
 * alterou e deixar passar sem validar).
 */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const ordenado: Record<string, unknown> = {};
      for (const k of Object.keys(val as Record<string, unknown>).sort()) {
        ordenado[k] = (val as Record<string, unknown>)[k];
      }
      return ordenado;
    }
    return val;
  });

export const isSameRecord = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);

// ─── Cliente ──────────────────────────────────────────────────────────────

export interface ClientDataValidacao {
  nome: string;
  ativo: boolean;
  observacoes: string;
}

export const validateNomeCliente = (nome: string): string | null =>
  nome.trim() ? null : 'Nome do cliente é obrigatório';

/**
 * Cluster é obrigatório, e a regra vive no banco em três lugares.
 *
 * `criar_cliente_com_clusters` recusa a criação sem cluster; o gatilho DEFERRED
 * `trg_cliente_tem_cluster` recusa INSERT **e** UPDATE que deixem o cliente sem
 * vínculo; e `trg_cliente_cluster_last` recusa apagar o último vínculo. Até o
 * B20/B17 nada disso tinha par na tela: o consultor descobria pelo `400` da RPC,
 * depois do round-trip, com o formulário inteiro preenchido.
 *
 * A frase é a mesma que a RPC emite, de propósito: quem vir a mensagem do
 * servidor (a rede de segurança continua lá) lê exatamente o que a tela diria.
 */
export const validateClustersCliente = (clusterIds: readonly string[] | undefined): string | null =>
  (clusterIds?.length ?? 0) > 0 ? null : 'Selecione ao menos 1 cluster';

/** Observações: obrigatória ao INATIVAR; se preenchida, mín. 20 caracteres. */
export const validateObservacoesCliente = (clientData: ClientDataValidacao): string | null => {
  const obs = (clientData.observacoes || '').trim();
  if (!clientData.ativo && obs.length < 20) {
    return 'Para inativar o cliente, preencha as Observações (mín. 20 caracteres).';
  }
  if (obs && obs.length < 20) {
    return 'Observações do cliente deve ter no mínimo 20 caracteres.';
  }
  return null;
};

// ─── Contribuintes ────────────────────────────────────────────────────────

export const rotuloContribuinte = (e: DraftEntity): string =>
  e.nome_razao_social?.trim() || e.cpf_cnpj || '(contribuinte sem nome)';

/** Identificação: razão social + CPF/CNPJ. Separada porque a checagem de
 *  documento repetido entra entre ela e o resto dos dados. */
export const validateContribuinteDocumento = (e: DraftEntity): string | null => {
  if (!e.nome_razao_social?.trim()) {
    return `Contribuinte ${e.cpf_cnpj || 'novo'}: informe a Razão Social / Nome completo`;
  }
  const quem = rotuloContribuinte(e);
  const digits = (e.cpf_cnpj || '').replace(/\D/g, '');
  if (!digits) return `Contribuinte "${quem}": CPF/CNPJ é obrigatório`;
  if (digits.length !== 11 && digits.length !== 14) {
    return `Contribuinte "${quem}": CPF deve ter 11 dígitos ou CNPJ 14 dígitos`;
  }
  return null;
};

export const validateContribuinteDados = (e: DraftEntity, inscricoes: InscricaoIE[] = []): string | null => {
  const quem = rotuloContribuinte(e);
  if (!e.cep?.trim()) return `Contribuinte "${quem}": CEP é obrigatório`;
  if (!e.logradouro?.trim()) return `Contribuinte "${quem}": Logradouro é obrigatório`;
  if (!e.bairro?.trim()) return `Contribuinte "${quem}": Bairro é obrigatório`;
  if (!e.municipio?.trim()) return `Contribuinte "${quem}": Município é obrigatório`;
  if (!e.uf?.trim() || e.uf.trim().length !== 2) return `Contribuinte "${quem}": UF deve ter 2 caracteres`;
  if (e.tipo_pessoa === 'PJ') {
    if (!e.cod_cnae?.trim()) return `Contribuinte "${quem}": CNAE é obrigatório para PJ`;
    if (!e.simples_nacional) return `Contribuinte "${quem}": informe a situação do Simples Nacional`;
  }
  for (const ie of inscricoes) {
    if (ie.situacao === 'sim' && !ie.uf) {
      return `Contribuinte "${quem}": selecione a UF de todas as inscrições estaduais`;
    }
    if (ie.situacao === 'sim' && !ie.numero_ie?.trim()) {
      return `Contribuinte "${quem}": informe o número da IE do estado ${ie.uf}`;
    }
  }
  return null;
};

export interface DocumentoDuplicado {
  /** Índices (em `entities`) de todos os contribuintes que dividem o documento. */
  indices: number[];
  message: string;
}

/**
 * Mapa índice → duplicidade, marcando da segunda ocorrência em diante.
 * `indices` traz o grupo inteiro para o chamador decidir se barra ou só avisa
 * (se qualquer um do grupo foi mexido, o conflito é do usuário e deve barrar).
 */
export const findDocumentosDuplicados = (entities: DraftEntity[]): Map<number, DocumentoDuplicado> => {
  const porDocumento = new Map<string, number[]>();
  entities.forEach((e, idx) => {
    const digits = (e.cpf_cnpj || '').replace(/\D/g, '');
    if (!digits) return;
    const grupo = porDocumento.get(digits);
    if (grupo) grupo.push(idx);
    else porDocumento.set(digits, [idx]);
  });

  const resultado = new Map<number, DocumentoDuplicado>();
  for (const indices of porDocumento.values()) {
    if (indices.length < 2) continue;
    const primeiro = entities[indices[0]];
    for (const idx of indices.slice(1)) {
      resultado.set(idx, {
        indices,
        message: `Contribuinte "${rotuloContribuinte(entities[idx])}": documento repetido em "${rotuloContribuinte(primeiro)}"`,
      });
    }
  }
  return resultado;
};

// ─── Representantes ───────────────────────────────────────────────────────

export const validateRepresentante = (p: DraftRepresentante): string | null => {
  if (!p.nome?.trim()) return 'Representante: o Nome é obrigatório';
  const quem = p.nome.trim();
  if (!p.tipo_representante) return `Representante "${quem}": Cargo/função é obrigatório`;
  if (!p.email?.trim()) return `Representante "${quem}": Email é obrigatório`;
  if (!EMAIL_REGEX.test(p.email.trim())) return `Representante "${quem}": formato de e-mail inválido`;
  if (p.telefone?.trim() && p.telefone.replace(/\D/g, '').length < 10) {
    return `Representante "${quem}": telefone deve ter no mínimo 10 dígitos`;
  }
  if (p.observacoes?.trim() && p.observacoes.trim().length < 20) {
    return `Representante "${quem}": observações deve ter no mínimo 20 caracteres`;
  }
  return null;
};

// ─── Ordem de Serviço ─────────────────────────────────────────────────────

export const validateOrdemServico = (c: DraftOrdemServico): string | null => {
  const os = c.ordem_servico || '(sem número)';
  if (!c.cluster_id) return `OS "${os}": selecione a Empresa/Faturamento`;
  if (!c.setor_cliente_id) return `OS "${os}": selecione a Área do Negócio`;
  if (!c.regiao) return `OS "${os}": selecione a Região`;
  if (!c.produtos_contratados || c.produtos_contratados.length === 0) {
    return `OS "${os}": adicione ao menos um Produto Contratado`;
  }
  if (!c.distribuicao_receita || c.distribuicao_receita.length === 0) {
    return `OS "${os}": adicione ao menos um Centro de Custo na Distribuição de Receita`;
  }
  const centrosVistos = new Set<string>();
  for (const d of c.distribuicao_receita) {
    if (!d.id_centro_custo || !UUID_REGEX.test(d.id_centro_custo)) {
      return `OS "${os}": selecione um centro de custo válido para cada linha de distribuição`;
    }
    // Mesmo centro de custo em duas linhas é sempre erro de digitação (o rateio
    // é por centro de custo) e era o rastro do bug de duplicação.
    if (centrosVistos.has(d.id_centro_custo)) {
      return `OS "${os}": centro de custo repetido na Distribuição de Receita — remova a linha duplicada`;
    }
    centrosVistos.add(d.id_centro_custo);
  }
  const totalPercent = c.distribuicao_receita.reduce((sum, d) => sum + (d.percentual_rateio || 0), 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    return `OS "${os}": a soma dos percentuais de distribuição deve ser 100% (atual: ${totalPercent.toFixed(2)}%)`;
  }
  return null;
};
