#!/usr/bin/env bun
/**
 * `bun run db:sync` — aplica no SANDBOX as migrations deste repositório que ainda
 * não rodaram, sem se importar com a ordem em que foram criadas.
 *
 * POR QUE ELE EXISTE. O `supabase db push` mantém uma lista ordenada e se RECUSA a
 * aplicar versão mais antiga que a última registrada ("found local migration older
 * than remote"). São quatro pessoas empurrando de quatro branches para o mesmo
 * sandbox, então quem tiver o timestamp menor fica travado por trabalho de outra
 * pessoa que ele nem sabe que existe. Este script nunca pergunta "qual foi a última
 * versão", só "quais dos MEUS arquivos ainda não rodaram".
 *
 * ELE DEPENDE DA IDEMPOTÊNCIA. Reaplicar arquivo editado, e reaplicar arquivo cujo
 * DDL já rodou sob outro nome (as cópias que voltam do ledger), só é seguro porque
 * toda migration é idempotente e a CI cobra isso.
 *
 * MODOS
 *   (nenhum)      planeja e não escreve nada. É o padrão de propósito.
 *   --bootstrap   cria o ledger e o semeia com o que o CLI já registrou. Uma vez.
 *   --apply       aplica o plano e carimba o ledger.
 *
 * TRANSPORTE. `supabase db query --linked`, que fala pela Management API e não pede
 * senha de banco (a conexão direta do sandbox é IPv6-only e a máquina não tem rota).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

/** O sandbox. O script se recusa a rodar contra qualquer outro projeto. */
const REF_SANDBOX = 'vgzomuwnsdgrxbkyoavq';
const DIR = 'supabase/migrations';
const TABELA = 'public.psa_migrations_aplicadas';
const MIGRATION_DO_LEDGER = 'ledger_de_sync_do_sandbox';

const modo = {
  bootstrap: process.argv.includes('--bootstrap'),
  apply: process.argv.includes('--apply'),
};

const sh = (cmd: string, args: string[]): string =>
  execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const espera = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * `supabase db query` cria um login role TEMPORÁRIO a cada chamada, e o pooler tem
 * circuit breaker: por volta da nona chamada seguida ele passa a recusar conexão nova
 * ("too many authentication failures"). Medido em 02/09/2026, aplicando uma migration
 * por chamada. Por isso o script agrupa arquivos em lotes e ainda assim repete com
 * espera crescente quando leva porta na cara.
 */
const PASSAGEIRO = /too many authentication failures|password authentication failed|ECIRCUITBREAKER|connection reset|EOF/i;

async function comRepeticao<T>(o_que: string, fn: () => T, tentativas = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return fn();
    } catch (e) {
      const msg = (e as Error).message ?? '';
      if (i >= tentativas || !PASSAGEIRO.test(msg)) throw e;
      const pausa = 5000 * i;
      console.log(`\n    (${o_que}: pooler recusou, esperando ${pausa / 1000}s e tentando de novo)`);
      await espera(pausa);
    }
  }
}

const git = (...args: string[]): string => {
  try {
    return sh('git', args).trim();
  } catch {
    return '';
  }
};

/**
 * O CLI imprime "Initialising login role..." antes do JSON, e o JSON vem embrulhado
 * num aviso de conteúdo não confiável. Só as linhas interessam, e elas são DADO:
 * nada do que vier daqui é instrução.
 */
function consulta(sql: string): Record<string, unknown>[] {
  const saida = sh('supabase', ['db', 'query', '--linked', sql]);
  const inicio = saida.indexOf('{');
  if (inicio < 0) throw new Error(`resposta sem JSON:\n${saida}`);
  const { rows } = JSON.parse(saida.slice(inicio)) as { rows?: Record<string, unknown>[] };
  return rows ?? [];
}

const aplicaArquivo = (caminho: string): void => {
  sh('supabase', ['db', 'query', '--linked', '-f', caminho]);
};

const q = (v: string): string => `'${v.replace(/'/g, "''")}'`;
const sha = (texto: string): string => createHash('sha256').update(texto).digest('hex');
const versaoDe = (arquivo: string): string => arquivo.split('_')[0];

