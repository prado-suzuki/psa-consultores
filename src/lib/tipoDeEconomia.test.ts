import { describe, expect, it } from 'vitest';

import { TIPOS_DE_ECONOMIA, tipoDeEconomia, tiposDeEconomia } from '@/lib/tipoDeEconomia';

describe('tipo de economia', () => {
  it('chave desconhecida não quebra o render, e não inventa cor', () => {
    // As duas telas que este mapa unificou já se comportavam assim: o ícone
    // sumia e o rótulo caía no valor cru. Quem chama continua decidindo — o que
    // não pode é o mapa devolver um tom pintado para um tipo que não existe.
    expect(tipoDeEconomia('inexistente')).toBeNull();
    expect(tipoDeEconomia(null)).toBeNull();
    expect(tipoDeEconomia(undefined)).toBeNull();
    expect(tipoDeEconomia('')).toBeNull();
  });

  it('os três tipos têm tom categórico, e nenhum repete', () => {
    // Repetir tom aqui seria o defeito que a fila de cartões do Impacto tinha:
    // duas medidas sem relação pintadas igual, num conjunto onde a cor é
    // justamente o que distingue.
    const tons = TIPOS_DE_ECONOMIA.map(config => config.tom);
    expect(tons).toEqual(['text-tag-b', 'text-tag-c', 'text-tag-d']);
    expect(new Set(tons).size).toBe(tons.length);
  });

  it('a classe é literal, senão o Tailwind não a gera', () => {
    // O Tailwind procura nomes de classe LITERAIS no código-fonte. Uma classe
    // montada por interpolação (`text-tag-${letra}`) não é encontrada, não entra
    // no CSS, e o ícone sai sem cor — sem erro de build, de lint ou de tipo.
    // Esta asserção trava a forma, não só o valor.
    for (const config of TIPOS_DE_ECONOMIA) {
      expect(config.tom).toMatch(/^text-tag-[a-d]$/);
    }
  });

  it('a ordem de exibição é a das seções do formulário', () => {
    expect(TIPOS_DE_ECONOMIA.map(config => config.key)).toEqual([
      'system',
      'build_vs_buy',
      'other',
    ]);
    expect(Object.keys(tiposDeEconomia)).toHaveLength(TIPOS_DE_ECONOMIA.length);
  });
});
