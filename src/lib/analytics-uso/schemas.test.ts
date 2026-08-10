import { describe, expect, it } from 'vitest';
import usoApi from './__fixtures__/uso-api.json';
import arquivos from './__fixtures__/arquivos.json';
import { montarGerencialAnalytics } from './composicao';
import type { AnalyticsArquivosResponse, AnalyticsUsoApiResponse } from './types';
import {
  analyticsArquivosSchema,
  analyticsGerencialSchema,
  analyticsUsoApiSchema,
  parseAnalyticsResponse,
} from './schemas';

describe('contrato runtime do dashboard', () => {
  it('aceita os payloads de referência técnicos e gerencial', () => {
    expect(() => parseAnalyticsResponse(analyticsUsoApiSchema, usoApi)).not.toThrow();
    expect(() => parseAnalyticsResponse(analyticsArquivosSchema, arquivos)).not.toThrow();
    expect(() =>
      parseAnalyticsResponse(
        analyticsGerencialSchema,
        montarGerencialAnalytics(
          usoApi as AnalyticsUsoApiResponse,
          arquivos as unknown as AnalyticsArquivosResponse,
        ),
      ),
    ).not.toThrow();
  });

  it('rejeita resposta incompatível com mensagem segura', () => {
    expect(() =>
      parseAnalyticsResponse(analyticsUsoApiSchema, {
        periodo: { inicio: 'data-inválida', fim: '2026-08-06' },
      }),
    ).toThrow('A API retornou dados incompatíveis com o dashboard');
  });
});
