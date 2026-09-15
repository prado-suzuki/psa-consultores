import { describe, it, expect } from 'vitest';
import {
  montarMensagens,
  separarPorEspaco,
  frasePrazo,
  dataCurta,
  type AvisoDoChat,
} from './mensagemDoChat';

const BASE = 'https://psa-consultores.lovable.app';
const HOJE = '2026-09-14';

/**
 * Cada aviso nasce com tarefa PRÓPRIA, salvo quando o teste diz o contrário.
 *
 * Um `entidade_id` fixo no molde fazia todos os avisos de um teste serem a mesma
 * tarefa sem que o teste dissesse isso — e, com a dedup por tarefa, os casos
 * passavam a medir outra coisa.
 */
let proximaTarefa = 0;

function aviso(over: Partial<AvisoDoChat> = {}): AvisoDoChat {
  proximaTarefa += 1;
  return {
    area_nome: 'OSG',
    tipo: 'tarefa_prazo_proximo',
    entidade_id: `tarefa-${proximaTarefa}`,
    task_title: '1.2 Ata AGE 29/09/2026 - Aprovação Comissão',
    due_date: '2026-09-14',
    project_id: 'pppppppp-0000-0000-0000-000000000001',
    project_name: 'Estruturação Societária',
    cliente_nome: 'Bragança Agropecuária Ltda',
    dono_nome: 'Anne Strini',
    chave: 'chat:OSG:tarefa_prazo_proximo:aaaaaaaa-0000-0000-0000-000000000001:2026-09-14',
    ...over,
  };
}

describe('montarMensagens · resumo de prazo', () => {
  it('agrupa por pessoa, com o nome como cabeçalho', () => {
    const msgs = montarMensagens(
      [
        aviso({ dono_nome: 'Anne Strini', chave: 'k1' }),
        aviso({ dono_nome: 'Anne Strini', chave: 'k2', task_title: 'Plano de contas' }),
        aviso({ dono_nome: 'Karlene Gallo', chave: 'k3', task_title: '2ª Alteração' }),
      ],
      BASE,
      HOJE,
    );

    expect(msgs).toHaveLength(1);
    const linhas = msgs[0].texto.split('\n').filter(Boolean);
    expect(linhas[0]).toBe('*Prazos · OSG* — 3 tarefas');
    expect(linhas[1]).toBe('*Anne Strini*');
    expect(linhas[4]).toBe('*Karlene Gallo*');
  });

  it('põe vencidas e a vencer na MESMA mensagem, porque a pessoa é a mesma', () => {
    // O agrupamento é por quem está com a bola, não por marco: quem lê o espaço
    // pergunta "de quem é", não "o que vence hoje".
    const msgs = montarMensagens(
      [
        aviso({ tipo: 'tarefa_atrasada', due_date: '2026-09-08', chave: 'k1' }),
        aviso({ tipo: 'tarefa_prazo_proximo', due_date: '2026-09-17', chave: 'k2' }),
      ],
      BASE,
      HOJE,
    );

    expect(msgs).toHaveLength(1);
    expect(msgs[0].texto).toContain('atrasada desde 08/09');
    expect(msgs[0].texto).toContain('vence em 3 dias (17/09)');
  });

  it('escreve UMA linha por tarefa, mesmo quando ela tem dois avisos de prazo', () => {
    // A mesma tarefa pode ter `tarefa_prazo_proximo` e `tarefa_atrasada` no mesmo
    // dia. Antes cada tipo ia para uma mensagem e ninguém via; na mesma lista, a
    // tarefa aparecia duas vezes seguidas — visto com dados reais em 14/09/2026.
    const msgs = montarMensagens(
      [
        aviso({ tipo: 'tarefa_prazo_proximo', entidade_id: 't1', chave: 'k-prazo' }),
        aviso({ tipo: 'tarefa_atrasada', entidade_id: 't1', chave: 'k-atraso' }),
      ],
      BASE,
      HOJE,
    );

    const linhas = msgs[0].texto.split('\n').filter((l) => l.startsWith('•'));
    expect(linhas).toHaveLength(1);
  });

  it('reserva as DUAS chaves da tarefa que virou uma linha só', () => {
    // Reservar só a da linha deixaria a outra viva para ser oferecida amanhã.
    const msgs = montarMensagens(
      [
        aviso({ tipo: 'tarefa_prazo_proximo', entidade_id: 't1', chave: 'k-prazo' }),
        aviso({ tipo: 'tarefa_atrasada', entidade_id: 't1', chave: 'k-atraso' }),
      ],
      BASE,
      HOJE,
    );

    expect(msgs[0].chaves).toEqual(['k-prazo', 'k-atraso']);
  });

  it('carrega prazo, projeto e cliente em cada linha', () => {
    const msgs = montarMensagens([aviso()], BASE, HOJE);

    expect(msgs[0].texto).toContain(
      '— vence hoje (14/09) · Estruturação Societária · Bragança Agropecuária Ltda',
    );
  });

  it('reserva uma chave POR TAREFA mesmo com a mensagem sendo uma só', () => {
    // É o que permite marcar exatamente quais tarefas não saíram quando o POST
    // falha, e o que impede a mesma tarefa de ser publicada duas vezes.
    const msgs = montarMensagens([aviso({ chave: 'k1' }), aviso({ chave: 'k2' })], BASE, HOJE);

    expect(msgs[0].chaves).toEqual(['k1', 'k2']);
  });

  it('não mistura áreas na mesma mensagem', () => {
    const msgs = montarMensagens(
      [aviso({ area_nome: 'Tax', chave: 'k1' }), aviso({ area_nome: 'OSG', chave: 'k2' })],
      BASE,
      HOJE,
    );

    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.area).sort()).toEqual(['OSG', 'Tax']);
  });

  it('põe o resumo numa thread do DIA, e não na de um projeto', () => {
    // O resumo atravessa projetos e pessoas: numa thread de projeto ele mentiria
    // sobre o assunto. O dia no fim evita empilhar o de amanhã no de hoje.
    const msgs = montarMensagens([aviso()], BASE, HOJE);

    expect(msgs[0].threadKey).toBe('prazos:OSG:2026-09-14');
  });

  it('junta sob um cabeçalho próprio as tarefas sem responsável', () => {
    const msgs = montarMensagens([aviso({ dono_nome: null })], BASE, HOJE);

    expect(msgs[0].texto).toContain('*Sem responsável*');
  });
});

