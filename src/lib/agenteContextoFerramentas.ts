/**
 * Snapshot de Board › Ferramentas (adoção das ferramentas internas) para o
 * Agente PSA.
 *
 * Quarto irmão de `agenteContextoBoard`, e a tela onde a disciplina de `null`
 * pesa mais: aqui existem DUAS formas diferentes de "zero", e confundi-las é o
 * erro clássico desta base.
 *
 *  - `taxaRetencao` é `null` no PRIMEIRO mês da série, porque não existe mês
 *    anterior para comparar. Isso não é retenção de 0%.
 *  - o mês de referência pode estar PARCIAL (o mês corrente, ainda correndo).
 *    Comparar um mês parcial com meses fechados foi o que já fez a queda de 80%
 *    para 50% parecer perda de adoção quando era só agosto pela metade. O
 *    snapshot carrega esse aviso junto do número, sempre.
 *
 * Nasceu de uma remoção: o banner de erro com "Tentar novamente" saiu da grade.
 * A informação vai em `avisos` e o botão "Atualizar" da barra de filtros
 * continua na tela — quem perdeu o banner não perdeu o caminho de tentar de novo.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';

/** Linhas por lista. A tela mostra top 5 de ferramenta e top 20 de pessoa. */
const MAX_FERRAMENTAS = 5;
const MAX_PESSOAS = 10;

export interface TotaisFerramentas {
  pessoasAtivas: number;
  usuariosNovos: number;
  totalAcoes: number;
  acoesPorPessoa: number;
  ferramentasUtilizadas: number;
}

export interface FerramentaUso {
  ferramenta: string;
  usuariosAtivos: number;
  chamadas: number;
  /** Fração (0–1) da base que usou a ferramenta. */
  coberturaUsuarios: number;
  /** Fração (0–1) de chamadas bem-sucedidas. */
  taxaSucesso: number;
}

export interface PessoaUso {
  usuario: string;
  chamadas: number;
  diasAtivos: number;
  ferramentasUsadas: number;
  documentosEnviados: number;
}

export interface EntradaContextoFerramentas {
  /** Rótulo do período escolhido, como o filtro o nomeia. */
  periodo: string;
  /** Rótulo do escopo: nome da empresa, ou "consolidado, todas as unidades". */
  escopo: string;
  /** Pessoa escolhida no filtro, `null` = todas. */
  pessoa: string | null;
  /** `null` quando a consulta não respondeu — nunca zeros por omissão. */
  totais: TotaisFerramentas | null;
  mesReferencia: {
    /** Rótulo do mês, ex: "ago/26". `null` = série vazia. */
    label: string | null;
    /** O mês de referência ainda está correndo. */
    parcial: boolean;
    /** Fração 0–1. `null` no primeiro mês da série: não há base anterior. */
    taxaRetencao: number | null;
    /** Rótulo do mês anterior, para a comparação não ficar anônima. */
    anteriorLabel: string | null;
  };
  ferramentas: FerramentaUso[];
  pessoas: PessoaUso[];
  /** Quantas ferramentas existem no catálogo (adotadas ou não). */
  catalogoFerramentas: number | null;
  /** A tela está servindo fixtures, não dado de produção. */
  usandoFixtures: boolean;
  /** Rótulos das consultas que falharam. Viram `avisos`. */
  falhas: string[];
}

const SUGESTOES = [
  'Qual ferramenta tem adoção alta e qual está parada?',
  'A retenção caiu de verdade ou o mês de referência está parcial?',
  'Quem usa muito e quem nunca entrou?',
];

const num = (v: number | null) => (v === null ? null : v.toLocaleString('pt-BR'));

const fracao = (v: number | null) =>
  v === null ? null : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const umaCasa = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function blocoAdocao(e: EntradaContextoFerramentas): BlocoContexto {
  const t = e.totais;
  return {
    id: 'adocao',
    titulo: 'Adoção no período',
    janela: e.periodo,
    nota: `escopo: ${e.escopo}${e.pessoa ? ` · pessoa: ${e.pessoa}` : ''}`,
    campos: [
      {
        rotulo: 'Pessoas ativas',
        valor: num(t?.pessoasAtivas ?? null),
        nota: 'pessoas, nunca contas de automação',
      },
      { rotulo: 'Pessoas que usaram pela primeira vez', valor: num(t?.usuariosNovos ?? null) },
      { rotulo: 'Ações no período', valor: num(t?.totalAcoes ?? null) },
      {
        rotulo: 'Ações por pessoa',
        valor: t ? umaCasa(t.acoesPorPessoa) : null,
      },
      {
        rotulo: 'Ferramentas com uso',
        valor: num(t?.ferramentasUtilizadas ?? null),
        nota: e.catalogoFerramentas === null
          ? undefined
          : `de ${e.catalogoFerramentas} no catálogo`,
      },
    ],
  };
}

