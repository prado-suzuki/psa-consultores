import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  lerWp,
  type ProblemaWp,
  type ResultadoLeitura,
} from '@/lib/planejamento-tributario/parser';
import { decideImportacao } from '@/lib/planejamento-tributario/recusa';
import { validar } from '@/lib/planejamento-tributario/validacoes';

/**
 * Confere a régua que decide se um WP entra no banco.
 *
 * O que precisa ficar preso aqui não é o caminho feliz, é a assimetria: o
 * arquivo trocado tem de ser barrado, e o número torto tem de passar com aviso. As
 * duas metades erradas custam caro de maneiras diferentes. Barrar demais faz o
 * Fiscal desistir da ferramenta e voltar a digitar; barrar de menos deixa entrar
 * número da linha errada, que é o defeito que não se anuncia.
 */

const PASTA = join(__dirname, '__fixtures__');

function le(caso: string): ResultadoLeitura {
  return lerWp(new Uint8Array(readFileSync(join(PASTA, caso, 'entrada.xlsx'))));
}

/** Uma planilha válida que não é um WP. */
function planilhaAlheia(): Uint8Array {
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    livro,
    XLSX.utils.aoa_to_sheet([
      ['Produto', 'Quantidade'],
      ['Soja', 40],
    ]),
    'Estoque',
  );
  return new Uint8Array(XLSX.write(livro, { type: 'array', bookType: 'xlsx' }));
}

describe('WP bom entra', () => {
  it.each([
    'resumo-pfxpj-x-pjxpj',
    'transferencia-rural',
    'dre',
    'carga-tributaria',
    'bens-e-dividas',
  ])('%s é aceito sem aviso', (caso) => {
    const leitura = le(caso);
    const decisao = decideImportacao(leitura, validar(leitura.valores));

    expect(decisao.veredito).toBe('aceita');
    expect(decisao.impedimentos).toEqual([]);
    expect(decisao.avisos).toEqual([]);
  });
});

describe('o que impede a importação', () => {
  /*
   * Aba nenhuma reconhecida é o caso do arquivo trocado: alguém sobe a planilha de
   * outro trabalho. Aceitar criaria uma revisão vazia amarrada ao cliente.
   */
  it('planilha que não é um WP é recusada', () => {
    const decisao = decideImportacao(lerWp(planilhaAlheia()));

    expect(decisao.veredito).toBe('recusa');
    expect(decisao.impedimentos.map((p) => p.tipo)).toContain('aba_ausente');
  });

  /*
   * Cabeçalho ilegível é o WP de formato antigo, ou o WP com linha inserida. A
   * leitura por endereço continuaria devolvendo número, só que da linha vizinha.
   */
  it('rótulo fora do lugar é recusado', () => {
    const leitura = le('dre');
    const decisao = decideImportacao({
      ...leitura,
      problemas: [
        ...leitura.problemas,
        {
          tipo: 'cabecalho_ilegivel',
          onde: 'Cenário Atual (PF)!B31',
          detalhe: 'esperava `Receita` e achei `(+) Arrendamento/Aluguel`',
        },
      ],
    });

    expect(decisao.veredito).toBe('recusa');
    expect(decisao.impedimentos.map((p) => p.tipo)).toEqual(['cabecalho_ilegivel']);
  });

  /*
   * Sem número nenhum não houve importação, e a recusa entra como impedimento
   * listado para a tela ter o que mostrar em vez de uma negativa muda.
   */
  it('leitura sem número é recusada, com o motivo escrito', () => {
    const vazia: ResultadoLeitura = {
      cabecalho: {},
      valores: [],
      farol: [],
      comentarios: [],
      bens: [],
      dividas: [],
      problemas: [],
    };
    const decisao = decideImportacao(vazia);

    expect(decisao.veredito).toBe('recusa');
    expect(decisao.impedimentos).toHaveLength(1);
    expect(decisao.impedimentos[0].detalhe).toContain('nenhum número foi lido');
  });

  /*
   * Só comentário não basta. Um recorte que traz o texto e nenhum valor não é um
   * estudo, e a régua olha número, não linha de texto.
   */
  it('só comentário não conta como número lido', () => {
    const decisao = decideImportacao(le('comentarios'));

    expect(decisao.veredito).toBe('recusa');
    expect(decisao.impedimentos[0].detalhe).toContain('nenhum número foi lido');
  });
});

