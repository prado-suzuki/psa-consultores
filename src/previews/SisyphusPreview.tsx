import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import OsgSisyphusAnimated from '@/components/equipe/osg/OsgSisyphusAnimated';
import '@/index.css';

const backgrounds = {
  claro: '#f6f1e9',
  branco: '#ffffff',
  escuro: '#0b1024',
} as const;

type Background = keyof typeof backgrounds;

export const SisyphusPreview = () => {
  const [size, setSize] = useState(640);
  const [background, setBackground] = useState<Background>('claro');
  const [paused, setPaused] = useState(false);

  return (
    <main className="min-h-screen bg-[#11152a] px-5 py-8 text-[#f6f1e9] sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-white/15 pb-6 md:flex-row md:items-end">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-[#c49a6c]">
              OSG Work / estudo de movimento
            </p>
            <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              Sísifo, em movimento
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Figura redesenhada em partes articuladas. Sem selo, sem deslocamento na rampa e com
              pedra em rotação contínua.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Fundos da visualização">
            {(Object.keys(backgrounds) as Background[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setBackground(option)}
                className={`rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wider transition ${
                  background === option
                    ? 'border-[#c49a6c] bg-[#c49a6c] text-[#141a36]'
                    : 'border-white/20 text-white/70 hover:border-white/50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </header>

        <section
          className={`relative grid min-h-[560px] place-items-center overflow-hidden rounded-[2rem] shadow-2xl ${paused ? 'sisifo-paused' : ''}`}
          style={{ backgroundColor: backgrounds[background] }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'linear-gradient(#141a36 1px, transparent 1px), linear-gradient(90deg, #141a36 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <OsgSisyphusAnimated
            size={size}
            className="h-auto max-w-[92%]"
            label="Prévia animada de Sísifo empurrando a pedra"
            paused={paused}
          />
        </section>

        <footer className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="min-w-28 rounded-xl bg-[#c49a6c] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#141a36]"
          >
            {paused ? 'Reproduzir' : 'Pausar'}
          </button>
          <label className="flex flex-1 items-center gap-4 font-mono text-xs uppercase tracking-wider text-white/60">
            Escala
            <input
              type="range"
              min="240"
              max="900"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className="h-1 flex-1 accent-[#c49a6c]"
            />
            <output className="w-16 text-right text-[#c49a6c]">{size}px</output>
          </label>
        </footer>
      </div>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SisyphusPreview />
  </React.StrictMode>,
);
