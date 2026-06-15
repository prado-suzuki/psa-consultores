// Testa a lógica de gating do provider sem montar o Joyride real (portal +
// @floating-ui não rodam bem no jsdom): `react-joyride` é mockado e capturamos
// os props passados a useJoyride (steps/run/onEvent).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MapaTourProvider } from './MapaTourProvider';
import { useMapaTour } from './useMapaTour';
import { TOURS, MAPA_BASE } from './tours';
import { isTourSeen } from './tourStorage';

interface JoyrideCall {
  steps: unknown[];
  run: boolean;
  onEvent?: (data: { status: string }) => void;
}

const hoisted = vi.hoisted(() => ({ calls: [] as JoyrideCall[] }));

vi.mock('react-joyride', () => ({
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
  useJoyride: (props: JoyrideCall) => {
    hoisted.calls.push({ steps: props.steps, run: props.run, onEvent: props.onEvent });
    return { Tour: null };
  },
}));

function Consumer() {
  const { startTour } = useMapaTour();
  return (
    <button type="button" onClick={() => startTour('cascata')}>
      iniciar-cascata
    </button>
  );
}

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <MapaTourProvider>
        <Consumer />
      </MapaTourProvider>
    </MemoryRouter>,
  );
}

describe('MapaTourProvider', () => {
  beforeEach(() => {
    hoisted.calls.length = 0;
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('auto-inicia o welcome na landing quando nunca foi visto', () => {
    renderAt(MAPA_BASE);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const welcome = hoisted.calls.find((c) => c.run && c.steps === TOURS.welcome);
    expect(welcome).toBeDefined();
  });

  it('NÃO auto-inicia quando o tour da página já foi visto', () => {
    localStorage.setItem('mapaTourSeen:welcome:v1', '1');
    renderAt(MAPA_BASE);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(hoisted.calls.length).toBe(0);
  });

  it('auto-inicia o tour da própria página (cascata) na 1ª visita', () => {
    renderAt(`${MAPA_BASE}/cascata`);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const cascata = hoisted.calls.find((c) => c.run && c.steps === TOURS.cascata);
    expect(cascata).toBeDefined();
  });

  it('marca o tour como visto ao auto-iniciar (só abre uma vez)', () => {
    renderAt(MAPA_BASE);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(isTourSeen('welcome')).toBe(true);
  });

  it('startTour abre o tour pedido mesmo já tendo sido visto', () => {
    localStorage.setItem('mapaTourSeen:cascata:v1', '1');
    renderAt(`${MAPA_BASE}/cascata`);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(hoisted.calls.length).toBe(0); // não auto-iniciou (já visto)

    act(() => {
      fireEvent.click(screen.getByText('iniciar-cascata'));
    });
    const cascata = hoisted.calls.find((c) => c.run && c.steps === TOURS.cascata);
    expect(cascata).toBeDefined();
  });
});
