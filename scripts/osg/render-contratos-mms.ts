/**
 * Renderiza os dois contratos rurais do MMS com o motor REAL e os blocos REAIS.
 *
 *   bun scripts/osg/render-contratos-mms.ts
 *
 * ── POR QUE ESTE ARNÊS EXISTE ───────────────────────────────────────────────
 *
 * O teste de unidade de `contextoRural.ts` prova que o contexto resolve os
 * placeholders de blocos que EU escrevi no próprio teste. Isso não prova nada
 * sobre os blocos que vão para o banco: um `{{ instrumento.foro }}` digitado
 * errado na migration passaria pelos 33 testes e só apareceria no contrato do
 * cliente.
 *
 * Então aqui os blocos são LIDOS DO CATÁLOGO NO BANCO — a versão `atual` de cada
 * `tmpl_bloco`, na ordem de `tmpl_documento_bloco` — e renderizados sobre os
 * dados reais do MMS. Se um placeholder não resolve, `gerarComposicao` lança; se
 * um bloco não traz dado, ele é descartado e o descarte é impresso. O que sai em
 * `docs/osg/contratos_exploracao/gerado/` é para comparar com o PDF assinado.
 *
 * Antes ele parseava o SQL de UMA migration. Isso passou a mentir no momento em
 * que a correção do catálogo virou migration seguinte: o arnês seguia validando a
 * primeira versão dos blocos, em silêncio, e dizendo que estava tudo certo.
 *
 * Precisa de sessão: exporte JWT e ANON (e SUPABASE_URL, se não houver
 * `.env.sandbox`). Os DADOS do MMS continuam abaixo, iguais aos da semeadura
 * `20260901192155` — quando o cadastro estiver semeado, a mesma comparação se faz
 * pela tela Gerar.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listasDoInstrumentoRural,
  mapearInstrumentoRural,
  type EntradaInstrumentoRural,
} from '../../src/lib/templates/contextoRural';
import {
  entradaDoInstrumento,
  matriculaParaMapear,
  type ExploracaoCrua,
  type MatriculaCrua,
} from '../../src/lib/osg/entradaRural';
import type { PessoaRow } from '../../src/hooks/useQualificacaoDasPartes';
import { mapearPessoa } from '../../src/lib/templates/mapeadores';
import { apararSegmentos, gerarComposicao, type Bloco, type Contexto, type RegistroFamilias, type Template } from '../../src/lib/templates/index';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// ══════════════════════════════════════════════════════════════════════════════
// 1. Os blocos, lidos do CATÁLOGO NO BANCO
// ══════════════════════════════════════════════════════════════════════════════

// Credenciais no padrão do `export-sops.ts`: o host sai do `.env.sandbox` (o Vite
// não carrega mais esse arquivo sozinho — ver vite.config.ts), e SUPABASE_URL do
// ambiente continua vencendo. JWT e ANON são obrigatórios: este arnês LÊ o
// catálogo, e ler exige sessão.
function urlDoSandbox(): string | undefined {
  try {
    const arquivo = readFileSync(resolve(RAIZ, '.env.sandbox'), 'utf8');
    return arquivo.match(/^SUPABASE_URL=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const RAW_BASE = process.env.SUPABASE_URL || urlDoSandbox();
const JWT = process.env.JWT;
const ANON = process.env.ANON;
if (!RAW_BASE || !JWT || !ANON) {
  console.error(
    'Faltam credenciais. Defina JWT e ANON no ambiente (e SUPABASE_URL, se o\n' +
    '.env.sandbox não estiver presente). Este arnês lê o catálogo do banco.',
  );
  process.exit(1);
}
const BASE = /\/rest\/v\d+$/.test(RAW_BASE) ? RAW_BASE : `${RAW_BASE.replace(/\/$/, '')}/rest/v1`;

// Anuncia o ALVO antes de falar com ele. `SUPABASE_URL` do ambiente vence o
// `.env.sandbox`, e no terminal desta máquina ela aponta para outro projeto — a
// chave do sandbox contra o projeto errado devolve 401 "Invalid API key", que não
// diz nada sobre a causa. Um arnês que compara contrato com o assinado não pode
// deixar dúvida sobre QUAL banco ele leu.
console.log(`banco               : ${BASE.replace(/^https:\/\/([^.]+).*/, '$1')}`);

async function get<T>(recurso: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${recurso}`, {
    headers: { apikey: ANON!, Authorization: `Bearer ${JWT}` },
  });
  if (!res.ok) throw new Error(`${res.status} em ${recurso}: ${await res.text()}`);
  return (await res.json()) as T[];
}

