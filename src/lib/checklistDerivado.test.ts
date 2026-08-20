import { describe, expect, it } from 'vitest';
import {
  agruparPorInstancia,
  contarArquivosSemTipo,
  derivarChecklist,
  montarInstancias,
  resumirChecklist,
  type ArquivoClassificado,
  type EntradaChecklist,
} from './checklistDerivado';
import type { ItemSolicitacao } from './solicitacao';

const item = (overrides: Partial<ItemSolicitacao> = {}): ItemSolicitacao => ({
  id: 'item-cpf',
  itemPadraoId: 'tipo-cpf',
  doCatalogo: true,
  granularidade: 'pessoa_pf',
  grupo: 'pf',
  ordem: 1,
  status: 'ativo',
  observacao: null,
  documento: 'CPF',
  entidade: 'Pessoa Física',
  nota: null,
  sobrescrito: { documento: false, entidade: false, nota: false },
  codigo: 'pf--cpf',
  confidencial: false,
  ...overrides,
});

const arquivo = (overrides: Partial<ArquivoClassificado> = {}): ArquivoClassificado => ({
  id: 'arq-1',
  nome_original: 'cpf-joao.pdf',
  documento_tipo_id: 'tipo-cpf',
  pessoa_id: null,
  bem_id: null,
  matricula_id: null,
  revisao: 'pendente',
  revisao_motivo: null,
  fonte: 'cliente',
  ...overrides,
});

const entrada = (overrides: Partial<EntradaChecklist> = {}): EntradaChecklist => ({
  itens: [item()],
  instancias: montarInstancias({
    pessoas: [
      { id: 'p-joao', denominacao: 'João', tipo_pessoa: 'PF' },
      { id: 'p-maria', denominacao: 'Maria', tipo_pessoa: 'PF' },
    ],
    bens: [],
    matriculas: [],
  }),
  arquivos: [],
  naoAplicaveis: [],
  avulsoPorItem: {},
  ...overrides,
});

describe('montarInstancias', () => {
  it('separa PF de PJ e sempre inclui a instância do cliente', () => {
    const instancias = montarInstancias({
      pessoas: [
        { id: 'p1', denominacao: 'João', tipo_pessoa: 'PF' },
        { id: 'p2', denominacao: 'Fazenda LTDA', tipo_pessoa: 'PJ' },
      ],
      bens: [],
      matriculas: [],
    });

    expect(instancias.map((i) => [i.chave, i.cluster])).toEqual([
      ['cliente', 'cliente'],
      ['pessoa:p1', 'pessoa_pf'],
      ['pessoa:p2', 'pessoa_pj'],
    ]);
  });

  it('classifica matrícula rural por tipo_bem IR e joga o resto em urbana', () => {
    const instancias = montarInstancias({
      pessoas: [],
      bens: [],
      matriculas: [
        { id: 'm1', numero: '111', tipo_bem: 'IR', bem_denominacao: 'Sítio', bem_referencia: null },
        { id: 'm2', numero: '222', tipo_bem: null, bem_denominacao: null, bem_referencia: null },
      ],
    });

    const rural = instancias.find((i) => i.chave === 'matricula:m1');
    const urbana = instancias.find((i) => i.chave === 'matricula:m2');
    expect(rural).toMatchObject({ cluster: 'imovel_rural', label: 'Sítio', detalhe: 'Matrícula 111' });
    // Sem nome de imóvel, o número vira o rótulo e não se repete no detalhe.
    expect(urbana).toMatchObject({ cluster: 'imovel_urbano', label: 'Matrícula 222', detalhe: null });
  });
});

