// Testa o sync das junções de etapa — foco no bug do PAPEL: um aprovador
// (papel='aprovado') NÃO pode ser tocado/convertido em executor ao salvar a
// etapa. Também cobre a guarda de "sem id → erro" (nunca religar no escuro).

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { syncVinculosEtapa } from './etapaVinculosSync';

describe('syncVinculosEtapa — responsáveis (papel)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserva linha de aprovador (papel="aprovado") ao reconciliar executores', async () => {
    const cap = mockSupabaseCapture({
      etapa_responsaveis: [
        { id: 'a1', responsavel_id: 'R-APROV', papel: 'aprovado', horas: 0 },
        { id: 'e1', responsavel_id: 'R1', papel: 'executado', horas: 1 },
      ],
    });
    await syncVinculosEtapa('E1', 'AS-IS', {
      executadoPor: [{ responsavelId: 'R1', nome: 'Fulano', horas: 2 }],
    });
    // aprovador nunca é deletado
    expect(cap.called('etapa_responsaveis', 'delete')).toBe(false);
    // só atualiza as horas do executor existente
    expect(cap.payloads('etapa_responsaveis', 'update')).toEqual([{ horas: 2 }]);
    expect(cap.called('etapa_responsaveis', 'insert')).toBe(false);
  });

  it('adicionar executor novo insere como "executado" e não mexe no aprovador', async () => {
    const cap = mockSupabaseCapture({
      etapa_responsaveis: [{ id: 'a1', responsavel_id: 'R-APROV', papel: 'aprovado', horas: 0 }],
    });
    await syncVinculosEtapa('E1', 'AS-IS', {
      executadoPor: [{ responsavelId: 'R2', nome: 'Ciclano', horas: 3 }],
    });
    expect(cap.called('etapa_responsaveis', 'delete')).toBe(false);
    const inseridos = cap.payloads('etapa_responsaveis', 'insert')[0] as Array<Record<string, unknown>>;
    expect(inseridos).toEqual([
      { etapa_id: 'E1', scenario: 'AS-IS', responsavel_id: 'R2', papel: 'executado', horas: 3 },
    ]);
  });

  it('remove executor que saiu da lista (mas nunca o aprovador)', async () => {
    const cap = mockSupabaseCapture({
      etapa_responsaveis: [
        { id: 'a1', responsavel_id: 'R-APROV', papel: 'aprovado', horas: 0 },
        { id: 'e1', responsavel_id: 'R1', papel: 'executado', horas: 1 },
      ],
    });
    await syncVinculosEtapa('E1', 'AS-IS', { executadoPor: [] });
    expect(cap.called('etapa_responsaveis', 'delete')).toBe(true); // remove R1
    expect(cap.called('etapa_responsaveis', 'insert')).toBe(false);
  });
});

describe('syncVinculosEtapa — documentos (guarda de id)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lança erro quando um documento não tem id resolvido (nunca grava no escuro)', async () => {
    mockSupabaseCapture({ etapa_documentos: [] });
    await expect(
      syncVinculosEtapa('E1', 'AS-IS', {
        docsEntrada: [{ documentoId: null as unknown as string, nome: 'Doc X', volume: 1 }],
      }),
    ).rejects.toThrow(/sem cadastro/i);
  });
});