/** A linha de `tmpl_documento_bloco` com o bloco e a versão ATUAL dele juntos. */
interface LinhaDoCatalogo {
  ordem: number;
  obrigatorio: boolean | null;
  bloco: {
    nome: string;
    tipo: string | null;
    ancora: string | null;
    repete_colecao: string | null;
    reinicia_numeracao: boolean | null;
    versoes: { conteudo: string }[];
    flags: { flag: { nome: string } | null }[];
  } | null;
}

/**
 * O documento do catálogo como `Template` do motor.
 *
 * Lê a versão ATUAL de cada bloco (`tmpl_bloco_versao.atual`), que é o que a tela
 * Gerar renderiza — a versão anterior fica no histórico e não deve entrar aqui.
 *
 * Bloco sem versão atual FALHA em vez de sair do documento em silêncio: um
 * capítulo que desaparece renumera todas as cláusulas seguintes, e o arnês existe
 * justamente para não deixar isso passar.
 */
async function carregarTemplate(nome: string): Promise<Template> {
  const recurso =
    'tmpl_documento_bloco?select=ordem,obrigatorio,' +
    'bloco:tmpl_bloco(nome,tipo,ancora,repete_colecao,reinicia_numeracao,' +
    'versoes:tmpl_bloco_versao(conteudo,atual),' +
    'flags:tmpl_bloco_flag(flag:tmpl_flag(nome)))' +
    `&documento_id=eq.${'${id}'}&order=ordem`;
  const docs = await get<{ id: string }>(
    `tmpl_documento?select=id&nome=eq.${encodeURIComponent(nome)}`,
  );
  if (docs.length !== 1) throw new Error(`esperava 1 documento "${nome}", achei ${docs.length}`);
  const linhas = await get<LinhaDoCatalogo>(recurso.replace('${id}', docs[0].id));

  const blocos = linhas.map((l) => {
    if (!l.bloco) throw new Error(`linha de ordem ${l.ordem} em "${nome}" sem bloco`);
    const atual = l.bloco.versoes.find((v) => (v as { atual?: boolean }).atual);
    if (!atual) throw new Error(`bloco "${l.bloco.nome}" sem versão atual`);
    return {
      id: l.bloco.nome,
      tipo: (l.bloco.tipo ?? 'livre') as Bloco['tipo'],
      obrigatorio: l.obrigatorio !== false,
      conteudo: atual.conteudo,
      repeteColecao: l.bloco.repete_colecao ?? undefined,
      ancora: l.bloco.ancora ?? undefined,
      reiniciaNumeracao: l.bloco.reinicia_numeracao === true,
      // As flags que o bloco EXIGE. Sem carregá-las, `comporBlocos` via um bloco
      // opcional sem flag declarada e o descartava — os três parágrafos da
      // pecuária sairiam do documento em silêncio, e o arnês diria que estava
      // tudo certo. É a mesma classe de defeito que fazia ele validar uma versão
      // morta dos blocos sem avisar.
      flagsRequeridas: l.bloco.flags.flatMap((f) => (f.flag ? [f.flag.nome] : [])),
    } satisfies Bloco;
  });
  return { id: nome, nome, blocos };
}

/**
 * O registro de famílias que o render consome ({{familia nome="…"}} → variantes).
 *
 * A alínea de imóvel é família desde a migration `20260902213602`: o texto vive
 * numa variante e os três hospedeiros a incluem por dentro da seção que itera os
 * imóveis. Sem carregar isto, `gerarComposicao` receberia o padrão `{}` e a
 * inclusão falharia — e o arnês existe justamente para não deixar essa classe de
 * coisa passar em silêncio.
 *
 * Mesmas regras de `montarRegistroFamilias` (useBibliotecaModelos.ts): a chave é
 * o NOME da cabeça, variante inativa ou sem versão publicada fica fora, e a ordem
 * é `variante_ordem` — que é o desempate quando mais de um seletor casa.
 */
