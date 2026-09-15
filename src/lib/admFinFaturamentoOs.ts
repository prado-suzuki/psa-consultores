// As OS vistas pelo faturamento: uma linha por OS, com tudo o que a aba
// Faturamento do cadastro de cliente mostra de UMA OS por vez.
//
// A aba (`FaturamentoTab`) responde "como fatura esta OS deste cliente". Quem
// fatura precisa da pergunta virada do avesso — "o que entrou, e em que ordem" —
// e essa não tem resposta lá: para vê-la seria preciso abrir cliente por cliente
// e clicar OS por OS. Por isso esta camada monta a MESMA leitura em linha, e não
// uma leitura nova: os quatro blocos de lá viram os quatro grupos de colunas da
// tabela, com os mesmos rótulos e as mesmas regras de vazio ("Isento" na
// inscrição estadual, travessão no que ninguém informou).
//
// Tudo aqui é função pura, de propósito: o que esta tela tem de arriscado é o
// casamento OS × contribuinte × cluster × rateio, e casamento errado não aparece
// na tela — aparece como nome de outro cliente na linha. É o que os testes ao
// lado travam.
import { SITUACAO_PROJETO_OPTIONS, formatCep, formatCpfCnpj, formatPhone } from '@/components/equipe/client-form/constants';
import { getEmpresaLabel } from '@/components/equipe/client-form/contratosLabels';
import { calcularValorParcela } from '@/lib/osParcelamento';

// ── O que vem do banco (espelha os `select()` do hook) ─────────────────

/** `cliente`, já filtrada por `excluido` e `ambiente` na query. */
export interface RawClienteNome {
  id: string;
  nome: string;
}

/** `ordem_servico` (sem coluna `ambiente`; o escopo vem do cliente). */
export interface RawOsFaturamento {
  id: string;
  numero_os: string | null;
  id_cliente: string;
  contribuinte_id: string | null;
  cluster_id: string | null;
  situacao: string | null;
  created_at: string | null;
  valor_projeto: number | null;
  numero_parcelas: number | null;
  valor_entrada: number | null;
  valor_reembolso_km: number | null;
  valor_reembolso_refeicao: number | null;
}

/** `contribuinte`, já filtrada por `excluido` e `ambiente` na query. */
export interface RawContribuinteFaturamento {
  id: string;
  nome_razao_social: string;
  /** 'PF' ou 'PJ'. Decide a máscara do documento, como no cadastro. */
  tipo_pessoa: string | null;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  complemento: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
}

/** `estrutura_clusters` — a empresa do grupo PSA que emite a nota. */
export interface RawClusterEmpresa {
  id: string;
  name: string;
  nome_empresa: string | null;
}

/** `distribuicao_receita` — o rateio da receita da OS. */
export interface RawRateioOs {
  id_ordem_servico: string;
  id_centro_custo: string;
  percentual_rateio: number | null;
}

/** `centros_custo` — catálogo global. */
export interface RawCentroCustoOs {
  id: string;
  codigo: string;
  nome: string;
}

// ── A linha da tabela ──────────────────────────────────────────────────

/** Uma fatia do rateio, já com o nome do centro de custo resolvido. */
export interface FatiaRateioOs {
  label: string;
  percentual: number;
}

export interface LinhaFaturamentoOs {
  os_id: string;
  numero_os: string | null;
  cliente_id: string;
  cliente_nome: string;
  /** `created_at` da OS: quando ela ENTROU no sistema, que é a ordem da tela. */
  entrou_em: string | null;
  situacao: string | null;
  situacao_label: string;
  // 01 — contribuinte de faturamento da OS
  contribuinte_nome: string | null;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  // 02 — endereço de cobrança
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade_uf: string | null;
  // 03 — valores do contrato
  valor_projeto: number;
  numero_parcelas: number | null;
  valor_entrada: number;
  /** Derivado, como na aba: `null` quando a OS não tem parcelamento. */
  valor_parcela: number | null;
  valor_reembolso_km: number;
  valor_reembolso_refeicao: number;
  // 04 — empresa / faturamento e distribuição de receita
  /** O cluster da OS. Guardado porque o filtro de empresa casa por id, não por nome. */
  cluster_id: string | null;
  empresa_faturamento: string | null;
  rateio: FatiaRateioOs[];
}

