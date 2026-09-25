import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

import { normalizarMimeDitado, useDitado } from '@/hooks/useDitado';

class GravadorFalso {
  static ultimo: GravadorFalso | null = null;

  static isTypeSupported(tipo: string) {
    return tipo === 'audio/webm;codecs=opus';
  }

  state: RecordingState = 'inactive';
  mimeType: string;
  ondataavailable: ((evento: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_stream: MediaStream, opcoes?: MediaRecorderOptions) {
    this.mimeType = opcoes?.mimeType ?? 'video/webm';
    GravadorFalso.ultimo = this;
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
  }

  finalizar() {
    this.ondataavailable?.({ data: new Blob(['voz'], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.();
  }
}

describe('useDitado', () => {
  const pararFaixa = vi.fn();
  const getUserMedia = vi.fn();
  const faixa = { stop: pararFaixa, readyState: 'live' as MediaStreamTrackState };

  beforeEach(() => {
    mocks.invoke.mockReset();
    pararFaixa.mockReset();
    getUserMedia.mockReset();
    GravadorFalso.ultimo = null;
    getUserMedia.mockResolvedValue({ getTracks: () => [faixa] });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    vi.stubGlobal('MediaRecorder', GravadorFalso);
  });

  it('grava sem timeslice, envia multipart e entrega a transcrição', async () => {
    const onResultado = vi.fn();
    mocks.invoke.mockResolvedValue({
      data: { texto: 'Texto limpo.', enriquecimento: null },
      error: null,
    });
    const { result, unmount } = renderHook(() =>
      useDitado({ ditado: 'comentario', onResultado }),
    );

    await act(async () => result.current.iniciar());
    expect(result.current.estado).toBe('gravando');

    act(() => result.current.parar());
    expect(pararFaixa).not.toHaveBeenCalled();
    act(() => GravadorFalso.ultimo?.finalizar());
    await waitFor(() => expect(result.current.estado).toBe('ocioso'));

    expect(pararFaixa).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledWith('ditar', { body: expect.any(FormData) });
    const formulario = mocks.invoke.mock.calls[0][1].body as FormData;
    expect(formulario.get('ditado')).toBe('comentario');
    expect((formulario.get('file') as File).type).toBe('audio/webm');
    expect(onResultado).toHaveBeenCalledWith({ texto: 'Texto limpo.', enriquecimento: null });
    unmount();
    expect(pararFaixa).toHaveBeenCalled();
  });

  it('reutiliza a faixa viva em gravações consecutivas', async () => {
    mocks.invoke.mockResolvedValue({
      data: { texto: 'Texto limpo.', enriquecimento: null },
      error: null,
    });
    const { result, unmount } = renderHook(() =>
      useDitado({ ditado: 'comentario', onResultado: vi.fn() }),
    );

    await act(async () => result.current.iniciar());
    act(() => result.current.parar());
    act(() => GravadorFalso.ultimo?.finalizar());
    await waitFor(() => expect(result.current.estado).toBe('ocioso'));

    await act(async () => result.current.iniciar());

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('para automaticamente no limite configurado', async () => {
    vi.useFakeTimers();
    mocks.invoke.mockResolvedValue({
      data: { texto: 'Fim.', enriquecimento: null },
      error: null,
    });
    const { result } = renderHook(() =>
      useDitado({ ditado: 'comentario', onResultado: vi.fn(), limiteMs: 1_000 }),
    );

    await act(async () => result.current.iniciar());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(pararFaixa).not.toHaveBeenCalled();
    act(() => GravadorFalso.ultimo?.finalizar());

    expect(mocks.invoke).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('explica quando a permissão do microfone é negada', async () => {
    getUserMedia.mockRejectedValue(new DOMException('negado', 'NotAllowedError'));
    const { result } = renderHook(() => useDitado({ ditado: 'comentario', onResultado: vi.fn() }));

    await act(async () => result.current.iniciar());

    expect(result.current.estado).toBe('erro');
    expect(result.current.erro).toMatch(/Permita o acesso ao microfone/);
  });

  it('preserva a mensagem acionável devolvida pela edge function', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
        context: new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }),
      }),
    });
    const { result } = renderHook(() => useDitado({ ditado: 'comentario', onResultado: vi.fn() }));

    await act(async () => result.current.iniciar());
    act(() => result.current.parar());
    act(() => GravadorFalso.ultimo?.finalizar());

    await waitFor(() => expect(result.current.estado).toBe('erro'));
    expect(result.current.erro).toBe('Créditos de IA esgotados.');
  });
});

describe('normalizarMimeDitado', () => {
  it.each([
    ['audio/webm;codecs=opus', 'audio/webm'],
    ['video/webm;codecs=opus', 'audio/webm'],
    ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'],
  ])('normaliza %s para %s', (entrada, esperado) => {
    expect(normalizarMimeDitado(entrada)).toBe(esperado);
  });
});