describe('montarMensagens · avisos avulsos', () => {
  it('manda tarefa atribuída avulsa, na thread do projeto', () => {
    const msgs = montarMensagens(
      [
        aviso({ tipo: 'tarefa_atribuida', chave: 'k1' }),
        aviso({ tipo: 'tarefa_atribuida', chave: 'k2', entidade_id: 't2' }),
      ],
      BASE,
      HOJE,
    );

    expect(msgs).toHaveLength(2);
    expect(msgs[0].threadKey).toBe('projeto:pppppppp-0000-0000-0000-000000000001');
    expect(msgs[0].texto).toContain('*Tarefa atribuída* · Anne Strini');
  });

  it('não diz "você" no espaço, onde todo mundo lê', () => {
    // O sino grava "Você é o responsável: <tarefa>", que fala com uma pessoa só.
    const msgs = montarMensagens([aviso({ tipo: 'tarefa_atribuida' })], BASE, HOJE);

    expect(msgs[0].texto.toLowerCase()).not.toContain('você');
  });

  it('usa o rótulo do sino na revisão', () => {
    const msgs = montarMensagens([aviso({ tipo: 'tarefa_em_revisao' })], BASE, HOJE);

    expect(msgs[0].texto).toContain('*Revisão pendente* · Anne Strini');
  });
});

