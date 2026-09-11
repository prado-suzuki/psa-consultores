import { describe, expect, it } from 'vitest';

import { prioridadeDoProjeto, prioridadeDoProjetoLista } from '@/lib/prioridadeDoProjeto';
import { medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca da prioridade do projeto. **Ela nasce VAZIA**, e é esse o ponto.
 *
 * O defeito que ela guarda não é cor crua: é **duas palavras iguais dizendo
 * coisas diferentes**. O `switch` do `projectPresentation` mandava `crítica`,
 * `urgent` e `high` para "Alta" em vermelho e `alta` para "Alta" em laranja —
 * dois projetos de urgência diferente, a mesma palavra, cores diferentes. Um
 * teste de cor não pegaria isso; por isso a asserção do rótulo está aqui junto.
 */
const RE_ESCADA_ESCRITA_A_MAO = /priority === '(high|medium|low)'[\s\S]{0,120}?(?:bg|text|border)-[a-z]/g;

const RECADO = 'Voltou escada de prioridade de projeto escrita na tela.\n'
  + "A escada e os dois vocabulários (pt e en) moram em @/lib/prioridadeDoProjeto:\n"
  + '  const p = prioridadeDoProjeto(valor);  // null quando a palavra é desconhecida\n'
  + '  <Badge variant="outline" className={p.badge}>{p.label}</Badge>';

describe('prioridade do projeto', () => {
  it('nenhuma tela escreve a escada à mão', () => {
    expect(medirCorCrua(RE_ESCADA_ESCRITA_A_MAO), RECADO).toEqual({});
  });

  it('crítica e alta são palavras diferentes — era o defeito', () => {
    expect(prioridadeDoProjeto('crítica')?.label).toBe('Crítica');
    expect(prioridadeDoProjeto('urgent')?.label).toBe('Crítica');
    expect(prioridadeDoProjeto('alta')?.label).toBe('Alta');
    expect(prioridadeDoProjeto('high')?.label).toBe('Alta');
    expect(prioridadeDoProjeto('crítica')?.label).not.toBe(prioridadeDoProjeto('alta')?.label);
  });

  it('as duas línguas caem no mesmo degrau, com a mesma cor', () => {
    for (const [pt, en] of [['baixa', 'low'], ['média', 'medium'], ['alta', 'high'], ['crítica', 'urgent']]) {
      expect(prioridadeDoProjeto(pt), `${pt} × ${en}`).toEqual(prioridadeDoProjeto(en));
    }
  });

  it('palavra desconhecida devolve null, e a tela mostra o valor cru', () => {
    // A prioridade do cadastro sai de texto livre na descrição: "-" e erro de
    // digitação chegam mesmo. Degrau arbitrário afirmaria urgência que ninguém escreveu.
    expect(prioridadeDoProjeto('-')).toBeNull();
    expect(prioridadeDoProjeto('')).toBeNull();
    expect(prioridadeDoProjeto(null)).toBeNull();
  });

  it('a escada sobe, e todo degrau veste papel do contrato', () => {
    expect(prioridadeDoProjetoLista.map((p) => p.key)).toEqual(['baixa', 'media', 'alta', 'critica']);
    for (const degrau of prioridadeDoProjetoLista) {
      expect(degrau.badge, degrau.key).toMatch(/bg-(status-|muted)/);
    }
  });
});
