import { describe, expect, it } from 'vitest';
import {
  mapearPendencias,
  pendenciasCliente,
  pendenciasContribuinte,
  pendenciasDocumentosRepetidos,
  pendenciasOrdemServico,
  pendenciasRepresentante,
} from '@/lib/camposObrigatorios';
import {
  findDocumentosDuplicados,
  validateContribuinteDados,
  validateContribuinteDocumento,
  validateObservacoesCliente,
  validateOrdemServico,
  validateRepresentante,
} from '@/lib/clientFormValidation';
import type { DraftEntity, DraftOrdemServico, DraftRepresentante, InscricaoIE } from '@/types/clientForm';

const CC_1 = '11111111-1111-4111-8111-111111111111';
const CC_2 = '22222222-2222-4222-8222-222222222222';

const contribuinteCompleto = (over: Partial<DraftEntity> = {}): DraftEntity =>
  ({
    _id: 1,
    tipo_pessoa: 'PJ',
    nome_razao_social: 'Empresa Exemplo Ltda',
    cpf_cnpj: '12.345.678/0001-95',
    cep: '78000-000',
    logradouro: 'Rua A',
    bairro: 'Centro',
    municipio: 'Cuiabá',
    uf: 'MT',
    cod_cnae: '0111-3/01',
    simples_nacional: 'optante',
    ...over,
  }) as DraftEntity;

const osCompleta = (over: Partial<DraftOrdemServico> = {}): DraftOrdemServico =>
  ({
    _id: 7,
    ordem_servico: '001/2026',
    cluster_id: 'c1',
    setor_cliente_id: 's1',
    regiao: '3NO',
    produtos_contratados: [{ _id: 1, produto_segmento_id: 'p1' }],
    distribuicao_receita: [{ id_centro_custo: CC_1, percentual_rateio: 100 }],
    ...over,
  }) as DraftOrdemServico;

const representanteCompleto = (over: Partial<DraftRepresentante> = {}): DraftRepresentante =>
  ({ _id: 3, nome: 'Maria', tipo_representante: 'Contador', email: 'maria@x.com', ...over }) as DraftRepresentante;

describe('pendenciasCliente', () => {
  it('cobra o nome', () => {
    expect(pendenciasCliente({ nome: '' }).map((p) => p.campo)).toEqual(['nome']);
    expect(pendenciasCliente({ nome: 'Grupo X', ativo: true })).toEqual([]);
  });

  it('inativar sem justificativa é falta na observação', () => {
    const faltas = pendenciasCliente({ nome: 'Grupo X', ativo: false, observacoes: '' });
    expect(faltas.map((p) => p.campo)).toEqual(['observacoes']);
    expect(faltas[0].mensagem).toContain('inativar');
  });

  it('observação preenchida curta demais também é falta', () => {
    const faltas = pendenciasCliente({ nome: 'Grupo X', ativo: true, observacoes: 'curta' });
    expect(faltas.map((p) => p.campo)).toEqual(['observacoes']);
  });
});

describe('pendenciasContribuinte', () => {
  it('não acusa nada quando está completo', () => {
    expect(pendenciasContribuinte(contribuinteCompleto())).toEqual([]);
  });

  it('aponta o campo e o item, não só a mensagem', () => {
    const [falta] = pendenciasContribuinte(contribuinteCompleto({ cep: '' }));
    expect(falta).toMatchObject({ aba: 'contribuintes', itemId: 1, campo: 'cep' });
  });

  it('CNAE e Simples só valem para pessoa jurídica', () => {
    const pf = contribuinteCompleto({
      tipo_pessoa: 'PF', cpf_cnpj: '021.721.511-49', cod_cnae: '', simples_nacional: '',
    });
    expect(pendenciasContribuinte(pf)).toEqual([]);
  });

  it('inscrição estadual incompleta é falta do contribuinte', () => {
    const ies: InscricaoIE[] = [{ _tempId: 1, situacao: 'sim', uf: 'MT', numero_ie: '' }];
    const faltas = pendenciasContribuinte(contribuinteCompleto(), ies);
    expect(faltas.map((f) => f.campo)).toEqual(['inscricoes']);
  });

  it('documento com contagem errada de dígitos é falta', () => {
    // O caso do Antonio Sansão: 10 dígitos porque o zero da frente se perdeu.
    const campos = pendenciasContribuinte(contribuinteCompleto({ cpf_cnpj: '2172151149' }))
      .map((p) => p.campo);
    expect(campos).toContain('cpf_cnpj');
  });
});

