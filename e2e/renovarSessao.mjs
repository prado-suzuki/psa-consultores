// Renova a sessao gravada em `e2e/.auth/user.json` usando o refresh token que
// ela ja carrega, sem precisar de E2E_EMAIL/E2E_PASSWORD.
//
// Existe porque o access token vive uma hora e o arquivo azeda em silencio: o
// harness e2e (e o agente que dirige o navegador) passa a cair em /equipe sem
// dizer por que. O refresh token vive muito mais, entao na maioria das vezes
// nao ha nada a redigitar.
//
//   node e2e/renovarSessao.mjs
//
// Quando o refresh token TAMBEM morreu, o script diz isso e o caminho e refazer
// o login pela UI: E2E_EMAIL=... E2E_PASSWORD=... npx playwright test --project=setup
//
// O projeto Supabase alvo NAO e escolhido aqui: vem da chave `sb-<ref>-auth-token`
// gravada no arquivo, que e o mesmo ref que o app usa na branch em que a sessao
// foi criada (main = producao, demais = sandbox). Renovar nao troca de banco.

import { readFileSync, existsSync, copyFileSync, writeFileSync } from 'node:fs';

const ARQUIVO = 'e2e/.auth/user.json';

/** Pares chave=valor de um arquivo .env, sem expandir nada. */
function lerEnv(caminho) {
  if (!existsSync(caminho)) return {};
  const pares = {};
  for (const linha of readFileSync(caminho, 'utf8').split('\n')) {
    if (!linha.includes('=') || linha.trimStart().startsWith('#')) continue;
    const i = linha.indexOf('=');
    pares[linha.slice(0, i).trim()] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return pares;
}

const estado = JSON.parse(readFileSync(ARQUIVO, 'utf8'));
const item = (estado.origins ?? [])
  .flatMap((o) => o.localStorage ?? [])
  .find((i) => /^sb-.*-auth-token$/.test(i.name));

if (!item) {
  console.error(`${ARQUIVO} nao tem chave sb-<ref>-auth-token. Refaca o login pela UI.`);
  process.exit(1);
}

const sessao = JSON.parse(item.value);
const ref = item.name.replace(/^sb-/, '').replace(/-auth-token$/, '');
const restam = Math.round((sessao.expires_at * 1000 - Date.now()) / 1000);
console.log(`projeto  ${ref}`);
console.log(`origem   ${(estado.origins ?? []).map((o) => o.origin).join(', ')}`);
console.log(`usuario  ${sessao.user?.email ?? '(sem email)'}`);
console.log(`token    ${restam > 0 ? `valido por ${restam}s` : `expirado ha ${-restam}s`}`);

// A chave anon sai do .env que corresponde ao ref, para nao chutar ambiente.
let apikey = null;
for (const arquivo of ['.env.development.local', '.env.development', '.env']) {
  const env = lerEnv(arquivo);
  if (!(env.VITE_SUPABASE_URL ?? '').includes(ref)) continue;
  apikey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? null;
  if (apikey) {
    console.log(`apikey   de ${arquivo}`);
    break;
  }
}
if (!apikey) {
  console.error(`\nnenhum .env aponta para ${ref}: nao sei qual chave anon usar.`);
  process.exit(1);
}

const resp = await fetch(`https://${ref}.supabase.co/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST',
  headers: { apikey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: sessao.refresh_token }),
});

if (!resp.ok) {
  console.error(`\nrefresh recusado (HTTP ${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  console.error('O refresh token morreu. Refaca o login pela UI:');
  console.error('  E2E_EMAIL=... E2E_PASSWORD=... npx playwright test --project=setup');
  process.exit(1);
}

const novo = await resp.json();
copyFileSync(ARQUIVO, `${ARQUIVO}.bak`);
for (const chave of ['access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type']) {
  if (chave in novo) sessao[chave] = novo[chave];
}
if (novo.user) sessao.user = novo.user;
item.value = JSON.stringify(sessao);
writeFileSync(ARQUIVO, JSON.stringify(estado));

console.log(`\nrenovado. expira em ${new Date(sessao.expires_at * 1000).toLocaleString('pt-BR')}`);
console.log(`backup do anterior em ${ARQUIVO}.bak`);
