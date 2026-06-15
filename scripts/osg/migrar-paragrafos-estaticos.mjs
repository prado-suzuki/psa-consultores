#!/usr/bin/env node
// Migração de dados: parágrafos 100% estruturais na biblioteca de blocos OSG.
//
// A) Cláusulas com "Parágrafo X:" escrito no conteúdo → o caput fica na cláusula
//    e cada parágrafo vira um bloco tipo `paragrafo` próprio, posicionado logo
//    após a cláusula em TODOS os modelos que a usam (numeração passa a ser
//    dinâmica; flags da cláusula são copiadas para os novos blocos).
// B) Bloco "Teste de Matriculas" (loop {{#integralizacoes}} com rótulo manual
//    "*Parágrafo {{ socio.paragrafo }}:*") → bloco parágrafo REPETIDOR
//    (repete_colecao = integralizacoes), com a referência cruzada trocada de
//    {{ imovel.refParagrafo }} (ordinal congelado no mapeador) para
//    {{ refItem.ref }} (carimbo da numeração estrutural). Requer a migration
//    20260612120000 (colunas repete_colecao/ancora) aplicada.
//
// Uso:  OSG_TOKEN=<jwt do usuário> node scripts/osg/migrar-paragrafos-estaticos.mjs [--apply]
// Sem --apply é dry-run: imprime o plano completo (antes/depois) e não escreve nada.
//
// Observações:
// - Escreve via REST com o token do usuário (mesmas permissões/RLS do app).
//   Não registra entradas na auditoria do app (audit_log) — anotar manualmente se necessário.
// - Idempotente: cláusula sem marcador não é tocada; o bloco repetidor é pulado
//   se repete_colecao já estiver preenchida.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APPLY = process.argv.includes('--apply');
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// --- Config -------------------------------------------------------------------

const env = Object.fromEntries(
  readFileSync(resolve(raiz, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);
const URL_BASE = `${env.VITE_SUPABASE_URL}/rest/v1`;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TOKEN = process.env.OSG_TOKEN;
if (!TOKEN) {
  console.error('Defina OSG_TOKEN com o access token (JWT) do usuário logado.');
  process.exit(1);
}
const AUTOR_ID = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64url').toString()).sub;

async function api(caminho, opts = {}) {
  const res = await fetch(`${URL_BASE}/${caminho}`, {
    ...opts,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers ?? {}),
    },
  });
  const corpo = await res.text();
  if (!res.ok) throw new Error(`${opts.method ?? 'GET'} ${caminho} → ${res.status}: ${corpo}`);
  return corpo ? JSON.parse(corpo) : null;
}

// --- Helpers ------------------------------------------------------------------

/** Marcador de parágrafo estático em início de linha ("Parágrafo Primeiro:", "*Parágrafo Único:*"). \p{L}: "Único"/"Décimo" têm não-ASCII (\w falharia). */
const MARCADOR = /^\*?Parágrafo\s+\p{L}+[^:\n]{0,15}:\*?[ \t]*/gmu;
/** Referência textual congelada no meio do texto (candidata futura a {{ refs.* }}). */
const REF_CONGELADA = /(?:no|do|ao)\s+Parágrafo\s+\p{L}+(?:\s+(?:desta|da|daquela)\s+[Cc]láusula(?:\s+\p{L}+)?)?|Cláusula\s+\p{L}+,\s*Parágrafo\s+\p{L}+/gu;

function dividirClausula(conteudo) {
  const marcas = [...conteudo.matchAll(MARCADOR)];
  if (marcas.length === 0) return null;
  const caput = conteudo.slice(0, marcas[0].index).trimEnd();
  const paragrafos = marcas.map((m, i) => {
    const fim = i + 1 < marcas.length ? marcas[i + 1].index : conteudo.length;
    return conteudo.slice(m.index + m[0].length, fim).trim();
  });
  return { caput, paragrafos };
}

const log = (...args) => console.log(...args);
const resumo = (texto, n = 90) => texto.replace(/\s+/g, ' ').slice(0, n) + (texto.length > n ? '…' : '');

// --- Carga --------------------------------------------------------------------

