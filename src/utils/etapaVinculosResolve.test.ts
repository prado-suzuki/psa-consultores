// Testa a resolução nome→id — o bug de COLISÃO: dois itens de clusters diferentes
// com o mesmo nome não podem se sobrescrever ao salvar a etapa.

import { describe, it, expect } from 'vitest';
import { resolveVinculoId, resolveSistemaId } from './etapaVinculosResolve';

describe('resolveVinculoId', () => {
  const byNome = new Map([['Matrícula', 'D-OSG'], ['Contrato', 'D2']]);
  // D-OSG e D-PSA têm o MESMO nome "Matrícula" (homônimos de clusters diferentes)
  const byId = new Map([['D-OSG', 'Matrícula'], ['D-PSA', 'Matrícula'], ['D2', 'Contrato']]);

  it('sem nome → mantém o id atual (vínculo real ainda não resolvido)', () => {
    expect(resolveVinculoId('', 'D-PSA', byNome, byId)).toBe('D-PSA');
    expect(resolveVinculoId(undefined, 'D-PSA', byNome, byId)).toBe('D-PSA');
  });
  it('id atual ainda casa com o nome → mantém (NÃO troca pelo homônimo)', () => {
    // vínculo aponta pra D-PSA; não deve virar D-OSG só porque byNome["Matrícula"]=D-OSG
    expect(resolveVinculoId('Matrícula', 'D-PSA', byNome, byId)).toBe('D-PSA');
  });
  it('nome mudou e resolve → novo id', () => {
    expect(resolveVinculoId('Contrato', 'D-OSG', byNome, byId)).toBe('D2');
  });
  it('nome mudou e NÃO resolve → undefined (força re-cadastro, sem relink silencioso)', () => {
    expect(resolveVinculoId('Inexistente', 'D-OSG', byNome, byId)).toBeUndefined();
  });
});

describe('resolveSistemaId', () => {
  const cands = new Map([['Docbox', [
    { id: 'S-OSG', cluster_id: 'C-OSG' },
    { id: 'S-PSA', cluster_id: 'C-PSA' },
    { id: 'S-GLOBAL', cluster_id: null },
  ]]]);
  it('escolhe o candidato do cluster do processo (homônimos entre clusters)', () => {
    expect(resolveSistemaId('Docbox', cands, 'C-OSG')).toBe('S-OSG');
    expect(resolveSistemaId('Docbox', cands, 'C-PSA')).toBe('S-PSA');
  });
  it('sem match de cluster → cai no candidato sem cluster (global)', () => {
    expect(resolveSistemaId('Docbox', cands, 'C-OUTRO')).toBe('S-GLOBAL');
  });
  it('sem candidato → devolve o próprio nome (legado)', () => {
    expect(resolveSistemaId('Inexistente', cands, 'C-OSG')).toBe('Inexistente');
  });
});
