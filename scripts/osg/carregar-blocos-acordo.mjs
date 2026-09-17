#!/usr/bin/env node
// Carrega os blocos do ACORDO DE QUOTISTAS e o modelo que os compõe.
//
// POR QUE UM SCRIPT, E NÃO UMA MIGRATION
// -----------------------------------------------------------------------------
// São 266 blocos e 225 KB de texto jurídico. Isso não cabe num `apply_migration`
// pelo MCP, e uma migration desse tamanho seria um arquivo que ninguém revisa.
// O molde é o do `migrar-paragrafos-estaticos.mjs`: escreve via REST com o JWT
// do usuário, portanto sob a MESMA RLS do app, sem chave de serviço.
//
// DE ONDE VEM O TEXTO
// -----------------------------------------------------------------------------
// De `docs/osg/acordo-blocos.json`, gerado a partir do `VF_Modelo Acordo de
// Quotistas` convertido para docx e lido com as ALTERAÇÕES ACEITAS. O arquivo
// original está com controle de alterações ligado, e a leitura ingênua cola o
// texto apagado no inserido ("HIPERHAUS PARTICIPAÇÕESDUAL DUARTE
// ALBUQUERQUEDUAL", 185 vezes). Ver a memória `gerar-pdf-com-edge`.
//
// O TIPO de cada bloco saiu do XML — do `numPr` de cada parágrafo e da família
// de níveis do `numbering.xml` —, e não de leitura a olho. Onde o autor desligou
// a numeração automática e digitou o rótulo no texto ("4.1 O direito…", "(I) o
// QUOTISTA…"), o rótulo foi removido: quem numera é o motor, e mantê-lo daria
// "4.1 4.1 O direito".
//
// OS PLACEHOLDERS NÃO ENTRAM AQUI. Este carregador traz o texto do modelo como
// ele é. A parametrização é uma segunda passada, campo a campo, para que cada
// troca de texto fixo por `{{ acordo.* }}` seja conferida contra a frase do
// documento — a regra de `campo-x-faz-y-no-documento`.
//
// Uso:  OSG_TOKEN=<jwt> node scripts/osg/carregar-blocos-acordo.mjs [--apply]
// Sem --apply é dry-run: imprime o plano e não escreve nada.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APPLY = process.argv.includes('--apply');
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const env = Object.fromEntries(
  readFileSync(resolve(raiz, '.env.sandbox'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);
const URL_BASE = `${env.VITE_SUPABASE_URL}/rest/v1`;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TOKEN = process.env.OSG_TOKEN;
if (!TOKEN) {
  console.error('Defina OSG_TOKEN com o access token (JWT) do usuário logado no SANDBOX.');
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

const CATEGORIA = 'acordo-quotistas';
const TIPO_DOC = 'acordo_quotistas';

const blocos = JSON.parse(readFileSync(resolve(raiz, 'docs/osg/acordo-blocos.json'), 'utf8'));

const conta = blocos.reduce((a, b) => ({ ...a, [b.tipo]: (a[b.tipo] ?? 0) + 1 }), {});
console.log(`${blocos.length} blocos:`,
  Object.entries(conta).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`).join(', '));

/*
 * CONFERÊNCIAS ANTES DE ESCREVER, porque o que entra errado aqui vira cláusula
 * errada em documento de cliente, e não erro na tela.
 */
const problemas = [];
const ROTULO_SOBRANDO = /^\s*(\d+\.\d+|\([IVX]+\)|[a-z]\))/;
for (const [i, b] of blocos.entries()) {
  const onde = `bloco ${i + 1} (${b.tipo})`;
  if (b.tipo !== 'clausula' && !b.conteudo.trim()) problemas.push(`${onde} sem texto`);
  if (b.tipo === 'clausula' && !b.titulo?.trim()) problemas.push(`${onde} sem título`);
  if (b.tipo !== 'clausula' && b.titulo) problemas.push(`${onde} não é cláusula e tem título`);
  if (['item', 'subitem', 'alinea', 'inciso'].includes(b.tipo) && ROTULO_SOBRANDO.test(b.conteudo)) {
    problemas.push(`${onde} com rótulo sobrando: "${b.conteudo.slice(0, 40)}"`);
  }
}
if (problemas.length) {
  console.error(`\n${problemas.length} problemas, nada foi escrito:`);
  for (const p of problemas.slice(0, 20)) console.error('  -', p);
  process.exit(1);
}
console.log('conferências passaram: texto, título e rótulo.');

if (!APPLY) {
  console.log('\n[dry-run] Use --apply para escrever. Amostra:');
  for (const b of blocos.slice(0, 3)) {
    console.log(`  [${b.tipo}] ${(b.titulo ?? b.conteudo).slice(0, 78)}`);
  }
  process.exit(0);
}

/*
 * IDEMPOTENTE: apaga o que já existe da categoria antes de inserir. A fonte é um
 * arquivo que pode mudar, e rodar de novo tem de reconstruir, não duplicar.
 */
const docsAntigos = await api(`tmpl_documento?tipo=eq.${TIPO_DOC}&select=id`);
for (const d of docsAntigos ?? []) {
  await api(`tmpl_documento_bloco?documento_id=eq.${d.id}`, { method: 'DELETE' });
}
await api(`tmpl_documento?tipo=eq.${TIPO_DOC}`, { method: 'DELETE' });

const antigos = await api(`tmpl_bloco?categoria=eq.${CATEGORIA}&select=id`);
if (antigos?.length) {
  const ids = antigos.map((b) => b.id).join(',');
  await api(`tmpl_bloco_versao?bloco_id=in.(${ids})`, { method: 'DELETE' });
  await api(`tmpl_bloco?categoria=eq.${CATEGORIA}`, { method: 'DELETE' });
  console.log(`${antigos.length} blocos antigos removidos.`);
}

/*
 * AS FLAGS DO ACORDO, que sao o que permite uma resposta do cadastro TIRAR
 * clausula do documento.
 *
 * Declarativas: o motor casa `entidade.campo === valor` contra as fontes que o
 * controller passa, e os campos condicionais do acordo ja resolvem 'sim'/''.
 * Sem a linha em `tmpl_flag` o vinculo em `tmpl_bloco_flag` nao existe, e o
 * bloco entra sempre.
 */
const FLAGS = [
  { nome: 'acordo_nao_concorrencia', campo: 'naoConcorrencia',
    descricao: 'Tem clausula de nao concorrencia.' },
  { nome: 'acordo_tem_lock_up', campo: 'temLockUp',
    descricao: 'Tem lock-up (periodo em que ninguem vende).' },
  { nome: 'acordo_tem_tag_along', campo: 'temTagAlong',
    descricao: 'Tem tag along (o minoritario exige ser comprado junto).' },
  { nome: 'acordo_tem_drag_along', campo: 'temDragAlong',
    descricao: 'Tem drag along (o majoritario obriga o minoritario a vender junto).' },
  { nome: 'acordo_opcao_venda_prevista', campo: 'opcaoVendaPrevista',
    descricao: 'Tem opcao de venda (o socio exige que comprem a parte dele).' },
  { nome: 'acordo_opcao_compra_prevista', campo: 'opcaoCompraPrevista',
    descricao: 'Tem opcao de compra (alguem exige que outro venda).' },
  { nome: 'acordo_tem_preferencia', campo: 'temPreferencia',
    descricao: 'Tem direito de preferencia na alienacao de quotas.' },
  { nome: 'acordo_reuniao_previa_obrigatoria', campo: 'reuniaoPreviaObrigatoria',
    descricao: 'Exige reuniao previa dos quotistas antes da reuniao de socios.' },
  { nome: 'acordo_consolida_composse', campo: 'consolidaComposse',
    descricao: 'A avaliacao consolida o que o socio explora junto com a sociedade.' },
  { nome: 'acordo_por_arbitragem', campo: 'porArbitragem',
    descricao: 'A briga vai para arbitragem, e nao para o judiciario.' },
];
const flagIdPorNome = new Map();
for (const f of FLAGS) {
  const [achada] = await api(`tmpl_flag?nome=eq.${f.nome}&select=id`);
  if (achada) { flagIdPorNome.set(f.nome, achada.id); continue; }
  const [criada] = await api('tmpl_flag', {
    method: 'POST',
    body: JSON.stringify({
      nome: f.nome, tipo: 'derivada', escopo: 'pj',
      entidade: 'acordo', campo: f.campo, valor: 'sim',
      descricao: f.descricao, ativo: true,
    }),
  });
  flagIdPorNome.set(f.nome, criada.id);
}
console.log(`flags: ${[...flagIdPorNome.keys()].join(', ')}`);

const [doc] = await api('tmpl_documento', {
  method: 'POST',
  body: JSON.stringify({
    nome: 'Acordo de Quotistas',
    tipo: TIPO_DOC,
    descricao: 'O contrato entre os sócios: saída, morte, separação e venda. '
      + 'Os parâmetros vêm do cadastro da GOV-03.',
    escopo: 'sociedade',
    ativo: true,
  }),
});
console.log(`modelo criado: ${doc.id}`);

// Em lotes, porque 266 requisições uma a uma levam minutos e o PostgREST aceita
// array no POST.
const LOTE = 25;
let ordem = 0;
for (let i = 0; i < blocos.length; i += LOTE) {
  const fatia = blocos.slice(i, i + LOTE);
  const criados = await api('tmpl_bloco', {
    method: 'POST',
    body: JSON.stringify(fatia.map((b) => ({
      nome: b.nome,
      categoria: CATEGORIA,
      tipo: b.tipo,
      titulo_documento: b.titulo ?? null,
      ativo: true,
      autor_id: AUTOR_ID,
    }))),
  });
  // O PostgREST devolve na ordem enviada, e é disso que a composição depende.
  await api('tmpl_bloco_versao', {
    method: 'POST',
    body: JSON.stringify(criados.map((c, k) => ({
      bloco_id: c.id, numero_versao: 1, atual: true, conteudo: fatia[k].conteudo,
      autor_id: AUTOR_ID,
    }))),
  });
  await api('tmpl_documento_bloco', {
    method: 'POST',
    body: JSON.stringify(criados.map((c) => ({
      documento_id: doc.id, bloco_id: c.id, ordem: ++ordem, obrigatorio: true,
    }))),
  });
  // O vinculo bloco -> flag. Bloco sem flag entra sempre; com flag, so quando o
  // cadastro do acordo a acende.
  const vinculos = criados.flatMap((c, k) => (fatia[k].flags ?? []).map((nome) => ({
    bloco_id: c.id, flag_id: flagIdPorNome.get(nome),
  })));
  if (vinculos.length) await api('tmpl_bloco_flag', { method: 'POST', body: JSON.stringify(vinculos) });
  process.stdout.write(`\r  ${ordem}/${blocos.length} blocos`);
}
console.log('');

// --- Conferência do que entrou -----------------------------------------------
const gravados = await api(`tmpl_bloco?categoria=eq.${CATEGORIA}&select=id,tipo`);
const compostos = await api(`tmpl_documento_bloco?documento_id=eq.${doc.id}&select=id`);
const semTexto = await api(
  `tmpl_bloco_versao?select=id,conteudo,bloco_id&bloco_id=in.(${gravados.map((b) => b.id).join(',')})`,
);
const vazios = semTexto.filter((v) => !v.conteudo?.trim()).length;
const clausulas = gravados.filter((b) => b.tipo === 'clausula').length;

console.log(`\ngravados: ${gravados.length} blocos, ${compostos.length} no modelo, `
  + `${clausulas} cláusulas, ${vazios} versões sem texto`);
if (gravados.length !== blocos.length || compostos.length !== blocos.length) {
  console.error('DIVERGÊNCIA: o que entrou não bate com o que foi enviado.');
  process.exit(1);
}
console.log('ok');