describe('pendenciasOrdemServico', () => {
  it('não acusa nada quando está completa', () => {
    expect(pendenciasOrdemServico(osCompleta())).toEqual([]);
  });

  it('rateio que não fecha 100% cai na seção 05', () => {
    const faltas = pendenciasOrdemServico(osCompleta({
      distribuicao_receita: [{ id_centro_custo: CC_1, percentual_rateio: 60 }],
    }));
    expect(faltas).toHaveLength(1);
    expect(faltas[0].secao).toBe(5);
    expect(faltas[0].mensagem).toContain('60%');
  });

  it('centro de custo repetido é falta própria', () => {
    const faltas = pendenciasOrdemServico(osCompleta({
      distribuicao_receita: [
        { id_centro_custo: CC_1, percentual_rateio: 50 },
        { id_centro_custo: CC_1, percentual_rateio: 50 },
      ],
    }));
    expect(faltas.map((f) => f.mensagem)).toContain('Centro de custo repetido');
  });

  it('cada falta sabe em qual seção mora', () => {
    const faltas = pendenciasOrdemServico({ _id: 9 } as DraftOrdemServico);
    expect(new Set(faltas.map((f) => f.secao))).toEqual(new Set([2, 3, 5]));
  });
});

// O número da seção é o que fica vermelho no formulário. Reordenar as seções na
// tela sem mexer aqui faria a marca apontar para a etapa errada, então cada
// campo tem a sua seção fixada em teste.
describe('seção de cada campo', () => {
  it('contribuinte: 01 identificação, 02 endereço, 03 dados fiscais', () => {
    const porCampo = new Map(
      pendenciasContribuinte({ _id: 1, tipo_pessoa: 'PJ' } as DraftEntity).map((f) => [f.campo, f.secao]),
    );
    expect(porCampo.get('nome_razao_social')).toBe(1);
    expect(porCampo.get('cpf_cnpj')).toBe(1);
    expect(porCampo.get('cep')).toBe(2);
    expect(porCampo.get('uf')).toBe(2);
    expect(porCampo.get('cod_cnae')).toBe(3);
    expect(porCampo.get('simples_nacional')).toBe(3);
  });

  it('representante: 01 identificação, 02 contato, 03 acesso e observações', () => {
    const porCampo = new Map(
      pendenciasRepresentante({ _id: 1, observacoes: 'curta' } as DraftRepresentante).map((f) => [f.campo, f.secao]),
    );
    expect(porCampo.get('nome')).toBe(1);
    expect(porCampo.get('tipo_representante')).toBe(1);
    expect(porCampo.get('email')).toBe(2);
    expect(porCampo.get('observacoes')).toBe(3);
  });

  it('cliente: 01 identificação, 03 observações', () => {
    const faltas = pendenciasCliente({ nome: '', ativo: false, observacoes: '' });
    const porCampo = new Map(faltas.map((f) => [f.campo, f.secao]));
    expect(porCampo.get('nome')).toBe(1);
    expect(porCampo.get('observacoes')).toBe(3);
  });
});

describe('pendenciasDocumentosRepetidos', () => {
  it('marca da segunda ocorrência em diante, apontando quem já tinha', () => {
    const faltas = pendenciasDocumentosRepetidos([
      contribuinteCompleto({ _id: 1, nome_razao_social: 'Primeira Ltda' }),
      contribuinteCompleto({ _id: 2, nome_razao_social: 'Segunda Ltda' }),
    ]);
    expect(faltas).toHaveLength(1);
    expect(faltas[0]).toMatchObject({ itemId: 2, campo: 'cpf_cnpj' });
    expect(faltas[0].mensagem).toContain('Primeira Ltda');
  });

  it('documento em branco não conta como repetido', () => {
    const faltas = pendenciasDocumentosRepetidos([
      contribuinteCompleto({ _id: 1, cpf_cnpj: '' }),
      contribuinteCompleto({ _id: 2, cpf_cnpj: '' }),
    ]);
    expect(faltas).toEqual([]);
  });
});

describe('pendenciasRepresentante', () => {
  it('não acusa nada quando está completo', () => {
    expect(pendenciasRepresentante(representanteCompleto())).toEqual([]);
  });

  it('e-mail mal formado é falta', () => {
    const faltas = pendenciasRepresentante(representanteCompleto({ email: 'maria' }));
    expect(faltas.map((f) => f.campo)).toEqual(['email']);
  });

  it('telefone curto e observação curta são faltas dos campos opcionais', () => {
    expect(pendenciasRepresentante(representanteCompleto({ telefone: '(65) 9999' })).map((f) => f.campo))
      .toEqual(['telefone']);
    expect(pendenciasRepresentante(representanteCompleto({ observacoes: 'curta' })).map((f) => f.campo))
      .toEqual(['observacoes']);
  });
});

