/**
 * Snapshot do Board · Capacidade (carga do time e prazos) para o Agente PSA.
 *
 * Esta tela é o dashboard de área do Tax e da OSG somado, e traz o que nenhuma
 * outra tela do Board tem: **quem vai estourar**, não quem já estourou. O
 * Operacional olha os 90 dias passados; aqui o mapa de calor olha os próximos
 * 14 dias.
 *
 * Por isso a fila de atrasadas entra com NOME, cliente e responsável: a
 * pergunta que esta tela responde não é "quanto", é "quem e o quê".
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';

/** Só o que o snapshot usa — o controller devolve muito mais. */
export interface EntradaContextoCapacidade {
  /** 'todas' no Board; 'tax'/'osg' quando cada área ligar o seu escopo. */
  escopoArea: string;
  filtrosAtivos: number;
  metrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
    totalTasks: number;
    doneTasks: number;
    completionRate: number;
    totalEstHours: number;
    overdueCount: number;
  };
  atrasadas: {
    title: string; project: string; client: string;
    responsible: string; dueDate: string; daysOverdue: number;
  }[];
  membros: { name: string; active: number; hours: number; overdue: number }[];
  topClientes: { name: string; hours: number }[];
  carregando: boolean;
}

const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

const SUGESTOES = [
  'Quem está mais sobrecarregado agora?',
  'Qual tarefa está atrasada há mais tempo, e de quem é?',
  'Qual cliente consome mais horas do time?',
];

function blocoCarga(e: EntradaContextoCapacidade): BlocoContexto {
  const m = e.metrics;
  return {
    id: 'carga',
    titulo: 'Carga do time',
    nota: 'Horas são ESTIMADAS (`estimated_hours`) das tarefas em aberto, não horas apontadas.',
    campos: [
      { rotulo: 'Projetos no escopo', valor: String(m.totalProjects) },
      { rotulo: 'Projetos ativos', valor: String(m.activeProjects) },
      { rotulo: 'Projetos em espera', valor: String(m.onHoldProjects) },
      { rotulo: 'Projetos concluídos', valor: String(m.completedProjects) },
      { rotulo: 'Tarefas no escopo', valor: String(m.totalTasks) },
      { rotulo: 'Tarefas concluídas', valor: `${m.doneTasks} (${m.completionRate}%)` },
      { rotulo: 'Horas estimadas em aberto', valor: `${num(m.totalEstHours)} h` },
      { rotulo: 'Tarefas atrasadas', valor: String(m.overdueCount) },
    ],
  };
}

function blocoAtrasadas(e: EntradaContextoCapacidade): BlocoContexto | null {
  if (e.atrasadas.length === 0) return null;
  const pior = e.atrasadas[0];
  return {
    id: 'atrasadas',
    titulo: 'Fila de tarefas atrasadas',
    nota: 'Ordenada por dias de atraso, da mais antiga para a mais recente.',
    campos: [
      { rotulo: 'Tarefas atrasadas', valor: String(e.atrasadas.length) },
      {
        rotulo: 'Atraso máximo',
        valor: `${pior.daysOverdue} dias`,
        nota: `${pior.title} · ${pior.responsible}`,
      },
    ],
    // 10 linhas: a fila inteira pode ter centenas, e nenhuma resposta melhora
    // por ver a 200a. As 10 mais antigas são as que decidem conversa.
    itens: e.atrasadas.slice(0, 10).map((t) => ({
      tarefa: t.title,
      responsavel: t.responsible,
      cliente: t.client,
      projeto: t.project,
      dias_de_atraso: t.daysOverdue,
    })),
  };
}

function blocoMembros(e: EntradaContextoCapacidade): BlocoContexto | null {
  if (e.membros.length === 0) return null;
  const maisCarregado = e.membros.reduce((a, b) => (b.hours > a.hours ? b : a));
  return {
    id: 'membros',
    titulo: 'Carga por pessoa',
    nota: 'Só tarefas EM ABERTO. Quem zerou a fila não aparece com carga.',
    campos: [
      { rotulo: 'Pessoas com tarefa em aberto', valor: String(e.membros.length) },
      {
        rotulo: 'Maior carga de horas',
        valor: `${maisCarregado.name} · ${num(maisCarregado.hours)} h`,
        nota: `${maisCarregado.active} tarefas em aberto, ${maisCarregado.overdue} atrasadas`,
      },
    ],
    itens: e.membros.slice(0, 12).map((m) => ({
      pessoa: m.name,
      tarefas_em_aberto: m.active,
      horas_estimadas: num(m.hours),
      atrasadas: m.overdue,
    })),
  };
}

function blocoClientes(e: EntradaContextoCapacidade): BlocoContexto | null {
  if (e.topClientes.length === 0) return null;
  return {
    id: 'clientes_horas',
    titulo: 'Clientes que mais consomem horas',
    nota: 'É o outro lado do faturamento por cliente da tela de Projetos: '
      + 'quem consome hora contra quem gera receita.',
    campos: [{ rotulo: 'Clientes no ranking', valor: String(e.topClientes.length) }],
    itens: e.topClientes.map((c) => ({ cliente: c.name, horas_estimadas: num(c.hours) })),
  };
}

export function contextoBoardCapacidade(e: EntradaContextoCapacidade): ContextoTela {
  const blocos = [
    blocoCarga(e),
    blocoAtrasadas(e),
    blocoMembros(e),
    blocoClientes(e),
  ].filter((b): b is BlocoContexto => b !== null);

  return {
    rotulo: 'Board · Capacidade (carga do time e prazos)',
    filtros: {
      área: e.escopoArea === 'todas' ? 'Tax + OSG (consolidado)' : e.escopoArea,
      'filtros da tela': e.filtrosAtivos > 0 ? `${e.filtrosAtivos} ativo(s)` : 'nenhum',
      janela: 'tarefas em aberto; o mapa de calor da tela olha os próximos 14 dias',
    },
    blocos,
    sugestoes: SUGESTOES,
  };
}
