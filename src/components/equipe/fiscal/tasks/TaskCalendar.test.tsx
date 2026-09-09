import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CELULAS, FECHA_A_GRADE, TaskCalendar } from '@/components/equipe/fiscal/tasks/TaskCalendar';
import { usePeriodoDeTarefas } from '@/hooks/usePeriodoDeTarefas';
import { statusColors } from '@/lib/taskStatusColors';
import type { OrgTask } from '@/hooks/useOrgTasks';

/**
 * Agosto de 2026 começa num sábado e tem 31 dias: a primeira semana traz seis
 * dias de julho e a última, cinco de setembro. É o mês que mais expõe o buraco
 * que existia antes — o quadro só tinha os dias do próprio mês.
 */
const DENTRO_DE_AGOSTO_DE_2026 = new Date(2026, 7, 12, 9, 0, 0);

const tarefa = (over: Partial<OrgTask> = {}): OrgTask =>
  ({
    id: 'a1',
    title: 'Apurar ICMS de julho',
    description: null,
    status: 'in_progress',
    priority: 'media',
    assigned_to: null,
    assigned_to_name: 'Marina',
    reviewer_id: null,
    created_by: null,
    due_date: '2026-08-12',
    due_time: null,
    is_recurring: false,
    recurrence_type: null,
    category: 'fiscal',
    tags: [],
    estimated_hours: null,
    actual_hours: null,
    parent_task_id: null,
    start_date: null,
    project_id: null,
    client_id: null,
    contribuinte_id: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...over,
  }) as OrgTask;

const semAcoes = { onEdit: vi.fn(), onDelete: vi.fn(), onReassign: vi.fn() };

/**
 * O mês do calendário vem do painel, e o recorte por mês vem do mesmo hook. O
 * teste monta os dois juntos de propósito: separar o mês do filtro faria a seta
 * andar sem o conteúdo acompanhar, e é justamente isso que se quer travar.
 */
function CalendarioComPeriodo({ tasks = [] as OrgTask[] }) {
  const periodo = usePeriodoDeTarefas(tasks);
  return <TaskCalendar tasks={periodo.tarefas} {...semAcoes} periodo={periodo} />;
}

describe('TaskCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DENTRO_DE_AGOSTO_DE_2026);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fecha o mês em semanas inteiras', () => {
    render(<CalendarioComPeriodo />);

    const quadro = screen.getByTestId('calendario-quadro');
    expect(quadro.children).toHaveLength(CELULAS);
  });

  it('a variante que apaga a borda da última linha segue o tamanho do quadro', () => {
    // Tailwind lê classe como texto, então o número dentro do `nth-child` é
    // literal e não pode ser montado a partir de `CELULAS`. Este é o único
    // lugar que prende os dois: mudar SEMANAS_NO_QUADRO sem mudar a classe
    // deixaria uma régua sobrando na base do card.
    expect(FECHA_A_GRADE).toContain(`nth-child(n+${CELULAS - 6})`);
  });

  it('mostra os dias do mês vizinho como contexto, sem oferecer clique', () => {
    render(<CalendarioComPeriodo />);

    const deFora = screen.getAllByTestId('calendario-dia-de-fora');
    expect(deFora).toHaveLength(CELULAS - 31);
    // 27 de julho aparece na primeira linha; 1 de setembro, na última.
    expect(deFora.map(celula => celula.textContent)).toContain('27');
    deFora.forEach(celula => expect(celula.tagName).toBe('DIV'));
  });

  it('marca hoje com o primário da área, e não com um papel de status', () => {
    render(<CalendarioComPeriodo />);

    const hoje = screen.getByTestId('calendario-hoje');
    expect(hoje).toHaveTextContent('12');
    expect(hoje.className).toContain('bg-primary');
    // `success` é o papel de "concluído": pintar hoje com ele dizia que o dia
    // estava feito. Ver o comentário no componente.
    expect(hoje.className).not.toContain('success');
  });

  it('a seta anda o mês e Hoje volta — a barra é a mesma do Gantt', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CalendarioComPeriodo />);

    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await usuario.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Julho de 2026')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();
  });

  it('tarefa sem prazo fica parada na célula de hoje, marcada como tal', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CalendarioComPeriodo tasks={[tarefa({ id: 'T9', due_date: null, title: 'Definir escopo' })]} />);

    // Ela está DENTRO da célula de hoje, não solta no quadro.
    const celulaDeHoje = screen.getByTestId('calendario-hoje').closest('button');
    expect(celulaDeHoje).toHaveTextContent('Definir escopo');

    // E o chip é tracejado, porque ela não vence hoje: está hospedada em hoje.
    const chip = screen.getByText('Definir escopo');
    expect(chip.className).toContain('border-dashed');

    await usuario.hover(chip);
    expect(
      await screen.findByText('Sem prazo — parada em hoje até a data ser definida'),
    ).toBeInTheDocument();
  });

  it('andar para outro mês tira a tarefa sem prazo da tela', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CalendarioComPeriodo tasks={[tarefa({ id: 'T9', due_date: null, title: 'Definir escopo' })]} />);

    await usuario.click(screen.getByRole('button', { name: 'Próximo mês' }));

    expect(screen.queryByText('Definir escopo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('calendario-hoje')).not.toBeInTheDocument();
  });

  it('a tarefa na célula veste o papel do status, que a área resolve', () => {
    render(<CalendarioComPeriodo tasks={[tarefa()]} />);

    const chip = screen.getByText('Apurar ICMS de julho');
    expect(chip.className).toContain(statusColors.in_progress.combined.split(' ')[0]);
    expect(chip.className).not.toMatch(/bg-(blue|green|purple|orange|pink|red|gray|slate)-/);
  });
});

