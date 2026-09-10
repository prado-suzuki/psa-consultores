import { describe, expect, it } from 'vitest';
import {
  ESCOPO_TUDO,
  atalhosDeEscopo,
  mensagemDoVazio,
  mesDoValor,
  mesesDoAno,
  ordenarPorVencimento,
  passoDeMes,
  recorteDoValor,
  rotuloDoMes,
  rotuloDoRecorte,
  tarefasNoEscopo,
  tarefasNoPeriodo,
  tituloDoMes,
  valorDoMes,
  valorDoRecorte,
} from '@/lib/periodoDeTarefas';
import type { OrgTask } from '@/hooks/useOrgTasks';

const tarefa = (id: string, due_date: string | null, status = 'todo'): OrgTask =>
  ({ id, title: id, due_date, status }) as OrgTask;

const AGOSTO = new Date(2026, 7, 1);
const HOJE = new Date(2026, 7, 12);

describe('tituloDoMes', () => {
  it('usa o formato do Gantt, e devolve o mês em minúscula', () => {
    // A maiúscula da primeira letra é da `BarraDePeriodo`, não daqui — é ela
    // que sabe que o título dela começa frase.
    expect(tituloDoMes(AGOSTO)).toBe('agosto de 2026');
  });
});

describe('passoDeMes', () => {
  it('anda para os dois lados e vira o ano', () => {
    expect(tituloDoMes(passoDeMes(AGOSTO, 1))).toBe('setembro de 2026');
    expect(tituloDoMes(passoDeMes(new Date(2026, 0, 1), -1))).toBe('dezembro de 2025');
  });
});

describe('tarefasNoPeriodo', () => {
  it('mantém só quem vence no mês', () => {
    const tarefas = [
      tarefa('julho', '2026-07-31'),
      tarefa('agosto-1', '2026-08-01'),
      tarefa('agosto-31', '2026-08-31'),
      tarefa('setembro', '2026-09-01'),
    ];

    expect(tarefasNoPeriodo(tarefas, AGOSTO, HOJE).map(t => t.id)).toEqual([
      'agosto-1',
      'agosto-31',
    ]);
  });

  it('tarefa sem prazo aparece com hoje à vista, e só ali', () => {
    // Ela fica PARADA em hoje: cobra a correção de quem olha o mês corrente e
    // não vira ruído nos outros onze. Ver o comentário da função.
    const tarefas = [tarefa('sem-prazo', null), tarefa('setembro', '2026-09-01')];

    expect(tarefasNoPeriodo(tarefas, AGOSTO, HOJE).map(t => t.id)).toEqual(['sem-prazo']);
    expect(tarefasNoPeriodo(tarefas, new Date(2026, 8, 1), HOJE).map(t => t.id)).toEqual([
      'setembro',
    ]);
    expect(tarefasNoPeriodo(tarefas, new Date(2026, 6, 1), HOJE)).toEqual([]);
  });

  it('definir o prazo tira a tarefa de hoje e a põe no mês dela', () => {
    // O caminho de saída existe: é o que faz "parada em hoje" ser cobrança e
    // não prisão.
    const semPrazo = [tarefa('T1', null)];
    const comPrazo = [tarefa('T1', '2026-11-20')];
    const NOVEMBRO = new Date(2026, 10, 1);

    expect(tarefasNoPeriodo(semPrazo, AGOSTO, HOJE).map(t => t.id)).toEqual(['T1']);
    expect(tarefasNoPeriodo(comPrazo, AGOSTO, HOJE)).toEqual([]);
    expect(tarefasNoPeriodo(comPrazo, NOVEMBRO, HOJE).map(t => t.id)).toEqual(['T1']);
  });

  it('o mês compara ano também', () => {
    const tarefas = [tarefa('agosto-2025', '2025-08-15'), tarefa('agosto-2026', '2026-08-15')];

    expect(tarefasNoPeriodo(tarefas, AGOSTO, HOJE).map(t => t.id)).toEqual(['agosto-2026']);
  });
});

describe('atalhosDeEscopo', () => {
  it('abre em Tudo e traz as faixas de prazo, na ordem do menu', () => {
    expect(atalhosDeEscopo(HOJE)).toEqual([
      { valor: ESCOPO_TUDO, rotulo: 'Tudo' },
      { valor: 'overdue', rotulo: 'Atrasadas' },
      { valor: '2026-08', rotulo: 'Este mês' },
      { valor: 'next_30', rotulo: 'Próximos 30 dias' },
      { valor: 'no_due', rotulo: 'Sem prazo' },
    ]);
  });

  it('"Este mês" é o mês corrente, e não um escopo à parte', () => {
    // Se fosse escopo próprio, escolher o atalho e clicar em `ago` na grade
    // seriam dois estados diferentes para a mesma tela.
    const atalho = atalhosDeEscopo(HOJE).find(o => o.rotulo === 'Este mês');

    expect(atalho?.valor).toBe(valorDoMes(HOJE));
    expect(recorteDoValor(atalho!.valor, AGOSTO)).toEqual({ escopo: 'mes', mes: AGOSTO });
  });
});

