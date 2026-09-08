// Integridade dos guias da Tax: toda âncora citada num passo precisa existir no
// código como `data-tour="X"` ou `dataTour="X"`.
//
// Por que importa: o React Joyride falha SILENCIOSO quando o alvo não existe. O
// passo simplesmente não aparece, e o guia fica menor sem ninguém saber por quê.
// Renomear uma classe não quebra nada aqui, mas renomear uma âncora quebra, e é
// esse o erro que este teste pega. Mesmo espírito do `tourTargets.test.ts` do
// MAPA, que cobre os tours de lá.

import { describe, it, expect } from 'vitest';
import { ROTA_PARA_TOUR, TAX_TOURS, resolverTourTax, type TaxTourId } from './tours';

const fontes = import.meta.glob('../../../../**/*.{tsx,ts}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const codigo = Object.entries(fontes)
  .filter(([caminho]) => !caminho.includes('.test.'))
  .map(([, src]) => src)
  .join('\n');

const ancorasNoCodigo = new Set<string>();
for (const m of codigo.matchAll(/(?:data-tour|dataTour)=(?:"([^"]+)"|\{['"]([^'"]+)['"]\})/g)) {
  ancorasNoCodigo.add(m[1] ?? m[2]);
}
// Âncora condicional, do tipo `data-tour={ancoraDoTour ? 'clientes-seta' : undefined}`:
// só a primeira linha da lista e o primeiro cartão do lote a recebem.
for (const m of codigo.matchAll(/ancoraDoTour \? '([a-z-]+)'/g)) {
  ancorasNoCodigo.add(m[1]);
}

function ancorasDosPassos(): { tour: string; alvo: string }[] {
  const fora: { tour: string; alvo: string }[] = [];
  for (const [tour, passos] of Object.entries(TAX_TOURS)) {
    for (const passo of passos) {
      const m = String(passo.target).match(/^\[data-tour="([^"]+)"\]$/);
      if (m) fora.push({ tour, alvo: m[1] });
    }
  }
  return fora;
}

describe('guias da Tax', () => {
  it('toda âncora referenciada nos passos existe no código', () => {
    const faltando = ancorasDosPassos().filter(({ alvo }) => !ancorasNoCodigo.has(alvo));
    expect(faltando, `âncoras inexistentes: ${JSON.stringify(faltando)}`).toEqual([]);
  });

  it('a varredura achou âncoras (sanidade do glob ?raw)', () => {
    expect(ancorasNoCodigo.size).toBeGreaterThan(10);
    expect(ancorasDosPassos().length).toBeGreaterThan(10);
  });

  it('todo passo tem título e conteúdo, e nenhum tour está vazio', () => {
    for (const [tour, passos] of Object.entries(TAX_TOURS)) {
      expect(passos.length, `tour vazio: ${tour}`).toBeGreaterThan(0);
      for (const passo of passos) {
        expect(String(passo.title ?? ''), `passo sem título em ${tour}`).not.toBe('');
        expect(String(passo.content ?? ''), `passo sem conteúdo em ${tour}`).not.toBe('');
      }
    }
  });

  it('as três telas com guia resolvem pela rota, e o resto não', () => {
    expect(resolverTourTax('/equipe/tax/projetos/clientes')).toBe('clientes');
    expect(resolverTourTax('/equipe/tax/projetos/cadastro')).toBe('tarefas');
    expect(resolverTourTax('/equipe/tax/projetos/cadastro-lote')).toBe('lote');
    // Rota da área sem guia próprio: o "?" não deve aparecer nem cair em outro.
    expect(resolverTourTax('/equipe/tax/projetos/feed')).toBeNull();
    expect(resolverTourTax('/equipe/tax')).toBeNull();
  });

  it('o guia de cada rota mapeada existe em TAX_TOURS', () => {
    for (const id of Object.values(ROTA_PARA_TOUR)) {
      expect(TAX_TOURS[id], `rota aponta para tour inexistente: ${id}`).toBeDefined();
    }
  });

  it('os guias de modal e diálogo NÃO abrem por rota', () => {
    // Eles são disparados por quem abre o modal (as âncoras só existem então).
    const porRota = new Set<TaxTourId>(Object.values(ROTA_PARA_TOUR));
    for (const id of ['modal-cliente', 'modal-os', 'criar-projeto'] as TaxTourId[]) {
      expect(porRota.has(id), `${id} não deveria abrir por rota`).toBe(false);
    }
  });
});
