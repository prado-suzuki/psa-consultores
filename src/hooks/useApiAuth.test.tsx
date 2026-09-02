// B21: o caminho da API não pode arrastar quem está trabalhando.
//
// Um 401 do backend não é veredito sobre a sessão do Supabase. O endpoint pode
// estar mal configurado ou negar a requisição por outros motivos; só uma falha
// definitiva do refresh token deve abrir o diálogo global de reautenticação.
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessionSupabase: vi.fn(),
  refreshSession: vi.fn(),
  sessaoExpirada: false,
  session: null as unknown,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSessionSupabase,
    },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    session: mocks.session,
    refreshSession: mocks.refreshSession,
    sessaoExpirada: mocks.sessaoExpirada,
  }),
}));

import { useApiAuth } from '@/hooks/useApiAuth';

const agora = () => Math.floor(Date.now() / 1000);
const sessao = (expiresAt: number, accessToken = 'token-vigente') => ({
  access_token: accessToken,
  refresh_token: 'refresh-vigente',
  expires_at: expiresAt,
  user: { id: 'u-1' },
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessaoExpirada = false;
  mocks.session = sessao(agora() + 3600);
  mocks.getSessionSupabase.mockResolvedValue({ data: { session: mocks.session } });
  mocks.refreshSession.mockResolvedValue(null);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const resposta = (status: number) => ({ status, ok: status < 400 }) as Response;

describe('401 devolvido pela API', () => {
  it('reutiliza o token que já foi renovado durante a chamada', async () => {
    const anterior = sessao(agora() + 3600);
    const nova = sessao(agora() + 3600, 'token-novo');
    mocks.getSessionSupabase
      .mockResolvedValueOnce({ data: { session: anterior } })
      .mockResolvedValueOnce({ data: { session: nova } });
    fetchMock.mockResolvedValueOnce(resposta(401)).mockResolvedValueOnce(resposta(401));
    const { result } = renderHook(() => useApiAuth());

    const response = await result.current.fetchWithAuth('/api/qualquer');

    expect(response.status).toBe(401);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token-novo');
  });

  it('401 com token ainda válido pertence ao endpoint e não força refresh', async () => {
    fetchMock.mockResolvedValue(resposta(401));
    const { result } = renderHook(() => useApiAuth());

    const response = await result.current.fetchWithAuth('/api/qualquer');

    expect(response.status).toBe(401);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('com o diálogo já aberto, a chamada completa falha sem renovar de novo', async () => {
    mocks.sessaoExpirada = true;
    fetchMock.mockResolvedValue(resposta(200));
    const { result } = renderHook(() => useApiAuth());

    await expect(result.current.fetchWithAuth('/api/qualquer')).rejects.toThrow('Sessão expirada');

    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('renovação preventiva por chamada de API', () => {
  it('token perto de expirar é enviado como está, sem disparar refresh', async () => {
    // Antes, faltando menos de cinco minutos, CADA chamada de API disparava um
    // refresh. Era um renovador a mais disputando o mesmo refresh token, e a
    // rotação é o que devolve 400 "already used". Quem antecipa agora é o vigia
    // do AuthContext, uma vez a cada trinta segundos; aqui sobra o caminho
    // reativo (401 renova e repete).
    mocks.session = sessao(agora() + 60);
    mocks.getSessionSupabase.mockResolvedValue({ data: { session: mocks.session } });
    const { result } = renderHook(() => useApiAuth());

    expect(await result.current.getValidToken()).toBe('token-vigente');
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('o 401 continua renovando e repetindo a chamada', async () => {
    mocks.session = sessao(agora() - 1);
    mocks.getSessionSupabase.mockResolvedValue({ data: { session: mocks.session } });
    mocks.refreshSession.mockResolvedValue({ access_token: 'token-novo' });
    fetchMock.mockResolvedValueOnce(resposta(401)).mockResolvedValueOnce(resposta(200));
    const { result } = renderHook(() => useApiAuth());

    const r = await result.current.fetchWithAuth('/api/qualquer');

    expect(r.status).toBe(200);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const cabecalhosDaRepeticao = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>;
    expect(cabecalhosDaRepeticao.Authorization).toBe('Bearer token-novo');
  });
});
