import { describe, expect, it } from 'vitest';
import {
  listRowAria,
  listRowClasses,
  listRowIconBoxClasses,
  listRowIconGlyphClasses,
  listRowTitleClasses,
} from '@/lib/listRowStates';

/**
 * O que estes testes protegem é a regra do padrão, não a aparência: seleção
 * múltipla é NEUTRA e o acento pertence ao vínculo. Um `bg-primary/5` que
 * reapareça no estado "selecionado" reprova aqui.
 *
 * O caso "ambos" tem teste próprio porque é onde o `cn` (twMerge) poderia
 * colapsar `border-primary` com `border-l-border` e apagar a barra.
 */
describe('listRowClasses', () => {
  it('em repouso usa a superfície do card e ganha hover', () => {
    const c = listRowClasses();
    expect(c).toContain('bg-card');
    expect(c).toContain('hover:bg-muted/60');
    expect(c).toContain('border-border');
    expect(c).not.toContain('bg-muted ');
  });

  it('selecionado é neutro: fundo muted e barra, SEM acento', () => {
    const c = listRowClasses({ selecionado: true });
    expect(c).toContain('bg-muted');
    expect(c).toContain('border-l-border');
    expect(c).toContain('border-border');
    expect(c).not.toContain('border-primary');
    expect(c).not.toContain('bg-primary');
    // Linha já marcada não realça de novo no hover.
    expect(c).not.toContain('hover:');
  });

  it('vinculado é quem usa o acento, sobre a superfície do card', () => {
    const c = listRowClasses({ vinculado: true });
    expect(c).toContain('border-primary');
    expect(c).toContain('bg-card');
    expect(c).not.toContain('bg-muted');
    expect(c).not.toContain('hover:');
  });

  it('ambos combina fundo neutro, borda de acento e barra — nada é colapsado', () => {
    const c = listRowClasses({ selecionado: true, vinculado: true });
    expect(c).toContain('bg-muted');
    expect(c).toContain('border-primary');
    expect(c).toContain('border-l-border');
    expect(c).toContain('border-l-2');
  });

  it('desabilitado perde o hover e esmaece', () => {
    const c = listRowClasses({ desabilitado: true });
    expect(c).toContain('opacity-60');
    expect(c).toContain('cursor-not-allowed');
    expect(c).not.toContain('hover:');
  });
});

describe('reforço não-cromático', () => {
  it('inverte o ícone só no vínculo', () => {
    expect(listRowIconBoxClasses({ vinculado: true })).toContain('bg-primary');
    expect(listRowIconBoxClasses({ selecionado: true, vinculado: true })).toContain('bg-primary');
    expect(listRowIconGlyphClasses({ vinculado: true }, 'text-red-500')).toBe('text-primary-foreground');
    expect(listRowIconGlyphClasses({ selecionado: true }, 'text-red-500')).toBe('text-red-500');
  });

  it('o quadrado do ícone nunca tem o mesmo fundo da linha', () => {
    // Em repouso a linha é `card`; marcada, vira `muted`. O quadrado anda ao
    // contrário para continuar visível nos dois casos.
    expect(listRowClasses()).toContain('bg-card');
    expect(listRowIconBoxClasses()).toContain('bg-muted');
    expect(listRowClasses({ selecionado: true })).toContain('bg-muted');
    expect(listRowIconBoxClasses({ selecionado: true })).toContain('bg-background');
  });

  it('anuncia o item ativo com aria-current, e só ele', () => {
    expect(listRowAria({ vinculado: true })).toEqual({ 'aria-current': 'true' });
    expect(listRowAria({ selecionado: true })).toEqual({});
    expect(listRowAria()).toEqual({});
  });

  it('engrossa o título quando marcado', () => {
    expect(listRowTitleClasses({ selecionado: true })).toContain('font-medium');
    expect(listRowTitleClasses()).toContain('font-normal');
  });
});