describe('campo que a tabela exige', () => {
  /*
   * `wp_bem.categoria` é `not null`. Antes desta régua, a linha sem categoria
   * passava e a RPC abortava a transação inteira, devolvendo falha de restrição do
   * Postgres sem dizer qual linha da planilha causou.
   */
  it('bem sem categoria é recusado, apontando a linha', () => {
    const leitura = le('bens-e-dividas');
    const decisao = decideImportacao({
      ...leitura,
      bens: [{ ...leitura.bens[0], categoria: undefined }, ...leitura.bens.slice(1)],
    });

    expect(decisao.veredito).toBe('recusa');
    expect(decisao.impedimentos).toHaveLength(1);
    expect(decisao.impedimentos[0].tipo).toBe('campo_obrigatorio');
    expect(decisao.impedimentos[0].onde).toBe('Bens da Atv. Rural!8');
  });

  it('dívida sem titularidade é recusada, apontando a linha', () => {
    const leitura = le('bens-e-dividas');
    const decisao = decideImportacao({
      ...leitura,
      dividas: [...leitura.dividas.slice(0, 2), { ...leitura.dividas[2], titularidade: undefined }],
    });

    expect(decisao.veredito).toBe('recusa');
    expect(decisao.impedimentos[0].onde).toBe('Dívidas da Atv. Rural!10');
  });

  /* Uma linha ruim não deve esconder as outras: a tela lista todas de uma vez. */
  it('lista todas as linhas ruins, não só a primeira', () => {
    const leitura = le('bens-e-dividas');
    const decisao = decideImportacao({
      ...leitura,
      bens: leitura.bens.map((b) => ({ ...b, categoria: undefined })),
    });

    expect(decisao.impedimentos).toHaveLength(3);
  });
});

describe('o que passa com aviso', () => {
  /*
   * Célula de erro do Excel é coisa que a pessoa precisa ver, e esconder o estudo
   * até ela consertar a planilha não ajuda: ela conserta olhando o que entrou.
   */
  it('célula de erro do Excel entra com aviso', () => {
    const leitura = le('dre');
    const problema: ProblemaWp = {
      tipo: 'celula_de_erro',
      onde: 'Cenário Atual (PF)!C40',
      detalhe: 'a célula traz erro do Excel: #DIV/0!',
    };
    const decisao = decideImportacao({
      ...leitura,
      problemas: [...leitura.problemas, problema],
    });

    expect(decisao.veredito).toBe('aceita_com_aviso');
    expect(decisao.avisos).toEqual([problema]);
    expect(decisao.impedimentos).toEqual([]);
  });

  it('conta que não fecha entra com aviso', () => {
    const leitura = le('resumo-pfxpj-x-pjxpj');
    const decisao = decideImportacao(leitura, [
      {
        tipo: 'conta_nao_fecha',
        onde: 'Resumo!D16',
        detalhe: '`Pessoa Física` deveria ser a soma das linhas de baixo',
      },
    ]);

    expect(decisao.veredito).toBe('aceita_com_aviso');
    expect(decisao.avisos).toHaveLength(1);
  });

  it('fórmula sem resultado guardado entra com aviso', () => {
    const leitura = le('dre');
    const decisao = decideImportacao({
      ...leitura,
      problemas: [
        {
          tipo: 'formula_sem_resultado',
          onde: 'Cenário Atual (PF)!C31',
          detalhe: 'a fórmula `SUM(C32:C40)` não tem resultado guardado',
        },
      ],
    });

    expect(decisao.veredito).toBe('aceita_com_aviso');
  });

  /*
   * O impedimento manda, mesmo com aviso ao lado: não faz sentido gravar aviso de
   * uma revisão que não vai existir. Mas os avisos continuam na resposta, porque a
   * tela mostra os dois e a pessoa conserta tudo de uma vez.
   */
  it('um impedimento manda, e os avisos seguem visíveis', () => {
    const leitura = le('dre');
    const decisao = decideImportacao(
      {
        ...leitura,
        problemas: [
          ...leitura.problemas,
          { tipo: 'cabecalho_ilegivel', onde: 'x', detalhe: 'saiu do lugar' },
          { tipo: 'celula_de_erro', onde: 'y', detalhe: '#REF!' },
        ],
      },
      [{ tipo: 'conta_nao_fecha', onde: 'z', detalhe: 'não fecha' }],
    );

    expect(decisao.veredito).toBe('recusa');
    expect(decisao.impedimentos).toHaveLength(1);
    expect(decisao.avisos).toHaveLength(2);
  });
});

describe('a régua em si', () => {
  /*
   * Tipo novo nasce avisando, e é de propósito: a lista dos que impedem é a curta.
   * Se um tipo novo passasse a impedir por omissão, uma leitura mais detalhista
   * começaria a barrar estudo bom sem ninguém decidir isso.
   */
  it('tipo desconhecido pela régua avisa, não impede', () => {
    const leitura = le('dre');
    const decisao = decideImportacao({
      ...leitura,
      problemas: [{ tipo: 'tipo_inesperado', onde: 'Resumo!D16', detalhe: 'tipo object' }],
    });

    expect(decisao.veredito).toBe('aceita_com_aviso');
  });
});
