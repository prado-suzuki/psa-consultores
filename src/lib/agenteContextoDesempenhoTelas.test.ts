import { describe, it, expect } from 'vitest';
import {
  contextoDesempenhoCiclos, contextoDesempenhoMetas, contextoDesempenhoRelatorios,
  contextoDesempenhoEvolucao, contextoDesempenhoFeedbacks, contextoDesempenhoReunioes,
  contextoMinhaEvolucao,
} from './agenteContextoDesempenhoTelas';
import type { ContextoTela } from '@/hooks/useAgenteContexto';

const ciclo = {
  nome: 'Ciclo 2026.1', status: 'em_andamento',
  data_inicio: '2026-01-01', data_fim: '2026-06-30',
  data_analise_semestral: '2026-07-15',
};

const campo = (ctx: ContextoTela, blocoId: string, rotulo: string) =>
  ctx.blocos.find((b) => b.id === blocoId)?.campos.find((c) => c.rotulo === rotulo);
const bloco = (ctx: ContextoTela, id: string) => ctx.blocos.find((b) => b.id === id);

describe('bloco de ciclo (comum às sete telas)', () => {
  it('sem ciclo, diz que os numeros ficam sem janela — nao finge um ciclo', () => {
    const ctx = contextoDesempenhoFeedbacks({ ciclo: null, feedbacks: [], carregando: false });
    const c = campo(ctx, 'ciclo', 'Ciclo');
    expect(c?.valor).toBeNull();
    expect(c?.nota).toContain('não têm janela');
  });

  it('analise semestral sem data nao vira data inventada', () => {
    const ctx = contextoDesempenhoFeedbacks({
      ciclo: { ...ciclo, data_analise_semestral: null }, feedbacks: [], carregando: false,
    });
    expect(campo(ctx, 'ciclo', 'Análise semestral')?.nota).toBe('sem data marcada');
  });
});

describe('contextoDesempenhoCiclos', () => {
  it('conta ciclos por status e o que ja existe no selecionado', () => {
    const ctx = contextoDesempenhoCiclos({
      ciclos: [ciclo, { ...ciclo, nome: 'Ciclo 2025.2', status: 'encerrado' }],
      selecionado: ciclo,
      metasDoCiclo: [{ status: 'ativa', nivel: 'individual' }],
      analisesRegistradas: 3,
      carregando: false,
    });
    expect(campo(ctx, 'ciclos', 'Ciclos')?.valor).toBe('2');
    expect(campo(ctx, 'ciclos', 'Ciclos encerrado')?.valor).toBe('1');
    expect(campo(ctx, 'conteudo', 'Metas no ciclo')?.valor).toBe('1');
  });
});

describe('contextoDesempenhoMetas', () => {
  const metas = [
    { nivel: 'individual', dimensao: 'entrega', status: 'ativa', progresso_atual: 40, peso: 1, prazo: '2026-01-01', responsavel_id: 'u1' },
    { nivel: 'equipe', dimensao: 'impacto', status: 'concluida', progresso_atual: 100, peso: 1, prazo: '2026-01-01', responsavel_id: null },
    { nivel: 'individual', dimensao: 'entrega', status: 'ativa', progresso_atual: 10, peso: 1, prazo: null, responsavel_id: 'u2' },
  ];
  const entrada = {
    ciclo, metas, regrasPpr: 2, filtrosAtivos: { nível: null }, hoje: '2026-08-25', carregando: false,
  };

  it('meta concluida com prazo antigo NAO conta como vencida', () => {
    expect(campo(contextoDesempenhoMetas(entrada), 'metas', 'Metas com prazo vencido e não concluídas')?.valor)
      .toBe('1');
  });

  it('meta sem prazo tem contagem propria e diz por que', () => {
    const c = campo(contextoDesempenhoMetas(entrada), 'metas', 'Metas sem prazo');
    expect(c?.valor).toBe('1');
    expect(c?.nota).toContain('ninguém consegue cobrar');
  });

  it('progresso medio sem meta devolve null, nao zero', () => {
    const ctx = contextoDesempenhoMetas({ ...entrada, metas: [] });
    expect(campo(ctx, 'metas', 'Progresso médio')?.valor).toBeNull();
    expect(campo(ctx, 'metas', 'Progresso médio')?.nota).toBe('sem meta no recorte');
  });

  it('filtro vazio aparece como "todos", nao some', () => {
    expect(contextoDesempenhoMetas(entrada).filtros['nível']).toBe('todos');
  });
});