describe('TaskCalendar — a célula do dia cabe no celular', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(DENTRO_DE_AGOSTO_DE_2026);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const montarCalendario = () =>
    render(<CalendarioComPeriodo tasks={[tarefa({ due_date: '2026-08-10' })]} />);

  /*
    `grid-cols-7` divide o que tem por sete, sempre: em 358px úteis dá 51px por
    dia. Não cabe título de tarefa em 51px — as tiras de 10px truncavam em
    quatro letras — e os 80px de altura mínima faziam a tela ficar alta e vazia
    ao mesmo tempo.

    O agravante que decidiu o desenho: as tiras dependem de `HoverCard` para o
    título inteiro se ler, e em toque não existe hover. No celular elas eram
    quatro letras sem saída nenhuma.
  */
  it('no celular a célula é compacta, e o desktop não encolhe', () => {
    montarCalendario();

    const dia = screen.getAllByTestId('calendario-dia')[0];
    // 3rem: o mês inteiro cabe numa olhada, que é para isso que existe visão de
    // mês.
    expect(dia.className).toContain('min-h-[3rem]');
    expect(dia.className).toContain('md:min-h-[100px]');
    // O `sm:min-h-` do original tinha de sair: com ele a ordem das media
    // queries deixava o desktop em 80px e a faixa de 640-767px em 100px.
    expect(dia.className).not.toMatch(/sm:min-h-/);
  });

  it('o dia de fora do mês acompanha a altura, senão a semana fica alta', () => {
    montarCalendario();

    const deFora = screen.getAllByTestId('calendario-dia-de-fora')[0];
    // Linha de grade tem a altura da célula mais alta.
    expect(deFora.className).toContain('min-h-[3rem]');
    expect(deFora.className).not.toMatch(/sm:min-h-/);
  });

  it('tocar num dia abre a lista dele, sem estourar a zona morta do `today`', () => {
    /*
      Regressão real, achada por ela em 09/09: tocar num dia derrubava a tela
      com "Cannot access 'today' before initialization".

      A causa vinha de 3d69a7b1: `getTasksForDate` passou a ler `today` para
      hospedar tarefa sem prazo na célula de hoje, mas `const today` estava
      declarada DEPOIS de `selectedDateTasks`, que chama a função no corpo do
      componente. Sem dia selecionado o ternário não chamava nada e o defeito
      ficava latente; a fase 7 fez do toque o caminho principal no celular e ele
      apareceu na primeira tentativa.

      Nenhum teste selecionava um dia — é por isso que passou verde. Este
      seleciona.
    */
    /*
      A tarefa é SEM PRAZO de propósito, e é o detalhe que faz o teste medir
      algo. `today` só é lido no ramo do filtro que hospeda tarefa sem prazo na
      célula de hoje:

          task.due_date ? isSameDay(parseDate(task.due_date), date)
                        : isSameDay(date, today)

      Com prazo, o ternário nem chega no `today` e a zona morta não estoura —
      foi assim que a primeira versão deste teste passou verde com o defeito de
      volta. Conferido: devolvendo `const today` para depois do uso, ESTE teste
      falha com "Cannot access 'today' before initialization".
    */
    render(<CalendarioComPeriodo tasks={[tarefa({ id: 'T9', due_date: null, title: 'Definir escopo' })]} />);

    const celulaDeHoje = screen.getByTestId('calendario-hoje').closest('button');
    fireEvent.click(celulaDeHoje as HTMLElement);

    // O cabeçalho do painel só existe depois da seleção. Medir o título da
    // tarefa seria vazio: o vitest roda com `css: false`, então a tira
    // escondida do desktop (`hidden md:flex`) já renderiza o título.
    expect(screen.getByText('12 de agosto, 2026')).toBeInTheDocument();
  });

  it('as tiras de tarefa saem do celular e entra a contagem', () => {
    const comTarefa = montarCalendario();

    // A contagem diz que há trabalho no dia; o toque diz qual — e tocar no dia
    // já abria o painel com a lista inteira antes desta frente.
    const tiras = comTarefa.container.querySelector('[class*="md:flex"][class*="hidden"]');
    expect(tiras).not.toBeNull();
    expect(comTarefa.container.querySelector('[class*="md:hidden"][class*="tabular-nums"]'))
      .not.toBeNull();
  });
});
