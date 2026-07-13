// Integridade dos ALVOS do tour: todo seletor [data-tour="X"] referenciado num
// passo dos TOURS precisa existir de fato no código — como atributo
// data-tour="X"/dataTour="X" numa página/componente OU como literal do mapa
// NAV_TOURS do Layout (a sidebar aplica data-tour={NAV_TOURS[rota]}).
//
// Por que importa: o React Joyride falha SILENCIOSO quando o alvo não existe —
// o passo simplesmente não aparece. Renomear/remover uma âncora quebra o guia
// sem erro. Este teste é o mesmo espírito do de tooltips (`tooltips.test.ts`).

import { describe, it, expect } from 'vitest';
import { TOURS } from './tours';

// Código-fonte do módulo como texto (Vite ?raw), pra varrer as âncoras reais.
const fontes = import.meta.glob('../../../../**/*.{tsx,ts}', {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;
const codigo = Object.entries(fontes)
  .filter(([p]) => !p.includes('.test.'))
  .map(([, src]) => src)
  .join('\n');

// Âncoras DEFINIDAS: data-tour="X" | dataTour="X" | dataTour={'X'} e os literais
// 'nav-...' do mapa NAV_TOURS (aplicados via data-tour={NAV_TOURS[l.to]}).
const definidos = new Set<string>();
for (const m of codigo.matchAll(/(?:data-tour|dataTour)=(?:"([^"]+)"|\{['"]([^'"]+)['"]\})/g)) {
  definidos.add(m[1] ?? m[2]);
}
for (const m of codigo.matchAll(/['"](nav-[a-z-]+)['"]/g)) {
  definidos.add(m[1]);
}

// Âncoras REFERENCIADAS nos passos — só os seletores [data-tour="X"]
// (targets como 'body' ou seletores de classe não são âncoras e são ignorados).
function referenciados(): { tour: string; alvo: string }[] {
  const out: { tour: string; alvo: string }[] = [];
  for (const [tour, steps] of Object.entries(TOURS)) {
    for (const step of steps) {
      const m = String(step.target).match(/^\[data-tour="([^"]+)"\]$/);
      if (m) out.push({ tour, alvo: m[1] });
    }
  }
  return out;
}

describe('integridade dos alvos do tour', () => {
  it('todo [data-tour] referenciado nos TOURS existe no código', () => {
    const faltando = referenciados().filter(({ alvo }) => !definidos.has(alvo));
    expect(faltando, `âncoras de tour inexistentes no código: ${JSON.stringify(faltando)}`).toEqual([]);
  });

  it('a varredura encontrou âncoras (sanidade do glob ?raw)', () => {
    expect(definidos.size).toBeGreaterThan(10);
    expect(referenciados().length).toBeGreaterThan(10);
  });
});
