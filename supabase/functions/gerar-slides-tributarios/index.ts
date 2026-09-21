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
import { validatePptx } from '../_shared/ooxml/validate.ts';
import {
  montaDeck,
  type Deck,
  type ValorDaRevisao,
} from '../_shared/planejamento-tributario/slides.ts';
import { tokensDoDeck } from '../_shared/planejamento-tributario/tokens.ts';

/** Muda quando a forma de montar o slide muda, e fica gravado na apresentação. */
const VERSAO_DO_GERADOR = '2.0';

const BUCKET_MOLDES = 'osg-templates';
const BUCKET_SAIDA = 'wp-apresentacoes';

/**
 * O molde do capítulo 03 no padrão visual novo, de 21/09/2026.
 *
 * **Nome novo de propósito, em vez de trocar o conteúdo do arquivo antigo.** O
 * molde mora no bucket de cada ambiente e não viaja no código, então os dois
 * andam em passos diferentes. Sobrescrever o `TEMPLATE_TRIBUTARIO.pptx` faria a
 * versão anterior desta função, ainda no ar em outro ambiente, escrever tokens
 * que o arquivo novo não tem: sete slides em branco e nenhum erro. Com nome novo,
 * o ambiente que ainda não recebeu o arquivo responde 503 dizendo exatamente o
 * que falta, que é falha visível e resolvível.
 */
const MOLDE = 'TEMPLATE_TRIBUTARIO_V2.pptx';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * Os sete slides do capítulo, e quantos tokens cada um espera.
 *
 * **O molde deixou de ter tabela.** Medido no modelo da consultoria: o capítulo
 * 03 não tem um único `<a:tbl>`, e cada quadro é um conjunto de caixas de texto
 * em posição fixa. Por isso aqui não há mais clonagem de linha, moldura de
 * tabela nem índice de coluna: há um mapa de token e uma substituição de texto.
 *
 * `tokens` é quantos tokens o slide tem no molde certo. Serve de conferência: se
 * o arquivo do bucket não for este, a contagem não bate e sai aviso, em vez de o
 * deck sair com os slots vazios e cara de pronto.
 */
const SLIDES = [
  { arquivo: 'ppt/slides/slide1.xml', nome: 'capa do capítulo', tokens: 0 },
  { arquivo: 'ppt/slides/slide2.xml', nome: 'Premissas e QUADRO 01', tokens: 40 },
  { arquivo: 'ppt/slides/slide3.xml', nome: 'Cenários avaliados', tokens: 4 },
  { arquivo: 'ppt/slides/slide4.xml', nome: 'Diferenças nos modelos', tokens: 0 },
  { arquivo: 'ppt/slides/slide5.xml', nome: 'Quadro comparativo da carga', tokens: 0 },
  { arquivo: 'ppt/slides/slide6.xml', nome: 'Transferência da atividade rural', tokens: 14 },
  { arquivo: 'ppt/slides/slide7.xml', nome: 'Resumo e QUADRO 02', tokens: 140 },
] as const;

// ─── OOXML ───────────────────────────────────────────────────────────────────

function textoDe(no: Element): string {
  return qsa(no, 'a:t')
    .map((t) => t.textContent ?? '')
    .join('');
}

/**
 * Encolhe a fonte de um pedaço do slide.
 *
 * **Serve só para o nome do cliente no rodapé**, que é uma linha e um espaço
 * fixo. Quadro NÃO encolhe: em 08/09/2026 a DRE do Grupo Mattei saiu inteira a
 * 7pt, ilegível, e um cartão transbordou mesmo assim. Encolher trocava um defeito
 * visível por um pior, que é o slide que ninguém lê e ainda parece pronto.
 *
 * Só mexe em `sz` que já existe. Texto que herda o tamanho do tema fica como
 * está, porque inventar um tamanho onde não havia mudaria o desenho.
 */
const PISO_DA_FONTE = 700;

function encolheFonte(no: Element, fator: number): void {
  for (const rPr of qsa(no, 'a:rPr')) {
    const atual = Number(rPr.getAttribute('sz') ?? 0);
    if (!atual) continue;
    rPr.setAttribute('sz', String(Math.max(PISO_DA_FONTE, Math.round(atual * fator))));
  }
}

/** Quantos `{{TOKEN}}` existem num XML, para conferir o molde antes de escrever. */
function contaTokens(xml: string): number {
  return (xml.match(/\{\{[A-Z0-9_]+\}\}/g) ?? []).length;
}

