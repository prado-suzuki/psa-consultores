#!/usr/bin/env bun
/**
 * Catraca de idempotência das migrations.
 *
 * Por que ela existe: o schema do banco tem DOIS escritores (nós, no sandbox, e o
 * Lovable, em produção) e o Lovable devolve o mesmo DDL num arquivo com nome de
 * UUID. Para o ledger do sandbox essa cópia é uma versão inédita, então o DDL
 * roda DUAS vezes. Se a migration for idempotente isso é um no-op inofensivo; se
 * não for, é erro no meio de um push (ou dano). A regra vale para todo arquivo
 * novo: rodar duas vezes tem de dar no mesmo.
 *
 * Ela olha SÓ os arquivos passados por argumento, que na CI são os do diff do PR.
 * Nunca o histórico inteiro: regra que nasce reprovando o legado morre desligada.
 *
 * Escotilhas, nesta ordem de preferência:
 *   1. `-- idempotencia-ok: <motivo>` na linha da ocorrência ou na de cima.
 *   2. o arquivo inteiro listado em supabase/migrations/.idempotencia-excecoes
 *      (para migration escrita pelo agente do Lovable, que não editamos).
 * Motivo em branco não libera nada.
 *
 * Uso: bun scripts/checa-idempotencia-migrations.ts <arquivo.sql> [...]
 */
import { readFileSync, existsSync } from 'node:fs';

const ARQUIVO_EXCECOES = 'supabase/migrations/.idempotencia-excecoes';

/**
 * Apaga do SQL tudo que não é código: comentários, literais de texto e blocos
 * $$...$$. Preserva o comprimento e as quebras de linha, para que o número de
 * linha do achado continue valendo.
 *
 * Os blocos de dólar são o ponto mais importante daqui. O jeito CERTO de guardar
 * uma constraint é justamente `do $$ ... alter table add constraint ... $$`; sem
 * mascarar o miolo, a catraca reprovaria o padrão que ela existe para incentivar.
 *
 * É um scanner e não uma cadeia de regex porque as duas ordens possíveis erram:
 * mascarar comentário antes come o `--` de dentro de um literal, e mascarar
 * literal antes come a apóstrofe de dentro de um comentário.
 */
function mascarar(sql: string): string {
  const saida = sql.split('');
  const n = sql.length;
  const apagar = (de: number, ate: number) => {
    for (let k = de; k < Math.min(ate, n); k++) if (saida[k] !== '\n') saida[k] = ' ';
  };

  let i = 0;
  while (i < n) {
    const c = sql[i];

    if (c === '-' && sql[i + 1] === '-') {
      const fim = sql.indexOf('\n', i);
      const ate = fim < 0 ? n : fim;
      apagar(i, ate);
      i = ate;
      continue;
    }

    if (c === '/' && sql[i + 1] === '*') {
      const fim = sql.indexOf('*/', i + 2);
      const ate = fim < 0 ? n : fim + 2;
      apagar(i, ate);
      i = ate;
      continue;
    }

    if (c === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") { j += 2; continue; } // apóstrofe escapada
          break;
        }
        j++;
      }
      apagar(i, j + 1);
      i = j + 1;
      continue;
    }

    if (c === '"') { // identificador entre aspas: não é código nem lixo, só pula
      const fim = sql.indexOf('"', i + 1);
      i = fim < 0 ? n : fim + 1;
      continue;
    }

    if (c === '$') {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))?.[0];
      if (tag) {
        const fim = sql.indexOf(tag, i + tag.length);
        const ate = fim < 0 ? n : fim + tag.length;
        apagar(i, ate);
        i = ate;
        continue;
      }
    }

    i++;
  }

  return saida.join('');
}

type Regra = { nome: string; re: RegExp; conserto: string };