/**
 * Rótulo da situação, na tradução que a leitura da OS já usa. Situação fora da
 * lista volta como veio: inventar "—" esconderia dado que existe no banco.
 */
export function situacaoLabel(situacao: string | null): string {
  if (!situacao) return '—';
  return SITUACAO_PROJETO_OPTIONS.find((o) => o.value === situacao)?.label ?? situacao;
}

/**
 * O endereço numa linha só, como o bloco 02 da aba monta: logradouro e, quando
 * existe, o complemento depois da vírgula.
 */
export function enderecoDeCobranca(
  contribuinte: Pick<RawContribuinteFaturamento, 'logradouro' | 'complemento'> | undefined,
): string | null {
  if (!contribuinte?.logradouro) return null;
  return contribuinte.complemento
    ? `${contribuinte.logradouro}, ${contribuinte.complemento}`
    : contribuinte.logradouro;
}

/**
 * O documento com a máscara do cadastro, e não como está gravado.
 *
 * A coluna guarda os dois jeitos: há contribuinte com `26.825.052/8395-06` e
 * contribuinte com `26825052839506`, porque a máscara é da tela e nem toda carga
 * passou por ela. Sem isto, a mesma tela mostra os dois formatos e quem confere
 * contra a nota acha que são documentos diferentes. `tipo_pessoa` decide a
 * máscara; sem ele, quem decide é a contagem de dígitos.
 */
export function documentoFormatado(
  cpfCnpj: string | null | undefined,
  tipoPessoa: string | null | undefined,
): string | null {
  if (!cpfCnpj?.trim()) return null;
  const digitos = cpfCnpj.replace(/\D/g, '');
  if (digitos.length !== 11 && digitos.length !== 14) return cpfCnpj;
  const tipo = tipoPessoa ?? (digitos.length === 11 ? 'PF' : 'PJ');
  return formatCpfCnpj(digitos, tipo);
}

/** Cidade / UF, também como o bloco 02: sem UF, só a cidade. */
export function cidadeUf(
  contribuinte: Pick<RawContribuinteFaturamento, 'municipio' | 'uf'> | undefined,
): string | null {
  if (!contribuinte?.municipio) return null;
  return contribuinte.uf ? `${contribuinte.municipio} / ${contribuinte.uf}` : contribuinte.municipio;
}

/**
 * As OS mais recentes no topo, pela data em que ENTRARAM (`created_at`).
 *
 * OS sem `created_at` vai para o FIM, e não para o topo: a coluna é anulável no
 * banco, e ordenar nulo como "agora" colocaria o registro mais antigo — o que
 * veio de carga em massa antes da coluna existir — na frente do que foi digitado
 * hoje. Empate desempata pelo número da OS, decrescente, para a ordem não dançar
 * entre dois renders (as cargas gravaram o mesmo timestamp para lotes inteiros).
 */
export function ordenarPorEntrada(linhas: LinhaFaturamentoOs[]): LinhaFaturamentoOs[] {
  return linhas.slice().sort((a, b) => {
    if (a.entrou_em !== b.entrou_em) {
      if (!a.entrou_em) return 1;
      if (!b.entrou_em) return -1;
      return a.entrou_em < b.entrou_em ? 1 : -1;
    }
    return (b.numero_os ?? '').localeCompare(a.numero_os ?? '', 'pt-BR', { numeric: true });
  });
}

/**
 * O rateio de cada OS, indexado por `id_ordem_servico` e já com o nome do centro
 * de custo. Centro de custo que sumiu do catálogo cai no próprio id, como a aba
 * faz — apagar a fatia esconderia percentual que existe.
 */
