// Gera a seção tributária da apresentação a partir de UMA revisão do papel de
// trabalho, e grava o resultado.
//
// Contrato:
//   body → { importacaoId: string }
//   resp → { apresentacaoId, versao, nomeArquivo, url, problemas }
//
// **Recebe só o id da revisão.** Nenhum número vem do navegador: a função lê as
// tabelas `wp_*` ela mesma, com o token de quem chamou, e a RLS decide o que ela
// enxerga. É exigência do enunciado da PT-03 e é o que faz o slide sair do mesmo
// lugar que a conferência da PT-02 olhou.
//
// **Falha estrutural não entrega arquivo.** Se o `validatePptx` achar problema no
// pacote, nada sobe para o bucket e nada entra na tabela: volta erro.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { packPptx, readText, unpackPptx, writeText, type PptxParts } from '../_shared/ooxml/zip.ts';
import { parseXml, qsa, serializeXml } from '../_shared/ooxml/xml.ts';
import { applyTokensToNode, stripRemainingTokens } from '../_shared/ooxml/runs.ts';
import {
  cloneRow,
  insertRowBefore,
  listRows,
  removeRow,
  rowContainsToken,
} from '../_shared/ooxml/table.ts';
import { validatePptx } from '../_shared/ooxml/validate.ts';
import {
  montaDeck,
  type TabelaDoSlide,
  type ComentarioDaRevisao,
  type Deck,
  type FarolDaRevisao,
  type LinhaDaTabela,
  type ValorDaRevisao,
} from '../_shared/planejamento-tributario/slides.ts';

/** Muda quando a forma de montar o slide muda, e fica gravado na apresentação. */
const VERSAO_DO_GERADOR = '1.0';

const BUCKET_MOLDES = 'osg-templates';
const BUCKET_SAIDA = 'wp-apresentacoes';
const MOLDE = 'TEMPLATE_TRIBUTARIO.pptx';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * Onde cada tabela mora no molde, quais células são de valor, e quantas delas o
 * molde reserva por ano.
 *
 * `porAno` é o que evita o pior defeito silencioso desta tela: a DRE tem dois
 * espaços por ano, e um estudo com um contribuinte só devolve três colunas.
 * Encaixando por posição, 2027 caía no espaço do segundo contribuinte de 2026,
 * com o número certo debaixo do cabeçalho errado.
 */
const SLIDES = {
  dre: { arquivo: 'ppt/slides/slide2.xml', colunas: [2, 3, 5, 6, 8, 9], porAno: 2 },
  farol: { arquivo: 'ppt/slides/slide7.xml', colunas: [] as number[], porAno: 0 },
  transferencia: {
    arquivo: 'ppt/slides/slide8.xml',
    colunas: [2, 4, 6, 8, 10, 12],
    porAno: 1,
  },
  resumo: {
    arquivo: 'ppt/slides/slide9.xml',
    colunas: [2, 3, 4, 6, 7, 8, 10, 11, 12],
    porAno: 3,
  },
  comentarios: { arquivo: 'ppt/slides/slide10.xml', colunas: [] as number[], porAno: 0 },
};

/**
 * A chave de cada espaço do molde, na ordem em que eles aparecem.
 *
 * Vazio onde o estudo não tem o que pôr: um ano a menos, ou um contribuinte a
 * menos, deixa a célula em branco em vez de puxar o valor do vizinho.
 */
function chavesDosEspacos(t: TabelaDoSlide, porAno: number): string[] {
  const chaves: string[] = [];
  for (const ano of t.anos) {
    if (t.subs.length === 0) {
      chaves.push(ano);
      continue;
    }
    for (let i = 0; i < porAno; i++) {
      chaves.push(t.subs[i] ? `${ano}|${t.subs[i]}` : '');
    }
  }
  return chaves;
}

const WINGDINGS = 'Wingdings 2';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';

// ─── OOXML ───────────────────────────────────────────────────────────────────

/**
 * A MOLDURA da tabela, não a tabela.
 *
 * O `listRows` do `_shared` recebe o `p:graphicFrame` e procura o `a:tbl` dentro
 * dele. Passando o `a:tbl` direto ele procura uma tabela dentro da tabela, não
 * acha, e devolve lista vazia: as linhas-modelo nunca eram encontradas e o slide
 * saía com a tabela em branco, sem erro nenhum.
 */
function molduraDaTabela(doc: Document): Element | null {
  for (const gf of qsa(doc, 'p:graphicFrame')) {
    if (qsa(gf, 'a:tbl').length > 0) return gf;
  }
  return null;
}

