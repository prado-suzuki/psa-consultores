import { describe, expect, it } from 'vitest';
import { buildGanttData, groupGanttByPerson } from './equipeSprintDetalhes';

/**
 * A lib da sprint não calcula geometria de Gantt. Quem calcula é
 * `src/lib/ganttTimeline.ts`, que tem teste próprio.
 *
 * ESTE TESTE EXISTE POR CAUSA DE UM REVERT QUE VAI ACONTECER. A remoção da
 * geometria daqui foi commitada, por acidente de sessão paralela, DENTRO do
 * commit de cor `0fd30b3a` — que é um commit de outra frente, com boa chance de
 * ser revertido um dia. O revert compila e passa em tudo: a API antiga é um
 * superconjunto da atual (mesmas assinaturas, mais campos), então nenhum
 * consumidor quebra. Ele volta calado, e o que volta é código morto — um eixo
 * que ia do começo ao fim da sprint, que a tela não usa mais.
 *
 * Silêncio é o defeito. Aqui ele vira falha.
 */

const CAMPOS_DE_GEOMETRIA_APOSENTADOS = [
  'days',
  'totalDays',
  'startOffset',
  'duration',
  'barLeft',
  'barWidth',
  'consolidatedBarLeft',
  'consolidatedBarWidth',
  'minStart',
  'maxEnd',
] as const;

const sprint = {
  id: 'sprint-1',
  name: 'Sprint Alfa',
  start_date: '2026-07-01',
  end_date: '2026-07-31',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- o teste só lê datas; o resto do Sprint não participa
} as any;

const entregavel = (id: string, assignedTo: string, start: string, due: string, horas: number) =>
  ({
    id,
    title: `Entregável ${id}`,
    assigned_to: assignedTo,
    start_date: start,
    due_date: due,
    status: 'pending',
    estimated_hours: horas,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- idem
  }) as any;

const entregaveis = [
  entregavel('a', 'ana', '2026-07-02', '2026-07-06', 4),
  entregavel('b', 'ana', '2026-07-10', '2026-07-12', 2),
  entregavel('c', 'bruno', '2026-07-05', '2026-07-09', 3),
];

describe('a lib da sprint não devolve geometria de Gantt', () => {
  it('buildGanttData devolve datas resolvidas, e só isso', () => {
    const dados = buildGanttData(sprint, entregaveis);
    expect(Object.keys(dados)).toEqual(['deliverables']);
    expect(dados.deliverables[0].startDate).toEqual(new Date(2026, 6, 2));
    expect(dados.deliverables[0].endDate).toEqual(new Date(2026, 6, 6));
    for (const campo of CAMPOS_DE_GEOMETRIA_APOSENTADOS) {
      expect(dados.deliverables[0]).not.toHaveProperty(campo);
      expect(dados).not.toHaveProperty(campo);
    }
  });

  it('groupGanttByPerson devolve os totais da linha, sem barra consolidada', () => {
    const pessoas = groupGanttByPerson(buildGanttData(sprint, entregaveis), sprint, (id) => id ?? '');
    expect(pessoas.map((pessoa) => pessoa.personId)).toEqual(['ana', 'bruno']);
    expect(pessoas[0]).toMatchObject({ count: 2, totalHours: 6, completedCount: 0 });
    expect(Object.keys(pessoas[0]).sort()).toEqual([
      'completedCount',
      'count',
      'deliverables',
      'personId',
      'personName',
      'totalHours',
    ]);
    for (const campo of CAMPOS_DE_GEOMETRIA_APOSENTADOS) {
      expect(pessoas[0]).not.toHaveProperty(campo);
    }
  });

  it('o início cai no começo da sprint quando o entregável não tem um próprio', () => {
    const semInicio = buildGanttData(sprint, [entregavel('d', 'ana', null as never, '2026-07-08', 1)]);
    expect(semInicio.deliverables[0].startDate).toEqual(new Date(2026, 6, 1));
  });
});
