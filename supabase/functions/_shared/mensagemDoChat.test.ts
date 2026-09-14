import { describe, it, expect } from 'vitest';
import { montarMensagens, dataCurta, type AvisoDoChat } from './mensagemDoChat';

const BASE = 'https://psa-consultores.lovable.app';
const DIA = '2026-09-14';

function aviso(over: Partial<AvisoDoChat> = {}): AvisoDoChat {
  return {
    area_nome: 'Tax',
    tipo: 'tarefa_prazo_proximo',
    entidade_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    task_title: 'Levantar a estrutura societária',
    due_date: '2026-09-17',
    project_id: 'pppppppp-0000-0000-0000-000000000001',
    project_name: 'Diagnóstico Societário',
    dono_nome: 'Anne Strini',
    chave: 'chat:Tax:tarefa_prazo_proximo:aaaaaaaa-0000-0000-0000-000000000001:2026-09-14',
    ...over,
  };
}

describe('montarMensagens', () => {
  it('junta os avisos de prazo da mesma área numa mensagem só', () => {
    const msgs = montarMensagens(
      [
        aviso({ entidade_id: 't1', chave: 'k1' }),
        aviso({ entidade_id: 't2', chave: 'k2', task_title: 'Conferir certidões' }),
        aviso({ entidade_id: 't3', chave: 'k3', task_title: 'Montar organograma' }),
      ],
      BASE,
      DIA,
    );

    expect(msgs).toHaveLength(1);
    expect(msgs[0].texto).toContain('*Prazo de tarefa* — 3 tarefas');
    expect(msgs[0].texto.split('\n')).toHaveLength(4);
  });

  it('reserva uma chave POR TAREFA mesmo quando a mensagem é uma só', () => {
    // É o que permite marcar exatamente quais tarefas não saíram quando o POST
    // falha, e o que impede a mesma tarefa de ser publicada duas vezes.
    const msgs = montarMensagens(
      [aviso({ chave: 'k1' }), aviso({ entidade_id: 't2', chave: 'k2' })],
      BASE,
      DIA,
    );

    expect(msgs[0].chaves).toEqual(['k1', 'k2']);
  });

  it('não mistura áreas na mesma mensagem, nem que o tipo seja o mesmo', () => {
    const msgs = montarMensagens(
      [aviso({ area_nome: 'Tax', chave: 'k1' }), aviso({ area_nome: 'OSG', chave: 'k2' })],
      BASE,
      DIA,
    );

    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.area).sort()).toEqual(['OSG', 'Tax']);
  });

  it('separa prazo de atraso, porque o texto do prazo difere', () => {
    const msgs = montarMensagens(
      [
        aviso({ tipo: 'tarefa_prazo_proximo', chave: 'k1' }),
        aviso({ tipo: 'tarefa_atrasada', chave: 'k2', due_date: '2026-09-13' }),
      ],
      BASE,
      DIA,
    );

    expect(msgs).toHaveLength(2);
    expect(msgs.find((m) => m.texto.includes('Prazo de tarefa'))!.texto).toContain('vence 17/09');
    expect(msgs.find((m) => m.texto.includes('Tarefa atrasada'))!.texto).toContain('venceu 13/09');
  });

  it('manda tarefa atribuída avulsa, na thread do projeto', () => {
    const msgs = montarMensagens(
      [
        aviso({ tipo: 'tarefa_atribuida', chave: 'k1' }),
        aviso({ tipo: 'tarefa_atribuida', chave: 'k2', entidade_id: 't2' }),
      ],
      BASE,
      DIA,
    );

    expect(msgs).toHaveLength(2);
    expect(msgs[0].threadKey).toBe('projeto:pppppppp-0000-0000-0000-000000000001');
    expect(msgs[0].texto).toContain('*Tarefa atribuída* — Anne Strini');
  });

  it('põe o resumo numa thread do DIA, e não na de um projeto', () => {
    // O resumo atravessa projetos: numa thread de projeto ele mentiria sobre o
    // assunto da conversa. E o dia no fim evita empilhar o de amanhã no de hoje.
    const msgs = montarMensagens([aviso()], BASE, DIA);

    expect(msgs[0].threadKey).toBe('Tax:tarefa_prazo_proximo:2026-09-14');
  });

  it('monta o link com a rota da área e o deep-link da tarefa', () => {
    const msgs = montarMensagens([aviso({ area_nome: 'OSG', entidade_id: 'abc' })], BASE, DIA);

    expect(msgs[0].texto).toContain(`<${BASE}/equipe/osg/projetos/tarefas?taskId=abc|`);
  });

  it('área sem rota conhecida perde o link, não a mensagem', () => {
    const msgs = montarMensagens([aviso({ area_nome: 'Marketing' })], BASE, DIA);

    expect(msgs[0].texto).not.toContain('<');
    expect(msgs[0].texto).toContain('Levantar a estrutura societária');
  });

  it('neutraliza os ângulos do título, que comeriam o resto da linha', () => {
    const msgs = montarMensagens(
      [aviso({ task_title: 'Revisar <contrato> do cliente' })],
      BASE,
      DIA,
    );

    // O título entra inteiro, e o único < da linha continua sendo o do link.
    expect(msgs[0].texto).toContain('Revisar \u2039contrato\u203a do cliente');
    expect(msgs[0].texto.split('<')).toHaveLength(2);
  });

  it('aguenta aviso sem dono, sem projeto e sem prazo', () => {
    const msgs = montarMensagens(
      [aviso({ tipo: 'tarefa_em_revisao', dono_nome: null, project_name: null, due_date: null })],
      BASE,
      DIA,
    );

    expect(msgs[0].texto).toContain('*Revisão pendente*');
    expect(msgs[0].texto).not.toContain('undefined');
    expect(msgs[0].texto).not.toContain('null');
  });

  it('devolve lista vazia quando não há aviso', () => {
    expect(montarMensagens([], BASE, DIA)).toEqual([]);
  });
});

describe('dataCurta', () => {
  it('não desloca o dia, porque `due_date` é data e não instante', () => {
    // Com `new Date('2026-01-01')` e fuso de Cuiabá (UTC-4) isto viraria 31/12.
    expect(dataCurta('2026-01-01')).toBe('01/01');
    expect(dataCurta('2026-09-17')).toBe('17/09');
  });

  it('devolve nulo sem data', () => {
    expect(dataCurta(null)).toBeNull();
  });
});
