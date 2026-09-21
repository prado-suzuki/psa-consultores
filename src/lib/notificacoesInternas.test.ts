import { describe, expect, it } from 'vitest';

import {
  apresentacaoDoAviso,
  avisosDoAmbiente,
  ondeDoAviso,
  destinoDoAviso,
  textoDaRepeticao,
  type NotificacaoTipo,
} from '@/lib/notificacoesInternas';

const TODOS_OS_TIPOS: NotificacaoTipo[] = [
  'tarefa_atribuida',
  'tarefa_em_revisao',
  'documento_recebido',
  'solicitacao_enviada',
  'documento_aprovado',
  'documento_recusado',
  'cobranca_pendencia',
  'tarefa_prazo_proximo',
  'tarefa_atrasada',
  'tarefa_inativa',
];

describe('apresentacaoDoAviso', () => {
  it('tem rótulo e tom para todos os tipos do enum', () => {
    for (const tipo of TODOS_OS_TIPOS) {
      const { rotulo, tom } = apresentacaoDoAviso(tipo);
      expect(rotulo).toBeTruthy();
      expect(tom).toBeTruthy();
    }
  });

  it('reusa o roxo da revisão derivada, para o mesmo assunto não ter duas cores', () => {
    expect(apresentacaoDoAviso('tarefa_em_revisao').tom).toContain('purple');
  });

  it('separa âmbar de atenção e vermelho de estouro nos avisos de prazo', () => {
    // GES-01A: prazo que se aproxima ainda dá para resolver, prazo estourado não.
    // Duas cores diferentes, senão o sino não distingue urgência de aviso.
    expect(apresentacaoDoAviso('tarefa_prazo_proximo').tom).toContain('amber');
    expect(apresentacaoDoAviso('tarefa_atrasada').tom).toContain('destructive');
    // "Prazo de tarefa", e não "Prazo próximo": o mesmo tipo cobre o aviso de
    // três dias antes e o de vence hoje (docs/geral/avisos-prazo-tarefa.md).
    expect(apresentacaoDoAviso('tarefa_prazo_proximo').rotulo).toBe('Prazo de tarefa');
    expect(apresentacaoDoAviso('tarefa_atrasada').rotulo).toBe('Tarefa atrasada');
  });

  it('põe a falta de movimentação na família âmbar, porque não é estouro', () => {
    // GES-01B: falta de movimento é lembrete de atenção, não prazo vencido. O
    // vermelho fica para o atraso, que é fato consumado.
    //
    // O rótulo é "Sem movimentação", e não "Tarefa inativa", por decisão da
    // consultoria em 21/09/2026: "inativa" é interpretativo, porque a tarefa pode
    // estar legitimamente aguardando cliente ou dependência externa. A chave do
    // enum continua `tarefa_inativa`, que é dado, não texto de tela.
    expect(apresentacaoDoAviso('tarefa_inativa').tom).toContain('amber');
    expect(apresentacaoDoAviso('tarefa_inativa').rotulo).toBe('Sem movimentação');
  });

  it('distingue o projeto frio da tarefa fria pelo rótulo, não pelo tom', () => {
    // GES-01B: o gestor recebe os dois, e precisa saber de relance se o que
    // parou foi uma tarefa ou o projeto inteiro. Mesmo tom porque a natureza é a
    // mesma; rótulo diferente porque a leitura é outra.
    expect(apresentacaoDoAviso('projeto_inativo').rotulo).toBe('Projeto sem movimentação');
    expect(apresentacaoDoAviso('projeto_inativo').tom).toBe(apresentacaoDoAviso('tarefa_inativa').tom);
  });

  it('cai num rótulo genérico se o banco tiver um tipo que o types.ts ainda não conhece', () => {
    // O intervalo entre a migração e a regeneração dos tipos: melhor "Aviso" do
    // que etiqueta vazia na tela.
    expect(apresentacaoDoAviso('prazo_vencido' as NotificacaoTipo).rotulo).toBe('Aviso');
  });
});