function textoDe(no: Element): string {
  return qsa(no, 'a:t')
    .map((t) => t.textContent ?? '')
    .join('');
}

/**
 * Escreve numa célula, opcionalmente trocando a fonte.
 *
 * **A fonte vai junto de propósito.** No Farol, marcador e percentual convivem na
 * mesma linha e o molde congela a fonte de cada célula. Escrever só o texto faria
 * um percentual cair numa célula de Wingdings e sair como rabisco, **sem erro
 * nenhum**, que é o pior defeito possível num slide de imposto.
 */
function escreveNaCelula(tc: Element, valor: string, fonte?: string): void {
  const runs = qsa(tc, 'a:r');
  if (runs.length === 0) return;
  const t = qsa(runs[0], 'a:t')[0];
  if (!t) return;
  t.textContent = valor;

  if (fonte) {
    let rPr = qsa(runs[0], 'a:rPr')[0];
    if (!rPr) {
      rPr = runs[0].ownerDocument!.createElementNS(A, 'a:rPr');
      runs[0].insertBefore(rPr, runs[0].firstChild);
    }
    for (const tag of ['latin', 'cs', 'sym']) {
      let el = qsa(rPr, `a:${tag}`)[0];
      if (!el) {
        el = rPr.ownerDocument!.createElementNS(A, `a:${tag}`);
        rPr.appendChild(el);
      }
      el.setAttribute('typeface', fonte);
    }
  }

  for (let i = 1; i < runs.length; i++) runs[i].parentNode?.removeChild(runs[i]);
}

/**
 * Troca as linhas-modelo pelas linhas de dado.
 *
 * O molde traz uma linha por estilo, com token, e ela é clonada por linha que
 * vier. `prefixos` é a lista de estilos na ordem do nível: a DRE tem três, para
 * total, grupo e detalhe, e é o `nivel` que escolhe.
 */
function preencheTabela(
  moldura: Element,
  prefixos: string[],
  linhas: LinhaDaTabela[],
  chavesPorEspaco: string[],
  indicesDeValor: number[],
): void {
  const modelos = new Map<string, Element>();
  for (const tr of listRows(moldura)) {
    for (const p of prefixos) {
      if (rowContainsToken(tr, `${p}ROTULO`)) modelos.set(p, tr);
    }
  }
  if (modelos.size === 0) return;
  const primeiro = [...modelos.values()][0];

  for (const linha of linhas) {
    const p =
      prefixos.length === 1 ? prefixos[0] : prefixos[Math.min(linha.nivel, prefixos.length - 1)];
    const molde = modelos.get(p) ?? primeiro;
    const nova = cloneRow(molde);

    const celulas = qsa(nova, 'a:tc');
    celulas.forEach((tc, i) => {
      const tok = textoDe(tc).trim();
      if (!tok.includes('{{')) return;
      if (tok.includes('ROTULO')) {
        escreveNaCelula(tc, linha.rotulo);
        return;
      }
      const pos = indicesDeValor.indexOf(i);
      const chave = pos >= 0 ? (chavesPorEspaco[pos] ?? '') : '';
      escreveNaCelula(tc, chave ? (linha.valores[chave] ?? '-') : '');
    });

    insertRowBefore(nova, primeiro);
  }
  for (const tr of modelos.values()) removeRow(tr);
}

/** Normaliza rótulo para casar molde e mapa, que divergem em acento e plural. */
function normaliza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * O Farol é preenchido célula a célula, e não por clonagem.
 *
 * As linhas dele são fixas e a fonte varia por célula. O token traz a posição
 * (`{{F_L01_LP_PF}}`) porque casar por texto quebraria: o molde saiu de um deck e
 * o mapa de outro, e 5 dos 18 rótulos têm redação diferente.
 */
function preencheFarol(moldura: Element, farol: Deck['farol'], deParaDoMolde: string[]): number {
  const porChave = new Map<string, Deck['farol'][number]>();
  for (const c of farol) {
    const reg = c.regime === 'presumido' ? 'LP' : 'LR';
    porChave.set(`${normaliza(c.rotulo)}|${reg}_${c.pessoa.toUpperCase()}`, c);
  }

  let semDado = 0;
  for (const tr of listRows(moldura)) {
    for (const tc of qsa(tr, 'a:tc')) {
      const tok = textoDe(tc).trim();
      if (!tok.startsWith('{{F_')) continue;
      const [, li, reg, pes] = tok.replace(/[{}]/g, '').split('_');
      const i = Number(li.slice(1)) - 1;
      const rotulo = deParaDoMolde[i];
      const cel = rotulo ? porChave.get(`${normaliza(rotulo)}|${reg}_${pes}`) : undefined;
      if (cel) {
        escreveNaCelula(tc, String(cel.valor), cel.eMarcador ? WINGDINGS : 'Arial');
      } else {
        escreveNaCelula(tc, '-', 'Arial');
        semDado++;
      }
    }
  }
  return semDado;
}

