/**
 * Resolução determinística dos nomes ditados para IDs válidos.
 *
 * A Edge Function `ditar` extrai NOMES (nunca IDs). Aqui eles são casados contra
 * as listas permitidas que a tela já carrega — e só contra elas: nenhuma consulta
 * nova acontece dentro da resolução, então nenhum cadastro fora do escopo do
 * usuário pode vazar para o modal.
 *
 * A regra central é a recusa: correspondência ambígua ou inexistente deixa o
 * campo VAZIO em vez de adivinhar. O usuário revisa o modal antes de salvar, e um
 * campo em branco com aviso é melhor que o cadastro errado preenchido em silêncio.
 *
 * Ordem de decisão (plano docs/planos/ditado-preenchimento-contextual-tarefa.md):
 * - Projeto: menção resolvida unicamente; sem menção, o projeto do contexto da
 *   tela; menção ambígua/inválida NÃO cai no contexto da tela.
 * - Cliente: derivado do projeto resolvido; sem projeto, resolvido da menção;
 *   menção incompatível com o projeto preserva o vínculo cadastral do projeto e
 *   vira conflito.
 * - Responsável: membros permitidos do projeto; sem projeto, membros da área;
 *   nome completo exato ou primeiro nome único — duas "Ana" deixam vazio.
 */

export interface SugestaoParaResolver {
  responsavel_mencionado: string | null;
  cliente_mencionado: string | null;
  projeto_mencionado: string | null;
  horas_estimadas: number | null;
}

export interface ProjetoParaResolucao {
  id: string;
  nome: string;
  external_client_id: string | null;
}

export interface ClienteParaResolucao {
  id: string;
  nome: string;
}

export interface PessoaParaResolucao {
  id: string;
  name: string;
}

export interface ListasParaResolucao {
  projetos: ProjetoParaResolucao[];
  clientes: ClienteParaResolucao[];
  /** Membros permitidos do projeto resolvido — vazios quando não há projeto. */
  membrosDoProjeto: PessoaParaResolucao[];
  /** Membros disponíveis da área, para quando a fala não fixa projeto. */
  membrosDaArea: PessoaParaResolucao[];
}

export type CampoNaoResolvido = 'responsavel' | 'cliente' | 'projeto';

export interface ResolucaoTarefaDitada {
  projetoId: string | null;
  clienteId: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  horasEstimadas: number | null;
  /** Campos mencionados na fala que não puderam ser resolvidos com segurança. */
  camposNaoResolvidos: CampoNaoResolvido[];
  /** Avisos não bloqueantes: menção incompatível ou não identificada em campo já preenchido. */
  conflitos: string[];
}

const ARTIGOS = new Set(['o', 'a', 'os', 'as', 'para', 'pro', 'pra', 'de', 'do', 'da', 'no', 'na']);