async function carregarFamilias(): Promise<RegistroFamilias> {
  const variantes = await get<{
    id: string;
    familia_id: string;
    variante_ordem: number | null;
    variante_rotulo: string | null;
    variante_seletor: Record<string, unknown> | null;
    ativo: boolean;
    versoes: { conteudo: string | null; atual: boolean }[];
  }>(
    'tmpl_bloco?select=id,familia_id,variante_ordem,variante_rotulo,variante_seletor,ativo,' +
      'versoes:tmpl_bloco_versao(conteudo,atual)&familia_id=not.is.null',
  );
  if (variantes.length === 0) return {};

  const ids = [...new Set(variantes.map((v) => v.familia_id))];
  const cabecas = await get<{ id: string; nome: string }>(
    `tmpl_bloco?select=id,nome&id=in.(${ids.join(',')})`,
  );
  const nomePorId = new Map(cabecas.map((c) => [c.id, c.nome]));

  const registro: RegistroFamilias = {};
  for (const v of variantes) {
    const nome = nomePorId.get(v.familia_id);
    const atual = v.versoes.find((x) => x.atual);
    if (!nome || !v.ativo || !atual?.conteudo) continue;
    (registro[nome] ??= []).push({
      id: v.id,
      rotulo: v.variante_rotulo,
      ordem: v.variante_ordem ?? 0,
      seletor: Object.fromEntries(
        Object.entries(v.variante_seletor ?? {}).map(([c, valor]) => [c, String(valor ?? '')]),
      ),
      conteudo: atual.conteudo,
    });
  }
  for (const lista of Object.values(registro)) lista.sort((a, b) => a.ordem - b.ordem);
  return registro;
}

const TEMPLATE_PARCERIA = await carregarTemplate('Parceria Rural');
const TEMPLATE_COMPOSSE = await carregarTemplate('Composse Rural Pro Indiviso');
const FAMILIAS = await carregarFamilias();
console.log(
  `famílias carregadas : ${Object.keys(FAMILIAS).length ? Object.entries(FAMILIAS).map(([n, v]) => `${n} (${v.length})`).join(', ') : 'nenhuma'}`,
);

// ══════════════════════════════════════════════════════════════════════════════
// 2. Os dados do MMS — LIDOS DO BANCO
// ══════════════════════════════════════════════════════════════════════════════
//
// Antes eles estavam escritos à mão aqui. Isso significava duas fontes para o
// mesmo cadastro — a semeadura `20260901192155` e a cópia neste arquivo — e elas
// divergiram: o preâmbulo saía sem capital social e sem os administradores, e a
// alínea sem Livro e Folha, com o dado correto gravado no banco todo esse tempo.
// O arnês informava "nenhum placeholder pendente" e estava certo; só não estava
// comparando o que a tela produz.
//
// A conversão linha→entrada é a MESMA da tela (`entradaDoInstrumento`, em
// src/lib/osg/entradaRural.ts). É o que faz este arnês testar o caminho do
// consultor, e não um caminho paralelo.

const CLIENTE = '[TESTE] MMS';

const SELECT_EXPLORACAO =
  '*,' +
  'partes:exploracao_rural_parte(pessoa_id,papel,fracao,ordem),' +
  'imoveis:exploracao_rural_imovel!exploracao_rural_imovel_exploracao_rural_id_fkey(' +
    'matricula_id,area_explorada,area_unidade,ordem,origem_tipo,origem_externa_id,' +
    'origem_exploracao_rural_id),' +
  'origens:exploracao_rural_origem_externa(id,titulo_instrumento,data_assinatura,' +
    'outorgante_pessoa_id,outorgante_representante,outorgante_capital_social_na_assinatura)';

// O MESMO select da tela (MATRICULA_GERACAO_SELECT), porque é o mesmo mapeador
// que consome o resultado.
const SELECT_MATRICULA =
  'id,numero,livro,folha,municipio_imovel,uf_imovel,area_documento,area_unidade,' +
  'vlr_contabil,confrontacoes_texto,descricao_psa_completa,tipo_bem,tipo_exploracao_posse,' +
  'bem:bem_id(denominacao,vlr_contabil,ccir_codigo,cliente_id,tipo_bem,inscricao_municipal,' +
    'endereco_logradouro,endereco_numero,endereco_complemento,endereco_bairro,endereco_cep,' +
    'area_construida_m2,participa_estruturacao),' +
  'cartorio:cartorio_id(nome_completo,comarca,uf),' +
  'titularidade(integralizador,fracao,titular:titular_pessoa_id(id,denominacao,cliente_id))';