/**
 * A ordem das linhas do Farol no molde.
 *
 * Vem do próprio molde, lida na hora: cada linha de dado tem o rótulo na primeira
 * célula e tokens nas demais. Ler em vez de fixar no código evita que a lista
 * envelheça quando o molde for trocado pelo da Mônica.
 */
function deParaDoFarol(moldura: Element): string[] {
  const lista: string[] = [];
  for (const tr of listRows(moldura)) {
    const celulas = qsa(tr, 'a:tc');
    if (celulas.length === 0) continue;
    const rotulo = textoDe(celulas[0]).trim();
    const temToken = celulas.slice(1).some((tc) => textoDe(tc).includes('{{F_'));
    if (rotulo && temToken) lista.push(rotulo);
  }
  return lista;
}

function tokensGlobais(deck: Deck): Record<string, string> {
  const t: Record<string, string> = { CLIENTE: deck.cliente ?? 'Cliente' };
  deck.anos.slice(0, 3).forEach((a, i) => {
    t[`ANO${i + 1}`] = String(a);
  });
  deck.transferencia.colunas.slice(0, 6).forEach((a, i) => {
    t[`TR_ANO${i + 1}`] = String(a);
  });
  /* O molde não fixa o nome dos cenários: quem escreve é o estudo. */
  deck.cenarios.slice(0, 3).forEach((c, i) => {
    t[`CEN${i + 1}`] = c;
  });
  /* Nomes de contribuinte: o molde tem duas colunas e o WP pode ter uma só. */
  const contribuintes = [...new Set(deck.dre.colunas.map((c) => c.split('|')[1]).filter(Boolean))];
  t.PF = contribuintes[0] ?? 'Pessoa Física';
  t.PJ = contribuintes[1] ?? 'Pessoa Jurídica';
  return t;
}

function montaPptx(molde: Uint8Array, deck: Deck): { bytes: Uint8Array; avisos: string[] } {
  const partes: PptxParts = unpackPptx(molde);
  const avisos: string[] = [];
  const globais = tokensGlobais(deck);

  const tabelas: [keyof typeof SLIDES, string[], LinhaDaTabela[]][] = [
    ['dre', ['DRE0_', 'DRE1_', 'DRE2_'], deck.dre.linhas],
    ['transferencia', ['TR_SECAO_', 'TR_ITEM_', 'TR_TOTAL_'], deck.transferencia.linhas],
    ['resumo', ['RES0_', 'RES1_'], deck.resumo.linhas],
  ];

  for (const [chave, prefixos, linhas] of tabelas) {
    const { arquivo, colunas: indices } = SLIDES[chave];
    const doc = parseXml(readText(partes, arquivo));
    const moldura = molduraDaTabela(doc);
    if (!moldura) {
      avisos.push(`O molde não tem tabela em ${arquivo}.`);
      continue;
    }
    const daTabela =
      chave === 'dre' ? deck.dre : chave === 'resumo' ? deck.resumo : deck.transferencia;
    /* A Transferência tem linha de seção, que é título sem valor: nível 0. */
    const comNivel = linhas.map((l) =>
      chave === 'transferencia'
        ? { ...l, nivel: Object.keys(l.valores).length === 0 ? 0 : l.nivel }
        : l,
    );
    preencheTabela(
      moldura,
      prefixos,
      comNivel,
      chavesDosEspacos(daTabela, SLIDES[chave].porAno),
      indices,
    );
    applyTokensToNode(doc.documentElement, globais);
    stripRemainingTokens(doc.documentElement);
    writeText(partes, arquivo, serializeXml(doc));
  }

  {
    const { arquivo } = SLIDES.farol;
    const doc = parseXml(readText(partes, arquivo));
    const moldura = molduraDaTabela(doc);
    if (moldura) {
      const semDado = preencheFarol(moldura, deck.farol, deParaDoFarol(moldura));
      if (semDado > 0) {
        avisos.push(
          `${semDado} célula(s) da Carga Tributária ficaram sem dado e saíram como traço.`,
        );
      }
    }
    applyTokensToNode(doc.documentElement, globais);
    stripRemainingTokens(doc.documentElement);
    writeText(partes, arquivo, serializeXml(doc));
  }

  {
    const { arquivo } = SLIDES.comentarios;
    const doc = parseXml(readText(partes, arquivo));
    const tokens: Record<string, string> = { ...globais };
    for (const c of deck.comentarios) {
      tokens[`COM_${c.tributo.replace(/[^A-Za-z]/g, '').toUpperCase()}`] = c.texto;
    }
    applyTokensToNode(doc.documentElement, tokens);
    stripRemainingTokens(doc.documentElement);
    writeText(partes, arquivo, serializeXml(doc));
  }

  /* O rodapé mora no layout, não no slide. */
  for (const caminho of Object.keys(partes)) {
    if (!caminho.startsWith('ppt/slideLayouts/slideLayout')) continue;
    const xml = readText(partes, caminho);
    if (!xml.includes('{{CLIENTE}}')) continue;
    writeText(partes, caminho, xml.replaceAll('{{CLIENTE}}', globais.CLIENTE));
  }

  return { bytes: packPptx(partes), avisos };
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

async function crc32cBase64(bytes: Uint8Array): Promise<string> {
  /* O checksum do arquivo gerado. `SHA-256` serve: aqui ele identifica o pacote,
   * e não precisa casar com o do GCS como na importação. */
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return btoa(String.fromCharCode(...new Uint8Array(hash).slice(0, 16)));
}

function descreveErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    const partes = [o.message, o.details, o.hint, o.code ? `(${o.code})` : null].filter(Boolean);
    if (partes.length) return partes.join(' ');
    try {
      return JSON.stringify(e);
    } catch {
      /* objeto circular: cai no genérico abaixo */
    }
  }
  return 'Falha sem descrição ao gerar a apresentação.';
}