// A localização não pode discordar de quem barra o salvamento: se a validação
// recusa, tem de existir uma marca na tela; se aceita, não pode haver marca
// sobrando apontando para um campo que o save considera preenchido.
describe('acordo com a validação que barra o save', () => {
  it('cliente: acusam juntos', () => {
    const casos = [
      { nome: 'Grupo X', ativo: true, observacoes: '' },
      { nome: 'Grupo X', ativo: false, observacoes: '' },
      { nome: 'Grupo X', ativo: true, observacoes: 'curta' },
      { nome: 'Grupo X', ativo: false, observacoes: 'motivo suficientemente longo da inativação' },
    ];
    for (const c of casos) {
      const barra = !!validateObservacoesCliente(c);
      // O nome está sempre preenchido nos casos, então a única falta possível
      // aqui é a observação — é ela que os dois lados precisam enxergar igual.
      expect(pendenciasCliente(c).length > 0).toBe(barra);
    }
  });

  it('contribuinte: acusam juntos', () => {
    const ieIncompleta: InscricaoIE[] = [{ _tempId: 1, situacao: 'sim', uf: 'MT', numero_ie: '' }];
    const casos: Array<[DraftEntity, InscricaoIE[]]> = [
      [contribuinteCompleto(), []],
      [contribuinteCompleto({ cep: '' }), []],
      [contribuinteCompleto({ nome_razao_social: '' }), []],
      [contribuinteCompleto({ cod_cnae: '' }), []],
      [contribuinteCompleto({ uf: 'M' }), []],
      [contribuinteCompleto(), ieIncompleta],
    ];
    for (const [e, ies] of casos) {
      const barra = !!(validateContribuinteDocumento(e) || validateContribuinteDados(e, ies));
      expect(pendenciasContribuinte(e, ies).length > 0).toBe(barra);
    }
  });

  it('documento repetido: acusam juntos', () => {
    const listas: DraftEntity[][] = [
      [contribuinteCompleto({ _id: 1 }), contribuinteCompleto({ _id: 2, cpf_cnpj: '11.222.333/0001-81' })],
      [contribuinteCompleto({ _id: 1 }), contribuinteCompleto({ _id: 2 })],
    ];
    for (const lista of listas) {
      expect(pendenciasDocumentosRepetidos(lista).length > 0)
        .toBe(findDocumentosDuplicados(lista).size > 0);
    }
  });

  it('ordem de serviço: acusam juntas', () => {
    const casos: DraftOrdemServico[] = [
      osCompleta(),
      osCompleta({ regiao: '' }),
      osCompleta({ produtos_contratados: [] }),
      osCompleta({ distribuicao_receita: [{ id_centro_custo: CC_1, percentual_rateio: 99 }] }),
    ];
    for (const c of casos) {
      expect(pendenciasOrdemServico(c).length > 0).toBe(!!validateOrdemServico(c));
    }
  });

  it('representante: acusam juntos', () => {
    const casos: DraftRepresentante[] = [
      representanteCompleto(),
      representanteCompleto({ nome: '' }),
      representanteCompleto({ email: 'x' }),
      representanteCompleto({ tipo_representante: '' }),
      representanteCompleto({ telefone: '(65) 9999' }),
      representanteCompleto({ telefone: '(65) 99999-9999' }),
      representanteCompleto({ observacoes: 'curta' }),
    ];
    for (const p of casos) {
      expect(pendenciasRepresentante(p).length > 0).toBe(!!validateRepresentante(p));
    }
  });
});

describe('mapearPendencias', () => {
  it('agrupa por aba, item, seção e campo', () => {
    const mapa = mapearPendencias([
      ...pendenciasContribuinte(contribuinteCompleto({ _id: 11, cep: '', municipio: '' })),
      ...pendenciasOrdemServico(osCompleta({ _id: 22, regiao: '' })),
    ]);

    expect([...mapa.abas].sort()).toEqual(['contratos', 'contribuintes']);
    expect([...mapa.itens].sort()).toEqual([11, 22]);
    expect([...(mapa.secoesPorItem.get(22) ?? [])]).toEqual([2]);
    expect([...(mapa.camposPorItem.get(11) ?? new Map()).keys()].sort()).toEqual(['cep', 'municipio']);
  });

  it('a aba do cliente entra sem item, na chave 0', () => {
    const mapa = mapearPendencias(pendenciasCliente({ nome: '' }));
    expect(mapa.itens.size).toBe(0);
    expect(mapa.camposPorItem.get(0)?.get('nome')).toBe('Informe o nome do cliente');
  });

  it('sem pendência, tudo vazio', () => {
    const mapa = mapearPendencias([]);
    expect(mapa.abas.size).toBe(0);
    expect(mapa.itens.size).toBe(0);
    expect(mapa.camposPorItem.size).toBe(0);
  });
});