const clientes = await get<{ id: string }>(
  `cliente?select=id&nome=eq.${encodeURIComponent(CLIENTE)}`,
);
if (clientes.length !== 1) {
  throw new Error(
    `esperava 1 cliente "${CLIENTE}", achei ${clientes.length}. ` +
    'A semeadura 20260901192155 foi aplicada neste banco?',
  );
}
const CLIENTE_ID = clientes[0].id;

const pessoas = await get<PessoaRow>(`pessoa?select=*&cliente_id=eq.${CLIENTE_ID}`);
const pessoaPorId = new Map(pessoas.map((p) => [p.id, p]));

const matriculasCruas = await get<MatriculaCrua>(
  `matricula?select=${SELECT_MATRICULA}&cliente_id=eq.${CLIENTE_ID}`,
);
const matriculaPorId = new Map(
  matriculasCruas.map((m) => [m.id, matriculaParaMapear(m)]),
);

// Quem administra a pessoa jurídica outorgante: o preâmbulo qualifica cada
// administrador por extenso e o fecho dá a cada um a sua linha de assinatura.
const administracao = await get<{ pj_pessoa_id: string; administrador: PessoaRow | null }>(
  'administracao?select=pj_pessoa_id,administrador:administrador_pessoa_id(*)' +
  `&pj_pessoa_id=in.(${[...pessoaPorId.keys()].join(',')})&order=created_at`,
);
const administradoresPorPj = new Map<string, PessoaRow[]>();
for (const a of administracao) {
  if (!a.administrador) continue;
  administradoresPorPj.set(
    a.pj_pessoa_id,
    [...(administradoresPorPj.get(a.pj_pessoa_id) ?? []), a.administrador],
  );
}

const exploracoes = await get<ExploracaoCrua & { id: string; tipo_exploracao: string }>(
  `exploracao_rural?select=${SELECT_EXPLORACAO}&cliente_id=eq.${CLIENTE_ID}`,
);
// A origem INTERNA do composse aponta para a parceria: é de lá que saem a data e
// o outorgante que o Considerando V nomeia.
const exploracaoPorId = new Map(exploracoes.map((e) => [e.id, e]));

function entradaDoTipo(tipo: string, manuais: EntradaInstrumentoRural['manuais']) {
  const linha = exploracoes.find((e) => e.tipo_exploracao === tipo);
  if (!linha) {
    throw new Error(`o cliente "${CLIENTE}" não tem instrumento do tipo "${tipo}" no banco.`);
  }
  const entrada = entradaDoInstrumento(
    linha, pessoaPorId, matriculaPorId, administradoresPorPj, exploracaoPorId,
  );
  return { ...entrada, manuais };
}

// Foro, número de vias e instituto de preço NÃO são cadastro: são dados do ATO de
// assinar, que na tela Gerar vivem no painel "Ajustar dados manualmente". Aqui
// entram com os valores do contrato assinado — é o único trecho que continua
// escrito à mão, e é escrito à mão na tela também.
const ENTRADA_PARCERIA = entradaDoTipo('parceria', {
  foroComarca: 'Lucas do Rio Verde',
  foroUf: 'MT',
  numeroVias: 4,
  institutoPreco: 'IMEA – Instituto Mato-Grossense de Economia e Agropecuária',
});

