/**
 * Renderiza o ACORDO DE QUOTISTAS com o motor REAL e os blocos REAIS do banco.
 *
 *   JWT=… ANON=… bun scripts/osg/render-acordo.ts --cliente Abacaxi
 *
 * ── POR QUE ESTE ARNÊS EXISTE ───────────────────────────────────────────────
 *
 * É o irmão do `render-contratos-mms.ts`, e existe pelo mesmo motivo: o teste de
 * unidade prova que o contexto resolve os placeholders de blocos que EU escrevi
 * dentro do próprio teste. Não prova nada sobre os 266 blocos que o
 * `carregar-blocos-acordo.mjs` gravou no catálogo.
 *
 * A diferença aqui é o defeito que ele foi feito para pegar. Os blocos saíram do
 * modelo do escritório, que é o acordo de um cliente de verdade. Onde a
 * parametrização não chegou, sobra o nome DESSE cliente no documento de outro —
 * e isso não dá erro em lugar nenhum: o documento sai inteiro, bonito, com o
 * nome errado. Por isso o relatório abaixo procura por nome de gente e de
 * empresa que não sejam do cadastro lido.
 *
 * O caminho é o da tela Gerar, e não um paralelo: os blocos vêm de
 * `tmpl_documento_bloco` na ordem gravada, a entrada vem de `entradaDoAcordo`
 * (o mesmo tradutor que `useGeracaoDocumento` chama), e o contexto se monta com
 * `camposDoAcordo` e `listasDoAcordo`, que são o que o controller usa.
 *
 * O QUE ELE NÃO COBRE: a folha da tela (proveniência, snapshot, flags por
 * seleção) e o docx. Ele mede o TEXTO que o motor produz, que é onde moram os
 * defeitos de conteúdo.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { entradaDoAcordo } from '../../src/lib/osg/entradaAcordo';
import type { AcordoCompleto } from '../../src/hooks/useDomainAcordoQuotistas';
import { camposDoAcordo, listasDoAcordo } from '../../src/lib/templates/contextoAcordo';
import {
  mapearAdministrador, mapearSociedade, tituloColetivoDosAdministradores,
} from '../../src/lib/templates/mapeadores';
import { CAMPOS_MANUAIS } from '../../src/lib/templates/vocabulario';
import { montarDocx } from '../../src/lib/templates/docx';
import type { PessoaRow } from '../../src/hooks/useQualificacaoDasPartes';
import {
  apararSegmentos,
  gerarComposicao,
  pendenciasDoDocumento,
  type Bloco,
  type Contexto,
  type Template,
} from '../../src/lib/templates/index';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function arg(nome: string, padrao?: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : padrao;
}

const CLIENTE = arg('cliente', 'Abacaxi')!;
const EMPRESA = arg('empresa');
const VERSAO = arg('versao');
/*
 * O NOME CURTO é campo MANUAL (ver CAMPOS_MANUAIS): não existe coluna de apelido
 * no cadastro da empresa, então na tela ele é um campo de texto que o consultor
 * digita. Aqui ele é argumento pelo mesmo motivo, e o padrão é um aviso visível
 * — se sair assim no texto, é porque a tela também deixaria em branco.
 */
const NOME_CURTO = arg('nome-curto');