const REGRAS: Regra[] = [
  {
    nome: 'CREATE TABLE sem IF NOT EXISTS',
    re: /\bcreate\s+(?:unlogged\s+|global\s+|local\s+|temp\s+|temporary\s+)*table\s+(?!if\s+not\s+exists)/gi,
    conserto: 'create table if not exists ...',
  },
  {
    nome: 'ADD COLUMN sem IF NOT EXISTS',
    re: /\badd\s+column\s+(?!if\s+not\s+exists)/gi,
    conserto: 'add column if not exists ...',
  },
  {
    nome: 'ALTER TABLE ... ADD sem a palavra COLUMN',
    re: /\balter\s+table\s+(?:if\s+exists\s+)?[\w".]+\s+add\s+(?!column\b|constraint\b|primary\b|foreign\b|unique\b|check\b|exclude\b)/gi,
    conserto: 'escreva add column if not exists ... (a forma implícita não aceita a guarda)',
  },
  {
    nome: 'CREATE INDEX sem IF NOT EXISTS',
    re: /\bcreate\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?!if\s+not\s+exists)/gi,
    conserto: 'create index if not exists ...',
  },
  {
    nome: 'CREATE FUNCTION/PROCEDURE sem OR REPLACE',
    re: /\bcreate\s+(?!or\s+replace\s+)(?:function|procedure)\b/gi,
    conserto: 'create or replace function ...',
  },
  {
    nome: 'CREATE MATERIALIZED VIEW sem IF NOT EXISTS',
    re: /\bcreate\s+materialized\s+view\s+(?!if\s+not\s+exists)/gi,
    conserto: 'create materialized view if not exists ... (matview não aceita or replace)',
  },
  {
    nome: 'CREATE TYPE sem guarda',
    re: /\bcreate\s+type\b/gi,
    conserto: 'do $$ begin if not exists (select 1 from pg_type where typname = \'x\') then create type ...; end if; end $$;',
  },
  {
    nome: 'ALTER TYPE ... ADD VALUE sem IF NOT EXISTS',
    re: /\badd\s+value\s+(?!if\s+not\s+exists)/gi,
    conserto: 'alter type x add value if not exists \'y\'',
  },
  {
    nome: 'CREATE SCHEMA sem IF NOT EXISTS',
    re: /\bcreate\s+schema\s+(?!if\s+not\s+exists)/gi,
    conserto: 'create schema if not exists ...',
  },
  {
    nome: 'CREATE EXTENSION sem IF NOT EXISTS',
    re: /\bcreate\s+extension\s+(?!if\s+not\s+exists)/gi,
    conserto: 'create extension if not exists ...',
  },
  {
    nome: 'CREATE SEQUENCE sem IF NOT EXISTS',
    re: /\bcreate\s+sequence\s+(?!if\s+not\s+exists)/gi,
    conserto: 'create sequence if not exists ...',
  },
  {
    nome: 'DROP sem IF EXISTS',
    re: /\bdrop\s+(?:table|view|materialized\s+view|column|policy|trigger|function|procedure|index|type|constraint|schema|sequence|publication)\s+(?!if\s+exists)/gi,
    conserto: 'drop ... if exists',
  },
];

/** Nome do objeto num `create policy "x" on t` / `drop policy if exists "x" on t`. */
function nomesDe(sql: string, re: RegExp): Set<string> {
  const achados = new Set<string>();
  for (const m of sql.matchAll(re)) achados.add(m[1].replace(/^"|"$/g, '').toLowerCase());
  return achados;
}

type Achado = { arquivo: string; linha: number; regra: string; conserto: string };

