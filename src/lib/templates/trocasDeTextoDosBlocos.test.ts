/**
 * As migrations que corrigem texto de bloco por troca de trecho só citam campo
 * que existe. Campo inexistente não dá erro no render: some calado da peça.
 * O teste lê a migration, que é onde a redação nova vive.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAPEIS, PAPEIS_LISTA } from './binding';
import { camposDaEntidade } from './vocabulario';

const MIGRATIONS = [
  'supabase/migrations/20260923155027_integralizacao_concorda_com_a_socia.sql',
  'supabase/migrations/20260923155204_doacao_e_usufruto_sem_nome_repetido.sql',
];

const TROCA = /pg_temp\.trocar_no_bloco\(\s*'[^']+'::uuid,\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',/g;

function trocas(arquivo: string): Array<{ de: string; para: string }> {
  const sql = readFileSync(arquivo, 'utf8');
  return [...sql.matchAll(TROCA)].map((m) => ({
    de: m[1].replace(/''/g, "'"),
    para: m[2].replace(/''/g, "'"),
  }));
}

function camposDoPapel(papel: string): Set<string> | null {
  if (papel in PAPEIS) {
    return new Set(camposDaEntidade(PAPEIS[papel as keyof typeof PAPEIS].tipo).map((c) => c.id));
  }
  for (const lista of Object.values(PAPEIS_LISTA)) {
    if (lista.itemKey !== papel) continue;
    return new Set([
      ...camposDaEntidade(lista.tipo).map((c) => c.id),
      ...(lista.camposExtras ?? []).map((c) => c.id),
    ]);
  }
  return null;
}

describe.each(MIGRATIONS)('%s', (arquivo) => {
  const lidas = trocas(arquivo);

  it('tem ao menos uma troca, e nenhuma é reaplicável sobre o próprio resultado', () => {
    expect(lidas.length).toBeGreaterThan(0);
    for (const { de, para } of lidas) expect(para.includes(de)).toBe(false);
  });

  it('o texto novo cita só campos do vocabulário', () => {
    const desconhecidos: string[] = [];
    for (const { para } of lidas) {
      for (const [, caminho] of para.matchAll(/\{\{\s*[#/]?([\w.]+)\s*\}\}/g)) {
        const [papel, campo] = caminho.split('.');
        if (!campo || papel === 'refs') continue;
        if (!camposDoPapel(papel)?.has(campo)) desconhecidos.push(caminho);
      }
    }
    expect(desconhecidos).toEqual([]);
  });

  // `qualificacao` já abre com o nome: citá-lo antes sai "FULANO, FULANO, brasileiro".
  it('não emenda o nome da pessoa à qualificação dela', () => {
    for (const { para } of lidas) {
      expect(para).not.toMatch(/\{\{\s*(\w+)\.nome\w*\s*\}\}\*?,\s*\{\{\s*\1\.qualificacao\s*\}\}/);
    }
  });
});