function montaPptx(molde: Uint8Array, deck: Deck): { bytes: Uint8Array; avisos: string[] } {
  const partes: PptxParts = unpackPptx(molde);
  const avisos: string[] = [];
  const tokens = tokensDoDeck(deck);

  for (const { arquivo, nome, tokens: esperados } of SLIDES) {
    let xml: string;
    try {
      xml = readText(partes, arquivo);
    } catch {
      avisos.push(`O molde não tem o slide de ${nome} (${arquivo}).`);
      continue;
    }

    /*
     * **A conferência do molde vem antes da escrita.** O arquivo mora no bucket e
     * pode estar desatualizado; sem isto, um molde antigo devolveria um deck de
     * slots vazios com cara de pronto, que é o defeito que mais custou tempo
     * nesta frente.
     */
    const achados = contaTokens(xml);
    if (achados !== esperados) {
      avisos.push(
        `O slide de ${nome} tem ${achados} token(s) e o molde certo tem ${esperados}. ` +
          `Confira se o "${MOLDE}" do bucket é o do padrão visual novo.`,
      );
    }

    const doc = parseXml(xml);
    applyTokensToNode(doc.documentElement, tokens);
    stripRemainingTokens(doc.documentElement);
    writeText(partes, arquivo, serializeXml(doc));
  }

  /*
   * O rodapé mora no layout, não no slide, e o nome do cliente pode ser longo:
   * "Elefante de Pijama Colchões Industriais Eireli" quebrava em duas linhas e a
   * segunda saía cortada pela borda. Passando de 28 caracteres a fonte encolhe na
   * proporção, com piso.
   */
  const CABE_NO_RODAPE = 28;
  for (const caminho of Object.keys(partes)) {
    if (!caminho.startsWith('ppt/slideLayouts/slideLayout')) continue;
    const xml = readText(partes, caminho);
    if (!xml.includes('{{CLIENTE}}')) continue;

    const doc = parseXml(xml);
    if (tokens.CLIENTE.length > CABE_NO_RODAPE) {
      for (const sp of qsa(doc, 'p:sp')) {
        if (textoDe(sp).includes('{{CLIENTE}}')) {
          encolheFonte(sp, CABE_NO_RODAPE / tokens.CLIENTE.length);
        }
      }
    }
    applyTokensToNode(doc.documentElement, { CLIENTE: tokens.CLIENTE });
    writeText(partes, caminho, serializeXml(doc));
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

async function resumoDosBytes(bytes: Uint8Array): Promise<string> {
  /* O checksum do arquivo gerado. `SHA-256` serve: aqui ele identifica o pacote,
   * e não precisa casar com o do GCS como na importação. */
  /*
   * A cópia existe por causa de tipagem, não de comportamento: `bytes.buffer` é
   * `ArrayBufferLike`, que admite `SharedArrayBuffer`, e as tipagens novas do
   * Deno recusam isso onde o WebCrypto pede `BufferSource`. Copiar para um
   * `ArrayBuffer` comum resolve sem mentir num cast.
   */
  const copia = new Uint8Array(bytes.length);
  copia.set(bytes);
  const hash = await crypto.subtle.digest('SHA-256', copia.buffer);
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
      /* Literal numa linha só, e sem concatenar: o cliente do Supabase infere o
       * tipo da resposta LENDO esta string. Quebrada em `'a' + 'b'` ele desiste,
       * a linha volta como `GenericStringError` e `revisao.versao` deixa de
       * existir para o TypeScript. */
      // prettier-ignore
      .select('id, versao, cliente_no_wp, estudo_id, ano_base, crescimento_anual, wp_estudo!inner(cliente_id, cliente!inner(nome))')
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

    /*
     * **Só `wp_valor` é lido.** O capítulo novo não tem o slide do Farol nem as
     * caixas de comentário por tributo, então `wp_farol` e `wp_comentario`
     * deixaram de ser consultados aqui. As duas tabelas seguem de pé e seguem
     * sendo preenchidas pela importação: o dado não se perde, ele só não tem
     * mais slide neste capítulo.
     */
    const valores = await buscaTudo<Record<string, never>>(
      'wp_valor',
      'bloco, rotulo, nivel, cenario, contribuinte, ano, valor_numerico, valor_texto, unidade, origem_celula',
    );

    const premissas = revisao as unknown as {
      ano_base?: number | null;
      crescimento_anual?: number | null;
    };

    const deck = montaDeck({
      clienteNoWp: doCadastro ?? revisao.cliente_no_wp ?? undefined,
      anoBase: premissas.ano_base ?? null,
      crescimentoAnual: premissas.crescimento_anual ?? null,
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

    const bytesDoMolde = new Uint8Array(await molde.arrayBuffer());
    /*
     * O checksum DO MOLDE, e não do arquivo gerado: é ele que responde "quais
     * apresentações saíram do deck velho" quando o modelo definitivo chegar.
     * Sem isso a coluna existiria e nasceria vazia, que é o mesmo que não ter.
     */
    const checksumDoMolde = await resumoDosBytes(bytesDoMolde);

    const { bytes, avisos } = montaPptx(bytesDoMolde, deck);

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
            /*
       * Os avisos da montagem são sobre o molde e sobre o que veio do WP, nunca
       * sobre espaço, então entram como `origem`.
       */
      ...avisos.map((a) => ({ tipo: 'origem' as const, onde: 'geração', detalhe: a })),
    ];

    const { data: gravada, error: erroGravar } = await comoUsuario
      .from('wp_apresentacao')
      .insert({
        importacao_id: importacaoId,
        versao,
        storage_path: caminho,
        nome_arquivo: nomeArquivo,
        tamanho: bytes.byteLength,
        checksum: await resumoDosBytes(bytes),
        template_nome: MOLDE,
        template_checksum: checksumDoMolde,
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
