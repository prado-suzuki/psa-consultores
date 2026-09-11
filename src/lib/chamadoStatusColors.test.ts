import { describe, expect, it } from 'vitest';

import {
  CHAMADO_ATIVIDADE_OPCOES,
  CHAMADO_PRIORIDADE_OPCOES,
  CHAMADO_STATUS_OPCOES,
  chamadoPrioridadeConfig,
  chamadoStatusConfig,
} from '@/lib/chamadoStatusColors';
import { medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do rótulo de chamado. **Ela nasce VAZIA**, e é esse o ponto.
 *
 * Em 03/09/2026 o mesmo `statusLabels` estava copiado em seis arquivos e o
 * `priorityLabels` em quatro, todos com os mesmos textos — até um deles não ter.
 * A cópia do portal do cliente não tinha a chave `media`, que existe no banco, e
 * a pílula de prioridade saía **vazia** na tela do cliente. Ninguém percebeu
 * porque cada cópia, isolada, parecia certa.
 *
 * A proteção não podia ser pelo nome das chaves: `em_analise`, `aberto` e
 * `em_andamento` também são vocabulário do checklist de documentos, dos ciclos de
 * desempenho e das reuniões 1a1, que são outros domínios e têm rótulo próprio. O
 * que é exclusivo do chamado é o CONJUNTO — um objeto que mapeia `aberto` e
 * `fechado` para texto no mesmo literal só pode ser o ciclo de vida do chamado.
 *
 * Reaproveita o varredor de `medirCorCrua`, que conta ocorrência por arquivo nas
 * pastas de tela. O nome dele fala de cor; a mecânica é genérica, e `src/lib`
 * fica fora da varredura — que é justamente onde o mapa legítimo mora.
 */
const RE_MAPA_DE_STATUS = /\{[^{}]*\baberto:\s*'[^']*'[^{}]*\bfechado:\s*'/gs;
const RE_MAPA_DE_PRIORIDADE = /\{[^{}]*\bbaixa:\s*'[^']*'[^{}]*\burgente:\s*'/gs;

const RECADO = 'Voltou mapa de rótulo de chamado escrito à mão numa tela.\n'
  + 'O rótulo sai do campo `label` da config de @/lib/chamadoStatusColors, que é a\n'
  + 'MESMA que dá a classe de cor — é assim que os dois não divergem:\n'
  + '  texto de um chamado   -> chamadoStatusConfig(status).label\n'
  + '  texto de prioridade   -> chamadoPrioridadeConfig(prioridade).label\n'
  + '  opções de um Select   -> CHAMADO_STATUS_OPCOES / CHAMADO_PRIORIDADE_OPCOES\n'
  + 'A config já devolve o valor cru como rótulo quando a chave é desconhecida, então\n'
  + 'nenhuma tela precisa do `|| ticket.status` que as cópias carregavam.';

describe('rótulo de chamado', () => {
  it('nenhuma tela declara mapa próprio de status ou de prioridade', () => {
    expect(medirCorCrua(RE_MAPA_DE_STATUS), RECADO).toEqual({});
    expect(medirCorCrua(RE_MAPA_DE_PRIORIDADE), RECADO).toEqual({});
  });

  it('chave desconhecida vira o próprio valor, e não pílula vazia', () => {
    expect(chamadoStatusConfig('status_que_nao_existe').label).toBe('status_que_nao_existe');
    expect(chamadoStatusConfig(null).label).toBe('Sem status');
  });

  it('`media` tem rótulo — é a chave que saía vazia no portal do cliente', () => {
    expect(chamadoPrioridadeConfig('media').label).toBe('Média');
    expect(chamadoPrioridadeConfig('normal').label).toBe('Normal');
  });

  it('`media` NÃO é oferecida em Select, para não gravar chave duplicada', () => {
    // `normal` e `media` são o mesmo conceito com dois nomes no banco. Ler as duas
    // é obrigatório; oferecer as duas seria continuar criando o problema.
    expect(CHAMADO_PRIORIDADE_OPCOES.map(p => p.key)).toEqual(['baixa', 'normal', 'alta', 'urgente']);
  });

  it('as opções vêm na ordem do ciclo de vida, não na de declaração', () => {
    expect(CHAMADO_STATUS_OPCOES.map(s => s.key)).toEqual(['aberto', 'em_andamento', 'resolvido', 'fechado']);
    expect(CHAMADO_ATIVIDADE_OPCOES.map(a => a.key)).toEqual(['aguardando_resposta', 'respondido', 'em_analise']);
  });

  it('toda opção tem rótulo e classe — nenhuma chave errada virou `undefined`', () => {
    for (const opcao of [...CHAMADO_STATUS_OPCOES, ...CHAMADO_PRIORIDADE_OPCOES, ...CHAMADO_ATIVIDADE_OPCOES]) {
      expect(opcao?.label, `opção sem config: ${JSON.stringify(opcao)}`).toBeTruthy();
      expect(opcao?.badge).toMatch(/^bg-status-/);
    }
  });
});
