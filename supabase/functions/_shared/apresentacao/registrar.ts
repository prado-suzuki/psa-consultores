/**
 * Registrar um deck: do molde no bucket ate a linha no registro e a URL assinada.
 *
 * "Registrar", e nao "publicar": nada aqui vai ao cliente. A funcao guarda o
 * arquivo e grava a linha que diz que ele existiu; quem entrega e a tela.
 *
 * ## Por que existe
 *
 * Os dois geradores de .pptx da casa fazem a mesma coisa depois que o conteudo
 * esta pronto — baixar o molde, validar o pacote, versionar, subir, registrar,
 * assinar URL. O tributario fazia tudo isso dentro do proprio `serve`; a OSG nao
 * fazia nada disso, e por isso o deck dela saia sem versao, sem checksum e sem
 * registro de que existiu.
 *
 * O que varia entre os dois e pouco e entra por parametro: o molde, a tabela de
 * registro, a ancora, o bucket de saida e o nome do arquivo. **O que nao varia e
 * a ordem**, e e a ordem que carrega as decisoes:
 *
 *   1. valida o pacote ANTES de qualquer escrita — arquivo quebrado nao sobe;
 *   2. grava a LINHA antes do ARQUIVO, para a `UNIQUE` decidir quem fica com a
 *      versao antes de algum byte ser escrito (ver o comentario do laco);
 *   3. TENTA desfazer a linha se o upload falhar — e avisa quando nao consegue,
 *      porque as tabelas nao tem policy de DELETE e o banco nao reclama disso;
 *   4. so entrega URL do que ficou registrado.
 *
 * ## O que NAO entra aqui
 *
 * Montar o .pptx. Isso e do gerador — os moldes sao estruturalmente diferentes
 * (um preenche celula de molde fixo, o outro duplica slide e posiciona em EMU) e
 * unificar seria reescrever um dos dois. Entra por callback.
 */

import { validatePptx } from "../ooxml/validate.ts";
import { unpackPptx } from "../ooxml/zip.ts";
import type { ProblemaDoDeck } from "./problema.ts";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Quantas vezes tentar de novo quando duas geracoes disputam a mesma versao. */
const TENTATIVAS_DE_VERSAO = 4;

/** Postgres: violacao de unique. E o que a corrida de versao produz. */
const UNIQUE_VIOLATION = "23505";

/*
 * O RECORTE do supabase-js que esta casca usa — e so ele.
 *
 * Um `any` aqui desligaria a checagem no arquivo do qual os dois geradores
 * dependem. Declarar so o que se chama tem o efeito colateral bom de documentar a
 * superficie: quem ler sabe que esta funcao nao faz update, nao faz rpc e nao
 * toca em outro bucket alem dos dois que recebe.
 */
interface Resposta<T> {
  data: T | null;
  error: { message?: string; code?: string } | null;
}

interface ConsultaDeVersao {
  eq: (coluna: string, valor: string) => ConsultaDeVersao;
  order: (coluna: string, opcoes: { ascending: boolean }) => ConsultaDeVersao;
  limit: (n: number) => Promise<Resposta<Array<{ versao: number }>>>;
}

interface TabelaDoRegistro {
  select: (colunas: string) => ConsultaDeVersao;
  insert: (linha: Record<string, unknown>) => {
    select: (colunas: string) => { single: () => Promise<Resposta<{ id: string }>> };
  };
  delete: () => {
    eq: (coluna: string, valor: string) => {
      /** `.select()` devolve as linhas APAGADAS — e assim que se sabe se saiu. */
      select: (colunas: string) => Promise<Resposta<Array<{ id: string }>>>;
    };
  };
}

interface Balde {
  download: (nome: string) => Promise<Resposta<{ arrayBuffer: () => Promise<ArrayBuffer> }>>;
  upload: (
    caminho: string,
    bytes: Uint8Array,
    opcoes: { contentType: string; upsert: boolean },
  ) => Promise<{ error: unknown }>;
  createSignedUrl: (caminho: string, segundos: number) => Promise<Resposta<{ signedUrl: string }>>;
}

export interface ClienteDeRegistro {
  from: (tabela: string) => TabelaDoRegistro;
}

