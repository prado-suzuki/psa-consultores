#!/usr/bin/env bun
/**
 * Grava, como JSON, a RESPOSTA que cada endpoint do dashboard "Controle de uso
 * e envio" vai devolver — rodando no BigQuery de producao exatamente a SQL que
 * o service em Python vai rodar.
 *
 * A ideia: nao exportar a view (isso obrigaria a agregar em TypeScript e depois
 * jogar fora, porque a agregacao final e do backend). Exportar o PAYLOAD. O
 * arquivo gerado faz tres trabalhos:
 *   1. destrava o front hoje, sem backend e sem rede;
 *   2. e o CONTRATO entregue ao backend junto com o .sql que o produziu;
 *   3. vira fixture de vitest depois que o endpoint existir.
 *
 * Cada .sql em scripts/analytics-uso/ devolve UMA linha com UMA coluna
 * `payload` (TO_JSON_STRING de um STRUCT) — mesmo formato do
 * CalculadoraIbsCbsService, que tem 1 _execute_query por endpoint.
 *
 * Uso:
 *   bun scripts/dump-analytics-fixtures.ts
 *   bun scripts/dump-analytics-fixtures.ts --inicio=2026-01-01 --fim=2026-08-06
 *   bun scripts/dump-analytics-fixtures.ts --only=arquivos
 *   bun scripts/dump-analytics-fixtures.ts --segmentos=nenhum
 *
 * Requer `bq` autenticado (gcloud auth login + projeto psa-digital-prod).
 * So quem REGENERA os fixtures precisa disso; depois de commitados, o front
 * roda sem nenhuma credencial de BigQuery.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SQL_DIR = join(ROOT, 'scripts', 'analytics-uso');
const OUT_DIR = join(ROOT, 'src', 'lib', 'analytics-uso', '__fixtures__');

/** Cada entrada vira um dos dois endpoints de produção. */
const ROTAS = [
  { nome: 'uso-api', endpoint: 'GET /api/v1/analytics/uso/api-consumo' },
  { nome: 'arquivos', endpoint: 'GET /api/v1/analytics/uso/arquivos' },
] as const;

function arg(nome: string, padrao: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return hit ? hit.slice(nome.length + 3) : padrao;
}

const hoje = new Date().toISOString().slice(0, 10);
const inicio = arg('inicio', `${hoje.slice(0, 4)}-01-01`);
const fim = arg('fim', hoje);
const only = arg('only', '');
const modoSegmentos = arg('segmentos', 'todos');
const gerarSegmentos = !only && modoSegmentos !== 'nenhum';
const gerarPessoas = gerarSegmentos && modoSegmentos !== 'ferramentas';
const gerarFerramentas = gerarSegmentos && modoSegmentos !== 'usuarios';

function rodarBq(
  sql: string,
  usuario = '',
  clusterId = '',
  ferramenta = '',
): unknown {
  const args = ['query', '--use_legacy_sql=false', '--format=json', '--max_rows=1'];
  args.push(
    `--parameter=inicio:DATE:${inicio}`,
    `--parameter=fim:DATE:${fim}`,
    `--parameter=usuario:STRING:${usuario}`,
    `--parameter=cluster_id:STRING:${clusterId}`,
  );
  // A view de arquivos nao tem conceito de ferramenta; mandar o parametro
  // para uma query que nao o referencia e erro no BigQuery.
  if (sql.includes('@ferramenta')) {
    args.push(`--parameter=ferramenta:STRING:${ferramenta}`);
  }
  // `bq` e um script Python. Sem PYTHONIOENCODING, ao ter o stdout redirecionado
  // no Windows ele encoda na codepage do console (cp1252) e troca acento por
  // U+FFFD — "Execucao" chega como "Execu��o". Forcamos UTF-8 na saida
  // dele e decodificamos o buffer explicitamente, sem depender do locale.
  // Chamar o wrapper `.cmd` diretamente no Windows preserva cada argumento;
  // `shell: true` quebraria nomes com espaço (ex.: "Alexandre Silva").
  const executavelBq = process.platform === 'win32' ? 'bq.cmd' : 'bq';
  const stdout = execFileSync(executavelBq, args, {
    input: sql,
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  });
  const linhas = JSON.parse(stdout.toString('utf8')) as Array<{ payload: string }>;
  if (linhas.length !== 1 || typeof linhas[0]?.payload !== 'string') {
    throw new Error('a query deve devolver exatamente 1 linha com a coluna `payload`');
  }
  return JSON.parse(linhas[0].payload);
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`periodo: ${inicio} -> ${fim}\n`);