/** Sem acento, minúscula, espaços colapsados — a comparação é sobre isto aqui. */
export function normalizarNome(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function primeiroNome(valor: string): string {
  return normalizarNome(valor).split(' ')[0] ?? '';
}

/**
 * Menção textual pode vir cercada de "cliente", "projeto", "para" etc. — "para o
 * cliente Alfa" menciona "Alfa". As pontas formadas só por artigos e preposições
 * curtas caem fora antes da comparação.
 */
export function mencaoLimpa(mencao: string): string {
  const palavras = normalizarNome(mencao).split(' ').filter(Boolean);
  while (palavras.length > 1 && ARTIGOS.has(palavras[0])) palavras.shift();
  while (palavras.length > 1 && ARTIGOS.has(palavras[palavras.length - 1])) palavras.pop();
  return palavras.join(' ');
}

interface Correspondencia<T> {
  exata: T[];
  parciais: T[];
}

function correspondenciasDe<T>(mencao: string, candidatos: T[], nomeDe: (item: T) => string): Correspondencia<T> {
  const alvo = mencaoLimpa(mencao);
  if (!alvo) return { exata: [], parciais: [] };
  const exata: T[] = [];
  const parciais: T[] = [];
  for (const candidato of candidatos) {
    const nome = normalizarNome(nomeDe(candidato));
    if (!nome) continue;
    if (nome === alvo) exata.push(candidato);
    else if (nome.includes(alvo) || alvo.includes(nome)) parciais.push(candidato);
  }
  return { exata, parciais };
}

/**
 * Único vencedor ou nada: exata ganha, mas só quando é única; sem exata, uma
 * parcial única serve. Duas ou nenhuma → null (o chamador decide se era menção).
 */
function resolverUnico<T>(mencao: string, candidatos: T[], nomeDe: (item: T) => string): T | null {
  const { exata, parciais } = correspondenciasDe(mencao, candidatos, nomeDe);
  if (exata.length === 1) return exata[0];
  if (exata.length === 0 && parciais.length === 1) return parciais[0];
  return null;
}

/** Nome completo exato, ou primeiro nome (menção de UMA palavra) quando único. */
function resolverPessoa(mencao: string, candidatos: PessoaParaResolucao[]): PessoaParaResolucao | null {
  const alvo = mencaoLimpa(mencao);
  if (!alvo) return null;
  const exatos = candidatos.filter((p) => normalizarNome(p.name) === alvo);
  if (exatos.length === 1) return exatos[0];
  if (exatos.length > 1) return null;
  // A tolerância do primeiro nome é para a fala solta ("a Ana revisa..."); um
  // nome completo dito e não encontrado não vira outro "Ana" por aproximação.
  if (alvo.includes(' ')) return null;
  const peloPrimeiroNome = candidatos.filter((p) => primeiroNome(p.name) === alvo);
  return peloPrimeiroNome.length === 1 ? peloPrimeiroNome[0] : null;
}

export interface ProjetoResolvidoDaMencao {
  projetoId: string | null;
  /** true quando houve menção de projeto que não se resolveu (não cai no contexto da tela). */
  mencaoNaoResolvida: boolean;
}

/**
 * Primeira decisão da resolução, exportada porque o hook precisa dela antes de
 * buscar os membros do projeto. Internamente é a mesma regra que
 * `resolverTarefaDitada` aplica — o project_id final nunca diverge deste.
 */
export function resolverProjetoDitado(
  sugestao: SugestaoParaResolver,
  projetos: ProjetoParaResolucao[],
  projetoDaTela: string | null,
): ProjetoResolvidoDaMencao {
  const mencao = sugestao.projeto_mencionado?.trim();
  if (!mencao) {
    const doContexto = projetos.find((p) => p.id === projetoDaTela) ?? null;
    return { projetoId: doContexto?.id ?? null, mencaoNaoResolvida: false };
  }
  const resolvido = resolverUnico(mencao, projetos, (p) => p.nome);
  return { projetoId: resolvido?.id ?? null, mencaoNaoResolvida: !resolvido };
}

export function resolverTarefaDitada(
  sugestao: SugestaoParaResolver,
  listas: ListasParaResolucao,
  projetoDaTela: string | null,
): ResolucaoTarefaDitada {
  const camposNaoResolvidos: CampoNaoResolvido[] = [];
  const conflitos: string[] = [];

  // ── Projeto ─────────────────────────────────────────────────────────
  const { projetoId, mencaoNaoResolvida } = resolverProjetoDitado(sugestao, listas.projetos, projetoDaTela);
  const projeto = projetoId ? (listas.projetos.find((p) => p.id === projetoId) ?? null) : null;
  if (mencaoNaoResolvida) camposNaoResolvidos.push('projeto');

  // ── Cliente ─────────────────────────────────────────────────────────
  let clienteId: string | null = null;
  const mencaoCliente = sugestao.cliente_mencionado?.trim();
  if (projeto) {
    // O vínculo cadastral manda: cliente do projeto, sempre que o projeto se resolve.
    clienteId = projeto.external_client_id;
    if (mencaoCliente) {
      const cliente = resolverUnico(mencaoCliente, listas.clientes, (c) => c.nome);
      if (!cliente) {
        conflitos.push(
          `Não foi possível identificar o cliente “${mencaoCliente.trim()}”; mantido o cliente do projeto.`,
        );
      } else if (cliente.id !== clienteId) {
        const nomeDoClienteDoProjeto =
          listas.clientes.find((c) => c.id === clienteId)?.nome ?? 'do projeto';
        conflitos.push(
          `O cliente mencionado (“${cliente.nome}”) não é o cliente do projeto (“${nomeDoClienteDoProjeto}”). Mantido o cliente do projeto.`,
        );
      }
    }
  } else if (mencaoCliente) {
    const cliente = resolverUnico(mencaoCliente, listas.clientes, (c) => c.nome);
    if (cliente) clienteId = cliente.id;
    else camposNaoResolvidos.push('cliente');
  }

  // ── Responsável ─────────────────────────────────────────────────────
  let responsavel: PessoaParaResolucao | null = null;
  const mencaoResponsavel = sugestao.responsavel_mencionado?.trim();
  if (mencaoResponsavel) {
    const candidatos = projetoId ? listas.membrosDoProjeto : listas.membrosDaArea;
    responsavel = resolverPessoa(mencaoResponsavel, candidatos);
    if (!responsavel) camposNaoResolvidos.push('responsavel');
  }

  // ── Horas ───────────────────────────────────────────────────────────
  const horas = sugestao.horas_estimadas;
  const horasEstimadas =
    typeof horas === 'number' && Number.isFinite(horas) && horas > 0 ? horas : null;

  return {
    projetoId: projeto?.id ?? null,
    clienteId,
    responsavelId: responsavel?.id ?? null,
    responsavelNome: responsavel?.name ?? null,
    horasEstimadas,
    camposNaoResolvidos,
    conflitos,
  };
}

const ROTULOS: Record<CampoNaoResolvido, string> = {
  responsavel: 'responsável',
  cliente: 'cliente',
  projeto: 'projeto',
};

/** Aviso não bloqueante do plano: “Não foi possível identificar com segurança…” */
export function mensagemCampoNaoResolvido(campo: CampoNaoResolvido, mencao: string): string {
  const texto = mencao.trim();
  return `Não foi possível identificar com segurança o ${ROTULOS[campo]} “${texto}”. Selecione-o antes de criar a tarefa.`;
}