function urlDoSandbox(): string | undefined {
  try {
    return readFileSync(resolve(RAIZ, '.env.sandbox'), 'utf8')
      .match(/^(?:SUPABASE_URL|VITE_SUPABASE_URL)=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}
function anonDoSandbox(): string | undefined {
  try {
    return readFileSync(resolve(RAIZ, '.env.sandbox'), 'utf8')
      .match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
}

const RAW_BASE = process.env.SUPABASE_URL || urlDoSandbox();
const JWT = process.env.JWT ?? process.env.OSG_TOKEN;
const ANON = process.env.ANON ?? anonDoSandbox();
if (!RAW_BASE || !JWT || !ANON) {
  console.error('Faltam credenciais: exporte JWT (ou OSG_TOKEN). Este arnês LÊ o catálogo.');
  process.exit(1);
}
const BASE = /\/rest\/v\d+$/.test(RAW_BASE) ? RAW_BASE : `${RAW_BASE.replace(/\/$/, '')}/rest/v1`;
console.log(`banco               : ${BASE.replace(/^https:\/\/([^.]+).*/, '$1')}`);

async function get<T>(recurso: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${recurso}`, {
    headers: { apikey: ANON!, Authorization: `Bearer ${JWT}` },
  });
  if (!res.ok) throw new Error(`${res.status} em ${recurso}: ${await res.text()}`);
  return (await res.json()) as T[];
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Os blocos, lidos do CATÁLOGO NO BANCO
// ══════════════════════════════════════════════════════════════════════════════

interface LinhaDoCatalogo {
  ordem: number;
  obrigatorio: boolean | null;
  bloco: {
    nome: string;
    tipo: string | null;
    titulo_documento: string | null;
    versoes: { conteudo: string; atual: boolean }[];
    flags: { flag: { nome: string } | null }[];
  } | null;
}

async function carregarTemplate(nome: string): Promise<Template> {
  const docs = await get<{ id: string }>(
    `tmpl_documento?select=id&nome=eq.${encodeURIComponent(nome)}`,
  );
  if (docs.length !== 1) throw new Error(`esperava 1 documento "${nome}", achei ${docs.length}`);
  const linhas = await get<LinhaDoCatalogo>(
    'tmpl_documento_bloco?select=ordem,obrigatorio,'
    + 'bloco:tmpl_bloco(nome,tipo,titulo_documento,versoes:tmpl_bloco_versao(conteudo,atual),'
    + 'flags:tmpl_bloco_flag(flag:tmpl_flag(nome)))'
    + `&documento_id=eq.${docs[0].id}&order=ordem&limit=2000`,
  );

  const blocos = linhas.map((l) => {
    if (!l.bloco) throw new Error(`linha de ordem ${l.ordem} sem bloco`);
    const atual = l.bloco.versoes.find((v) => v.atual);
    // Cláusula do Acordo é só a linha do título: ela não tem corpo, e o corpo é
    // o item seguinte. Exigir conteúdo aqui apagaria as 26 e órfãos os 237
    // filhos — foi exatamente o defeito que deixou o documento com 3 blocos.
    if (!atual && l.bloco.tipo !== 'clausula') {
      throw new Error(`bloco "${l.bloco.nome}" sem versão atual`);
    }
    return {
      id: l.bloco.nome,
      tipo: (l.bloco.tipo ?? 'livre') as Bloco['tipo'],
      obrigatorio: l.obrigatorio !== false,
      conteudo: atual?.conteudo ?? '',
      tituloDocumento: l.bloco.titulo_documento ?? undefined,
      // As flags que o bloco EXIGE. Sem carregá-las o arnês veria todo bloco como
      // incondicional e diria que o mecanismo funciona quando ele não funciona.
      flagsRequeridas: l.bloco.flags.flatMap((f) => (f.flag ? [f.flag.nome] : [])),
    } satisfies Bloco;
  });
  return { id: nome, nome, blocos };
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. O cadastro, lido do banco pelo MESMO caminho da tela
// ══════════════════════════════════════════════════════════════════════════════

const clientes = await get<{ id: string; nome: string }>(
  `cliente?select=id,nome&nome=ilike.${encodeURIComponent(`*${CLIENTE}*`)}`,
);
if (clientes.length !== 1) {
  console.error(`"${CLIENTE}" casou ${clientes.length} clientes: `
    + clientes.map((c) => c.nome).join(' | '));
  process.exit(1);
}
const cliente = clientes[0];
console.log(`cliente             : ${cliente.nome}`);

const pessoas = await get<PessoaRow>(`pessoa?select=*&cliente_id=eq.${cliente.id}`);
const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));

const crus = await get<Record<string, never>>(
  'acordo_quotistas?select=*,acordo_quorum(*),acordo_ramo_familiar(*),'
  + 'acordo_ordem_preferencia(*),acordo_signatario(*)'
  + `&cliente_id=eq.${cliente.id}&excluido=eq.false&order=versao.desc`,
);
// A forma que `entradaDoAcordo` espera é a de `useAcordosDoCliente`: cabeçalho
// separado das cinco coleções, cada uma ordenada.
const porOrdem = <T extends { ordem: number }>(l: T[] | null) =>
  [...(l ?? [])].sort((a, b) => a.ordem - b.ordem);
const completos = crus.map((linha) => {
  const {
    acordo_quorum: quoruns, acordo_ramo_familiar: ramos,
    acordo_ordem_preferencia: ordem, acordo_signatario: signatarios, ...acordo
  } = linha as unknown as Record<string, never[]>;
  return {
    acordo, quoruns: porOrdem(quoruns), ramos: porOrdem(ramos),
    ordemPreferencia: porOrdem(ordem), signatarios: porOrdem(signatarios),
  };
});
const escolhido = VERSAO
  ? completos.find((c) => String((c.acordo as { versao: number }).versao) === VERSAO)
  : completos[0];
if (!escolhido) {
  console.error(`sem acordo versão ${VERSAO} para este cliente`);
  process.exit(1);
}
const entrada = entradaDoAcordo(escolhido as unknown as AcordoCompleto, pessoaPorId);
if (!entrada) {
  console.error('`entradaDoAcordo` devolveu nulo: o acordo não tem o mínimo para virar documento.');
  process.exit(1);
}
const versao = (escolhido.acordo as { versao: number }).versao;
console.log(`acordo              : versão ${versao}`);

// A EMPRESA é o seletor único da tela Gerar, e dela saem `{{ sociedade.* }}` e
// os administradores que o preâmbulo nomeia.
const pjs = pessoas.filter((p) => p.tipo_pessoa === 'PJ');
const empresa = EMPRESA
  ? pjs.find((p) => p.denominacao?.toLowerCase().includes(EMPRESA.toLowerCase()))
  : pjs[0];
if (!empresa) {
  console.error(`sem PJ casando "${EMPRESA ?? ''}". PJs: ${pjs.map((p) => p.denominacao).join(' | ')}`);
  process.exit(1);
}
console.log(`empresa             : ${empresa.denominacao}`);

interface LinhaAdm { id: string; cargo: string | null; administrador: PessoaRow | null }
const admLinhas = await get<LinhaAdm>(
  `administracao?select=id,cargo,administrador:administrador_pessoa_id(*)&pj_pessoa_id=eq.${empresa.id}`,
);
const administradores = admLinhas
  .filter((l) => l.administrador)
  .map((l) => ({ pessoa: l.administrador!, cargo: l.cargo, administracaoId: l.id }));

// ══════════════════════════════════════════════════════════════════════════════
// 3. O contexto, como o controller monta
// ══════════════════════════════════════════════════════════════════════════════

const listas = listasDoAcordo(entrada);
const contexto: Contexto = {
  acordo: camposDoAcordo(entrada),
  sociedade: mapearSociedade(empresa, undefined, {
    tituloColetivoAdministradores: tituloColetivoDosAdministradores(administradores),
  }),
  ...listas,
  administradores: administradores.map(mapearAdministrador),
};
// Os campos MANUAIS: sem cadastro atrás, na tela são caixas de texto. Em branco
// resolvem '' e viram lacuna, e é assim que eles entram aqui também.
const manuais: Record<string, string> = {};
for (const c of CAMPOS_MANUAIS) manuais[c.id] = '';
if (NOME_CURTO) manuais.nomeCurtoDaEmpresa = NOME_CURTO;
Object.assign(contexto, manuais);

// ══════════════════════════════════════════════════════════════════════════════
// 4. Render + relatório
// ══════════════════════════════════════════════════════════════════════════════

const template = await carregarTemplate('Acordo de Quotistas');
console.log(`blocos no catálogo  : ${template.blocos.length}`);

let composicao;
try {
  // As flags ativas saem do CADASTRO, como no controller: campo condicional que
  // resolve 'sim' acende a flag de mesmo nome prefixada por `acordo_`.
  const campos = camposDoAcordo(entrada) as Record<string, string>;
  const flagsAtivas = Object.entries(campos)
    .filter(([, v]) => v === 'sim')
    .map(([k]) => `acordo_${k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`);
  console.log(`flags ativas        : ${flagsAtivas.join(', ') || 'nenhuma'}`);
  composicao = gerarComposicao(template, contexto, flagsAtivas, {});
} catch (erro) {
  console.error(`\n✗ O MOTOR LANÇOU: ${(erro as Error).message}`);
  process.exit(1);
}

const texto = composicao.blocos
  .map((b) => apararSegmentos(b.segmentos).map((s) => s.texto).join(''))
  .join('\n\n');

console.log(`\nblocos no documento : ${composicao.blocos.length}`);
console.log(`descartados         : ${composicao.descartados.length}`);
for (const d of composicao.descartados.slice(0, 15)) console.log(`  · ${d.id} — ${d.motivo}`);
if (composicao.descartados.length > 15) {
  console.log(`  · … e mais ${composicao.descartados.length - 15}`);
}

const pendencias = pendenciasDoDocumento(composicao.blocos);
console.log(`pendencias          : ${pendencias.length
  ? pendencias.map((p) => `${p.label}${p.lista ? ' (lista vazia)' : ''}`).join(' | ')
  : 'nenhuma'}`);
const pendentes = [...new Set([...texto.matchAll(/\{\{[^}]*\}\}/g)].map((m) => m[0]))];
console.log(`placeholder pendente: ${pendentes.length ? pendentes.join(', ') : 'nenhum'}`);
console.log(`"undefined" no texto: ${texto.includes('undefined') ? 'SIM ✗' : 'não'}`);
console.log(`cláusulas           : ${(texto.match(/^\*CLÁUSULA /gm) ?? []).length}`);
console.log(`caracteres          : ${texto.length}`);

/*
 * O CLIENTE ERRADO, que é o defeito que este arnês existe para pegar.
 *
 * Procura nome próprio em CAIXA ALTA que o texto trate como se fosse do
 * cadastro, e cobra que cada um seja de alguém que veio do banco. É busca
 * grosseira de propósito: "DUAL" só some do relatório quando some do texto.
 */
const doCadastro = new Set(
  [...pessoas.map((p) => p.denominacao ?? ''), cliente.nome, NOME_CURTO ?? '']
    .flatMap((n) => n.toUpperCase().split(/[^A-ZÀ-Ú]+/))
    .filter((p) => p.length > 2),
);
// As palavras que o próprio modelo escreve em caixa alta (os termos definidos da
// Cláusula Primeira). Elas não são nome de gente.
const TERMOS = /^(ACORDO|QUOTISTAS?|QUOTAS?|SOCIEDADES?|RELACIONADAS?|ADMINISTRAÇÃO|CONSELHO|DIRETORIA|REUNIÃO|SÓCIOS?|PARTES?|INTEGRANTES|CLÁUSULA|PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA|VIGÉSIMA|ÚNICO|ÚNICA|ANEXO|LTDA|S\.A|EIRELI|ME|EPP|CPF|CNPJ|RG|CEP|UF|BRASIL|ATIVIDADE|CONCORRENTE|ÁREA|DE|ATUAÇÃO|DO|DA|DOS|DAS|E|OU|A|O|AS|OS|EM|NO|NA|POR|PARA|COM|SEM)$/;
const suspeitos = new Map<string, number>();
for (const m of texto.matchAll(/\b[A-ZÀ-Ú]{3,}\b/g)) {
  const p = m[0];
  if (doCadastro.has(p) || TERMOS.test(p)) continue;
  suspeitos.set(p, (suspeitos.get(p) ?? 0) + 1);
}
const ordenados = [...suspeitos].sort((a, b) => b[1] - a[1]);
console.log(`\npalavras em caixa alta que NÃO vieram do cadastro: ${ordenados.length}`);
for (const [p, n] of ordenados.slice(0, 25)) console.log(`  ${String(n).padStart(4)}×  ${p}`);
if (ordenados.length > 25) console.log(`  … e mais ${ordenados.length - 25}`);

// As listas vazias, que são a outra metade do problema: lista sem item faz a
// seção sumir calada, e é assim que o preâmbulo sai sem ninguém.
console.log('\nlistas do acordo:');
for (const [nome, itens] of Object.entries(listas)) {
  console.log(`  ${itens.length ? ' ' : '✗'} ${nome}: ${itens.length}`);
}

const base = resolve(RAIZ, 'docs/osg/acordo-gerado', `${cliente.nome.replace(/[^\w]+/g, '-')}-v${versao}`);
mkdirSync(dirname(base), { recursive: true });
writeFileSync(`${base}.md`, texto, 'utf8');
console.log(`\nescrito em          : ${`${base}.md`.slice(RAIZ.length + 1)}`);

/*
 * O .docx TAMBÉM, porque metade dos defeitos de formatação não aparece no texto.
 *
 * O negrito do termo definido, o alinhamento do título de seção e o tamanho da
 * capa são decisão do `montarDocx`, e não do render: medir só o markdown deixou
 * passar a capa sem formatação por três semanas. O arquivo é o mesmo que a tela
 * baixa, e abre no Word.
 */
const { Packer } = await import('docx');
const doc = await montarDocx(composicao.blocos);
writeFileSync(`${base}.docx`, await Packer.toBuffer(doc));
console.log(`e o docx em         : ${`${base}.docx`.slice(RAIZ.length + 1)}`);