const blocos = await api('tmpl_bloco?select=*&order=nome');
const versoes = await api('tmpl_bloco_versao?select=id,bloco_id,numero_versao,conteudo&atual=eq.true');
const versaoPorBloco = new Map(versoes.map((v) => [v.bloco_id, v]));
const temColunasNovas = 'repete_colecao' in (blocos[0] ?? {});

if (!temColunasNovas) {
  log('⚠ Colunas repete_colecao/ancora ainda não existem — aplique a migration');
  log('  20260612120000_tmpl_bloco_repetidor_e_ancora.sql antes do --apply.');
  log('  (A parte A — split de cláusulas — não depende delas; a parte B sim.)\n');
}

// --- Parte A: split das cláusulas com parágrafos estáticos ---------------------

let totalParagrafos = 0;
const planos = [];

for (const bloco of blocos) {
  if (bloco.tipo !== 'clausula') continue;
  const versao = versaoPorBloco.get(bloco.id);
  if (!versao?.conteudo) continue;
  const divisao = dividirClausula(versao.conteudo);
  if (!divisao) continue;

  const tema = bloco.nome.replace(/^Cláusula\s+—\s+/, '');
  const nomes = divisao.paragrafos.map((_, i) =>
    divisao.paragrafos.length === 1 ? `Parágrafo — ${tema}` : `Parágrafo — ${tema} (${i + 1})`,
  );
  const posicoes = await api(`tmpl_documento_bloco?select=id,documento_id,ordem,obrigatorio&bloco_id=eq.${bloco.id}`);
  const flags = await api(`tmpl_bloco_flag?select=flag_id&bloco_id=eq.${bloco.id}`);
  planos.push({ bloco, versao, divisao, nomes, posicoes, flagIds: flags.map((f) => f.flag_id) });
  totalParagrafos += divisao.paragrafos.length;

  log(`\n■ ${bloco.nome} — ${divisao.paragrafos.length} parágrafo(s) extraído(s)`);
  log(`  caput: ${resumo(divisao.caput)}`);
  divisao.paragrafos.forEach((p, i) => log(`  ${i + 1}. [${nomes[i]}] ${resumo(p)}`));
  if (planos.at(-1).flagIds.length) log(`  flags copiadas: ${planos.at(-1).flagIds.length}`);
  for (const pos of posicoes) log(`  posição: modelo ${pos.documento_id.slice(0, 8)} ordem ${pos.ordem} (+${divisao.paragrafos.length} blocos após)`);
  const congeladas = [...versao.conteudo.matchAll(REF_CONGELADA)].map((m) => m[0]);
  if (congeladas.length) log(`  ☞ referências textuais congeladas (candidatas a {{ refs.* }} depois): ${[...new Set(congeladas)].join(' | ')}`);
}

// --- Parte B: bloco do loop de integralizações vira parágrafo repetidor --------

