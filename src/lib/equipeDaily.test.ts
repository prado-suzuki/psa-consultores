import { describe, expect, it } from 'vitest';
import {
  appendTaskReference,
  buildDailyBlockerFields,
  createDailyFormDraft,
  dailyTextToPlain,
  describeDailyMember,
  findCurrentActiveSprintId,
  filterDailyTasksBySearch,
  groupDailyTasksByParent,
  hydrateDailyForm,
  isDailyTextEmpty,
  parseDailyActualHours,
  toDailyRichText,
  type DailyFormDraft,
} from '@/lib/equipeDaily';
import {
  hasTarefaRichTextMarker,
  parseTarefaRichText,
  serializeTarefaRichText,
} from '@/lib/tarefaRichText';
import type { DailyStandup, Sprint } from '@/hooks/useDomainEquipeDaily';

interface TestTask {
  id: string;
  title: string;
  task_code: string | null;
  status: string;
  parent_id: string | null;
}
const tk = (id: string, over: Partial<TestTask> = {}): TestTask => ({
  id,
  title: id,
  task_code: null,
  status: 'pending',
  parent_id: null,
  ...over,
});

const draft = (overrides: Partial<DailyFormDraft> = {}): DailyFormDraft => ({
  ...createDailyFormDraft(),
  ...overrides,
});

const sp = (id: string, status: string | null, start_date: string | null): Sprint => ({
  id,
  name: id,
  project_id: null,
  status,
  start_date,
});

describe('findCurrentActiveSprintId', () => {
  it('escolhe a sprint ativa com início mais recente, independente da ordem da lista', () => {
    const sprints = [
      sp('antiga-ativa', 'active', '2026-06-01'),
      sp('futura-planejada', 'planned', '2026-09-01'),
      sp('atual-ativa', 'active', '2026-08-01'),
      sp('encerrada', 'completed', '2026-07-01'),
    ];
    expect(findCurrentActiveSprintId(sprints)).toBe('atual-ativa');
  });

  it('sem sprint ativa devolve string vazia (daily pode ficar sem sprint)', () => {
    expect(findCurrentActiveSprintId([sp('s1', 'planned', '2026-08-01'), sp('s2', null, null)])).toBe('');
    expect(findCurrentActiveSprintId([])).toBe('');
  });
});

describe('atualização rápida de tarefas', () => {
  const tasks = [
    tk('1', { title: 'Apuração de créditos', task_code: 'TR-12' }),
    tk('2', { title: 'Revisar relatório', task_code: 'TR-20' }),
  ];

  it('pesquisa por nome ou código sem diferenciar acentos e caixa', () => {
    expect(filterDailyTasksBySearch(tasks, 'apuracao').map((task) => task.id)).toEqual(['1']);
    expect(filterDailyTasksBySearch(tasks, 'tr-20').map((task) => task.id)).toEqual(['2']);
    expect(filterDailyTasksBySearch(tasks, '   ')).toEqual(tasks);
  });

  it('aceita horas válidas, inclusive zero e vírgula, e rejeita vazio ou negativo', () => {
    expect(parseDailyActualHours('0')).toBe(0);
    expect(parseDailyActualHours('2,5')).toBe(2.5);
    expect(parseDailyActualHours('')).toBeNull();
    expect(parseDailyActualHours('-1')).toBeNull();
  });
});

describe('describeDailyMember', () => {
  const members = [
    { id: 'u1', first_name: 'Ana', last_name: 'Silva' },
    { id: 'u2', first_name: 'Bruno', last_name: null },
  ];

  it('marca "(você)" no usuário autenticado e mostra só o nome nos demais', () => {
    expect(describeDailyMember(members, 'u1', 'u1')).toBe('Ana Silva (você)');
    expect(describeDailyMember(members, 'u2', 'u1')).toBe('Bruno');
  });

  it('sem perfil na lista: devolve "Você" para o autenticado e vazio para os outros', () => {
    expect(describeDailyMember(members, 'u9', 'u9')).toBe('Você');
    expect(describeDailyMember(members, 'u9', 'u1')).toBe('');
    expect(describeDailyMember(members, '', 'u1')).toBe('');
  });
});