describe('derivarChecklist', () => {
  it('multiplica o item pelas instâncias do grão dele', () => {
    const linhas = derivarChecklist(entrada());

    expect(linhas).toHaveLength(2);
    expect(linhas.map((l) => l.instancia.label).sort()).toEqual(['João', 'Maria']);
    expect(linhas.every((l) => l.status === 'pendente')).toBe(true);
  });

  it('dá recebido só para a instância dona do arquivo', () => {
    const linhas = derivarChecklist(entrada({
      arquivos: [arquivo({ pessoa_id: 'p-joao' })],
    }));

    const joao = linhas.find((l) => l.instancia.chave === 'pessoa:p-joao');
    const maria = linhas.find((l) => l.instancia.chave === 'pessoa:p-maria');
    expect(joao?.status).toBe('recebido');
    expect(joao?.arquivos).toEqual([
      { id: 'arq-1', nome: 'cpf-joao.pdf', revisao: 'pendente', motivo: null, fonte: 'cliente' },
    ]);
    expect(maria?.status).toBe('pendente');
  });

  it('arquivo recusado reabre a pendência, mas continua na linha', () => {
    const linhas = derivarChecklist(entrada({
      arquivos: [arquivo({
        pessoa_id: 'p-joao', revisao: 'recusado', revisao_motivo: 'Página cortada',
      })],
    }));

    const joao = linhas.find((l) => l.instancia.chave === 'pessoa:p-joao');
    // Volta a faltar (é o que reabre o envio no portal)...
    expect(joao?.status).toBe('pendente');
    // ...sem esconder o que já veio, senão ninguém sabe o que foi recusado.
    expect(joao?.arquivos).toEqual([
      { id: 'arq-1', nome: 'cpf-joao.pdf', revisao: 'recusado', motivo: 'Página cortada', fonte: 'cliente' },
    ]);
  });

  it('um recusado não derruba o recebido quando outro arquivo vale', () => {
    const linhas = derivarChecklist(entrada({
      arquivos: [
        arquivo({ id: 'arq-velho', pessoa_id: 'p-joao', revisao: 'recusado' }),
        arquivo({ id: 'arq-novo', pessoa_id: 'p-joao', revisao: 'aprovado' }),
      ],
    }));

    expect(linhas.find((l) => l.instancia.chave === 'pessoa:p-joao')?.status).toBe('recebido');
  });

  it('aprovado e ainda não revisado contam igual como recebido', () => {
    const semRevisao = derivarChecklist(entrada({ arquivos: [arquivo({ pessoa_id: 'p-joao' })] }));
    const aprovado = derivarChecklist(entrada({
      arquivos: [arquivo({ pessoa_id: 'p-joao', revisao: 'aprovado' })],
    }));

    expect(semRevisao.find((l) => l.instancia.chave === 'pessoa:p-joao')?.status).toBe('recebido');
    expect(aprovado.find((l) => l.instancia.chave === 'pessoa:p-joao')?.status).toBe('recebido');
  });

  it('ignora arquivo do tipo certo sem dono quando o grão é por pessoa', () => {
    const linhas = derivarChecklist(entrada({ arquivos: [arquivo()] }));

    expect(linhas.every((l) => l.status === 'pendente')).toBe(true);
  });

  it('casa o grão cliente com o arquivo sem dono', () => {
    const linhas = derivarChecklist(entrada({
      itens: [item({ id: 'item-rel', itemPadraoId: 'tipo-rel', granularidade: 'cliente', grupo: 'outros', documento: 'Relação de áreas' })],
      arquivos: [arquivo({ id: 'arq-rel', documento_tipo_id: 'tipo-rel' })],
    }));

    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ status: 'recebido', instancia: { chave: 'cliente' } });
  });

  it('não aplicável vence recebido, e dispensado vence tudo', () => {
    const naoAplicavel = derivarChecklist(entrada({
      arquivos: [arquivo({ pessoa_id: 'p-joao' })],
      naoAplicaveis: [{ solicitacao_item_id: 'item-cpf', pessoa_id: 'p-joao', bem_id: null, matricula_id: null }],
    }));
    expect(naoAplicavel.find((l) => l.instancia.chave === 'pessoa:p-joao')?.status).toBe('nao_aplicavel');

    const dispensado = derivarChecklist(entrada({
      itens: [item({ status: 'dispensado' })],
      arquivos: [arquivo({ pessoa_id: 'p-joao' })],
      naoAplicaveis: [{ solicitacao_item_id: 'item-cpf', pessoa_id: 'p-joao', bem_id: null, matricula_id: null }],
    }));
    expect(dispensado.every((l) => l.status === 'dispensado')).toBe(true);
  });

  it('resolve o tipo do item manual pelo avulso, e deixa nulo quando ele não existe', () => {
    const manual = item({ id: 'item-manual', itemPadraoId: null, doCatalogo: false, documento: 'Contrato de arrendamento' });

    const comAvulso = derivarChecklist(entrada({
      itens: [manual],
      avulsoPorItem: { 'item-manual': 'tipo-avulso' },
      arquivos: [arquivo({ id: 'arq-arr', documento_tipo_id: 'tipo-avulso', pessoa_id: 'p-maria' })],
    }));
    expect(comAvulso.find((l) => l.instancia.chave === 'pessoa:p-maria')).toMatchObject({
      documentoTipoId: 'tipo-avulso',
      status: 'recebido',
    });

    const semAvulso = derivarChecklist(entrada({ itens: [manual] }));
    expect(semAvulso.every((l) => l.documentoTipoId === null && l.status === 'pendente')).toBe(true);
  });

  it('não cria linha para instância de outro grão', () => {
    const linhas = derivarChecklist(entrada({
      itens: [item({ granularidade: 'pessoa_pj', grupo: 'pj' })],
    }));

    expect(linhas).toEqual([]);
  });
});

describe('resumirChecklist', () => {
  it('tira o encerrado da base do percentual', () => {
    const linhas = derivarChecklist(entrada({
      itens: [item(), item({ id: 'item-rg', itemPadraoId: 'tipo-rg', documento: 'RG', ordem: 2 })],
      arquivos: [arquivo({ pessoa_id: 'p-joao' })],
      naoAplicaveis: [{ solicitacao_item_id: 'item-rg', pessoa_id: 'p-maria', bem_id: null, matricula_id: null }],
    }));

    // 4 linhas: CPF/RG × João/Maria. Recebido: CPF do João. Encerrado: RG da Maria.
    expect(resumirChecklist(linhas)).toEqual({
      recebidos: 1, pendentes: 2, encerrados: 1, base: 3, pct: 33,
    });
  });
});

describe('agruparPorInstancia', () => {
  it('põe quem tem pendência na frente e ignora instância sem linha', () => {
    const linhas = derivarChecklist(entrada({
      instancias: montarInstancias({
        pessoas: [
          { id: 'p-joao', denominacao: 'João', tipo_pessoa: 'PF' },
          { id: 'p-maria', denominacao: 'Maria', tipo_pessoa: 'PF' },
          { id: 'p-pj', denominacao: 'Fazenda LTDA', tipo_pessoa: 'PJ' },
        ],
        bens: [],
        matriculas: [],
      }),
      arquivos: [arquivo({ pessoa_id: 'p-joao' })],
    }));

    const grupos = agruparPorInstancia(linhas);
    expect(grupos.map((g) => g.chave)).toEqual(['pessoa:p-maria', 'pessoa:p-joao']);
  });
});

describe('contarArquivosSemTipo', () => {
  it('conta o acervo que a subtração não vê', () => {
    expect(contarArquivosSemTipo([arquivo(), arquivo({ id: 'a2', documento_tipo_id: null })])).toBe(1);
  });
});
