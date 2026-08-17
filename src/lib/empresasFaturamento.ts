/**
 * Empresas de faturamento derivadas de `estrutura_clusters`.
 *
 * A tabela `empresas_faturamento` foi mesclada em `estrutura_clusters`: hoje a
 * empresa é par de colunas do cluster (`nome_empresa`, `cnpj`), não uma
 * entidade própria. Estas funções montam a lista de empresas já cadastradas a
 * partir dos clusters, para os formulários oferecerem escolha em vez de
 * redigitação — e para expor quando a mesma empresa foi digitada duas vezes.
 */

export interface ClusterComEmpresa {
  id: string;
  name: string;
  nome_empresa: string | null;
  cnpj: string | null;
}

export interface EmpresaCadastrada {
  /** Razão social como está cadastrada. */
  nome: string;
  cnpj: string | null;
  /** Clusters que faturam por esta empresa, em ordem alfabética de nome. */
  clusters: { id: string; name: string }[];
}

const chaveNome = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Empresas distintas já cadastradas, ordenadas por nome (pt-BR).
 * Agrupa por razão social; o CNPJ é o primeiro não vazio encontrado, de modo
 * que um cluster cadastrado sem CNPJ herde o do irmão que já tem.
 */
export function listarEmpresasCadastradas(clusters: ClusterComEmpresa[]): EmpresaCadastrada[] {
  const porNome = new Map<string, EmpresaCadastrada>();

  for (const cluster of clusters) {
    const nome = (cluster.nome_empresa || '').trim();
    if (!nome) continue;
    const chave = chaveNome(nome);
    const atual = porNome.get(chave);
    const cnpj = (cluster.cnpj || '').trim() || null;

    if (!atual) {
      porNome.set(chave, { nome, cnpj, clusters: [{ id: cluster.id, name: cluster.name }] });
      continue;
    }
    if (!atual.cnpj && cnpj) atual.cnpj = cnpj;
    if (!atual.clusters.some(c => c.id === cluster.id)) {
      atual.clusters.push({ id: cluster.id, name: cluster.name });
    }
  }

  const empresas = [...porNome.values()];
  empresas.forEach(e => e.clusters.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  return empresas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Empresa da lista que corresponde ao que está gravado no cluster. */
export function encontrarEmpresa(
  empresas: EmpresaCadastrada[],
  nome: string | null | undefined,
): EmpresaCadastrada | null {
  const alvo = chaveNome(nome || '');
  if (!alvo) return null;
  return empresas.find(e => chaveNome(e.nome) === alvo) ?? null;
}
