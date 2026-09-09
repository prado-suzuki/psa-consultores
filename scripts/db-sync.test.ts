import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Isola consulta sem executar o planejamento nem acessar o banco.
const script = readFileSync(new URL('./db-sync.ts', import.meta.url), 'utf8');
const consulta = script.slice(script.indexOf('function consulta('), script.indexOf('\nconst aplicaArquivo'));
const codigo = ts.transpile(consulta);

describe('db-sync: saida JSON da CLI', () => {
  test.each([
    '[{"existe":true}]',
    'Initialising login role...\n[{"existe":true}]',
    '{"rows":[{"existe":true}]}',
    'Initialising login role...\n{"rows":[{"existe":true}]}',
  ])('solicita JSON explicitamente e interpreta rows: %s', (saida) => {
    const chamadas: unknown[][] = [];
    const resultado = runInNewContext(`${codigo}\nconsulta('SQL de teste')`, {
      sh: (...args: unknown[]) => {
        chamadas.push(args);
        return saida;
      },
    });

    expect(chamadas).toEqual([
      ['supabase', ['db', 'query', '--linked', '--output', 'json', 'SQL de teste']],
    ]);
    expect(resultado).toEqual([{ existe: true }]);
  });

  test.each(['[]', '{"rows":[]}'])('aceita resultado vazio: %s', (saida) => {
    expect(runInNewContext(`${codigo}\nconsulta('SQL de teste')`, {
      sh: () => saida,
    })).toEqual([]);
  });

  test('rejeita saida tabular sem JSON', () => {
    expect(() => runInNewContext(`${codigo}\nconsulta('SQL de teste')`, {
      sh: () => 'existe\ntrue',
    })).toThrow('resposta sem JSON');
  });
});
