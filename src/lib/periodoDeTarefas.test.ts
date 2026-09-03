import { describe, expect, it } from 'vitest';
import {
  ESCOPO_TUDO,
  mesDoValor,
  opcoesDeEscopo,
  ordenarPorVencimento,
  passoDeMes,
  tarefasNoPeriodo,
  tituloDoMes,
  valorDoMes,
} from '@/lib/periodoDeTarefas';
import type { OrgTask } from '@/hooks/useOrgTasks';

const tarefa = (id: string, due_date: string | null): OrgTask =>
  ({ id, title: id, due_date, status: 'todo' }) as OrgTask;

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

describe('opcoesDeEscopo', () => {
  it('abre em Tudo e oferece meia dúzia de meses para cada lado de hoje', () => {
    const opcoes = opcoesDeEscopo(HOJE, AGOSTO);

    expect(opcoes[0]).toEqual({ valor: ESCOPO_TUDO, rotulo: 'Tudo' });
    // 13 meses: fevereiro de 2026 até fevereiro de 2027.
    expect(opcoes).toHaveLength(14);
    expect(opcoes[1].valor).toBe('2026-02');
    expect(opcoes[opcoes.length - 1].valor).toBe('2027-02');
  });

  it('inclui o mês âncora quando a seta já o levou fora da janela', () => {
    // O menu abriria em branco se o valor selecionado não estivesse na lista.
    const LONGE = new Date(2028, 4, 1);
    const opcoes = opcoesDeEscopo(HOJE, LONGE);

    expect(opcoes.map(o => o.valor)).toContain('2028-05');
    // E a lista segue em ordem: o mês de fora entra no lugar dele, não no fim.
    const meses = opcoes.slice(1).map(o => o.valor);
    expect(meses).toEqual([...meses].sort());
  });

  it('o rótulo já vem como o menu mostra: o mesmo título, começando frase', () => {
    const agosto = opcoesDeEscopo(HOJE, AGOSTO).find(o => o.valor === '2026-08');

    expect(agosto?.rotulo).toBe('Agosto de 2026');
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