export interface ClienteDeArquivo {
  storage: { from: (balde: string) => Balde };
}

export interface MoldeDoDeck {
  bucket: string;
  nome: string;
}

export interface RegistroDoDeck {
  /** `wp_apresentacao` ou `osg_apresentacao`. */
  tabela: string;
  /**
   * As colunas que identificam a serie da versao: `{ importacao_id }` no
   * tributario, `{ cliente_id, tipo }` na OSG. Entram no `insert` e no filtro do
   * `max(versao)`, entao a `UNIQUE` da tabela tem de cobrir exatamente estas mais
   * `versao`.
   */
  ancora: Record<string, string>;
  bucketSaida: string;
  /** Prefixo dentro do bucket — costuma ser o id do dono da serie. */
  pasta: string;
  nomeArquivo: (versao: number) => string;
}

/*
 * O `snapshot` ENTROU EM 21/09/2026, com o consumidor dele.
 *
 * Houve antes um campo `extras` genérico, criado para isto quando a tabela da OSG
 * ainda nao existia, e removido por ser superficie sem consumidor. Agora a
 * `osg_apresentacao` existe, tem a coluna `snapshot_dados`, e o gerador da OSG a
 * preenche — entao o campo entra nomeado, e nao como saco generico.
 *
 * SO A OSG PRECISA. O tributario ancora em `importacao_id`, que aponta para uma
 * revisao imutavel: o ponteiro ja e retrato, de graca. A OSG ancora em
 * `cliente_id`, e o cadastro anda — sem gravar o modelo de conteudo, um mes depois
 * ninguem sabe o que aquele deck afirmava. O precedente e o `documento_gerado`
 * das minutas, que nasce da mesma fonte viva e guarda `snapshot_dados` em 41 de 41.
 */

/**
 * O que o `montar` devolve.
 *
 * O `snapshot` sai DAQUI, e nao de um parametro de cima, porque ele nasce da mesma
 * chamada que produz os bytes: e o modelo de conteudo que virou aquele arquivo.
 * Tentei primeiro passar por fora e a casca tinha de ler a variavel DEPOIS do
 * `montar` — dependencia de ordem invisivel, num arquivo de que dois geradores
 * dependem. Vindo no retorno, a ordem deixa de existir.
 */
export interface Pacote {
  bytes: Uint8Array;
  avisos: string[];
  /** Vai para `snapshot_dados`. Quem nao tem a coluna (o tributario) omite. */
  snapshot?: unknown;
}

export interface ApresentacaoRegistrada {
  apresentacaoId: string;
  versao: number;
  nomeArquivo: string;
  url: string | null;
  problemas: ProblemaDoDeck[];
}

export interface FalhaAoRegistrar {
  erro: string;
  detalhes?: unknown;
  status: number;
}

export function falhou(r: ApresentacaoRegistrada | FalhaAoRegistrar): r is FalhaAoRegistrar {
  return (r as FalhaAoRegistrar).erro !== undefined;
}

/**
 * O checksum identifica o pacote; nao precisa casar com o do GCS.
 *
 * A COPIA PARA UM `ArrayBuffer` PROPRIO nao e desperdicio: o `Uint8Array` do
 * Deno e generico sobre `ArrayBufferLike`, que admite `SharedArrayBuffer`, e o
 * `crypto.subtle.digest` so aceita `BufferSource`. Passar direto compila com
 * `any` por perto e quebra no `deno check` — foi o que aconteceu quando este
 * trecho saiu do `gerar-slides-tributarios`, onde o erro ficava escondido atras
 * da resolucao de npm dos modulos OOXML.
 */
async function resumoDosBytes(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return btoa(String.fromCharCode(...new Uint8Array(hash).slice(0, 16)));
}