describe('contextoDesempenhoRelatorios', () => {
  it('pega o relatorio mais recente e ignora os sem data', () => {
    const ctx = contextoDesempenhoRelatorios({
      ciclo,
      relatorios: [
        { tipo: 'individual', status: 'pronto', gerado_em: '2026-03-01' },
        { tipo: 'individual', status: 'pronto', gerado_em: '2026-08-01' },
        { tipo: 'resumo', status: 'erro', gerado_em: null },
      ],
      membroSelecionado: null, pessoasElegiveis: 12, carregando: false,
    });
    expect(campo(ctx, 'relatorios', 'Último relatório gerado em')?.valor).toBe('2026-08-01');
    expect(campo(ctx, 'relatorios', 'Status erro')?.valor).toBe('1');
  });

  it('nenhum gerado devolve null com nota', () => {
    const ctx = contextoDesempenhoRelatorios({
      ciclo, relatorios: [], membroSelecionado: null, pessoasElegiveis: 0, carregando: false,
    });
    expect(campo(ctx, 'relatorios', 'Último relatório gerado em')?.nota).toBe('nenhum gerado no recorte');
  });
});

describe('contextoDesempenhoEvolucao e Feedbacks — o que NAO entra', () => {
  it('evolucao avisa que texto de conversa fica de fora', () => {
    const ctx = contextoDesempenhoEvolucao({
      ciclo, membroSelecionado: 'Ana', metas: [{ progresso_atual: 50 }],
      feedbacksRecebidos: 2, reunioes1a1: 1, ultimaReuniao: '2026-08-01', carregando: false,
    });
    expect(bloco(ctx, 'evolucao')?.nota).toContain('tela compartilhada');
    expect(campo(ctx, 'evolucao', 'Progresso médio')?.valor).toBe('50%');
  });

  it('feedbacks conta o que ainda nao e visivel para o avaliado', () => {
    const ctx = contextoDesempenhoFeedbacks({
      ciclo,
      feedbacks: [
        { tipo: 'reconhecimento', anonimo: false, visivel_para_avaliado: true, para_usuario_id: 'u1', created_at: '2026-08-01' },
        { tipo: 'desenvolvimento', anonimo: true, visivel_para_avaliado: false, para_usuario_id: 'u1', created_at: '2026-08-02' },
      ],
      carregando: false,
    });
    expect(campo(ctx, 'feedbacks', 'Pessoas que receberam algum')?.valor).toBe('1');
    expect(campo(ctx, 'feedbacks', 'Ainda não visíveis para o avaliado')?.valor).toBe('1');
    expect(campo(ctx, 'feedbacks', 'Anônimos')?.valor).toBe('1');
  });
});

describe('contextoDesempenhoReunioes', () => {
  const entrada = {
    ciclo,
    reunioes: [
      { data_reuniao: '2026-08-01', membro_id: 'u1', sentimento: 4 },
      { data_reuniao: '2026-07-01', membro_id: 'u1', sentimento: null },
    ],
    itensAbertos: [
      { prazo: '2026-08-01', status: 'aberto' },
      { prazo: null, status: 'aberto' },
    ],
    hoje: '2026-08-25',
    carregando: false,
  };

  it('sentimento medio so conta quem preencheu, e diz de quantos', () => {
    const c = campo(contextoDesempenhoReunioes(entrada), 'reunioes', 'Sentimento médio');
    expect(c?.valor).toBe('4');
    expect(c?.nota).toBe('média de 1 registro(s)');
  });

  it('sem sentimento preenchido, devolve null em vez de zero', () => {
    const ctx = contextoDesempenhoReunioes({
      ...entrada,
      reunioes: [{ data_reuniao: '2026-08-01', membro_id: 'u1', sentimento: null }],
    });
    expect(campo(ctx, 'reunioes', 'Sentimento médio')?.valor).toBeNull();
  });

  it('item de acao vencido e item sem prazo sao contagens SEPARADAS', () => {
    const ctx = contextoDesempenhoReunioes(entrada);
    expect(campo(ctx, 'itens', 'Com prazo vencido')?.valor).toBe('1');
    expect(campo(ctx, 'itens', 'Sem prazo')?.valor).toBe('1');
  });
});

describe('contextoMinhaEvolucao', () => {
  it('conta as proprias metas vencidas e os registros de conversa', () => {
    const ctx = contextoMinhaEvolucao({
      ciclo,
      metas: [
        { status: 'ativa', progresso_atual: 20, prazo: '2026-01-01', dimensao: 'entrega' },
        { status: 'concluida', progresso_atual: 100, prazo: '2026-01-01', dimensao: 'gestao' },
      ],
      comentariosDoLider: 2, meusPontosDeVista: 1, hoje: '2026-08-25', carregando: false,
    });
    expect(campo(ctx, 'minhas_metas', 'Com prazo vencido')?.valor).toBe('1');
    expect(campo(ctx, 'minhas_metas', 'Progresso médio')?.valor).toBe('60%');
    expect(campo(ctx, 'conversas', 'Comentários do líder para você')?.valor).toBe('2');
    expect(bloco(ctx, 'conversas')?.nota).toContain('não entra no snapshot');
  });
});
