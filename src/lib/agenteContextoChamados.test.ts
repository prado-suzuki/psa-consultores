import { describe, it, expect } from 'vitest';
import {
  contextoBoardChamados, type ChamadoDoSnapshot, type EntradaContextoChamados,
} from './agenteContextoChamados';

const c = (p: Partial<ChamadoDoSnapshot>): ChamadoDoSnapshot => ({
  status: 'aberto', priority: 'media', deadline: null, assigned_to: 'u1',
  estrutura_area_id: 'a1', activity_status: null, ...p,
});

const base: EntradaContextoChamados = {
  escopoLabel: 'todas as áreas',
  stats: { total: 5, abertos: 2, emAndamento: 1, resolvidos: 2 },
  chamados: [
    c({ deadline: '2026-08-01', assigned_to: null }),          // aberto, vencido, sem dono
    c({ status: 'em_andamento', deadline: '2026-12-01' }),      // aberto, no prazo
    c({ deadline: null, priority: 'urgente' }),                 // aberto, SEM prazo
    c({ status: 'resolvido', deadline: '2026-01-01' }),         // fora do "em aberto"
    c({ status: 'fechado', deadline: null, estrutura_area_id: null }),
  ],
  areaPorId: { a1: 'Tax' },
  hoje: '2026-08-25',
  carregando: false,
};

const bloco = (ctx: ReturnType<typeof contextoBoardChamados>, id: string) =>
  ctx.blocos.find((b) => b.id === id);
const campo = (ctx: ReturnType<typeof contextoBoardChamados>, id: string, rotulo: string) =>
  bloco(ctx, id)?.campos.find((x) => x.rotulo === rotulo);

describe('contextoBoardChamados', () => {
  it('prazo e responsavel olham SO o que segue em aberto', () => {
    const ctx = contextoBoardChamados(base);
    expect(campo(ctx, 'prazo', 'Em aberto')?.valor).toBe('3');
    // O resolvido tem prazo de janeiro, mas nao conta como vencido.
    expect(campo(ctx, 'prazo', 'Com prazo estourado')?.valor).toBe('1');
    expect(campo(ctx, 'prazo', 'Sem responsável')?.valor).toBe('1');
  });

  it('sem prazo NAO vira "no prazo" — tem contagem propria e diz por que', () => {
    const ctx = contextoBoardChamados(base);
    const c1 = campo(ctx, 'prazo', 'Sem prazo cadastrado');
    expect(c1?.valor).toBe('1');
    expect(c1?.nota).toContain('ninguém consegue cobrar');
  });

  it('chamado sem area aparece como "sem area atribuida", nao some', () => {
    const ctx = contextoBoardChamados({
      ...base,
      chamados: [c({ estrutura_area_id: null }), c({ estrutura_area_id: 'a1' })],
    });
    const itens = bloco(ctx, 'areas')?.itens ?? [];
    expect(itens.map((i) => i.area)).toContain('sem área atribuída');
  });

  it('area fora do mapa nao vira uuid cru na resposta', () => {
    const ctx = contextoBoardChamados({
      ...base, chamados: [c({ estrutura_area_id: 'desconhecida' })], areaPorId: {},
    });
    expect((bloco(ctx, 'areas')?.itens ?? [])[0].area).toBe('área não identificada');
  });

  it('a prioridade vira palavra em portugues', () => {
    const rotulos = bloco(contextoBoardChamados(base), 'prioridade')?.campos.map((x) => x.rotulo) ?? [];
    expect(rotulos).toContain('média');
    expect(rotulos).toContain('urgente');
  });

  it('fila vazia responde zero, nao some', () => {
    const ctx = contextoBoardChamados({
      ...base, chamados: [], stats: { total: 0, abertos: 0, emAndamento: 0, resolvidos: 0 },
    });
    expect(campo(ctx, 'fila', 'Chamados no escopo')?.valor).toBe('0');
    expect(campo(ctx, 'prazo', 'Em aberto')?.valor).toBe('0');
    expect(bloco(ctx, 'areas')).toBeUndefined();
  });

  it('a data de referencia viaja no filtro — a funcao nao le o relogio', () => {
    expect(contextoBoardChamados(base).filtros['referência']).toBe('2026-08-25');
    const outroDia = contextoBoardChamados({ ...base, hoje: '2026-01-01' });
    expect(campo(outroDia, 'prazo', 'Com prazo estourado')?.valor).toBe('0');
  });
});