for (const rota of ROTAS) {
  if (only && only !== rota.nome) continue;

  const sql = readFileSync(join(SQL_DIR, `${rota.nome}.sql`), 'utf8');
  const payload = rodarBq(sql);
  const destino = join(OUT_DIR, `${rota.nome}.json`);
  const texto = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(destino, texto, 'utf8');

  const blocos = Object.entries(payload as Record<string, unknown>)
    .map(([k, v]) => (Array.isArray(v) ? `${k}[${v.length}]` : k))
    .join(' ');
  const kb = (Buffer.byteLength(texto, 'utf8') / 1024).toFixed(1);
  console.log(`${rota.nome.padEnd(9)} ${kb.padStart(6)} KB  ${rota.endpoint}`);
  console.log(`${' '.repeat(10)}${blocos}\n`);
}

if (gerarSegmentos) {
  const usoApiBase = JSON.parse(readFileSync(join(OUT_DIR, 'uso-api.json'), 'utf8')) as {
    porUsuario: Array<{ usuario: string; automacao: boolean }>;
    porFerramenta: Array<{ ferramenta: string }>;
  };
  const arquivosBase = JSON.parse(readFileSync(join(OUT_DIR, 'arquivos.json'), 'utf8')) as {
    porUsuario: Array<{ usuario: string; automacao: boolean }>;
  };
  const pessoas = [
    ...usoApiBase.porUsuario.filter((item) => !item.automacao).map((item) => item.usuario),
    ...arquivosBase.porUsuario.filter((item) => !item.automacao).map((item) => item.usuario),
  ]
    .filter(Boolean)
    .filter((usuario, indice, todos) => todos.indexOf(usuario) === indice)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const sqlUsoApi = readFileSync(join(SQL_DIR, 'uso-api.sql'), 'utf8');
  const sqlArquivos = readFileSync(join(SQL_DIR, 'arquivos.sql'), 'utf8');
  const segmentos: Record<string, { usoApi: unknown; arquivos: unknown }> = {};

  console.log(`segmentos por pessoa: ${gerarPessoas ? pessoas.length : 0}`);
  for (const [indice, usuario] of (gerarPessoas ? pessoas : []).entries()) {
    segmentos[usuario] = {
      usoApi: rodarBq(sqlUsoApi, usuario),
      arquivos: rodarBq(sqlArquivos, usuario),
    };
    console.log(`${String(indice + 1).padStart(2)}/${pessoas.length}  ${usuario}`);
  }

  if (gerarPessoas) {
    const destino = join(OUT_DIR, 'por-usuario.json');
    const texto = `${JSON.stringify(segmentos, null, 2)}\n`;
    writeFileSync(destino, texto, 'utf8');
    const kb = (Buffer.byteLength(texto, 'utf8') / 1024).toFixed(1);
    console.log(`por-usuario ${kb.padStart(6)} KB  cross-filter local`);
  }

  // Ferramenta so recorta a API — a view de arquivos nao tem esse eixo.
  if (gerarFerramentas) {
    const ferramentas = usoApiBase.porFerramenta.map((item) => item.ferramenta);
    const porFerramenta: Record<string, unknown> = {};

    console.log(`\nsegmentos por ferramenta: ${ferramentas.length}`);
    for (const [indice, ferramenta] of ferramentas.entries()) {
      porFerramenta[ferramenta] = rodarBq(sqlUsoApi, '', '', ferramenta);
      console.log(
        `${String(indice + 1).padStart(2)}/${ferramentas.length}  ${ferramenta}`,
      );
    }

    const destinoFer = join(OUT_DIR, 'por-ferramenta.json');
    const textoFer = `${JSON.stringify(porFerramenta, null, 2)}\n`;
    writeFileSync(destinoFer, textoFer, 'utf8');
    const kbFer = (Buffer.byteLength(textoFer, 'utf8') / 1024).toFixed(1);
    console.log(`por-ferramenta ${kbFer.padStart(6)} KB  filtro de ferramenta local`);
  }
}
