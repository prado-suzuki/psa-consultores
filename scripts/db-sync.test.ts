import { describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Isola consulta sem executar o planejamento nem acessar o banco.
const script = readFileSync(new URL('./db-sync.ts', import.meta.url), 'utf8');
const consulta = script.slice(script.indexOf('function consulta('), script.indexOf('\nconst aplicaArquivo'));
const codigo = ts.transpile(consulta);

// Mesma isolacao para os dois hashes de arquivo, que tambem nao tocam no banco.
const codigoHash = ts.transpile(
  script.slice(script.indexOf('const sha ='), script.indexOf('const hashDoSql')),
);
const hash = (fn: 'sha' | 'shaConteudo', texto: string): string =>
  runInNewContext(`${codigoHash}\n${fn}(texto)`, { createHash, texto }) as string;

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

describe('db-sync: hash do arquivo', () => {
  const migration = 'alter table public.t\n  add column if not exists c text;\n';
  const comCrlf = migration.replace(/\n/g, '\r\n');

  test('shaConteudo ignora o fim de linha', () => {
    // `core.autocrlf=true` (default do Git para Windows) entrega o mesmo arquivo com
    // CRLF em disco. Se isso mudasse o hash, o plano acusaria o repositorio inteiro
    // como alterado naquela maquina, e um --apply reaplicaria DDL antigo.
    expect(hash('shaConteudo', comCrlf)).toBe(hash('shaConteudo', migration));
  });

  test('shaConteudo continua vendo conteudo editado', () => {
    // O detector de "alteradas" so serve se ainda pegar edicao de verdade.
    expect(hash('shaConteudo', `${migration}-- editei depois de aplicar\n`))
      .not.toBe(hash('shaConteudo', migration));
  });

  test('o sha cru distingue CRLF, e e por isso que o shaBruto existe', () => {
    // As linhas de ledger carimbadas antes da correcao guardam ESTE hash, com o fim
    // de linha de quem aplicou. Se o sha cru passasse a normalizar tambem, o
    // shaBruto viraria copia do shaConteudo e essas linhas seriam dadas por
    // alteradas.
    expect(hash('sha', comCrlf)).not.toBe(hash('sha', migration));
  });
});
