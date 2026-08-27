/**
 * Snapshot do Board · Chamados para o Agente PSA.
 *
 * A tela lista os chamados de todas as áreas (o recorte real é a RLS de
 * `tickets`: para o sócio, a empresa inteira; na Tax e na OSG, o cluster de
 * quem olha). O snapshot publica o MESMO `stats` que os cartões do topo
 * mostram, mais três leituras que a tabela tem e o cartão não resume: prazo
 * estourado, chamado sem responsável e distribuição por área.
 *
 * **`deadline` vazio não vira "no prazo".** Chamado sem prazo cadastrado é
 * chamado que ninguém pode cobrar — ele tem contagem própria, separada dos
 * vencidos, porque tratar os dois juntos esconderia o pior dos dois.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';

export interface ChamadoDoSnapshot {
  status: string;
  priority: string | null;
  deadline: string | null;
  assigned_to: string | null;
  estrutura_area_id: string | null;
  activity_status: string | null;
}

export interface EntradaContextoChamados {
  /** Rótulo do escopo em que a tela está montada. */
  escopoLabel: string;
  stats: { total: number; abertos: number; emAndamento: number; resolvidos: number };
  chamados: ChamadoDoSnapshot[];
  /** id da área da estrutura -> nome. */
  areaPorId: Record<string, string>;
  /** Data de referência 'YYYY-MM-DD' — a função pura não lê o relógio. */
  hoje: string;
  carregando: boolean;
}

const PRIORIDADE_ROTULO: Record<string, string> = {
  urgente: 'urgente', alta: 'alta', media: 'média', baixa: 'baixa',
};

const contar = <T,>(itens: T[], chave: (t: T) => string) => {
  const mapa = new Map<string, number>();
  for (const i of itens) mapa.set(chave(i), (mapa.get(chave(i)) ?? 0) + 1);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
};

const SUGESTOES = [
  'Quantos chamados estão com prazo estourado?',
  'Há chamado aberto sem responsável?',
  'Que área concentra os chamados em aberto?',
];

/** Em aberto = ainda não resolvido nem fechado. */
const emAberto = (c: ChamadoDoSnapshot) => c.status !== 'resolvido' && c.status !== 'fechado';

export function contextoBoardChamados(e: EntradaContextoChamados): ContextoTela {
  const abertos = e.chamados.filter(emAberto);
  const vencidos = abertos.filter((c) => c.deadline !== null && c.deadline < e.hoje);
  const semPrazo = abertos.filter((c) => c.deadline === null);
  const semResponsavel = abertos.filter((c) => c.assigned_to === null);

  const blocos: BlocoContexto[] = [{
    id: 'fila',
    titulo: 'Fila de chamados',
    nota: 'O recorte é o do seu acesso (RLS de `tickets`) — para o sócio, a empresa inteira.',
    campos: [
      { rotulo: 'Chamados no escopo', valor: String(e.stats.total) },
      { rotulo: 'Abertos', valor: String(e.stats.abertos) },
      { rotulo: 'Em andamento', valor: String(e.stats.emAndamento) },
      { rotulo: 'Resolvidos ou fechados', valor: String(e.stats.resolvidos) },
    ],
  }, {
    id: 'prazo',
    titulo: 'Prazo e responsável (só os que seguem em aberto)',
    campos: [
      { rotulo: 'Em aberto', valor: String(abertos.length) },
      {
        rotulo: 'Com prazo estourado',
        valor: String(vencidos.length),
        nota: `prazo anterior a ${e.hoje}`,
      },
      {
        rotulo: 'Sem prazo cadastrado',
        valor: String(semPrazo.length),
        nota: 'não é "no prazo" — é chamado que ninguém consegue cobrar',
      },
      { rotulo: 'Sem responsável', valor: String(semResponsavel.length) },
    ],
  }];

  const porArea = contar(abertos, (c) => c.estrutura_area_id ?? '__sem_area__');
  if (porArea.length > 0) {
    blocos.push({
      id: 'areas',
      titulo: 'Chamados em aberto por área',
      campos: [{ rotulo: 'Áreas com chamado em aberto', valor: String(porArea.length) }],
      itens: porArea.slice(0, 12).map(([id, qtd]) => ({
        area: id === '__sem_area__' ? 'sem área atribuída' : e.areaPorId[id] ?? 'área não identificada',
        em_aberto: qtd,
      })),
    });
  }

  const porPrioridade = contar(abertos, (c) => c.priority ?? '__sem__');
  if (porPrioridade.length > 0) {
    blocos.push({
      id: 'prioridade',
      titulo: 'Prioridade dos chamados em aberto',
      campos: porPrioridade.map(([p, qtd]) => ({
        rotulo: p === '__sem__' ? 'sem prioridade' : PRIORIDADE_ROTULO[p] ?? p,
        valor: String(qtd),
      })),
    });
  }

  return {
    rotulo: 'Board · Chamados',
    filtros: { escopo: e.escopoLabel, referência: e.hoje },
    blocos,
    sugestoes: SUGESTOES,
  };
}