describe('mesesDoAno', () => {
  it('doze meses abreviados, com o ano no valor e fora do rótulo', () => {
    // O ano vive no cabeçalho da grade: repetir "2026" doze vezes é o que
    // fazia a lista antiga precisar de rolagem.
    const meses = mesesDoAno(2026);

    expect(meses).toHaveLength(12);
    expect(meses[0]).toEqual({ valor: '2026-01', rotulo: 'jan' });
    expect(meses[11]).toEqual({ valor: '2026-12', rotulo: 'dez' });
  });
});

describe('valorDoRecorte, rotuloDoRecorte e mensagemDoVazio', () => {
  it('o mês marca a grade e escreve o título por extenso', () => {
    const recorte = { escopo: 'mes' as const, mes: AGOSTO };

    expect(valorDoRecorte(recorte)).toBe('2026-08');
    expect(rotuloDoRecorte(recorte)).toBe('Agosto de 2026');
    expect(mensagemDoVazio(recorte)).toBe('Nada com prazo em agosto de 2026');
    expect(rotuloDoMes(AGOSTO)).toBe('Agosto de 2026');
  });

  it('a faixa de prazo marca o atalho e diz o próprio vazio', () => {
    const recorte = { escopo: 'overdue' as const, mes: AGOSTO };

    expect(valorDoRecorte(recorte)).toBe('overdue');
    expect(rotuloDoRecorte(recorte)).toBe('Atrasadas');
    expect(mensagemDoVazio(recorte)).toBe('Nenhuma tarefa atrasada');
  });

  it('em Tudo não há recorte a culpar pelo vazio', () => {
    const recorte = { escopo: ESCOPO_TUDO as 'tudo', mes: AGOSTO };

    expect(rotuloDoRecorte(recorte)).toBe('Tudo');
    expect(mensagemDoVazio(recorte)).toBeNull();
  });
});

describe('tarefasNoEscopo', () => {
  const tarefas = [
    tarefa('atrasada', '2026-08-01'),
    tarefa('atrasada-concluida', '2026-08-02', 'done'),
    tarefa('daqui-uma-semana', '2026-08-19'),
    tarefa('daqui-dois-meses', '2026-10-19'),
    tarefa('sem-prazo', null),
  ];
  const ids = (escopo: 'tudo' | 'mes' | 'overdue' | 'next_30' | 'no_due') =>
    tarefasNoEscopo(tarefas, { escopo, mes: AGOSTO }, HOJE).map(t => t.id);

  it('tudo não recorta nada', () => {
    expect(ids('tudo')).toHaveLength(tarefas.length);
  });

  it('as faixas de prazo são as do dashboard de área, sem conta nova', () => {
    // Atrasada exclui a concluída — é a regra do `matchesUrgency`, e o teste
    // está aqui para a divergência entre as duas telas aparecer.
    expect(ids('overdue')).toEqual(['atrasada']);
    expect(ids('next_30')).toEqual(['daqui-uma-semana']);
    expect(ids('no_due')).toEqual(['sem-prazo']);
  });

  it('o mês continua sendo o mês, com a tarefa sem prazo parada em hoje', () => {
    expect(ids('mes')).toEqual([
      'atrasada',
      'atrasada-concluida',
      'daqui-uma-semana',
      'sem-prazo',
    ]);
  });
});

describe('valorDoMes e mesDoValor', () => {
  it('vão e voltam', () => {
    expect(valorDoMes(AGOSTO)).toBe('2026-08');
    expect(mesDoValor('2026-08')).toEqual(AGOSTO);
  });

  it('valor que não é mês devolve nulo, e o hook lê isso como Tudo', () => {
    expect(mesDoValor(ESCOPO_TUDO)).toBeNull();
    expect(mesDoValor('2026-13')).toBeNull();
  });
});

describe('ordenarPorVencimento', () => {
  it('da mais próxima para a mais distante', () => {
    const tarefas = [
      tarefa('sexta', '2026-08-14'),
      tarefa('segunda', '2026-08-10'),
      tarefa('quarta', '2026-08-12'),
    ];

    expect(ordenarPorVencimento(tarefas).map(t => t.id)).toEqual([
      'segunda',
      'quarta',
      'sexta',
    ]);
  });

  it('atravessa a virada do ano na ordem certa', () => {
    const tarefas = [tarefa('janeiro', '2027-01-05'), tarefa('dezembro', '2026-12-28')];

    expect(ordenarPorVencimento(tarefas).map(t => t.id)).toEqual(['dezembro', 'janeiro']);
  });

  it('sem prazo vai para o fim', () => {
    const tarefas = [tarefa('sem-prazo', null), tarefa('agosto', '2026-08-10')];

    expect(ordenarPorVencimento(tarefas).map(t => t.id)).toEqual(['agosto', 'sem-prazo']);
  });

  it('empate mantém a ordem de entrada', () => {
    const tarefas = [
      tarefa('primeira', '2026-08-10'),
      tarefa('segunda', '2026-08-10'),
      tarefa('terceira', '2026-08-10'),
    ];

    expect(ordenarPorVencimento(tarefas).map(t => t.id)).toEqual([
      'primeira',
      'segunda',
      'terceira',
    ]);
  });

  it('não mexe no array recebido', () => {
    const tarefas = [tarefa('sexta', '2026-08-14'), tarefa('segunda', '2026-08-10')];
    ordenarPorVencimento(tarefas);

    expect(tarefas.map(t => t.id)).toEqual(['sexta', 'segunda']);
  });
});