describe('montarMensagens · link e texto livre', () => {
  it('monta o link com a rota da área e o deep-link da tarefa', () => {
    const msgs = montarMensagens([aviso({ area_nome: 'Tax', entidade_id: 'abc' })], BASE, HOJE);

    expect(msgs[0].texto).toContain(`<${BASE}/equipe/tax/projetos/tarefas?taskId=abc|`);
  });

  it('área sem rota conhecida perde o link, não a mensagem', () => {
    const msgs = montarMensagens([aviso({ area_nome: 'Marketing' })], BASE, HOJE);

    expect(msgs[0].texto).not.toContain('<');
    expect(msgs[0].texto).toContain('1.2 Ata AGE');
  });

  it('neutraliza os ângulos do título, que comeriam o resto da linha', () => {
    const msgs = montarMensagens([aviso({ task_title: 'Revisar <contrato>' })], BASE, HOJE);

    expect(msgs[0].texto).toContain('Revisar ‹contrato›');
    expect(msgs[0].texto.split('<')).toHaveLength(2);
  });

  it('aguenta aviso sem projeto, sem cliente e sem prazo', () => {
    const msgs = montarMensagens(
      [aviso({ project_name: null, cliente_nome: null, due_date: null })],
      BASE,
      HOJE,
    );

    expect(msgs[0].texto).not.toContain('undefined');
    expect(msgs[0].texto).not.toContain('null');
    // A linha da tarefa fica só com o título: sem travessão solto no fim, que é
    // como um campo ausente aparece quando ninguém trata.
    const linhaDaTarefa = msgs[0].texto.split('\n').find((l) => l.startsWith('•'))!;
    expect(linhaDaTarefa).not.toContain('—');
  });

  it('devolve lista vazia quando não há aviso', () => {
    expect(montarMensagens([], BASE, HOJE)).toEqual([]);
  });
});

describe('frasePrazo', () => {
  it('sai da DATA e não do tipo do aviso', () => {
    // `tarefa_prazo_proximo` cobre dois marcos (faltam 3 dias e vence hoje), então
    // o tipo não basta para escrever a frase.
    expect(frasePrazo('2026-09-14', HOJE)).toBe('vence hoje (14/09)');
    expect(frasePrazo('2026-09-15', HOJE)).toBe('vence amanhã (15/09)');
    expect(frasePrazo('2026-09-17', HOJE)).toBe('vence em 3 dias (17/09)');
    expect(frasePrazo('2026-09-08', HOJE)).toBe('atrasada desde 08/09');
  });

  it('conta os dias sem deslocar pelo fuso na virada do ano', () => {
    // Com `new Date(iso)` num fuso a oeste, 01/01 vira 31/12 e a conta anda um dia.
    expect(frasePrazo('2027-01-01', '2026-12-31')).toBe('vence amanhã (01/01)');
  });

  it('devolve nulo sem prazo', () => {
    expect(frasePrazo(null, HOJE)).toBeNull();
  });
});

describe('separarPorEspaco', () => {
  const soOsg = (area: string) => area === 'OSG';

  it('deixa passar só a área que tem espaço configurado', () => {
    const { comEspaco, semEspaco } = separarPorEspaco(
      [
        aviso({ area_nome: 'OSG', chave: 'k1' }),
        aviso({ area_nome: 'Tax', chave: 'k2' }),
        aviso({ area_nome: 'Tax', chave: 'k3' }),
      ],
      soOsg,
    );

    expect(comEspaco.map((a) => a.chave)).toEqual(['k1']);
    expect(semEspaco).toEqual({ Tax: 2 });
  });

  it('conta por área o que ficou de fora, em vez de só descartar', () => {
    // O número é o que diz, na resposta da borda, que existe área esperando
    // espaço — sem ele, "não saiu nada" e "não havia nada" ficam iguais.
    const { semEspaco } = separarPorEspaco(
      [aviso({ area_nome: 'Tax' }), aviso({ area_nome: 'Marketing' })],
      () => false,
    );

    expect(semEspaco).toEqual({ Tax: 1, Marketing: 1 });
  });

  it('não devolve nada para reservar quando nenhuma área tem espaço', () => {
    // Se estes avisos fossem reservados, a chave do dia ficaria gravada e a tarefa
    // não sairia nem depois que o espaço da área fosse criado.
    const { comEspaco } = separarPorEspaco([aviso(), aviso()], () => false);

    expect(comEspaco).toEqual([]);
  });
});

describe('dataCurta', () => {
  it('não desloca o dia, porque `due_date` é data e não instante', () => {
    expect(dataCurta('2026-01-01')).toBe('01/01');
    expect(dataCurta('2026-09-17')).toBe('17/09');
  });

  it('devolve nulo sem data', () => {
    expect(dataCurta(null)).toBeNull();
  });
});
