import { describe, it, expect } from 'vitest';
import { processoCalculavel } from './processoCalculavel';
import type { Processo, Etapa, Responsavel } from '../types';

// Factories mínimas — preenchem os obrigatórios e aceitam overrides.
const resp = (over: Partial<Responsavel> = {}): Responsavel => ({
  id: 'r1', name: 'Analista', level: 'pleno', hourly_rate: 80, ...over,
});

const etapa = (over: Partial<Etapa> = {}): Etapa => ({
  id: 'e1', name: 'Etapa 1', description: '', process_id: 'p1', execution: 'manual',
  rework_rate: 0, volume_per_process: 1,
  docsEntrada: [], docsSaida: [], sistemas: [], volumeMensal: 0,
  executadoPor: [{ responsavelId: 'r1', nome: 'Analista', horas: 2 }],
  ...over,
});

const proc = (over: Partial<Processo> = {}): Processo => ({
  id: 'p1', name: 'Processo 1', description: '', volume_executions: 12, ...over,
});

describe('processoCalculavel', () => {
  it('(a) processo completo → ok, sem pendências', () => {
    const r = processoCalculavel(proc(), [etapa()], [resp()]);
    expect(r.ok).toBe(true);
    expect(r.faltando).toEqual([]);
  });

  it('(b) sem Volume Anual (e sem frequency) → bloqueia', () => {
    const r = processoCalculavel(proc({ volume_executions: null, frequency: null }), [etapa()], [resp()]);
    expect(r.ok).toBe(false);
    expect(r.faltando).toContain('Volume anual do processo');
  });

  it('(b2) frequency legado supre o volume anual', () => {
    const r = processoCalculavel(proc({ volume_executions: null, frequency: 'Mensal' }), [etapa()], [resp()]);
    expect(r.faltando).not.toContain('Volume anual do processo');
    expect(r.ok).toBe(true);
  });

  it('(c1) etapa sem responsável → bloqueia', () => {
    const r = processoCalculavel(proc(), [etapa({ executadoPor: [] })], [resp()]);
    expect(r.ok).toBe(false);
    expect(r.faltando).toContain('Etapa "Etapa 1": sem responsável');
  });

  it('(c2) etapa com horas zeradas → bloqueia', () => {
    const r = processoCalculavel(
      proc(),
      [etapa({ executadoPor: [{ responsavelId: 'r1', nome: 'Analista', horas: 0 }] })],
      [resp()],
    );
    expect(r.ok).toBe(false);
    expect(r.faltando).toContain('Etapa "Etapa 1": horas zeradas');
  });

  it('(c3) etapa sem volume por processo → bloqueia (não assume 1)', () => {
    const semVol = processoCalculavel(proc(), [etapa({ volume_per_process: undefined })], [resp()]);
    expect(semVol.ok).toBe(false);
    expect(semVol.faltando).toContain('Etapa "Etapa 1": volume por processo');

    const zeroVol = processoCalculavel(proc(), [etapa({ volume_per_process: 0 })], [resp()]);
    expect(zeroVol.faltando).toContain('Etapa "Etapa 1": volume por processo');
  });

  it('(d) erro/retrabalho zerados NÃO bloqueiam (0 é válido)', () => {
    const r = processoCalculavel(proc(), [etapa({ error_rate: 0, rework_rate: 0 })], [resp()]);
    expect(r.ok).toBe(true);
  });

  it('(e) responsável CADASTRADO com custo/hora 0 NÃO bloqueia (externo/grátis)', () => {
    const r = processoCalculavel(proc(), [etapa()], [resp({ hourly_rate: 0 })]);
    expect(r.ok).toBe(true);
  });

  it('(f) responsável referenciado inexistente no cadastro → bloqueia (vínculo quebrado)', () => {
    const r = processoCalculavel(
      proc(),
      [etapa({ executadoPor: [{ responsavelId: 'rX', nome: 'Fantasma', horas: 2 }] })],
      [resp({ id: 'r1', name: 'Analista' })],
    );
    expect(r.ok).toBe(false);
    expect(r.faltando).toContain('Etapa "Etapa 1": responsável "Fantasma" não cadastrado');
  });

  it('(f2) resolve responsável por NOME quando não há id', () => {
    const r = processoCalculavel(
      proc(),
      [etapa({ executadoPor: [{ nome: 'Analista', horas: 2 }] })],
      [resp({ id: 'r1', name: 'Analista' })],
    );
    expect(r.ok).toBe(true);
  });

  it('(g) processo sem etapas → bloqueia', () => {
    const r = processoCalculavel(proc(), [], [resp()]);
    expect(r.ok).toBe(false);
    expect(r.faltando).toContain('Nenhuma etapa mapeada');
  });

  it('(h) só considera etapas do próprio processo (filtra por process_id)', () => {
    const doProcesso = etapa({ id: 'e1', process_id: 'p1' });
    const deOutro = etapa({ id: 'e2', process_id: 'p2', executadoPor: [], volume_per_process: undefined });
    const r = processoCalculavel(proc({ id: 'p1' }), [doProcesso, deOutro], [resp()]);
    expect(r.ok).toBe(true); // a etapa 'e2' (de p2) é ignorada
  });
});