const ENTRADA_COMPOSSE = entradaDoTipo('composse', {
  foroComarca: 'Lucas do Rio Verde',
  foroUf: 'MT',
  numeroVias: 3,
  // Não é derivável: o contrato assinado diz "E ESPOSA", não "E OUTROS".
  nomeComposse: 'JOSE EDUARDO DE MACEDO SOARES JUNIOR E ESPOSA',
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Render + relatório
// ══════════════════════════════════════════════════════════════════════════════

/** O contexto como a tela Gerar monta: um sub-objeto por binding, mais as listas. */
function contextoDe(entrada: EntradaInstrumentoRural): Contexto {
  return {
    instrumento: mapearInstrumentoRural(entrada),
    // `outorgante` é binding de PESSOA como qualquer papel: na tela o consultor o
    // amarra; aqui a amarração é simulada com a pessoa que o cadastro registrou.
    outorgante: entrada.outorgante ? mapearPessoa(entrada.outorgante) : {},
    ...listasDoInstrumentoRural(entrada),
  };
}

function renderizar(
  rotulo: string,
  template: Template,
  entrada: EntradaInstrumentoRural,
  arquivo: string,
  flagsAtivas: string[] = [],
) {
  console.log(`\n${'═'.repeat(78)}\n${rotulo} — ${template.blocos.length} blocos lidos da migration\n${'═'.repeat(78)}`);

  const contexto = contextoDe(entrada);

  let composicao;
  try {
    composicao = gerarComposicao(template, contexto, flagsAtivas, FAMILIAS);
  } catch (erro) {
    console.log(`✗ O MOTOR LANÇOU: ${(erro as Error).message}`);
    return;
  }

  const texto = composicao.blocos
    .map((b) => apararSegmentos(b.segmentos).map((s) => s.texto).join(''))
    .join('\n\n');

  const pendentes = [...texto.matchAll(/\{\{[^}]*\}\}/g)].map((m) => m[0]);
  console.log(`blocos no documento : ${composicao.blocos.length}`);
  console.log(`descartados         : ${composicao.descartados.length}`);
  for (const d of composicao.descartados) console.log(`  · ${d.id} — ${d.motivo}`);
  console.log(`placeholder pendente: ${pendentes.length ? pendentes.join(', ') : 'nenhum'}`);
  console.log(`"undefined" no texto: ${texto.includes('undefined') ? 'SIM ✗' : 'não'}`);
  console.log(`caracteres          : ${texto.length}`);

  const destino = resolve(RAIZ, 'docs/osg/contratos_exploracao/gerado', arquivo);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, texto, 'utf8');
  console.log(`escrito em          : ${destino.slice(RAIZ.length + 1)}`);

  // O MESMO documento, mas com a fronteira de cada bloco preservada.
  //
  // O .md acima é o contrato corrido, e nele não se sabe qual bloco escreveu qual
  // parágrafo — que é justamente o que se precisa saber para conferir se o
  // catálogo cobre o instrumento assinado por inteiro. `composicao.blocos` já traz
  // essa fronteira (um item por bloco, e um item por INSTÂNCIA nos repetidores);
  // aqui ela só é gravada em vez de ser desmanchada pelo `join`.
  //
  // Os descartados entram também: bloco que saiu do documento por flag é
  // informação, não ausência — sem ele a conferência leria "faltou" onde o certo
  // é "não se aplica a este contrato".
  const porBloco = {
    documento: template.nome,
    blocosNoCatalogo: template.blocos.length,
    blocos: composicao.blocos.map((b, i) => ({
      posicao: i + 1,
      id: b.id,
      tipo: b.tipo ?? 'livre',
      texto: apararSegmentos(b.segmentos).map((s) => s.texto).join(''),
    })),
    descartados: composicao.descartados.map((d) => ({ id: d.id, motivo: d.motivo })),
  };
  const destinoJson = destino.replace(/\.md$/, '-por-bloco.json');
  writeFileSync(destinoJson, `${JSON.stringify(porBloco, null, 2)}\n`, 'utf8');
  console.log(`fronteira por bloco : ${destinoJson.slice(RAIZ.length + 1)}`);
}

// Nenhuma flag: a modalidade da pecuária passou a ser CADASTRO
// (`exploracao_rural.pecuaria_modalidades`), e quem decide se cada parágrafo entra
// é a condicional dentro do texto do bloco. Antes o arnês passava as três flags na
// mão — e por isso "provava" que o mecanismo funcionava sem tocar na parte que
// estava quebrada: onde a resposta seria gravada.
renderizar('PARCERIA RURAL — MMS', TEMPLATE_PARCERIA, ENTRADA_PARCERIA, 'mms-parceria-gerado.md');
renderizar('COMPOSSE RURAL — MMS', TEMPLATE_COMPOSSE, ENTRADA_COMPOSSE, 'mms-composse-gerado.md');