const blocoLoop = blocos.find(
  (b) => versaoPorBloco.get(b.id)?.conteudo?.includes('{{ socio.paragrafo }}'),
);
let planoLoop = null;
if (blocoLoop && temColunasNovas && blocoLoop.repete_colecao) {
  log(`\n■ ${blocoLoop.nome}: já é repetidor — nada a fazer.`);
} else if (blocoLoop) {
  const versao = versaoPorBloco.get(blocoLoop.id);
  let novo = versao.conteudo
    .replace(/^\{\{#integralizacoes[^}]*\}\}/, '')
    .replace(/\{\{\/integralizacoes\}\}\s*$/, '')
    .replace(/\*Parágrafo \{\{\s*socio\.paragrafo\s*\}\}:\*\s*/, '')
    .replace(/parágrafo \{\{\s*imovel\.refParagrafo\s*\}\}/g, '{{ refItem.ref }}')
    .trim();
  planoLoop = {
    bloco: blocoLoop,
    versao,
    novoConteudo: novo,
    novoNome: 'Parágrafo — Integralização de imóveis (por sócio)',
  };
  log(`\n■ ${blocoLoop.nome} → ${planoLoop.novoNome}`);
  log('  tipo: paragrafo · repete_colecao: integralizacoes');
  log(`  conteúdo (novo): ${resumo(novo, 160)}`);
}

log(`\nTotal: ${planos.length} cláusula(s) divididas, ${totalParagrafos} parágrafo(s) novos${planoLoop ? ', 1 repetidor' : ''}.`);

if (!APPLY) {
  log('\nDry-run — nada foi escrito. Rode com --apply para executar.');
  process.exit(0);
}

// --- Aplicação ------------------------------------------------------------------

async function novaVersao(blocoId, numeroAtual, versaoAtualId, conteudo, changelog) {
  await api(`tmpl_bloco_versao?id=eq.${versaoAtualId}`, { method: 'PATCH', body: JSON.stringify({ atual: false }) });
  await api('tmpl_bloco_versao', {
    method: 'POST',
    body: JSON.stringify({
      bloco_id: blocoId,
      numero_versao: numeroAtual + 1,
      conteudo,
      atual: true,
      autor_id: AUTOR_ID,
      changelog,
    }),
  });
}

for (const plano of planos) {
  const { bloco, versao, divisao, nomes, posicoes, flagIds } = plano;
  log(`\n→ aplicando: ${bloco.nome}`);

  // 1. Novos blocos parágrafo (com versão 1 e as flags da cláusula).
  const novosIds = [];
  for (let i = 0; i < divisao.paragrafos.length; i++) {
    const [novo] = await api('tmpl_bloco', {
      method: 'POST',
      body: JSON.stringify({
        nome: nomes[i],
        tipo: 'paragrafo',
        categoria: bloco.categoria,
        descricao: `Extraído da "${bloco.nome}" (migração: parágrafos estruturais).`,
        autor_id: AUTOR_ID,
      }),
    });
    await api('tmpl_bloco_versao', {
      method: 'POST',
      body: JSON.stringify({
        bloco_id: novo.id,
        numero_versao: 1,
        conteudo: divisao.paragrafos[i],
        atual: true,
        autor_id: AUTOR_ID,
        changelog: `Migrado da cláusula "${bloco.nome}" (separação de parágrafos estáticos).`,
      }),
    });
    if (flagIds.length) {
      await api('tmpl_bloco_flag', {
        method: 'POST',
        body: JSON.stringify(flagIds.map((flag_id) => ({ bloco_id: novo.id, flag_id }))),
      });
    }
    novosIds.push(novo.id);
  }

  // 2. Cláusula passa a ser só o caput (nova versão).
  await novaVersao(
    bloco.id,
    versao.numero_versao,
    versao.id,
    divisao.caput,
    'Parágrafos estáticos movidos para blocos próprios (numeração dinâmica).',
  );

  // 3. Posiciona os novos blocos logo após a cláusula em cada modelo que a usa.
  for (const pos of posicoes) {
    const seguintes = await api(
      `tmpl_documento_bloco?select=id,ordem&documento_id=eq.${pos.documento_id}&ordem=gt.${pos.ordem}&order=ordem.desc`,
    );
    for (const seg of seguintes) {
      await api(`tmpl_documento_bloco?id=eq.${seg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ordem: seg.ordem + novosIds.length }),
      });
    }
    await api('tmpl_documento_bloco', {
      method: 'POST',
      body: JSON.stringify(
        novosIds.map((blocoId, i) => ({
          documento_id: pos.documento_id,
          bloco_id: blocoId,
          ordem: pos.ordem + 1 + i,
          obrigatorio: pos.obrigatorio,
        })),
      ),
    });
  }
  log(`  ok — ${novosIds.length} bloco(s) criados e posicionados em ${posicoes.length} modelo(s).`);
}

if (planoLoop) {
  if (!temColunasNovas) {
    log('\n⚠ Repetidor NÃO aplicado: faltam as colunas repete_colecao/ancora (migration pendente).');
  } else {
    log(`\n→ aplicando: ${planoLoop.bloco.nome} → repetidor`);
    await api(`tmpl_bloco?id=eq.${planoLoop.bloco.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        nome: planoLoop.novoNome,
        tipo: 'paragrafo',
        repete_colecao: 'integralizacoes',
      }),
    });
    await novaVersao(
      planoLoop.bloco.id,
      planoLoop.versao.numero_versao,
      planoLoop.versao.id,
      planoLoop.novoConteudo,
      'Convertido em parágrafo repetidor: numeração e referência cruzada passam à composição ({{ ref }}/{{ refItem.ref }}).',
    );
    log('  ok.');
  }
}

log('\nConcluído.');
