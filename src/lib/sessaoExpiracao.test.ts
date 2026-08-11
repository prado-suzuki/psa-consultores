import { describe, expect, it } from 'vitest';
import {
  JANELA_AVISO_SEGUNDOS,
  estadoDaSessao,
  refreshFalhouDefinitivamente,
} from '@/lib/sessaoExpiracao';

const AGORA_MS = Date.UTC(2026, 7, 11, 14, 0, 0);
const agoraSeg = Math.floor(AGORA_MS / 1000);

describe('estadoDaSessao', () => {
  it('sessão com folga é válida', () => {
    expect(estadoDaSessao(agoraSeg + 3600, AGORA_MS)).toBe('valida');
  });

  it('entra na janela de aviso antes de morrer', () => {
    expect(estadoDaSessao(agoraSeg + JANELA_AVISO_SEGUNDOS + 1, AGORA_MS)).toBe('valida');
    expect(estadoDaSessao(agoraSeg + JANELA_AVISO_SEGUNDOS, AGORA_MS)).toBe('expirando');
    expect(estadoDaSessao(agoraSeg + 1, AGORA_MS)).toBe('expirando');
  });

  it('no instante do prazo, e depois dele, está expirada', () => {
    expect(estadoDaSessao(agoraSeg, AGORA_MS)).toBe('expirada');
    expect(estadoDaSessao(agoraSeg - 1, AGORA_MS)).toBe('expirada');
  });

  it('sessão sem prazo declarado não alarma', () => {
    expect(estadoDaSessao(undefined, AGORA_MS)).toBe('valida');
    expect(estadoDaSessao(null, AGORA_MS)).toBe('valida');
  });

  it('a janela é configurável', () => {
    expect(estadoDaSessao(agoraSeg + 120, AGORA_MS, 60)).toBe('valida');
    expect(estadoDaSessao(agoraSeg + 120, AGORA_MS, 300)).toBe('expirando');
  });
});

describe('refreshFalhouDefinitivamente', () => {
  it('veredito do servidor sobre o refresh token encerra a sessão', () => {
    expect(refreshFalhouDefinitivamente({
      name: 'AuthApiError', status: 400, code: 'refresh_token_not_found',
      message: 'Invalid Refresh Token: Refresh Token Not Found',
    })).toBe(true);
    expect(refreshFalhouDefinitivamente({
      name: 'AuthApiError', status: 400, message: 'Invalid Refresh Token: Already Used',
    })).toBe(true);
    expect(refreshFalhouDefinitivamente({ status: 401, message: 'Unauthorized' })).toBe(true);
  });

  it('soluço de rede ou do servidor NÃO encerra a sessão', () => {
    expect(refreshFalhouDefinitivamente({
      name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch',
    })).toBe(false);
    expect(refreshFalhouDefinitivamente({ name: 'TypeError', message: 'Failed to fetch' })).toBe(false);
    expect(refreshFalhouDefinitivamente({ status: 502, message: 'Bad Gateway' })).toBe(false);
    expect(refreshFalhouDefinitivamente({ status: 503 })).toBe(false);
    expect(refreshFalhouDefinitivamente({ name: 'AbortError', message: 'aborted' })).toBe(false);
  });

  it('sem erro não há expiração', () => {
    expect(refreshFalhouDefinitivamente(null)).toBe(false);
    expect(refreshFalhouDefinitivamente(undefined)).toBe(false);
  });

  it('erro desconhecido, sem status nem pista, fica do lado seguro', () => {
    expect(refreshFalhouDefinitivamente({ message: 'algo estranho aconteceu' })).toBe(false);
  });
});
