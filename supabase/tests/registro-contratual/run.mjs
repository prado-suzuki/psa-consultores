import { readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const name = `psa-registro-test-${process.pid}`;
const migration = readFileSync(`${root}supabase/migrations/20260908211755_registro_contratual_atomico.sql`, 'utf8');
const fixture = readFileSync(new URL('./fixture.sql', import.meta.url), 'utf8');
const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const [user, cliente, pj, template, doc, file, mov, bem, socio] = [1,2,3,4,5,6,7,8,9].map(uuid);
const auth = `set role authenticated; set request.jwt.claim.sub = '${user}'; set test.team = 'yes'; set test.cliente = '${cliente}';`;
const registro = { versao: 1, arquivoId: file, protocolo: 'P-1', numeroArquivamento: 'A-1',
  dataRegistro: '2026-01-03', juntaUf: 'MT', junta: 'JUCEMAT', confirmacaoId: uuid(10) };
const dados = { empresaId: pj, selecao: {}, registroPorBinding: {}, valoresLivres: {}, itensPorLista: {}, movimentosFormalizados: [mov] };
const versoes = { blocos: [{id: 'bloco', conteudo: 'Contrato'}], familias: {}, contextoRender: { sociedade: {nome: 'Teste'} } };
const json = obj => `'${JSON.stringify(obj).replaceAll("'", "''")}'::jsonb`;
const registrar = (id = doc, metadata = registro) => `update documento_gerado set status = 'registrado', snapshot_dados = snapshot_dados || jsonb_build_object('registroContratual', ${json(metadata)}) where id = '${id}';`;
const marcoMinimo = { versao: 1, confirmacaoId: uuid(10), protocolo: 'P-1', dataRegistro: '2026-01-03' };
const completar = (metadata, id = doc) => `update documento_gerado set snapshot_dados = jsonb_set(snapshot_dados,'{registroContratual}',${json(metadata)}) where id = '${id}';`;
function docker(args, input) {
  const result = spawnSync('docker', args, {input, encoding: 'utf8'});
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
function sql(text, ok = true) {
  const r = spawnSync('docker', ['exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-At'], {input: text, encoding:'utf8'});
  if (ok && r.status !== 0) throw new Error(`${r.stderr}\nSQL: ${text}`);
  if (!ok) assert.notEqual(r.status, 0, `Deveria falhar: ${text}`);
  return ok ? r.stdout.trim() : r.stderr;
}
function asyncSql(text) {
  const p = spawn('docker', ['exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-At']);
  let out = ''; let err = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
  p.stdin.end(text);
  return new Promise(resolve => p.on('close', status => resolve({status,out,err})));
}
async function waitForFirstTransaction() {
  for (let i=0; i<80; i++) {
    if (sql("select count(*) from pg_stat_activity where application_name='registro-first' and wait_event='PgSleep'") === '1') return;
    await new Promise(resolve => setTimeout(resolve,25));
  }
  throw new Error('A primeira transacao nao chegou ao ponto sincronizado');
}
function seed() {
  sql(`truncate audit_logs, movimentacao_quotas, documento_arquivo, documento_gerado, bem, pessoa, cliente, tmpl_documento cascade;
    insert into cliente values ('${cliente}', 'dev', false), ('${uuid(20)}','prod',false);
    insert into pessoa values ('${pj}','${cliente}','PJ'), ('${socio}','${cliente}','PF');
    insert into tmpl_documento values ('${template}','sociedade');
    insert into bem (id,cliente_id,empresa_destino_pessoa_id,denominacao,status_integralizacao)
      values ('${bem}','${cliente}','${pj}','Bem teste','Aprovado');
    insert into documento_gerado (id,cliente_id,pj_pessoa_id,documento_template_id,papel,documento_raiz_id,snapshot_dados,snapshot_flags,snapshot_versoes_blocos,snapshot_validado_em)
      values ('${doc}','${cliente}','${pj}','${template}','constitutivo','${doc}',${json(dados)},'[]',${json(versoes)},now());
    insert into documento_arquivo (id,cliente_id,ambiente,pessoa_id,documento_gerado_id,status,revisao,categoria,gcs_uri,checksum,tamanho,mime,nome_original,revisao_por,revisao_em)
      values ('${file}','${cliente}','dev','${pj}','${doc}','ativo','aprovado','societarios','gs://bucket/objeto','AAAAAA==',100,'application/pdf','registro.pdf','${user}',now());
    insert into movimentacao_quotas (id,cliente_id,empresa_pessoa_id,destino_pessoa_id,bem_id,tipo,quotas)
      values ('${mov}','${cliente}','${pj}','${socio}','${bem}','aporte',100);`);
}
function successor(n, raiz = uuid(n)) {
  const id = uuid(n); const arquivo = uuid(n+100);
  sql(`insert into documento_gerado (id,cliente_id,pj_pessoa_id,documento_template_id,papel,documento_raiz_id,substitui_documento_id,snapshot_dados,snapshot_flags,snapshot_versoes_blocos,snapshot_validado_em)
    values ('${id}','${cliente}','${pj}','${template}','alterador','${raiz}','${doc}',${json({...dados,movimentosFormalizados:[]})},'[]',${json(versoes)},now());
    insert into documento_arquivo select '${arquivo}',cliente_id,ambiente,pessoa_id,'${id}',excluido,status,revisao,categoria,gcs_uri,checksum,tamanho,mime,nome_original,revisao_por,revisao_em,updated_at,updated_by from documento_arquivo where id='${file}';`);
  return registrar(id,{...registro,arquivoId:arquivo,confirmacaoId:uuid(n+200)});
}
let count = 0;
function test(label, fn) { seed(); fn(); count++; console.log(`ok ${count} - ${label}`); }
function refused(setup, statement = registrar(), pattern = /ERROR:/) {
  sql(setup);
  assert.match(sql(auth + statement, false), pattern);
  assert.equal(sql(`select status from documento_gerado where id='${doc}'`), 'rascunho');
  assert.equal(sql('select count(*) from audit_logs'), '0');
}

try {
  docker(['run','--rm','-d','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);
  // A imagem oficial sobe um servidor TEMPORARIO para o init e o derruba antes
  // do definitivo: `pg_isready` responde ok nesse intervalo e o primeiro psql
  // cai em "socket ... failed". O sinal certo e o log dizer "ready to accept
  // connections" pela SEGUNDA vez.
  let ready = false;
  for (let i=0; i<120; i++) {
    const logs = spawnSync('docker',['logs',name],{encoding:'utf8'});
    const prontos = ((logs.stdout ?? '') + (logs.stderr ?? '')).split('database system is ready to accept connections').length - 1;
    if (prontos >= 2 && spawnSync('docker',['exec',name,'pg_isready','-U','postgres'],{stdio:'ignore'}).status === 0) { ready=true; break; }
    await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(ready, 'Postgres nao iniciou');
  sql(fixture); sql(migration); sql(migration);
  test('registro, carimbo, bem e diffs persistem juntos sob authenticated', () => {
    sql(auth + registrar());
    assert.equal(sql(`select status from documento_gerado where id='${doc}'`), 'registrado');
    assert.equal(sql(`select documento_gerado_id from movimentacao_quotas`), doc);
    assert.equal(sql('select status_integralizacao from bem'), 'Integralizado');
    assert.equal(sql('select count(*) from audit_logs'), '3');
    assert.equal(sql(`select changed_fields->'status_integralizacao'->>'old' from audit_logs where entity_type='bem'`), 'Aprovado');
    sql(auth + registrar());
    assert.equal(sql('select count(*) from audit_logs'), '3');
    // Corrigir o MARCO continua possivel depois do registro, e so ele: e o
    // caminho de quem registrou com o protocolo ainda por sair.
    sql(auth + registrar(doc, {...registro, protocolo:'outro'}));
    assert.equal(sql('select count(*) from audit_logs'), '4');
    assert.match(sql(auth + 'update documento_gerado set snapshot_validado_em = now()', false), /imutavel/);
  });
  for (const field of ['snapshot_dados','snapshot_flags','snapshot_versoes_blocos','snapshot_validado_em']) {
    test(`recusa ${field} ausente`, () => refused(`update documento_gerado set ${field}=null`));
  }
  for (const key of ['contextoRender','familias','blocos']) {
    test(`recusa template sem ${key}`, () => refused(`update documento_gerado set snapshot_versoes_blocos=snapshot_versoes_blocos-'${key}'`));
  }
  for (const [field,value] of Object.entries({excluido:'true', status:"'pendente'", revisao:"'recusado'", ambiente:"'prod'", checksum:'null', tamanho:'0', gcs_uri:"'https://invalido'", pessoa_id:'null', documento_gerado_id:'null'})) {
    test(`recusa arquivo ${field}`, () => refused(`update documento_arquivo set ${field}=${value}`));
  }
  test('recusa escopo acrescentado apenas no registro', () => refused('', `update documento_gerado set status='registrado', snapshot_dados=${json({...dados,movimentosFormalizados:[],registroContratual:registro})}`));
  test('recusa movimento invisivel/ausente sem carimbo parcial', () => refused(`update documento_gerado set snapshot_dados=jsonb_set(snapshot_dados,'{movimentosFormalizados}',${json([mov,uuid(88)])})`));
  test('recusa movimento de outro cliente', () => refused(`update movimentacao_quotas set cliente_id='${uuid(20)}'`));
  test('recusa evidencia divergente', () => refused(`update documento_gerado set snapshot_dados=snapshot_dados||'{"movimentosEvidencia":{}}'`));
  test('aceita evidencia exata', () => {
    sql(`update documento_gerado set snapshot_dados=snapshot_dados||jsonb_build_object('movimentosEvidencia',
      (select jsonb_object_agg(id::text,to_jsonb(m)-array['created_at','created_by','updated_at','updated_by','documento_gerado_id']) from movimentacao_quotas m))`);
    sql(auth+registrar());
  });
  test('preserva bem recusado', () => { sql("update bem set status_integralizacao='Recusado'"); sql(auth+registrar()); assert.equal(sql('select status_integralizacao from bem'),'Recusado'); });
  test('segundo status aprovado integraliza', () => { sql("update bem set status_integralizacao='Aprovado para 2ª Instancia'"); sql(auth+registrar()); assert.equal(sql('select status_integralizacao from bem'),'Integralizado'); });
  test('falha de auditoria reverte inclusive bem e carimbo', () => {
    sql("create policy deny_audit on audit_logs as restrictive for insert to authenticated with check (entity_type <> 'documento_gerado')");
    try { refused(''); assert.equal(sql('select status_integralizacao from bem'),'Aprovado'); assert.equal(sql('select count(*) from movimentacao_quotas where documento_gerado_id is not null'),'0'); }
    finally { sql('drop policy deny_audit on audit_logs'); }
  });
  test('guard de cliente mesmo com RLS interna ampla', () => refused('',auth+`set test.cliente='${uuid(20)}';`+registrar(),/Sem acesso/));
  test('sem auth nao registra mesmo como dono da tabela', () => refused('',"reset role; set request.jwt.claim.sub = '';"+registrar(),/Sem acesso/));
  test('formalizacao manual antes do registro falha no commit', () => {
    assert.match(sql(auth+`begin; update movimentacao_quotas set documento_gerado_id='${doc}'; commit;`,false),/Formalizacao exige/);
    assert.equal(sql('select count(*) from movimentacao_quotas where documento_gerado_id is not null'),'0');
  });
  test('registrados, movimentos e arquivo nao podem mudar ou desaparecer', () => {
    sql(auth+registrar());
    for (const statement of ["update documento_gerado set status='rascunho'",'delete from documento_gerado',
      "update documento_gerado set snapshot_flags='[\"nova\"]'",'update documento_gerado set documento_raiz_id=null',
      'delete from movimentacao_quotas','update movimentacao_quotas set documento_gerado_id=null',
      'update movimentacao_quotas set quotas=200','delete from documento_arquivo',"update documento_arquivo set checksum='outro'"]) {
      assert.match(sql(auth+statement,false),/imutavel/);
    }
  });
  test('insert registrado bloqueado', () => assert.match(sql(auth+`insert into documento_gerado(id,cliente_id,status) values ('${uuid(90)}','${cliente}','registrado')`,false),/transicao/));
  test('READ COMMITTED obrigatorio', () => assert.match(sql(auth+'begin isolation level repeatable read;'+registrar(),false),/READ COMMITTED/));
  for (const [key,value] of Object.entries({versao:2,confirmacaoId:'nao-uuid',dataRegistro:'2026-02-30',juntaUf:'XX',protocolo:'',numeroArquivamento:''})) {
    test(`metadata invalida ${key}`, () => refused('',registrar(doc,{...registro,[key]:value})));
  }
  test('registro exige o minimo do marco e recusa campo que saiu de v1', () => {
    // Sem protocolo ou sem data do registro a peca nao diria qual registro a
    // tornou oponivel, e e so isso que o banco cobra.
    for (const parcial of [{}, { protocolo: 'P-1' }, { dataRegistro: '2026-01-03' }]) {
      assert.match(sql(auth + registrar(doc, { versao: 1, confirmacaoId: uuid(10), ...parcial }), false),
        /Metadata obrigatoria/);
    }
    // As duas datas que sairam de v1 sao chave extra, nao campo opcional.
    for (const fora of ['dataInstrumento', 'dataProtocolo']) {
      assert.match(sql(auth + registrar(doc, { ...marcoMinimo, [fora]: '2026-01-01' }), false),
        /registroContratual v1 invalido/);
    }
    assert.equal(sql(`select status from documento_gerado where id='${doc}'`), 'rascunho');
    assert.equal(sql('select count(*) from audit_logs'), '0');
  });
  test('registra com o minimo e completa o resto depois, com trilha do que mudou', () => {
    // O calendario da junta: o registro sai hoje, o numero do arquivamento e o
    // PDF chancelado chegam depois. Isso nao impede o registro.
    sql(auth + registrar(doc, marcoMinimo));
    assert.equal(sql(`select status from documento_gerado where id='${doc}'`), 'registrado');
    assert.equal(sql(`select documento_gerado_id from movimentacao_quotas`), doc);
    assert.equal(sql('select status_integralizacao from bem'), 'Integralizado');
    assert.equal(sql('select count(*) from audit_logs'), '3');
    sql(auth + completar({ ...marcoMinimo, numeroArquivamento: 'A-1', juntaUf: 'MT', junta: 'JUCEMAT' }));
    assert.equal(sql(`select snapshot_dados->'registroContratual'->>'numeroArquivamento' from documento_gerado where id='${doc}'`), 'A-1');
    assert.equal(sql('select count(*) from audit_logs'), '4');
    assert.equal(sql(`select changed_fields->'registroContratual'->'new'->>'numeroArquivamento' from audit_logs order by performed_at desc limit 1`), 'A-1');
    assert.equal(sql(`select changed_fields->'registroContratual'->'old'->>'numeroArquivamento' from audit_logs order by performed_at desc limit 1`), '');
    // Completar de novo com o mesmo conteudo nao escreve nem audita.
    sql(auth + completar({ ...marcoMinimo, numeroArquivamento: 'A-1', juntaUf: 'MT', junta: 'JUCEMAT' }));
    assert.equal(sql('select count(*) from audit_logs'), '4');
  });
  test('completar aceita marco parcial e recusa o incoerente', () => {
    sql(auth + registrar(doc, marcoMinimo));
    // Metade do que falta hoje, metade quando a junta devolver.
    sql(auth + completar({ ...marcoMinimo, numeroArquivamento: 'A-1' }));
    for (const invalido of [{ dataRegistro: '2999-01-01' }, { dataRegistro: '' }, { juntaUf: 'XX' },
      { protocolo: '' }, { junta: 42 }, { nire: '123' }, { dataProtocolo: '2026-01-02' }]) {
      assert.match(sql(auth + completar({ ...marcoMinimo, ...invalido }), false), /ERROR:/);
    }
    // E o marco continua o que era antes da recusa.
    assert.equal(sql(`select snapshot_dados->'registroContratual'->>'numeroArquivamento' from documento_gerado where id='${doc}'`), 'A-1');
  });
  test('completar nao vira outro registro nem troca o arquivo eleito', () => {
    sql(auth + registrar());
    assert.match(sql(auth + completar({ ...registro, confirmacaoId: uuid(11) }), false), /Confirmacao do registro e imutavel/);
    assert.match(sql(auth + completar({ ...registro, arquivoId: uuid(66) }), false), /Arquivo registrado e imutavel/);
    // E o resto da peca segue fechado, mesmo viajando junto com a metadata.
    assert.match(sql(auth + `update documento_gerado set snapshot_flags='["nova"]', snapshot_dados = jsonb_set(snapshot_dados,'{registroContratual}',${json({ ...registro, protocolo: 'P-2' })}) where id='${doc}';`, false), /imutavel/);
    assert.equal(sql('select count(*) from audit_logs'), '3');
  });
  test('arquivo que chega depois e conferido como o do registro', () => {
    sql(auth + registrar(doc, marcoMinimo));
    sql("update documento_arquivo set revisao='pendente'");
    assert.match(sql(auth + completar({ ...marcoMinimo, arquivoId: file }), false), /Arquivo registrado ausente/);
    sql("update documento_arquivo set revisao='aprovado'");
    sql(auth + completar({ ...marcoMinimo, arquivoId: file }));
    assert.equal(sql(`select snapshot_dados->'registroContratual'->>'arquivoId' from documento_gerado where id='${doc}'`), file);
    // Eleito, ele passa a ser imutavel como o do registro completo.
    assert.match(sql(auth + "update documento_arquivo set checksum='outro'", false), /imutavel/);
  });
  test('completar exige acesso ao cliente e team_member', () => {
    sql(auth + registrar(doc, marcoMinimo));
    assert.match(sql(auth + `set test.cliente='${uuid(20)}';` + completar({ ...marcoMinimo, numeroArquivamento: 'A-1' }), false), /Sem acesso/);
    assert.match(sql("reset role; set request.jwt.claim.sub = '';" + completar({ ...marcoMinimo, numeroArquivamento: 'A-1' }), false), /Sem acesso/);
    assert.equal(sql(`select snapshot_dados->'registroContratual' ? 'numeroArquivamento' from documento_gerado where id='${doc}'`), 'f');
  });
  test('escopo vazio explicito permitido', () => { sql(`update documento_gerado set snapshot_dados=jsonb_set(snapshot_dados,'{movimentosFormalizados}','[]')`); sql(auth+registrar()); assert.equal(sql('select count(*) from audit_logs'),'1'); });
  test('escopo duplicado recusado', () => refused(`update documento_gerado set snapshot_dados=jsonb_set(snapshot_dados,'{movimentosFormalizados}',${json([mov,mov])})`));
  test('RLS UPDATE de bem negada aborta registro', () => {
    sql('create policy deny_bem on bem as restrictive for update to authenticated using (false)');
    try { refused(''); } finally { sql('drop policy deny_bem on bem'); }
  });
  test('revisao da mesma linhagem nao bloqueia sucessor; outra linhagem registrada bloqueia', () => {
    sql(auth+registrar());
    successor(30);
    sql(`update documento_gerado set status='revisao' where id='${uuid(30)}'`);
    const revision = successor(31,uuid(30));
    sql(auth+revision);
    const other = successor(32);
    assert.match(sql(auth+other,false),/sucessor registrado/);
  });

  seed();
  const first = asyncSql(auth+`set application_name='registro-first'; begin; ${registrar()} select pg_sleep(2); commit;`);
  await waitForFirstTransaction();
  const second = asyncSql(auth+registrar());
  const concurrent = await Promise.all([first,second]);
  assert.ok(concurrent.every(r=>r.status===0), JSON.stringify(concurrent));
  assert.equal(sql('select count(*) from audit_logs'),'3');
  console.log(`ok ${++count} - retry concorrente nao duplica efeitos`);

  seed(); sql(auth+registrar());
  const ac1 = successor(30); const ac2 = successor(31);
  const winner = asyncSql(auth+`set application_name='registro-first'; begin; ${ac1} select pg_sleep(2); commit;`);
  await waitForFirstTransaction();
  const loser = asyncSql(auth+ac2);
  const results = await Promise.all([winner,loser]);
  assert.equal(results.filter(r=>r.status===0).length,1,JSON.stringify(results));
  assert.match(results.find(r=>r.status!==0).err,/sucessor registrado/);
  assert.equal(sql("select count(*) from documento_gerado where papel='alterador' and status='registrado'"),'1');
  console.log(`ok ${++count} - dois sucessores concorrentes: somente um registra`);

  seed();
  const registerFile = asyncSql(auth+`set application_name='registro-first'; begin; ${registrar()} select pg_sleep(2); commit;`);
  await waitForFirstTransaction();
  const mutateFile = asyncSql(auth+"update documento_arquivo set checksum='adulterado'");
  const fileResults = await Promise.all([registerFile,mutateFile]);
  assert.equal(fileResults[0].status,0,JSON.stringify(fileResults));
  assert.notEqual(fileResults[1].status,0);
  assert.match(fileResults[1].err,/imutavel/);
  console.log(`ok ${++count} - arquivo nao muda enquanto registro concorrente confirma`);
  console.log(`${count} testes PostgreSQL passaram; migration aplicada duas vezes apenas neste container.`);
} finally {
  spawnSync('docker',['rm','-f',name],{stdio:'ignore'});
}