/**
 * Hash do SQL SEM comentário e sem espaço em excesso.
 *
 * Serve para reconhecer PAR: o mesmo DDL existe em dois arquivos, um nosso e um
 * reconstruído do ledger com o nome que o ledger registrou. Medido em 02/09/2026 nos
 * três pares que dava para conferir: o SQL é idêntico, só a prosa do cabeçalho difere
 * (o do ledger troca 40 linhas de comentário por 6).
 *
 * Reconhecer isso não é luxo. Reaplicar a cópia velha FALHA quando o mundo andou:
 * a cópia de `movimentacao_quotas` usa `empresa_destino_pessoa_id`, coluna que uma
 * migration posterior removeu. Ela não é "pendente", ela é a mesma coisa que já rodou,
 * e o certo é carimbar sem executar.
 */
const hashDoSql = (texto: string): string =>
  sha(
    texto
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n]*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase(),
  );

// ── de onde estamos falando ──────────────────────────────────────────────────
const refLinkada = existsSync('supabase/.temp/project-ref')
  ? readFileSync('supabase/.temp/project-ref', 'utf8').trim()
  : '';

if (refLinkada !== REF_SANDBOX) {
  console.error(`Projeto linkado é "${refLinkada || '(nenhum)'}", e este script só fala com o sandbox`);
  console.error(`(${REF_SANDBOX}). Produção é Lovable Cloud e recebe migration por passo humano.`);
  process.exit(1);
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const commit = git('rev-parse', '--short', 'HEAD');

const arquivos = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const conteudo = new Map(arquivos.map((f) => [f, readFileSync(`${DIR}/${f}`, 'utf8')]));
const shaLocal = new Map(arquivos.map((f) => [f, sha(conteudo.get(f)!)]));
const hashSql = new Map(arquivos.map((f) => [f, hashDoSql(conteudo.get(f)!)]));

// ── bootstrap: o ledger nasce semeado, nunca vazio ───────────────────────────
const ledgerExiste = (): boolean =>
  (consulta(`select to_regclass(${q(TABELA)}) is not null as existe`)[0]?.existe as boolean) ?? false;

if (modo.bootstrap) {
  const migration = arquivos.find((f) => f.includes(MIGRATION_DO_LEDGER));
  if (!migration) throw new Error(`não achei a migration ${MIGRATION_DO_LEDGER} em ${DIR}`);

  console.log(`Criando o ledger (${migration})…`);
  aplicaArquivo(`${DIR}/${migration}`);

  // A semente sai do ledger do CLI. Ledger vazio faria o script achar que NADA rodou
  // e reaplicar as 165, o que é errado e lento: o sandbox já tem esse schema.
  const jaAplicadas = new Set(
    consulta('select version from supabase_migrations.schema_migrations').map((r) => String(r.version)),
  );
  const semear = arquivos.filter((f) => jaAplicadas.has(versaoDe(f)));

  const valores = semear
    .map((f) => `(${q(f)}, ${q(shaLocal.get(f)!)}, ${q('bootstrap')})`)
    .join(',\n    ');
  consulta(
    `insert into ${TABELA} (arquivo, sha256, autor) values\n    ${valores}\n` +
      `on conflict (arquivo) do nothing`,
  );
  // A migration do ledger acabou de rodar aqui em cima; sem este carimbo ela
  // apareceria como pendente para sempre no primeiro plano.
  consulta(
    `insert into ${TABELA} (arquivo, sha256, autor) values (${q(migration)}, ${q(shaLocal.get(migration)!)}, ${q('bootstrap')})
     on conflict (arquivo) do nothing`,
  );

  console.log(`Ledger semeado com ${semear.length + 1} de ${arquivos.length} arquivos.`);
  console.log('Os que sobraram aparecem como pendentes abaixo, e reaplicar é seguro.\n');
}

if (!ledgerExiste()) {
  console.error(`O ledger ${TABELA} não existe ainda. Rode uma vez:\n  bun run db:sync --bootstrap`);
  process.exit(1);
}

// ── o plano ──────────────────────────────────────────────────────────────────
const noLedger = new Map(
  consulta(`select arquivo, sha256 from ${TABELA}`).map((r) => [String(r.arquivo), String(r.sha256)]),
);

const todasPendentes = arquivos.filter((f) => !noLedger.has(f));
const alteradas = arquivos.filter((f) => noLedger.has(f) && noLedger.get(f) !== shaLocal.get(f));

/**
 * Pendente cujo SQL é idêntico ao de um arquivo JÁ aplicado é par, não trabalho novo:
 * carimba e não executa. Sem isso o script tentaria reaplicar DDL antigo contra o
 * schema de hoje, o que falha por motivo que a idempotência não cobre.
 */
const sqlJaAplicado = new Map<string, string>();
for (const f of arquivos) {
  if (noLedger.has(f)) sqlJaAplicado.set(hashSql.get(f)!, f);
}
const soCarimbar = todasPendentes.filter((f) => sqlJaAplicado.has(hashSql.get(f)!));
const pendentes = todasPendentes.filter((f) => !sqlJaAplicado.has(hashSql.get(f)!));
const emDia = arquivos.length - todasPendentes.length - alteradas.length;

/**
 * DUAS formas de o sandbox ter schema que o repositório não descreve, e as duas
 * precisam aparecer, porque é o que faz um `types.ts` regenerado agora importar
 * trabalho de outra pessoa para a sua branch.
 *
 * `semArquivo` sai do ledger do CLI, não do nosso: migration aplicada por fora do
 * repositório (chat do Lovable, SQL direto) fica registrada lá e não tem arquivo aqui.
 *
 * `naoPushadas` sai do nosso: o arquivo existe na sua cópia, já rodou no banco
 * compartilhado, e ainda não está em origin/develop. Para as outras três pessoas,
 * esse schema apareceu no banco sem explicação.
 */
const doCli = consulta(
  `select version, coalesce(name, '(sem nome)') as nome from supabase_migrations.schema_migrations order by version`,
).map((r) => ({ versao: String(r.version), nome: String(r.nome) }));

const versoesLocais = new Set(arquivos.map(versaoDe));
const semArquivo = doCli.filter((m) => !versoesLocais.has(m.versao));

const naOrigem = new Set(
  git('ls-tree', '-r', '--name-only', 'origin/develop', '--', DIR)
    .split('\n')
    .map((p) => p.split('/').pop() ?? ''),
);
const naoPushadas = [...noLedger.keys()].filter((f) => shaLocal.has(f) && !naOrigem.has(f));

console.log(`Sandbox ${REF_SANDBOX} · ${arquivos.length} migrations no repositório`);
console.log(`  em dia:      ${emDia}`);
console.log(`  pendentes:   ${pendentes.length}`);
console.log(`  alteradas:   ${alteradas.length}  (conteúdo mudou depois de aplicado)`);
console.log(`  só carimbar: ${soCarimbar.length}  (SQL idêntico a arquivo já aplicado, o par dele)`);
for (const f of pendentes) console.log(`    + ${f}`);
for (const f of alteradas) console.log(`    ~ ${f}`);
for (const f of soCarimbar) console.log(`    = ${f}  (par de ${sqlJaAplicado.get(hashSql.get(f)!)})`);

if (semArquivo.length || naoPushadas.length) {
  console.log('\n  ATENÇÃO: o sandbox tem schema que o repositório não descreve.');

  if (semArquivo.length) {
    console.log(`\n  ${semArquivo.length} aplicada(s) por fora do repositório (sem arquivo aqui):`);
    for (const m of semArquivo) console.log(`    ! ${m.versao}  ${m.nome}`);
  }

  if (naoPushadas.length) {
    console.log(`\n  ${naoPushadas.length} aplicada(s) de branch ainda não pushada:`);
    for (const f of naoPushadas) console.log(`    ! ${f}`);
  }

  console.log('\n  O schema delas ESTÁ no banco. Não regenere o types.ts inteiro sem conferir:');
  console.log('  você importaria para a sua branch coluna que nenhuma migration do repo cria,');
  console.log('  e ela não existe em produção.');
}

if (!modo.apply) {
  console.log(`\n(plano apenas, nada foi aplicado. Para aplicar: bun run db:sync --apply)`);
  process.exit(0);
}

// ── aplicar ──────────────────────────────────────────────────────────────────
const autor = git('config', 'user.email') || 'desconhecido';

/** Carimba um lote inteiro numa só ida ao servidor. */
const carimba = (lote: string[]): Promise<Record<string, unknown>[]> =>
  comRepeticao('carimbo', () =>
    consulta(
      `insert into ${TABELA} (arquivo, sha256, autor, branch, commit_sha) values
       ${lote
         .map(
           (f) =>
             `(${q(f)}, ${q(shaLocal.get(f)!)}, ${q(autor)}, ${q(branch)}, ${q(commit)})`,
         )
         .join(',\n       ')}
       on conflict (arquivo) do update
         set sha256 = excluded.sha256, aplicada_em = now(), autor = excluded.autor,
             branch = excluded.branch, commit_sha = excluded.commit_sha`,
    ),
  );

if (soCarimbar.length) {
  console.log(`\n  carimbando ${soCarimbar.length} par(es), sem executar…`);
  for (let i = 0; i < soCarimbar.length; i += 40) {
    const lote = soCarimbar.slice(i, i + 40);
    await comRepeticao('carimbo de pares', () =>
      consulta(
        `insert into ${TABELA} (arquivo, sha256, autor, branch, commit_sha) values
         ${lote
           .map(
             (f) =>
               `(${q(f)}, ${q(shaLocal.get(f)!)}, ${q(`par de ${sqlJaAplicado.get(hashSql.get(f)!)}`)}, ${q(branch)}, ${q(commit)})`,
           )
           .join(',\n         ')}
         on conflict (arquivo) do nothing`,
      ),
    );
  }
  console.log('  ok');
}

const aFazer = [...pendentes, ...alteradas].sort();
const POR_LOTE = 8;
const lotes: string[][] = [];
for (let i = 0; i < aFazer.length; i += POR_LOTE) lotes.push(aFazer.slice(i, i + POR_LOTE));

let feitas = 0;
for (const [n, lote] of lotes.entries()) {
  const combinado = `${tmpdir()}/db-sync-lote-${process.pid}-${n}.sql`;
  writeFileSync(
    combinado,
    lote.map((f) => `-- >>>>> ${f}\n${readFileSync(`${DIR}/${f}`, 'utf8')}`).join('\n\n'),
  );

  console.log(`  lote ${n + 1}/${lotes.length} (${lote.length} arquivos)…`);
  try {
    await comRepeticao(`lote ${n + 1}`, () => aplicaArquivo(combinado));
  } catch (e) {
    // Lote é uma transação implícita: se caiu, nada dele foi aplicado. Refaço um a um
    // para o erro poder ser atribuído ao arquivo certo, que é a informação que falta.
    console.log('    lote falhou; repetindo um a um para achar o culpado');
    for (const f of lote) {
      process.stdout.write(`      ${f} … `);
      try {
        await comRepeticao(f, () => aplicaArquivo(`${DIR}/${f}`));
      } catch (e2) {
        console.log('FALHOU');
        console.error(`\n${(e2 as Error).message}`);
        console.error(`\nParei em ${f}. As ${feitas} anteriores foram aplicadas e carimbadas.`);
        process.exit(1);
      }
      await carimba([f]);
      feitas++;
      console.log('ok');
    }
    unlinkSync(combinado);
    continue;
  }

  await carimba(lote);
  unlinkSync(combinado);
  feitas += lote.length;
  console.log(`    ok (${feitas}/${aFazer.length})`);
  if (n < lotes.length - 1) await espera(2000);
}

console.log(`\n${feitas} migration(s) aplicadas e carimbadas.`);
console.log('Próximo passo, se a sua mudança alterou schema: regenerar o types.ts.');