function checar(arquivo: string): Achado[] {
  const bruto = readFileSync(arquivo, 'utf8');
  const sql = mascarar(bruto);

  // As escotilhas de linha saem do texto BRUTO: no mascarado o comentário já foi.
  const liberadas = new Set<number>();
  bruto.split('\n').forEach((linha, idx) => {
    const m = /--\s*idempotencia-ok\s*:\s*(\S.*)$/i.exec(linha);
    if (m) { liberadas.add(idx + 1); liberadas.add(idx + 2); }
  });

  const linhaDe = (pos: number) => sql.slice(0, pos).split('\n').length;
  const achados: Achado[] = [];

  for (const regra of REGRAS) {
    for (const m of sql.matchAll(regra.re)) {
      const linha = linhaDe(m.index!);
      if (liberadas.has(linha)) continue;
      achados.push({ arquivo, linha, regra: regra.nome, conserto: regra.conserto });
    }
  }

  // Pares obrigatórios: para policy e trigger não existe IF NOT EXISTS, então a
  // forma idempotente é o par `drop ... if exists` + `create ...`.
  const paraCada = [
    { que: 'policy', criar: /\bcreate\s+policy\s+("(?:[^"]+)"|[\w]+)/gi, dropar: /\bdrop\s+policy\s+if\s+exists\s+("(?:[^"]+)"|[\w]+)/gi },
    { que: 'trigger', criar: /\bcreate\s+(?!or\s+replace\s+)trigger\s+("(?:[^"]+)"|[\w]+)/gi, dropar: /\bdrop\s+trigger\s+if\s+exists\s+("(?:[^"]+)"|[\w]+)/gi },
    // Constraint também não tem IF NOT EXISTS. Vale o par, ou um do $$ ... $$ com
    // a consulta a pg_constraint (esse nem chega aqui, o mascarador já o apagou).
    { que: 'constraint', criar: /\badd\s+constraint\s+("(?:[^"]+)"|[\w]+)/gi, dropar: /\bdrop\s+constraint\s+if\s+exists\s+("(?:[^"]+)"|[\w]+)/gi },
    // View tem `or replace`, e o `create` sozinho abaixo só chega aqui quando ele
    // não foi usado. Mas o par `drop view if exists` + `create` é igualmente
    // idempotente, e é a forma OBRIGATÓRIA quando a lista de colunas muda: o
    // `or replace` recusa mudança de nome, tipo ou ordem de coluna existente.
    { que: 'view', criar: /\bcreate\s+(?!or\s+replace\s+)(?:materialized\s+)?view\s+("(?:[^"]+)"|[\w.]+)/gi, dropar: /\bdrop\s+(?:materialized\s+)?view\s+if\s+exists\s+("(?:[^"]+)"|[\w.]+)/gi },
  ];
  for (const { que, criar, dropar } of paraCada) {
    const dropados = nomesDe(sql, dropar);
    for (const m of sql.matchAll(criar)) {
      const nome = m[1].replace(/^"|"$/g, '').toLowerCase();
      if (dropados.has(nome)) continue;
      const linha = linhaDe(m.index!);
      if (liberadas.has(linha)) continue;
      achados.push({
        arquivo,
        linha,
        regra:
          que === 'constraint'
            ? `ADD CONSTRAINT ${nome} sem DROP CONSTRAINT IF EXISTS antes`
            : que === 'view'
              ? `CREATE VIEW ${nome} sem OR REPLACE e sem DROP VIEW IF EXISTS antes`
              : `CREATE ${que.toUpperCase()} "${nome}" sem DROP ... IF EXISTS antes`,
        conserto:
          que === 'constraint'
            ? `alter table ... drop constraint if exists ${nome};  antes do add`
            : que === 'view'
              ? `create or replace view ${nome}, ou drop view if exists ${nome}; antes do create`
              : `drop ${que} if exists "${nome}" on ...;  antes do create`,
      });
    }
  }

  // INSERT de dado precisa de guarda, senão a segunda passada duplica linha ou
  // estoura unique. Vale por statement, não pelo arquivo.
  //
  // São TRÊS guardas válidas, não uma. `on conflict` depende de existir unique
  // constraint em que se apoiar, e várias tabelas daqui não têm; num
  // `insert ... select`, a guarda idiomática é o anti-join (`where not exists`
  // ou `not in`), e ela é tão boa quanto. Exigir só `on conflict` reprovava
  // migration correta, que foi o que esta regra fez na primeira versão.
  const temGuarda = (s: string) =>
    /\bon\s+conflict\b/i.test(s) || /\bnot\s+exists\b/i.test(s) || /\bnot\s+in\s*\(/i.test(s);

  let offset = 0;
  for (const stmt of sql.split(';')) {
    if (/\binsert\s+into\b/i.test(stmt) && !temGuarda(stmt)) {
      const pos = offset + stmt.search(/\binsert\s+into\b/i);
      const linha = linhaDe(pos);
      if (!liberadas.has(linha)) {
        achados.push({
          arquivo,
          linha,
          regra: 'INSERT sem guarda',
          conserto: 'on conflict do nothing, ou where not exists (...) no insert ... select',
        });
      }
    }
    offset += stmt.length + 1;
  }

  return achados.sort((a, b) => a.linha - b.linha);
}

function excecoes(): Set<string> {
  if (!existsSync(ARQUIVO_EXCECOES)) return new Set();
  return new Set(
    readFileSync(ARQUIVO_EXCECOES, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean),
  );
}

const arquivos = process.argv.slice(2).filter((a) => a.endsWith('.sql'));
if (arquivos.length === 0) {
  console.log('Nenhuma migration para checar.');
  process.exit(0);
}

const dispensados = excecoes();
const achados: Achado[] = [];
for (const arquivo of arquivos) {
  const base = arquivo.split('/').pop()!;
  if (dispensados.has(base)) {
    console.log(`- ${base}: dispensado por ${ARQUIVO_EXCECOES}`);
    continue;
  }
  achados.push(...checar(arquivo));
}

if (achados.length === 0) {
  console.log(`OK: ${arquivos.length} migration(s) idempotente(s).`);
  process.exit(0);
}

console.error('\nMigration não idempotente. Rodar duas vezes tem de dar no mesmo.\n');
console.error('Isso importa porque o Lovable devolve o mesmo DDL num arquivo com nome');
console.error('de UUID, e o DDL acaba rodando duas vezes no sandbox.\n');
for (const a of achados) {
  console.error(`${a.arquivo}:${a.linha}  ${a.regra}`);
  console.error(`   -> ${a.conserto}\n`);
}
console.error(`${achados.length} ocorrência(s).`);
console.error('Escotilha, com motivo escrito: -- idempotencia-ok: <motivo>');
process.exit(1);