export async function registrarApresentacao(args: {
  /** Conexao de servico: so ela alcanca os buckets, que nao tem policy para o usuario. */
  admin: ClienteDeArquivo;
  /** Conexao que GRAVA o registro. No tributario e a do usuario, sob RLS. */
  db: ClienteDeRegistro;
  molde: MoldeDoDeck;
  registro: RegistroDoDeck;
  /**
   * Monta o .pptx a partir dos bytes do molde. E a parte de cada gerador.
   *
   * PODE SER ASSINCRONA. O tributario monta sincronamente, com a revisao ja lida;
   * os geradores da OSG consultam o cadastro por dentro (organograma, quadro,
   * titular) e por isso sao `async`. A assinatura sincrona atendia so ao primeiro
   * consumidor — foi o segundo que mostrou.
   */
  montar: (bytesDoMolde: Uint8Array) => Pacote | Promise<Pacote>;
  /** O que o conteudo ja tinha a dizer antes de virar arquivo. */
  problemas: ProblemaDoDeck[];
  versaoDoGerador: string;
}): Promise<ApresentacaoRegistrada | FalhaAoRegistrar> {
  const { admin, db, molde, registro, montar, versaoDoGerador } = args;

  const baixado = await admin.storage.from(molde.bucket).download(molde.nome);
  if (baixado.error || !baixado.data) {
    return {
      status: 503,
      erro: `O modelo "${molde.nome}" não está disponível neste ambiente.`,
    };
  }

  const bytesDoMolde = new Uint8Array(await baixado.data.arrayBuffer());
  /*
   * O checksum DO MOLDE, e nao do arquivo gerado: e ele que responde "quais
   * apresentacoes sairam do deck velho" quando o modelo definitivo chegar. Sem
   * isso a coluna existiria e nasceria vazia, que e o mesmo que nao ter.
   */
  const checksumDoMolde = await resumoDosBytes(bytesDoMolde);

  const { bytes, avisos, snapshot } = await montar(bytesDoMolde);

  /* Falha estrutural nao entrega arquivo: nada sobe e nada e gravado. */
  const doPacote = validatePptx(unpackPptx(bytes));
  if (doPacote.length > 0) {
    return {
      status: 500,
      erro: "O arquivo gerado saiu inconsistente e não foi salvo.",
      detalhes: doPacote,
    };
  }

  const problemas: ProblemaDoDeck[] = [
    ...args.problemas,
    /* Os avisos da montagem sao sobre o molde e sobre o que veio da fonte, nunca
     * sobre espaco, entao entram como `origem`. */
    ...avisos.map((a) => ({ tipo: "origem" as const, onde: "geração", detalhe: a })),
  ];
  const checksum = await resumoDosBytes(bytes);

  /*
   * A VERSAO E CALCULADA AQUI, E POR ISSO TEM CORRIDA.
   *
   * Ler o `max(versao)` e inserir sao dois passos sem transacao entre eles: duas
   * geracoes simultaneas leem o mesmo numero e a segunda bate na `UNIQUE`. Antes
   * disto o erro chegava cru ao usuario, como texto do Postgres.
   *
   * A repeticao resolve o caso real — duas abas, dois cliques — sem DDL. O
   * conserto definitivo e uma RPC que trava a linha-pai antes de contar, como o
   * `importar_wp` ja faz com `for update` no estudo; enquanto ela nao existe,
   * tentar de novo e honesto e suficiente.
   */
  let ultimoErro: unknown = null;
  for (let tentativa = 0; tentativa < TENTATIVAS_DE_VERSAO; tentativa++) {
    let consulta = db.from(registro.tabela).select("versao");
    for (const [coluna, valor] of Object.entries(registro.ancora)) {
      consulta = consulta.eq(coluna, valor);
    }
    const { data: anteriores } = await consulta.order("versao", { ascending: false }).limit(1);
    const versao = (anteriores?.[0]?.versao ?? 0) + 1;

    const nomeArquivo = registro.nomeArquivo(versao);
    const caminho = `${registro.pasta}/${nomeArquivo}`;

    /*
     * A LINHA VEM ANTES DO ARQUIVO, e a ordem e o ponto.
     *
     * O caminho no bucket carrega a versao, e o upload usa `upsert`. Subindo
     * primeiro, duas geracoes simultaneas fazem isto: a segunda SOBRESCREVE o
     * arquivo da primeira na versao N, so entao descobre a colisao pela `UNIQUE`,
     * e segue para N+1. A primeira fica com um registro cujo checksum e tamanho
     * nao descrevem mais o arquivo que esta la — e ninguem e avisado.
     *
     * Inserindo primeiro, a `UNIQUE` decide quem fica com N antes de qualquer
     * byte ser escrito. Quem perde repete com outra versao e nunca toca no
     * arquivo alheio.
     */
    const { data: gravada, error: erroGravar } = await db
      .from(registro.tabela)
      .insert({
        ...registro.ancora,
        versao,
        storage_path: caminho,
        nome_arquivo: nomeArquivo,
        tamanho: bytes.byteLength,
        checksum,
        template_nome: molde.nome,
        template_checksum: checksumDoMolde,
        versao_do_gerador: versaoDoGerador,
        problemas,
        /* Espalhado, e nao `snapshot_dados: args.snapshot`: a tabela do tributario
           nao tem essa coluna, e mandar `undefined` no insert e mandar a coluna. */
        ...(snapshot === undefined ? {} : { snapshot_dados: snapshot }),
      })
      .select("id")
      .single();

    if (erroGravar) {
      ultimoErro = erroGravar;
      if (erroGravar.code === UNIQUE_VIOLATION) continue;
      return { status: 500, erro: descreve(erroGravar) };
    }
    /* Sem erro e sem linha nao deveria acontecer; se acontecer, e melhor dizer do
       que seguir com `id` indefinido e gravar um registro sem dono. */
    if (!gravada) {
      return { status: 500, erro: "O registro da apresentação não voltou do banco." };
    }

    const { error: erroUpload } = await admin.storage
      .from(registro.bucketSaida)
      .upload(caminho, bytes, { contentType: PPTX_MIME, upsert: true });
    if (erroUpload) {
      /*
       * A versao foi reservada e o arquivo nao subiu. Registro apontando para
       * arquivo inexistente e pior que registro nenhum: a tela oferece um
       * download que falha.
       *
       * CONFERIR O DELETE NAO E PARANOIA. As duas tabelas de apresentacao tem
       * policy de SELECT, INSERT e UPDATE e NENHUMA de DELETE — por desenho, para
       * apresentacao entregue a cliente nao sumir do historico. Sob RLS, um DELETE
       * sem policy nao levanta erro: afeta zero linhas e devolve sucesso. A
       * primeira versao deste trecho checava so `error`, via `null`, e afirmava ter
       * desfeito o que continuava la.
       *
       * Por isso o `.select("id")`: quem responde se a linha saiu e a lista de
       * linhas apagadas, nao a ausencia de erro. Quando nao sai, o erro diz qual
       * versao ficou orfa, para um admin descartar.
       */
      const limpeza = await db
        .from(registro.tabela).delete().eq("id", gravada.id).select("id");
      const desfez = !limpeza.error && (limpeza.data?.length ?? 0) > 0;
      return {
        status: 500,
        erro: descreve(erroUpload),
        detalhes: desfez
          ? undefined
          : `A versão ${versao} ficou registrada sem arquivo e precisa ser descartada por um admin` +
            (limpeza.error ? `: ${descreve(limpeza.error)}` : " (a tabela não permite exclusão)."),
      };
    }

    const { data: assinada } = await admin.storage
      .from(registro.bucketSaida)
      .createSignedUrl(caminho, 60 * 15);

    return {
      apresentacaoId: gravada.id,
      versao,
      nomeArquivo,
      url: assinada?.signedUrl ?? null,
      problemas,
    };
  }

  return {
    status: 409,
    erro: "Outra geração desta apresentação estava em andamento. Tente de novo.",
    detalhes: descreve(ultimoErro),
  };
}

/**
 * `String(e)` nao serve: o erro do PostgREST e objeto simples, nao `Error`, e
 * virava "[object Object]" na tela. Erro que nao diz nada e pior que erro nenhum,
 * porque some com a pista.
 */
export function descreve(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    const partes = [o.message, o.details, o.hint, o.code ? `(${o.code})` : null].filter(Boolean);
    if (partes.length) return partes.join(" ");
    try {
      return JSON.stringify(e);
    } catch {
      /* objeto circular: cai no generico abaixo */
    }
  }
  return "Falha sem descrição ao gerar a apresentação.";
}
