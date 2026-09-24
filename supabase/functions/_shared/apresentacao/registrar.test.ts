// A casca de publicacao, que os dois geradores de .pptx chamam.
//
// O baseline de ponta a ponta prova que o DECK nao mudou. Ele nao prova nada
// sobre o que acontece quando duas geracoes disputam a mesma versao, quando o
// upload falha depois de a linha ser gravada, ou quando o molde nao esta no
// bucket — e sao esses caminhos que corrompem dado, nao o caminho feliz.
//
// O `validatePptx`/`unpackPptx` sao mockados: aqui nao se testa OOXML, testa-se a
// ORDEM das escritas. Bytes de verdade so tornariam o teste lento e fragil.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pacoteValido = vi.hoisted(() => ({ atual: [] as unknown[] }));

vi.mock('../ooxml/validate.ts', () => ({ validatePptx: () => pacoteValido.atual }));
vi.mock('../ooxml/zip.ts', () => ({ unpackPptx: () => ({}) }));

import { falhou, registrarApresentacao } from './registrar.ts';

/** O que cada dublê registrou, na ordem — é o que os testes de corrida leem. */
interface Diario {
  uploads: string[];
  inserts: Array<Record<string, unknown>>;
  deletes: string[];
}

/**
 * Dublês dos dois clientes.
 *
 * `versoesPorTentativa` e `erroDeInsertPorTentativa` são listas consumidas a cada
 * volta do laço: é assim que se encena uma colisão sem concorrência de verdade.
 */
function montarDubles(opcoes: {
  moldeExiste?: boolean;
  versoes?: Array<number | null>;
  errosDeInsert?: Array<{ code?: string; message?: string } | null>;
  erroDeUpload?: { message: string } | null;
  erroDeDelete?: { message: string } | null;
  /** Sem policy de DELETE, o Postgres nao erra: apaga zero linhas em silencio. */
  deleteApagaMesmo?: boolean;
  urlAssinada?: string | null;
} = {}) {
  const {
    moldeExiste = true,
    versoes = [null],
    errosDeInsert = [null],
    erroDeUpload = null,
    erroDeDelete = null,
    deleteApagaMesmo = true,
    urlAssinada = 'https://exemplo/assinada',
  } = opcoes;

  const diario: Diario = { uploads: [], inserts: [], deletes: [] };
  let voltaDaConsulta = 0;
  let voltaDoInsert = 0;

  const db = {
    from: () => ({
      select: () => {
        const encadeia = {
          eq: () => encadeia,
          order: () => encadeia,
          limit: async () => {
            const v = versoes[Math.min(voltaDaConsulta++, versoes.length - 1)];
            return { data: v === null ? [] : [{ versao: v }], error: null };
          },
        };
        return encadeia;
      },
      insert: (linha: Record<string, unknown>) => {
        diario.inserts.push(linha);
        const erro = errosDeInsert[Math.min(voltaDoInsert++, errosDeInsert.length - 1)];
        return {
          select: () => ({
            single: async () => ({ data: erro ? null : { id: 'ap-1' }, error: erro }),
          }),
        };
      },
      delete: () => ({
        eq: (_c: string, id: string) => ({
          select: async () => {
            diario.deletes.push(id);
            return { data: deleteApagaMesmo ? [{ id }] : [], error: erroDeDelete };
          },
        }),
      }),
    }),
  };

  const admin = {
    storage: {
      from: () => ({
        download: async () => ({
          data: moldeExiste ? { arrayBuffer: async () => new ArrayBuffer(8) } : null,
          error: moldeExiste ? null : { message: 'não achei' },
        }),
        upload: async (caminho: string) => {
          diario.uploads.push(caminho);
          return { error: erroDeUpload };
        },
        createSignedUrl: async () => ({
          data: urlAssinada ? { signedUrl: urlAssinada } : null,
          error: null,
        }),
      }),
    },
  };

  return { db, admin, diario };
}

const chamar = (
  dubles: ReturnType<typeof montarDubles>,
  extra: Partial<Parameters<typeof registrarApresentacao>[0]> = {},
) =>
  registrarApresentacao({
    admin: dubles.admin as never,
    db: dubles.db as never,
    molde: { bucket: 'osg-templates', nome: 'MOLDE.pptx' },
    registro: {
      tabela: 'wp_apresentacao',
      ancora: { importacao_id: 'imp-1' },
      bucketSaida: 'wp-apresentacoes',
      pasta: 'estudo-1',
      nomeArquivo: (v) => `deck_v${v}.pptx`,
    },
    montar: () => ({ bytes: new Uint8Array([1, 2, 3]), avisos: [] }),
    problemas: [],
    versaoDoGerador: '1.0',
    ...extra,
  });

beforeEach(() => {
  pacoteValido.atual = [];
});

describe('o caminho feliz', () => {
  it('primeira geração é a versão 1, e devolve o que a tela precisa', async () => {
    const d = montarDubles();
    const r = await chamar(d);

    expect(falhou(r)).toBe(false);
    if (falhou(r)) return;
    expect(r.versao).toBe(1);
    expect(r.nomeArquivo).toBe('deck_v1.pptx');
    expect(r.apresentacaoId).toBe('ap-1');
    expect(r.url).toBe('https://exemplo/assinada');
    expect(d.diario.uploads).toEqual(['estudo-1/deck_v1.pptx']);
  });

  it('a próxima versão sai de quem já existe', async () => {
    const r = await chamar(montarDubles({ versoes: [7] }));
    expect(falhou(r) ? null : r.versao).toBe(8);
  });

  it('grava checksum, molde e versão do gerador — é o que responde "o que regerar"', async () => {
    const d = montarDubles();
    await chamar(d);
    const linha = d.diario.inserts[0];

    expect(linha.template_nome).toBe('MOLDE.pptx');
    expect(linha.versao_do_gerador).toBe('1.0');
    expect(linha.tamanho).toBe(3);
    expect(typeof linha.checksum).toBe('string');
    expect(typeof linha.template_checksum).toBe('string');
    // o checksum do arquivo e o do molde sao de bytes diferentes
    expect(linha.checksum).not.toBe(linha.template_checksum);
    expect(linha.importacao_id).toBe('imp-1'); // a ancora entra no insert
  });

  it('URL não assinada não derruba a geração — o arquivo está lá', async () => {
    const r = await chamar(montarDubles({ urlAssinada: null }));
    expect(falhou(r) ? null : r.url).toBeNull();
  });
});

