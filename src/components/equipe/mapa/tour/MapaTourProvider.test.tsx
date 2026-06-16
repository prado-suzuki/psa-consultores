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

// O provider só roda os passos cujo alvo já existe no DOM (filtro do TourRunner).
// Em jsdom não há a UI real, então montamos as âncoras `[data-tour="…"]` que o
// tour referencia para que os passos sobrevivam ao filtro.
const mountedAnchors: HTMLElement[] = [];
function mountTargets(steps: { target?: unknown }[]) {
  for (const s of steps) {
    if (typeof s.target !== 'string') continue;
    const m = /^\[data-tour="(.+)"\]$/.exec(s.target);
    if (!m) continue; // 'body' e outros já existem / não são âncoras data-tour
    if (document.querySelector(s.target)) continue;
    const el = document.createElement('div');
    el.setAttribute('data-tour', m[1]);
    document.body.appendChild(el);
    mountedAnchors.push(el);
  }
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
    mountedAnchors.splice(0).forEach((el) => el.remove());
  });

  it('auto-inicia o welcome na landing quando nunca foi visto', () => {
    mountTargets(TOURS.welcome);
    renderAt(MAPA_BASE);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const welcome = hoisted.calls.find((c) => c.run);
    expect(welcome).toBeDefined();
    expect(welcome?.steps).toEqual(TOURS.welcome);
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
    mountTargets(TOURS.cascata);
    renderAt(`${MAPA_BASE}/cascata`);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    const cascata = hoisted.calls.find((c) => c.run);
    expect(cascata).toBeDefined();
    expect(cascata?.steps).toEqual(TOURS.cascata);
  });

  it('marca o tour como visto ao auto-iniciar (só abre uma vez)', () => {
    renderAt(MAPA_BASE);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(isTourSeen('welcome')).toBe(true);
  });

  it('startTour abre o tour pedido mesmo já tendo sido visto', () => {
    mountTargets(TOURS.cascata);
    localStorage.setItem('mapaTourSeen:cascata:v1', '1');
    renderAt(`${MAPA_BASE}/cascata`);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(hoisted.calls.length).toBe(0); // não auto-iniciou (já visto)

    act(() => {
      fireEvent.click(screen.getByText('iniciar-cascata'));
    });
    const cascata = hoisted.calls.find((c) => c.run);
    expect(cascata).toBeDefined();
    expect(cascata?.steps).toEqual(TOURS.cascata);
  });
});