describe('buildDailyBlockerFields', () => {
  it('sem bloqueio: limpa o texto e NÃO envia as colunas novas (compatível com base pré-migração)', () => {
    expect(buildDailyBlockerFields(draft({ has_blocker: false, blockers: 'ignorar' }))).toEqual({
      blockers: null,
    });
  });

  it('com bloqueio sem tarefa/responsável: envia só o texto do bloqueio', () => {
    expect(
      buildDailyBlockerFields(draft({ has_blocker: true, blockers: 'acesso pendente' })),
    ).toEqual({ blockers: 'acesso pendente' });
  });

  it('com tarefa e responsável: inclui as colunas novas', () => {
    expect(
      buildDailyBlockerFields(
        draft({
          has_blocker: true,
          blockers: 'acesso pendente',
          blocked_deliverable_id: 'deliv-1',
          blocker_owner: 'TI',
        }),
      ),
    ).toEqual({
      blockers: 'acesso pendente',
      blocked_deliverable_id: 'deliv-1',
      blocker_owner: 'TI',
    });
  });
});

describe('toDailyRichText', () => {
  it('mantém valor já marcado e texto plano intactos', () => {
    const marcado = serializeTarefaRichText({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'oi' }] }],
    });
    expect(toDailyRichText(marcado)).toBe(marcado);
    expect(toDailyRichText('linha 1\nlinha 2')).toBe('linha 1\nlinha 2');
    expect(toDailyRichText(null)).toBe('');
  });

  it('daily antigo em markdown vira rich text de verdade (sem asteriscos literais)', () => {
    const convertido = toDailyRichText('**Entrega** concluída\n- item um\n- item dois');
    expect(hasTarefaRichTextMarker(convertido)).toBe(true);
    const doc = parseTarefaRichText(convertido);
    expect(doc.content?.[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', marks: [{ type: 'bold' }], text: 'Entrega' },
        { type: 'text', text: ' concluída' },
      ],
    });
    expect(doc.content?.[1]?.type).toBe('bulletList');
    expect(doc.content?.[1]?.content).toHaveLength(2);
    expect(dailyTextToPlain(convertido)).toBe('Entrega concluída\nitem um\nitem dois');
  });
});

describe('isDailyTextEmpty', () => {
  it('reconhece vazio no texto plano e no documento sem texto', () => {
    expect(isDailyTextEmpty('')).toBe(true);
    expect(isDailyTextEmpty('   ')).toBe(true);
    expect(isDailyTextEmpty(serializeTarefaRichText({ type: 'doc', content: [{ type: 'paragraph' }] }))).toBe(true);
    expect(isDailyTextEmpty('Fechei a análise')).toBe(false);
  });

  it('considera a referência atômica como texto e preserva o código na leitura plana', () => {
    const value = serializeTarefaRichText({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'dailyTaskReference',
          attrs: { taskId: 'task-1', code: 'TR-12', title: 'Apuração', href: '/tarefa' },
        }],
      }],
    });
    expect(isDailyTextEmpty(value)).toBe(false);
    expect(dailyTextToPlain(value)).toBe('[TR-12]');
  });
});

