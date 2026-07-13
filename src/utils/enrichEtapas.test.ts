// Testa a resolução id→nome das etapas (o que a UI exibe). Fallback: id não
// resolvido mantém o valor cru (não some da tela).

import { describe, it, expect } from 'vitest';
import { enrichEtapas } from './enrichEtapas';
import type { Documento, Sistema, Responsavel, Etapa } from '../types';

const docs = [{ id: 'D1', nome: 'Matrícula' }] as Documento[];
const sistemas = [{ id: 'S1', nome: 'Docbox' }] as Sistema[];
const resp = [{ id: 'R1', name: 'Analista' }] as Responsavel[];
const raw = [{
  id: 'E1', process_id: 'P1', name: 'A',
  docsEntrada: [{ documentoId: 'D1', nome: '', volume: 1 }], docsSaida: [],
  executadoPor: [{ responsavelId: 'R1', nome: '', horas: 2 }],
  sistemas: ['S1'],
}] as unknown as Etapa[];

describe('enrichEtapas', () => {
  it('resolve ids→nomes (doc, responsável, sistema)', () => {
    const [e] = enrichEtapas(raw, docs, sistemas, resp);
    expect(e.docsEntrada[0].nome).toBe('Matrícula');
    expect(e.executadoPor[0].nome).toBe('Analista');
    expect(e.sistemas).toEqual(['Docbox']);
  });
  it('id não resolvido → mantém valor cru (fallback, não some)', () => {
    const [e] = enrichEtapas(
      [{ ...raw[0], sistemas: ['S-DESCONHECIDO'] }] as unknown as Etapa[], docs, sistemas, resp,
    );
    expect(e.sistemas).toEqual(['S-DESCONHECIDO']);
  });
});
