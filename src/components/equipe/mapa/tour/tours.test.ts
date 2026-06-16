import { describe, it, expect } from 'vitest';
import { MAPA_BASE, ROUTE_TO_TOUR, TOURS } from './tours';

describe('tours', () => {
  it('todo passo de todo tour tem target e content', () => {
    for (const [id, steps] of Object.entries(TOURS)) {
      expect(steps.length, `tour "${id}" deve ter passos`).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.target, `passo do tour "${id}" sem target`).toBeTruthy();
        expect(step.content, `passo do tour "${id}" sem content`).toBeTruthy();
      }
    }
  });

  it('ROUTE_TO_TOUR só aponta para tours existentes', () => {
    for (const id of Object.values(ROUTE_TO_TOUR)) {
      expect(TOURS[id], `rota mapeada para tour inexistente "${id}"`).toBeDefined();
    }
  });

  it('a landing do MAPA mapeia para o tour de boas-vindas', () => {
    expect(ROUTE_TO_TOUR[MAPA_BASE]).toBe('welcome');
  });
});