function rateioPorOs(
  rateio: RawRateioOs[],
  centrosCusto: RawCentroCustoOs[],
): Map<string, FatiaRateioOs[]> {
  const centroPorId = new Map(
    centrosCusto.map((c) => [c.id, `${c.codigo} - ${c.nome}`] as const),
  );
  const mapa = new Map<string, FatiaRateioOs[]>();
  for (const fatia of rateio) {
    const lista = mapa.get(fatia.id_ordem_servico) ?? [];
    lista.push({
      label: centroPorId.get(fatia.id_centro_custo) ?? fatia.id_centro_custo,
      percentual: fatia.percentual_rateio ?? 0,
    });
    mapa.set(fatia.id_ordem_servico, lista);
  }
  // Maior fatia primeiro: quem lê a coluna quer saber para onde vai a maior
  // parte da receita, e a ordem de chegada do `select` não diz nada.
  for (const lista of mapa.values()) lista.sort((a, b) => b.percentual - a.percentual);
  return mapa;
}

/**
 * Monta as linhas da tabela.
 *
 * A OS SEM CLIENTE NA LISTA SAI, e isso é o recorte de ambiente desta tela:
 * `ordem_servico` não tem a coluna `ambiente` (ver AGENTS.md), então o ambiente
 * dela é o do cliente — e a lista de clientes já chega filtrada. É o mesmo INNER
 * JOIN de `buildOsRows`, pelo mesmo motivo, com um a mais aqui: o nome do cliente
 * é COLUNA desta tabela, então linha sem cliente seria linha sem a coluna que a
 * Patricia pediu.
 *
 * Contribuinte e cluster, ao contrário, são LEFT JOIN: OS sem contribuinte
 * escolhido existe de verdade (ver `FaturamentoTab`), e sumir com ela esconderia
 * exatamente a OS que falta alguém preencher.
 */
export function montarLinhasFaturamentoOs(input: {
  os: RawOsFaturamento[];
  clientes: RawClienteNome[];
  contribuintes: RawContribuinteFaturamento[];
  clusters: RawClusterEmpresa[];
  rateio: RawRateioOs[];
  centrosCusto: RawCentroCustoOs[];
}): LinhaFaturamentoOs[] {
  const { os, clientes, contribuintes, clusters, rateio, centrosCusto } = input;
  const clientePorId = new Map(clientes.map((c) => [c.id, c] as const));
  const contribuintePorId = new Map(contribuintes.map((c) => [c.id, c] as const));
  const clusterPorId = new Map(clusters.map((c) => [c.id, c] as const));
  const rateios = rateioPorOs(rateio, centrosCusto);

  const linhas: LinhaFaturamentoOs[] = [];
  for (const o of os) {
    const cliente = clientePorId.get(o.id_cliente);
    if (!cliente) continue;
    const contribuinte = o.contribuinte_id ? contribuintePorId.get(o.contribuinte_id) : undefined;
    const cluster = o.cluster_id ? clusterPorId.get(o.cluster_id) : undefined;

    linhas.push({
      os_id: o.id,
      numero_os: o.numero_os,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      entrou_em: o.created_at,
      situacao: o.situacao,
      situacao_label: situacaoLabel(o.situacao),
      contribuinte_nome: contribuinte?.nome_razao_social ?? null,
      cpf_cnpj: documentoFormatado(contribuinte?.cpf_cnpj, contribuinte?.tipo_pessoa),
      // "Isento" só quando HÁ contribuinte: sem ele a célula não tem sobre quem
      // afirmar isenção, e escrever "Isento" na linha vazia seria inventar
      // cadastro. É a mesma regra do bloco 01 da aba.
      inscricao_estadual: contribuinte ? contribuinte.inscricao_estadual || 'Isento' : null,
      telefone: contribuinte?.telefone ? formatPhone(contribuinte.telefone) : null,
      cep: contribuinte?.cep ? formatCep(contribuinte.cep) : null,
      endereco: enderecoDeCobranca(contribuinte),
      numero: contribuinte?.numero ?? null,
      bairro: contribuinte?.bairro ?? null,
      cidade_uf: cidadeUf(contribuinte),
      valor_projeto: o.valor_projeto ?? 0,
      numero_parcelas: o.numero_parcelas,
      valor_entrada: o.valor_entrada ?? 0,
      valor_parcela: calcularValorParcela({
        valorProjeto: o.valor_projeto ?? 0,
        valorEntrada: o.valor_entrada ?? 0,
        numeroParcelas: o.numero_parcelas ?? null,
      }),
      valor_reembolso_km: o.valor_reembolso_km ?? 0,
      valor_reembolso_refeicao: o.valor_reembolso_refeicao ?? 0,
      cluster_id: o.cluster_id,
      empresa_faturamento: cluster ? getEmpresaLabel(cluster) : null,
      rateio: rateios.get(o.id) ?? [],
    });
  }

  return ordenarPorEntrada(linhas);
}