describe('a corrida de versão', () => {
  // ESTE É O TESTE QUE JUSTIFICA A ORDEM. Subindo o arquivo antes do insert, a
  // geração que perde a disputa sobrescreve o .pptx da que ganhou — o caminho no
  // bucket carrega a versão e o upload usa `upsert`. A vítima fica com um
  // registro cujo checksum não descreve mais o arquivo, e ninguém é avisado.
  it('quem perde a versão NÃO escreve no caminho da que ganhou', async () => {
    const d = montarDubles({
      versoes: [3, 4],
      errosDeInsert: [{ code: '23505' }, null],
    });
    const r = await chamar(d);

    expect(falhou(r) ? null : r.versao).toBe(5);
    expect(d.diario.inserts).toHaveLength(2);
    // um upload só, e no caminho da versão que a tentativa VENCEU
    expect(d.diario.uploads).toEqual(['estudo-1/deck_v5.pptx']);
  });

  it('desiste depois de quatro tentativas, e diz que foi disputa', async () => {
    const d = montarDubles({
      versoes: [1],
      errosDeInsert: [{ code: '23505' }],
    });
    const r = await chamar(d);

    expect(falhou(r)).toBe(true);
    if (!falhou(r)) return;
    expect(r.status).toBe(409);
    expect(r.erro).toContain('Tente de novo');
    expect(d.diario.inserts).toHaveLength(4);
    expect(d.diario.uploads).toEqual([]); // nenhum byte escrito
  });

  it('erro de insert que não é colisão não vira repetição', async () => {
    const d = montarDubles({ errosDeInsert: [{ code: '42501', message: 'RLS' }] });
    const r = await chamar(d);

    expect(falhou(r) ? r.status : null).toBe(500);
    expect(d.diario.inserts).toHaveLength(1);
  });
});

describe('quando o upload falha depois de a versão ser reservada', () => {
  it('desfaz a linha — registro sem arquivo é pior que registro nenhum', async () => {
    const d = montarDubles({ erroDeUpload: { message: 'bucket fora do ar' } });
    const r = await chamar(d);

    expect(falhou(r) ? r.status : null).toBe(500);
    expect(d.diario.deletes).toEqual(['ap-1']);
  });

  it('se o desfazer der erro, o aviso nomeia o erro', async () => {
    const d = montarDubles({
      erroDeUpload: { message: 'bucket fora do ar' },
      erroDeDelete: { message: 'sem permissão' },
      deleteApagaMesmo: false,
    });
    const r = await chamar(d);

    expect(falhou(r) ? String(r.detalhes) : '').toContain('precisa ser descartada por um admin');
    expect(falhou(r) ? String(r.detalhes) : '').toContain('sem permissão');
  });

  // O CASO QUE A PRIMEIRA VERSAO NAO VIA. As tabelas de apresentacao nao tem
  // policy de DELETE, por desenho. Sob RLS isso nao levanta erro: apaga zero
  // linhas e devolve sucesso. Checar so `error` fazia o codigo afirmar ter
  // desfeito o que continuava la.
  it('delete que não apaga nada, e não erra, ainda assim avisa', async () => {
    const d = montarDubles({
      erroDeUpload: { message: 'bucket fora do ar' },
      deleteApagaMesmo: false,
    });
    const r = await chamar(d);

    expect(falhou(r) ? String(r.detalhes) : '').toContain('não permite exclusão');
  });
});

describe('o que impede a escrita', () => {
  it('molde ausente é 503, e a mensagem nomeia o arquivo que falta', async () => {
    const d = montarDubles({ moldeExiste: false });
    const r = await chamar(d);

    expect(falhou(r) ? r.status : null).toBe(503);
    expect(falhou(r) ? r.erro : '').toContain('não está disponível neste ambiente');
    expect(d.diario.inserts).toEqual([]);
    expect(d.diario.uploads).toEqual([]);
  });

  it('pacote inconsistente não sobe e não grava', async () => {
    pacoteValido.atual = ['slide3 sem relação'];
    const d = montarDubles();
    const r = await chamar(d);

    expect(falhou(r) ? r.status : null).toBe(500);
    expect(d.diario.inserts).toEqual([]);
    expect(d.diario.uploads).toEqual([]);
  });
});

describe('os problemas gravados', () => {
  it('juntam os do conteúdo com os da montagem, e a montagem entra como origem', async () => {
    const d = montarDubles();
    const r = await chamar(d, {
      problemas: [{ tipo: 'origem', onde: 'Quadro Societário', detalhe: 'faltou sócio' }],
      montar: () => ({ bytes: new Uint8Array([1]), avisos: ['tabela transbordou'] }),
    });

    expect(falhou(r) ? [] : r.problemas).toEqual([
      { tipo: 'origem', onde: 'Quadro Societário', detalhe: 'faltou sócio' },
      { tipo: 'origem', onde: 'geração', detalhe: 'tabela transbordou' },
    ]);
    // e os mesmos vao para o banco, congelados junto com o arquivo
    expect(d.diario.inserts[0].problemas).toHaveLength(2);
  });
});
