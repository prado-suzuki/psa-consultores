/**
 * "Preenchimento do sistema" — bloco do Estratégico (Board → Dashboard) que
 * mostra o INVERSO do resto da tela: não é resultado de trabalho, é o que
 * falta CADASTRAR, por área, com nome e número, para o sócio cobrar quem tem
 * que alimentar o sistema.
 *
 * Funções PURAS, no padrão de `boardExecutivo.ts`: recebem o snapshot já
 * buscado por `useDomainPreenchimentoSistema` e devolvem as linhas da tela.
 * Testado em `preenchimentoSistema.test.ts`.
 *
 * Regra de honestidade que atravessa todo este arquivo: quando a consulta de
 * origem falhou, o número é `null`, NUNCA `0`. Zero aqui significa "está tudo
 * cadastrado" — é elogio indevido a uma área que só teve a consulta
 * falhando, ou peor, uma cobrança injusta à área errada. A UI (componente)
 * decide como mostrar `null` ("não foi possível medir"); estas funções nunca
 * fabricam o zero.
 */

/** Quantos nomes entram na amostra do tooltip antes do "e mais N". */
const LIMITE_NOMES = 10;

// ── Entradas (linhas brutas das queries) ─────────────────────────────────
export interface AreaCadastroPreenchimento {
  id: string;
  name: string;
  is_active: boolean;
  cost_center_id: string | null;
}

export interface ProjetoPreenchimento {
  id: string;
  name: string | null;
  estrutura_area_id: string | null;
  responsible_id: string | null;
  equipe_id: string | null;
  start_date: string | null;
  end_date: string | null;
  ordem_servico_id: string | null;
}

export interface OsPreenchimento {
  id: string;
  numero_os: string | null;
  data_inicio: string | null;
}

export interface ClientePreenchimento {
  id: string;
  nome: string | null;
  uf: string | null;
  categoria: string | null;
}

// ── Saídas ─────────────────────────────────────────────────────────────
/**
 * Uma lacuna nomeável: quantos registros têm o problema, e os nomes de até
 * `LIMITE_NOMES` deles (para o "quais são os 18?" do dono). `total: null`
 * quando a consulta de origem falhou — nunca `0`.
 */
export interface LacunaContagem {
  total: number | null;
  /** Nomes/identificadores dos afetados, até `LIMITE_NOMES`. Vazio se `total` for `null` ou `0`. */
  nomes: string[];
}

export interface LinhaPreenchimentoArea {
  id: string;
  label: string;
  /** Projetos cadastrados na área. `null` quando `org_projects` falhou. */
  projetos: number | null;
  semResponsavel: LacunaContagem;
  semEquipe: LacunaContagem;
  semData: LacunaContagem;
  semOs: LacunaContagem;
  /** `estrutura_areas.cost_center_id` nulo -- centro de custo da área FALTANDO. */
  centroCustoFaltando: boolean;
}

const nomeDoProjeto = (p: ProjetoPreenchimento) => p.name?.trim() || `projeto sem nome (${p.id.slice(0, 8)})`;

function lacuna(projetos: ProjetoPreenchimento[], afetado: (p: ProjetoPreenchimento) => boolean): LacunaContagem {
  const encontrados = projetos.filter(afetado);
  return { total: encontrados.length, nomes: encontrados.slice(0, LIMITE_NOMES).map(nomeDoProjeto) };
}

const LACUNA_INDISPONIVEL: LacunaContagem = { total: null, nomes: [] };

/**
 * Uma linha por área ATIVA do cadastro (`estrutura_areas.is_active`) — mesma
 * regra de `resumoPorAreaCadastro`: a lista vem do cadastro, nunca de um
 * array fixo no código. Área nova ativada aparece sozinha, sem deploy.
 *
 * `projetos === null` (org_projects indisponível): TODA a linha vira
 * "não foi possível medir" -- nenhuma lacuna pode ser inferida sem a fonte.
 */
export function resumoPreenchimentoPorArea(
  areas: AreaCadastroPreenchimento[],
  projetos: ProjetoPreenchimento[] | null,
): LinhaPreenchimentoArea[] {
  return areas
    .filter((a) => a.is_active)
    .map((area) => {
      const centroCustoFaltando = !area.cost_center_id;
      if (projetos === null) {
        return {
          id: area.id,
          label: area.name,
          projetos: null,
          semResponsavel: LACUNA_INDISPONIVEL,
          semEquipe: LACUNA_INDISPONIVEL,
          semData: LACUNA_INDISPONIVEL,
          semOs: LACUNA_INDISPONIVEL,
          centroCustoFaltando,
        };
      }
      const doGrupo = projetos.filter((p) => p.estrutura_area_id === area.id);
      return {
        id: area.id,
        label: area.name,
        projetos: doGrupo.length,
        semResponsavel: lacuna(doGrupo, (p) => !p.responsible_id),
        semEquipe: lacuna(doGrupo, (p) => !p.equipe_id),
        // "sem data" = início OU fim nulo -- qualquer um dos dois já é lacuna.
        semData: lacuna(doGrupo, (p) => !p.start_date || !p.end_date),
        semOs: lacuna(doGrupo, (p) => !p.ordem_servico_id),
        centroCustoFaltando,
      };
    });
}