describe('appendTaskReference', () => {
  const bulletTexts = (value: string) =>
    parseTarefaRichText(value)
      .content?.filter((node) => node.type === 'bulletList')
      .flatMap((list) => list.content ?? [])
      .map((item) => item.content?.[0]?.content?.[0]?.text);

  it('em texto vazio, abre a lista com o item (com código quando houver)', () => {
    const primeiro = appendTaskReference('', { id: 'd1', title: 'Conciliação', task_code: 'T-3' });
    expect(parseTarefaRichText(primeiro).content).toEqual([
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[T-3] Conciliação' }] }] },
        ],
      },
    ]);
    expect(bulletTexts(appendTaskReference('', { id: 'd2', title: 'Sem código', task_code: null }))).toEqual([
      'Sem código',
    ]);
  });

  it('acrescenta na lista que já existe no fim, sem criar outra', () => {
    const um = appendTaskReference('', { id: 'd1', title: 'Tarefa 1', task_code: 'T-1' });
    const dois = appendTaskReference(um, { id: 'd2', title: 'Tarefa 2', task_code: 'T-2' });
    expect(parseTarefaRichText(dois).content).toHaveLength(1);
    expect(bulletTexts(dois)).toEqual(['[T-1] Tarefa 1', '[T-2] Tarefa 2']);
  });

  it('preserva o texto que a pessoa já escreveu antes da lista', () => {
    const resultado = appendTaskReference('Contexto do dia', { id: 'd1', title: 'Tarefa', task_code: 'T-1' });
    const doc = parseTarefaRichText(resultado);
    expect(doc.content?.[0]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'Contexto do dia' }] });
    expect(doc.content?.[1]?.type).toBe('bulletList');
    expect(dailyTextToPlain(resultado)).toBe('Contexto do dia\n[T-1] Tarefa');
  });
});

describe('groupDailyTasksByParent', () => {
  it('agrupa filhas sob a mãe, joga concluídas pro fim e separa as avulsas', () => {
    const tasks = [
      tk('mae', { title: 'Sincronização' }),
      tk('f1', { title: 'Parte 1', parent_id: 'mae' }),
      tk('f2', { title: 'Parte 2', parent_id: 'mae', status: 'completed' }),
      tk('f3', { title: 'Parte 3', parent_id: 'mae' }),
      tk('avulsa', { title: 'Tarefa solta', task_code: '1' }),
    ];
    const groups = groupDailyTasksByParent(tasks);

    expect(groups).toHaveLength(2);
    expect(groups[0].header).toBe('Sincronização');
    expect(groups[0].tasks.map((t) => t.id)).toEqual(['f1', 'f3', 'f2']); // concluída (f2) por último
    expect(groups[1].header).toBeNull();
    expect(groups[1].tasks.map((t) => t.id)).toEqual(['avulsa']);
  });

  it('filha cuja mãe não está na lista vira avulsa (não some)', () => {
    const tasks = [tk('orfa', { title: 'Órfã', parent_id: 'ausente' })];
    expect(groupDailyTasksByParent(tasks)).toEqual([{ header: null, tasks: [tasks[0]] }]);
  });

  it('usa código + título no cabeçalho da mãe quando há código', () => {
    const tasks = [tk('mae', { title: 'Projeto X', task_code: 'P7' }), tk('f', { parent_id: 'mae' })];
    expect(groupDailyTasksByParent(tasks)[0].header).toBe('P7 Projeto X');
  });
});

describe('hydrateDailyForm — bloqueio', () => {
  const base: DailyStandup = {
    id: 's1',
    user_id: 'u1',
    date: '2026-07-21',
    did_yesterday: null,
    will_do_today: null,
    blockers: null,
    created_at: '2026-07-21T12:00:00.000Z',
    sprint_id: null,
    project_id: null,
    process_id: null,
  };

  it('sem bloqueio: has_blocker falso', () => {
    expect(hydrateDailyForm(base).has_blocker).toBe(false);
  });

  it('com texto de bloqueio OU tarefa travada: has_blocker verdadeiro e campos preenchidos', () => {
    expect(hydrateDailyForm({ ...base, blockers: 'travou' }).has_blocker).toBe(true);
    const hydrated = hydrateDailyForm({
      ...base,
      blocked_deliverable_id: 'deliv-9',
      blocker_owner: 'cliente',
    });
    expect(hydrated).toMatchObject({
      has_blocker: true,
      blocked_deliverable_id: 'deliv-9',
      blocker_owner: 'cliente',
    });
  });
});
