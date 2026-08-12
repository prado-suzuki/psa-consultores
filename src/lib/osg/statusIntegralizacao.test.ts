import { describe, expect, it } from 'vitest';
import {
  AVISO_STATUS_ELEGIVEIS,
  STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO,
  STATUS_INTEGRALIZACAO,
  statusLevaBemAoDocumento,
} from '@/lib/osg/statusIntegralizacao';

// Cenário do aceite (B3), deliberadamente FORA do caso MMS: uma alteração
// contratual cujos bens foram gravados como "Aprovado para 2ª Instancia" — o
// status que o filtro literal `.eq(…, 'Aprovado')` deixava de fora, fazendo o
// contrato sair sem imóveis e sem sócios.
describe('status elegíveis para integralização', () => {
  it('leva ao documento o bem aprovado em 2ª instância, não só o "Aprovado"', () => {
    expect(statusLevaBemAoDocumento('Aprovado para 2ª Instancia')).toBe(true);
    expect(statusLevaBemAoDocumento('Aprovado')).toBe(true);
  });

  it('deixa de fora os status que não decidem a integralização', () => {
    for (const status of ['Pendente', 'Em análise', 'Recusado', 'Não se aplica']) {
      expect(statusLevaBemAoDocumento(status)).toBe(false);
    }
    // Pendente de decisão do time (ver o módulo): hoje NÃO entra.
    expect(statusLevaBemAoDocumento('Integralizado')).toBe(false);
    expect(statusLevaBemAoDocumento(null)).toBe(false);
    expect(statusLevaBemAoDocumento('')).toBe(false);
  });

  it('só admite no conjunto elegível valores que o cadastro realmente grava', () => {
    for (const status of STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO) {
      expect(STATUS_INTEGRALIZACAO).toContain(status);
    }
  });

  it('deriva o aviso da tela do próprio conjunto — mudar o conjunto muda a frase', () => {
    for (const status of STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO) {
      expect(AVISO_STATUS_ELEGIVEIS).toContain(status);
    }
    expect(AVISO_STATUS_ELEGIVEIS).not.toContain('Recusado');
  });
});
