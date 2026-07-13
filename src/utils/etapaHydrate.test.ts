// Testa a hidratação de process_stages → Etapa: separa docs por sentido, mapeia
// sistemas e — chave — EXCLUI aprovador (papel='aprovado') do executadoPor.

import { describe, it, expect } from 'vitest';
import { hydrateEtapa, type EtapaDbRow } from './etapaHydrate';

describe('hydrateEtapa', () => {
  it('separa docs por sentido, exclui aprovador do executadoPor e mapeia sistemas', () => {
    const row = {
      id: 'E1', scenario: 'AS-IS', name: 'A',
      etapa_documentos: [
        { documento_id: 'D1', sentido: 'entrada', volume: 1 },
        { documento_id: 'D2', sentido: 'saida', volume: 2 },
      ],
      etapa_responsaveis: [
        { responsavel_id: 'R1', papel: 'executado', horas: 1 },
        { responsavel_id: 'R2', papel: 'aprovado', horas: 0 },
      ],
      etapa_sistemas: [{ sistema_id: 'S1', rateio: 100 }],
      gargalo_etapas: [],
    } as unknown as EtapaDbRow;

    const e = hydrateEtapa(row);
    expect(e.docsEntrada.map((d) => d.documentoId)).toEqual(['D1']);
    expect(e.docsSaida.map((d) => d.documentoId)).toEqual(['D2']);
    expect(e.executadoPor.map((r) => r.responsavelId)).toEqual(['R1']); // aprovador fora
    expect(e.sistemas).toEqual(['S1']);
  });
});