/** Sentinela do residual "sem área" -- mesmo id usado em `useBoardRollupAreas`. */
export const SEM_AREA_ID = 'SEM_AREA';

/**
 * Projeto sem `estrutura_area_id` não entra em NENHUMA linha de
 * `resumoPreenchimentoPorArea` -- é resíduo, tratado aqui, separado, nunca
 * somado silenciosamente a uma área que não é dele.
 *
 * `null` quando não há o que mostrar: consulta indisponível (a ausência de
 * origem já é coberta pelo banner de falha da tela, mostrar aqui seria
 * repetir o aviso sem base pra dizer SE há resíduo) ou residual zerado (não
 * polui a tela com uma linha "0 sem área").
 */
export function linhaSemArea(projetos: ProjetoPreenchimento[] | null): LinhaPreenchimentoArea | null {
  if (projetos === null) return null;
  const semArea = projetos.filter((p) => !p.estrutura_area_id);
  if (semArea.length === 0) return null;
  return {
    id: SEM_AREA_ID,
    label: 'Sem área atribuída',
    projetos: semArea.length,
    semResponsavel: lacuna(semArea, (p) => !p.responsible_id),
    semEquipe: lacuna(semArea, (p) => !p.equipe_id),
    semData: lacuna(semArea, (p) => !p.start_date || !p.end_date),
    semOs: lacuna(semArea, (p) => !p.ordem_servico_id),
    // Não há área, logo não há centro de custo de área a cobrar aqui.
    centroCustoFaltando: false,
  };
}

// ── Faixa da empresa inteira (o que não é por área) ──────────────────────
export interface MetricaFaixaEmpresa {
  /** Quantos registros têm a lacuna. `null` = consulta indisponível. */
  comLacuna: number | null;
  /** Total da base (denominador). `null` = consulta indisponível. */
  total: number | null;
  nomes: string[];
}

const METRICA_INDISPONIVEL: MetricaFaixaEmpresa = { comLacuna: null, total: null, nomes: [] };

export interface FaixaEmpresaPreenchimento {
  osSemDataInicio: MetricaFaixaEmpresa;
  clientesSemUf: MetricaFaixaEmpresa;
  clientesSemCategoria: MetricaFaixaEmpresa;
}

/**
 * OS sem data de início e clientes (ambiente PROD) sem UF/categoria -- as
 * três lacunas que não são atribuíveis a uma área específica do cadastro.
 *
 * `os`/`clientes` chegam `null` quando a respectiva consulta falhou; cada
 * metrica vira "indisponível" independentemente da outra ter funcionado.
 */
export function faixaEmpresaPreenchimento(
  os: OsPreenchimento[] | null,
  clientes: ClientePreenchimento[] | null,
): FaixaEmpresaPreenchimento {
  const osSemDataInicio: MetricaFaixaEmpresa = os === null
    ? METRICA_INDISPONIVEL
    : (() => {
        const afetadas = os.filter((o) => !o.data_inicio);
        return {
          comLacuna: afetadas.length,
          total: os.length,
          nomes: afetadas.slice(0, LIMITE_NOMES).map((o) => o.numero_os?.trim() || `OS ${o.id.slice(0, 8)}`),
        };
      })();

  const clientesSemUf: MetricaFaixaEmpresa = clientes === null
    ? METRICA_INDISPONIVEL
    : (() => {
        const afetados = clientes.filter((c) => !c.uf);
        return {
          comLacuna: afetados.length,
          total: clientes.length,
          nomes: afetados.slice(0, LIMITE_NOMES).map((c) => c.nome?.trim() || `cliente ${c.id.slice(0, 8)}`),
        };
      })();

  const clientesSemCategoria: MetricaFaixaEmpresa = clientes === null
    ? METRICA_INDISPONIVEL
    : (() => {
        const afetados = clientes.filter((c) => !c.categoria);
        return {
          comLacuna: afetados.length,
          total: clientes.length,
          nomes: afetados.slice(0, LIMITE_NOMES).map((c) => c.nome?.trim() || `cliente ${c.id.slice(0, 8)}`),
        };
      })();

  return { osSemDataInicio, clientesSemUf, clientesSemCategoria };
}

/**
 * Texto do tooltip/title de uma lacuna nomeável: os nomes da amostra e,
 * quando o total for maior que a amostra, "e mais N". `total: null` devolve
 * uma frase que diz a ausência de base, nunca uma string vazia (que o
 * navegador trata como "sem tooltip").
 */
export function tituloLacuna(l: { total: number | null; nomes: string[] }, semLacunaTexto = 'Nenhum'): string {
  if (l.total === null) return 'Não foi possível medir -- a consulta falhou.';
  if (l.total === 0) return semLacunaTexto;
  const resto = l.total - l.nomes.length;
  return resto > 0 ? `${l.nomes.join(', ')} e mais ${resto}` : l.nomes.join(', ');
}