serve(async (req) => {
  const pre = handleCorsPreflightRequest(req);
  if (pre) return pre;
  const cors = buildCorsHeaders(req);
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const { importacaoId } = (await req.json()) as { importacaoId?: string };
    if (!importacaoId) return json({ error: 'informe o importacaoId' }, 400);

    const autorizacao = req.headers.get('Authorization') ?? '';
    if (!autorizacao) return json({ error: 'sem autenticação' }, 401);

    /* Duas conexões, de propósito: a do usuário lê e grava sob RLS, e a de
     * serviço só toca no bucket, que não tem policy para o usuário final. */
    const comoUsuario = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: autorizacao } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: revisao, error: erroRevisao } = await comoUsuario
      .from('wp_importacao')
      .select(
        'id, versao, cliente_no_wp, estudo_id, wp_estudo!inner(cliente_id, cliente!inner(nome))',
      )
      .eq('id', importacaoId)
      .maybeSingle();
    if (erroRevisao) throw erroRevisao;
    if (!revisao) return json({ error: 'revisão não encontrada, ou você não tem acesso' }, 404);

    /*
     * **Paginado de propósito.** O PostgREST devolve no máximo 1000 linhas por
     * requisição, e uma revisão tem 1.499 valores. Sem isto os últimos 499
     * ficavam para trás **sem erro nenhum**, e a Transferência, que é lida por
     * último, saía inteira vazia. Foi assim que o defeito apareceu no primeiro
     * teste de ponta a ponta.
     */
    const PAGINA = 1000;
    async function buscaTudo<T>(tabela: string, colunas: string, ordem?: string): Promise<T[]> {
      const tudo: T[] = [];
      for (let de = 0; ; de += PAGINA) {
        let q = comoUsuario
          .from(tabela)
          .select(colunas)
          .eq('importacao_id', importacaoId)
          .range(de, de + PAGINA - 1);
        if (ordem) q = q.order(ordem);
        const { data, error } = await q;
        if (error) throw error;
        const lote = (data ?? []) as unknown as T[];
        tudo.push(...lote);
        if (lote.length < PAGINA) return tudo;
      }
    }

    /*
     * **O nome do cliente sai do cadastro, não da planilha.**
     * `cliente_no_wp` é o que o consultor digitou dentro do arquivo, e o mesmo WP
     * pode ser importado para clientes diferentes: as três primeiras gerações
     * saíram com o mesmo nome de arquivo para três clientes distintos, o que faz
     * um parecer o outro. Quem manda é o cadastro.
     */
    const doCadastro =
      (revisao as unknown as { wp_estudo?: { cliente?: { nome?: string } } }).wp_estudo?.cliente
        ?.nome ?? null;

    const [valores, farol, comentarios] = await Promise.all([
      buscaTudo<Record<string, never>>(
        'wp_valor',
        'bloco, rotulo, nivel, cenario, contribuinte, ano, valor_numerico, valor_texto, unidade, origem_celula',
      ),
      buscaTudo<Record<string, never>>(
        'wp_farol',
        'rotulo, regime, pessoa, valor_numerico, valor_texto',
      ),
      buscaTudo<Record<string, never>>('wp_comentario', 'cenario, tributo, ordem, texto', 'ordem'),
    ]);

    const deck = montaDeck({
      clienteNoWp: doCadastro ?? revisao.cliente_no_wp ?? undefined,
      valores: valores.map((v) => ({
        bloco: v.bloco,
        rotulo: v.rotulo,
        nivel: v.nivel ?? undefined,
        cenario: v.cenario,
        contribuinte: v.contribuinte ?? undefined,
        ano: v.ano,
        valor: v.valor_numerico ?? v.valor_texto ?? '',
        unidade: v.unidade,
        origemCelula: v.origem_celula ?? undefined,
      })) as ValorDaRevisao[],
      farol: farol.map((f) => ({
        rotulo: f.rotulo,
        regime: f.regime,
        pessoa: f.pessoa,
        valor: f.valor_numerico ?? f.valor_texto ?? '',
      })) as FarolDaRevisao[],
      comentarios: comentarios as unknown as ComentarioDaRevisao[],
    });

    const { data: molde, error: erroMolde } = await admin.storage
      .from(BUCKET_MOLDES)
      .download(MOLDE);
    if (erroMolde || !molde) {
      return json(
        {
          error:
            `O molde "${MOLDE}" não está no bucket "${BUCKET_MOLDES}". ` +
            'Ele não viaja no código: alguém precisa subir o arquivo neste ambiente.',
        },
        503,
      );
    }

    const { bytes, avisos } = montaPptx(new Uint8Array(await molde.arrayBuffer()), deck);

    /* Falha estrutural não entrega arquivo: nada sobe e nada é gravado. */
    const problemasDoPacote = validatePptx(unpackPptx(bytes));
    if (problemasDoPacote.length > 0) {
      return json(
        {
          error: 'O arquivo gerado saiu inconsistente e não foi salvo.',
          detalhes: problemasDoPacote,
        },
        500,
      );
    }

    const { data: anteriores } = await comoUsuario
      .from('wp_apresentacao')
      .select('versao')
      .eq('importacao_id', importacaoId)
      .order('versao', { ascending: false })
      .limit(1);
    const versao = (anteriores?.[0]?.versao ?? 0) + 1;

    const nomeArquivo = `PSA_Tributario_${slug(deck.cliente ?? 'cliente')}_r${revisao.versao}_v${versao}.pptx`;
    const caminho = `${revisao.estudo_id}/${nomeArquivo}`;

    const { error: erroUpload } = await admin.storage
      .from(BUCKET_SAIDA)
      .upload(caminho, bytes, { contentType: PPTX_MIME, upsert: true });
    if (erroUpload) throw erroUpload;

    const problemas = [
      ...deck.problemas,
      ...avisos.map((a) => ({ tipo: 'tipo_inesperado', onde: 'geração', detalhe: a })),
    ];

    const { data: gravada, error: erroGravar } = await comoUsuario
      .from('wp_apresentacao')
      .insert({
        importacao_id: importacaoId,
        versao,
        storage_path: caminho,
        nome_arquivo: nomeArquivo,
        tamanho: bytes.byteLength,
        checksum: await crc32cBase64(bytes),
        template_nome: MOLDE,
        versao_do_gerador: VERSAO_DO_GERADOR,
        problemas,
      })
      .select('id')
      .single();
    if (erroGravar) throw erroGravar;

    const { data: assinada } = await admin.storage
      .from(BUCKET_SAIDA)
      .createSignedUrl(caminho, 60 * 15);

    return json({
      apresentacaoId: gravada.id,
      versao,
      nomeArquivo,
      url: assinada?.signedUrl ?? null,
      problemas,
    });
  } catch (e) {
    /*
     * **`String(e)` não serve aqui.** O erro do PostgREST é um objeto simples,
     * não um `Error`, e virava a string "[object Object]" na tela: um erro que
     * não diz nada é pior do que erro nenhum, porque some com a pista.
     */
    return json({ error: descreveErro(e) }, 500);
  }
});