function blocoRetencao(e: EntradaContextoFerramentas): BlocoContexto {
  const m = e.mesReferencia;
  return {
    id: 'retencao',
    titulo: 'Retenção do mês de referência',
    janela: m.label ?? 'sem série no período',
    // A nota é a peça que impede a leitura errada mais comum desta tela.
    nota: m.parcial
      ? `ATENÇÃO: ${m.label} é o mês CORRENTE e está PARCIAL. Não compare com mês `
        + 'fechado sem dizer que um dos dois está incompleto — queda aparente aqui '
        + 'costuma ser mês pela metade, não perda de adoção.'
      : undefined,
    campos: [
      {
        rotulo: 'Taxa de retenção',
        valor: fracao(m.taxaRetencao),
        nota: m.taxaRetencao === null
          ? 'primeiro mês da série: não existe mês anterior comparável. NÃO é 0%.'
          : `pessoas ativas em ${m.label} que também estavam ativas em ${m.anteriorLabel ?? 'no mês anterior'}`,
      },
      { rotulo: 'Mês de referência', valor: m.label },
      { rotulo: 'Mês anterior', valor: m.anteriorLabel },
    ],
  };
}

function blocoFerramentas(e: EntradaContextoFerramentas): BlocoContexto | null {
  if (e.ferramentas.length === 0) return null;
  return {
    id: 'ferramentas',
    titulo: 'Ferramentas mais usadas',
    janela: e.periodo,
    campos: [{ rotulo: 'Ferramentas na lista', valor: String(e.ferramentas.length) }],
    itens: e.ferramentas.slice(0, MAX_FERRAMENTAS).map((f) => ({
      ferramenta: f.ferramenta,
      'pessoas ativas': f.usuariosAtivos,
      acoes: f.chamadas,
      cobertura: fracao(f.coberturaUsuarios),
      'taxa de sucesso': fracao(f.taxaSucesso),
    })),
  };
}

function blocoPessoas(e: EntradaContextoFerramentas): BlocoContexto | null {
  if (e.pessoas.length === 0) return null;
  return {
    id: 'pessoas',
    titulo: 'Quem mais usa',
    janela: e.periodo,
    nota: 'lista recortada e ordenada por ações — não é o time inteiro',
    campos: [{ rotulo: 'Pessoas com atividade', valor: String(e.pessoas.length) }],
    itens: e.pessoas.slice(0, MAX_PESSOAS).map((p) => ({
      pessoa: p.usuario,
      acoes: p.chamadas,
      'dias ativos': p.diasAtivos,
      ferramentas: p.ferramentasUsadas,
      'documentos enviados': p.documentosEnviados,
    })),
  };
}

export function contextoBoardFerramentas(e: EntradaContextoFerramentas): ContextoTela {
  const blocos = [
    blocoAdocao(e),
    blocoRetencao(e),
    blocoFerramentas(e),
    blocoPessoas(e),
  ].filter((b): b is BlocoContexto => b !== null);

  const avisos = [
    ...(e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : []),
    // Fixture não é dado da casa. Sem este aviso, o agente responderia com
    // convicção sobre números de demonstração.
    ...(e.usandoFixtures
      ? ['esta tela está servindo dados de DEMONSTRAÇÃO (fixtures), não dados reais']
      : []),
  ];

  return {
    rotulo: 'Board · Ferramentas (adoção, engajamento e retenção das ferramentas internas)',
    filtros: {
      periodo: e.periodo,
      escopo: e.escopo,
      pessoa: e.pessoa ?? 'todas',
    },
    blocos,
    avisos: avisos.length > 0 ? avisos : undefined,
    sugestoes: SUGESTOES,
  };
}