describe('destinoDoAviso', () => {
  const base = '/equipe/tax/projetos/tarefas';

  it('monta o deep-link da tarefa a partir da entidade', () => {
    const destino = destinoDoAviso(
      { href: null, entidade_tipo: 'org_task', entidade_id: 'T1' },
      base,
      'tax',
    );
    expect(destino).toBe('/equipe/tax/projetos/tarefas?taskId=T1');
  });

  it('usa a base do sino em que a pessoa está, não uma rota fixa', () => {
    const destino = destinoDoAviso(
      { href: null, entidade_tipo: 'org_task', entidade_id: 'T1' },
      '/equipe/osg/projetos/tarefas',
      'osg',
    );
    expect(destino).toBe('/equipe/osg/projetos/tarefas?taskId=T1');
  });

  it('href gravado tem precedência sobre a derivação', () => {
    const destino = destinoDoAviso(
      { href: '/qualquer/lugar', entidade_tipo: 'org_task', entidade_id: 'T1' },
      base,
      'tax',
    );
    expect(destino).toBe('/qualquer/lugar');
  });

  it('aviso de cliente não tem destino, porque não existe tela por cliente', () => {
    const destino = destinoDoAviso(
      { href: null, entidade_tipo: 'cliente', entidade_id: 'C1' },
      base,
      'tax',
    );
    expect(destino).toBeNull();
  });

  // GES-03: o aviso de projeto reusa o endereco que o feed monta, e por isso
  // acompanha a area do sino em que a pessoa esta.
  it('aviso de projeto abre o cadastro do projeto, na area do sino', () => {
    expect(
      destinoDoAviso({ href: null, entidade_tipo: 'org_project', entidade_id: 'P1' }, base, 'tax'),
    ).toBe('/equipe/tax/projetos/cadastro?projetoId=P1');
    expect(
      destinoDoAviso(
        { href: null, entidade_tipo: 'org_project', entidade_id: 'P1' },
        '/equipe/osg/projetos/tarefas',
        'osg',
      ),
    ).toBe('/equipe/osg/projetos/cadastro?projetoId=P1');
  });
});

describe('textoDaRepeticao', () => {
  it('não diz nada quando o evento aconteceu uma vez', () => {
    expect(textoDaRepeticao(1)).toBeNull();
    expect(textoDaRepeticao(0)).toBeNull();
  });

  it('mostra a contagem quando o agrupamento acumulou', () => {
    expect(textoDaRepeticao(2)).toBe('2 movimentações');
    expect(textoDaRepeticao(63)).toBe('63 movimentações');
  });
});

describe('avisosDoAmbiente', () => {
  const aviso = (metadata: unknown) => ({ id: 'N1', metadata });

  it('mantém aviso sem ambiente nos metadados, que vale para os dois', () => {
    expect(avisosDoAmbiente([aviso({}), aviso(null)], 'prod')).toHaveLength(2);
  });

  it('descarta aviso do outro ambiente', () => {
    const avisos = [aviso({ ambiente: 'dev' }), aviso({ ambiente: 'prod' })];
    expect(avisosDoAmbiente(avisos, 'prod')).toEqual([aviso({ ambiente: 'prod' })]);
    expect(avisosDoAmbiente(avisos, 'dev')).toEqual([aviso({ ambiente: 'dev' })]);
  });

  it('ambiente desconhecido nos metadados lê como sem ambiente', () => {
    expect(avisosDoAmbiente([aviso({ ambiente: 'homolog' })], 'prod')).toHaveLength(1);
  });
});

describe('ondeDoAviso', () => {
  /* O texto do aviso é aprovado pela Patricia e diz "este planejamento". No sino
   * a linha aparece solta, então de que projeto ele fala vem dos metadados, em
   * vez de a frase dela ser reescrita. */
  it('devolve o projeto gravado no evento', () => {
    expect(ondeDoAviso({ projeto: 'Diagnóstico Societário' })).toBe('Diagnóstico Societário');
  });

  it('devolve nulo quando o evento não gravou projeto', () => {
    expect(ondeDoAviso({ ambiente: 'prod' })).toBeNull();
    expect(ondeDoAviso(null)).toBeNull();
    expect(ondeDoAviso('  ')).toBeNull();
    expect(ondeDoAviso({ projeto: '   ' })).toBeNull();
    expect(ondeDoAviso({ projeto: 42 })).toBeNull();
  });
});
