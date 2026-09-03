import { describe, expect, it } from 'vitest';

import { entregavelStatusColors } from '@/lib/entregavelStatusColors';
import { mapeamentoStatusColors } from '@/lib/mapeamentoStatusColors';
import { medirCorCrua } from '@/lib/medirCorCrua';
import { statusColors as taskStatusColors } from '@/lib/taskStatusColors';

/**
 * A palavra do status, quando ela é a MESMA chave em domínios diferentes.
 *
 * Decisão dela em 03/09/2026: uma forma só, masculina — `in_progress` é "Em
 * Andamento", `completed` é "Concluído", `cancelled` é "Cancelado". Antes disso a
 * mesma chave tinha duas palavras: `taskStatusColors` e `entregavelStatusColors`
 * diziam "Em Progresso", enquanto `mapeamentoStatusColors`, `chamadoStatusColors` e
 * o `auditFieldFormatter` diziam "Em Andamento" — e o `auditFieldFormatter`, que
 * formata os quatro domínios de uma vez, dizia "Concluída"/"Cancelada".
 *
 * ⚠️ **O QUE ESTA CATRACA NÃO PERSEGUE**, e não é esquecimento:
 *
 * - **prosa**, onde o gênero concorda com o substantivo da frase: "tarefas
 *   concluídas", "Entregas Concluídas", "Concluída e cancelada ficam de fora".
 *   Isso é gramática, não rótulo, e mexer piora o português;
 * - **domínio com vocabulário feminino inteiro e coerente**, que não tem par para
 *   resolver: sprint (`Ativa`/`Concluída`/`Planejada`), melhoria
 *   (`Concluída`/`Cancelada`), meta (`ativa`/`pausada`/`concluida`/`cancelada`) e
 *   situação de OS (`concluida`/`cancelada`, que é o valor gravado no banco).
 *   Uniformizar só o `completed` desses deixaria "Ativa / Concluído / Planejada",
 *   que é pior que os dois lados. Se um dia forem para o masculino, vão INTEIROS,
 *   e é outra decisão;
 * - **comentário que conta a história** da divergência. Vários arquivos citam "Em
 *   Progresso" para explicar por que aquela cópia era errada; reescrever apaga o
 *   motivo, e o motivo é o que impede a volta.
 *
 * Por isso a varredura é pelo LITERAL EM JSX, não pela palavra no arquivo: só pega
 * a forma que chega na tela como rótulo.
 */
const RE_ROTULO_JSX = />\s*(Em Progresso)\s*</g;

describe('rótulo de status', () => {
  it('nenhuma tela escreve "Em Progresso" como rótulo em JSX', () => {
    expect(
      medirCorCrua(RE_ROTULO_JSX),
      'Voltou "Em Progresso" como rótulo de tela.\n'
        + 'A forma canônica é "Em Andamento" (decisão de 03/09/2026), e ela sai do mapa\n'
        + 'do domínio, não de literal:\n'
        + '  tarefa      -> statusColors.in_progress.label       (@/lib/taskStatusColors)\n'
        + '  entregável  -> entregavelStatusColors.in_progress.label\n'
        + '  opções de Select -> ENTREGAVEL_STATUS_OPCOES / statusList\n'
        + 'Comentário que cita "Em Progresso" para contar a história não cai aqui —\n'
        + 'esta regra só olha texto entre > e < de JSX.',
    ).toEqual({});
  });

  it('a mesma chave tem a mesma palavra nos mapas que a compartilham', () => {
    expect(taskStatusColors.in_progress.label).toBe('Em Andamento');
    expect(entregavelStatusColors.in_progress.label).toBe('Em Andamento');
    expect(mapeamentoStatusColors.in_progress.label).toBe('Em Andamento');
  });

  it('`completed`/`done` é "Concluído" nos três mapas', () => {
    expect(taskStatusColors.done.label).toBe('Concluído');
    expect(entregavelStatusColors.completed.label).toBe('Concluído');
    expect(mapeamentoStatusColors.completed.label).toBe('Concluído');
  });
});
