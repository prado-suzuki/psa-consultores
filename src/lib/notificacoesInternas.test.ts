import { describe, expect, it } from 'vitest';

import {
  apresentacaoDoAviso,
  avisosDoAmbiente,
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
    // "Prazo de tarefa" cobre os dois avisos que vêm antes do vencimento — três
    // dias antes e vence hoje —, e é por isso que não se chama "Prazo próximo".
    // Patricia, 02/09/2026, em docs/geral/avisos-prazo-tarefa.md.
    expect(apresentacaoDoAviso('tarefa_prazo_proximo').rotulo).toBe('Prazo de tarefa');
    expect(apresentacaoDoAviso('tarefa_atrasada').rotulo).toBe('Tarefa atrasada');
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