/**
 * O que a barra de filtros escolheu. Vazio (`null`) é "todos".
 */
export interface FiltrosDeFaturamento {
  clienteId: string | null;
  clusterId: string | null;
  osId: string | null;
}

export const SEM_FILTRO: FiltrosDeFaturamento = { clienteId: null, clusterId: null, osId: null };

/** Quantos filtros estão aplicados. É o número que o botão de limpar carrega. */
export function quantidadeDeFiltros(filtros: FiltrosDeFaturamento): number {
  return [filtros.clienteId, filtros.clusterId, filtros.osId].filter(Boolean).length;
}

/**
 * As linhas que sobram depois dos filtros.
 *
 * Os três se acumulam (E, não OU): escolher cliente e empresa mostra as OS que
 * são das duas coisas. Empresa `null` na linha (OS sem cluster) só aparece
 * quando o filtro de empresa está vazio — filtrar por uma empresa e receber de
 * volta a OS que não tem empresa nenhuma seria mentira.
 */
export function filtrarLinhas(
  linhas: LinhaFaturamentoOs[],
  filtros: FiltrosDeFaturamento,
): LinhaFaturamentoOs[] {
  return linhas.filter((l) => {
    if (filtros.clienteId && l.cliente_id !== filtros.clienteId) return false;
    if (filtros.clusterId && l.cluster_id !== filtros.clusterId) return false;
    if (filtros.osId && l.os_id !== filtros.osId) return false;
    return true;
  });
}

/** Os clientes QUE TÊM OS, para o campo de cliente. Sem repetir, em ordem alfabética. */
export function opcoesDeCliente(
  linhas: LinhaFaturamentoOs[],
): Array<{ id: string; nome: string }> {
  const porId = new Map<string, string>();
  for (const l of linhas) porId.set(l.cliente_id, l.cliente_nome);
  return [...porId]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * As empresas que faturam, para o campo de empresa.
 *
 * Sai das OS e não do cadastro de clusters de propósito: cluster que nunca
 * faturou nada vira opção que devolve lista vazia, e opção assim faz quem filtra
 * duvidar do filtro em vez de duvidar do dado.
 */
export function opcoesDeEmpresa(
  linhas: LinhaFaturamentoOs[],
): Array<{ id: string; nome: string }> {
  const porId = new Map<string, string>();
  for (const l of linhas) {
    if (l.cluster_id && l.empresa_faturamento) porId.set(l.cluster_id, l.empresa_faturamento);
  }
  return [...porId]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * As OS para o campo de OS, na ordem em que a lista as mostra.
 *
 * Cada opção carrega o cliente como texto secundário, e o documento do
 * contribuinte como palavra de busca: quem tem a nota na mão procura pelo CNPJ,
 * não pelo número da OS.
 */
export function opcoesDeOs(
  linhas: LinhaFaturamentoOs[],
): Array<{ id: string; numero: string; cliente: string; documento: string | null }> {
  return linhas.map((l) => ({
    id: l.os_id,
    numero: l.numero_os || 'sem número',
    cliente: l.cliente_nome,
    documento: l.cpf_cnpj,
  }));
}
