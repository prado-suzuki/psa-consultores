import { describe, it, expect } from 'vitest';
import {
  janelaDoPeriodo, PERIODO_PADRAO, periodosAuditoria,
} from './auditPeriodos';

const HOJE = '2026-07-30';

describe('periodosAuditoria', () => {
  it('oferece as três janelas móveis, os dois semestres e o histórico', () => {
    expect(periodosAuditoria(HOJE).map(p => p.valor)).toEqual([
      'ultimos-7', 'ultimos-30', 'ultimos-90', 'semestre-atual', 'semestre-anterior', 'tudo',
    ]);
  });

  it('nomeia o semestre pela posição, não pelo ano, e mostra as datas ao lado', () => {
    const labels = periodosAuditoria(HOJE).map(p => p.label);
    expect(labels).toContain('Semestre atual (jul–dez/26)');
    expect(labels).toContain('Semestre anterior (jan–jun/26)');
  });

  it('acompanha a virada de ano sem mudar as opções', () => {
    // Janeiro de 2027: o semestre anterior é o 2º de 2026 — o rótulo continua
    // relativo e o semestre que acabou segue alcançável.
    const labels = periodosAuditoria('2027-01-15').map(p => p.label);
    expect(labels).toContain('Semestre atual (jan–jun/27)');
    expect(labels).toContain('Semestre anterior (jul–dez/26)');
  });

  it('tem o padrão entre as opções', () => {
    expect(periodosAuditoria(HOJE).some(p => p.valor === PERIODO_PADRAO)).toBe(true);
  });
});

describe('janelaDoPeriodo', () => {
  it('conta os últimos N dias a partir de hoje, sem fim', () => {
    expect(janelaDoPeriodo('ultimos-30', HOJE)).toEqual({
      desde: '2026-06-30', ate: null, dias: 30, slug: '30d',
    });
    expect(janelaDoPeriodo('ultimos-7', HOJE).desde).toBe('2026-07-23');
    expect(janelaDoPeriodo('ultimos-90', HOJE).desde).toBe('2026-05-01');
  });

  it('atravessa a virada de ano na janela móvel', () => {
    expect(janelaDoPeriodo('ultimos-30', '2026-01-10').desde).toBe('2025-12-11');
  });

  it('conta no semestre atual só os dias que já aconteceram', () => {
    const janela = janelaDoPeriodo('semestre-atual', HOJE);
    expect(janela.desde).toBe('2026-07-01');
    // O fim continua 31/12 — o filtro não precisa mentir a data —, mas o
    // denominador para em 30/07: 30 dias corridos.
    expect(janela.ate).toBe('2026-12-31');
    expect(janela.dias).toBe(30);
  });

  it('traz o semestre anterior inteiro, com o ano certo em cada metade', () => {
    expect(janelaDoPeriodo('semestre-anterior', HOJE)).toEqual({
      desde: '2026-01-01', ate: '2026-06-30', dias: 181, slug: 'sem1-2026',
    });

    // Em março de 2027 o anterior é jul–dez/2026, não jan–jun/2027.
    expect(janelaDoPeriodo('semestre-anterior', '2027-03-15')).toEqual({
      desde: '2026-07-01', ate: '2026-12-31', dias: 184, slug: 'sem2-2026',
    });
  });

  it('mantém o semestre atual no primeiro semestre do ano', () => {
    const janela = janelaDoPeriodo('semestre-atual', '2027-03-15');
    expect(janela.desde).toBe('2027-01-01');
    expect(janela.ate).toBe('2027-06-30');
    expect(janela.slug).toBe('sem1-2027');
  });

  it('não limita nem conta dias em todo o período', () => {
    expect(janelaDoPeriodo('tudo', HOJE)).toEqual({
      desde: null, ate: null, dias: null, slug: 'tudo',
    });
  });

  it('cai no padrão de 30 dias com valor desconhecido', () => {
    expect(janelaDoPeriodo('qualquer-coisa', HOJE)).toEqual(janelaDoPeriodo('ultimos-30', HOJE));
  });

  it('gera slug distinto por período, e datado no semestre para o CSV não colidir entre anos', () => {
    const slugs = periodosAuditoria(HOJE).map(p => janelaDoPeriodo(p.valor, HOJE).slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    expect(janelaDoPeriodo('semestre-atual', HOJE).slug)
      .not.toBe(janelaDoPeriodo('semestre-atual', '2027-07-30').slug);
  });
});
