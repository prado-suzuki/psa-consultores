import { describe, it, expect } from 'vitest';
import {
  isSameRecord,
  validateClustersCliente,
  validateNomeCliente,
  validateObservacoesCliente,
  validateContribuinteDocumento,
  validateContribuinteDados,
  findDocumentosDuplicados,
  validateRepresentante,
  validateOrdemServico,
} from './clientFormValidation';
import type { DraftEntity, DraftRepresentante, DraftOrdemServico } from '@/types/clientForm';

const CENTRO_A = '11111111-1111-4111-8111-111111111111';
const CENTRO_B = '22222222-2222-4222-8222-222222222222';

const contribuinte = (over: Partial<DraftEntity> = {}): DraftEntity => ({
  _id: 1,
  tipo_pessoa: 'PJ',
  cpf_cnpj: '12.345.678/0001-90',
  nome_razao_social: 'Agro Amazônia',
  nome_fantasia: '',
  situacao_inscricao_estadual: 'isento',
  inscricao_estadual: '',
  cod_cnae: '0111-3/01',
  setor: '',
  simples_nacional: 'nao_optante',
  telefone: '',
  cep: '78000-000',
  logradouro: 'Av. Central',
  numero: '100',
  complemento: '',
  bairro: 'Centro',
  municipio: 'Cuiabá',
  uf: 'MT',
  contribuinte_faturamento: false,
  atividade_principal: '',
  ...over,
});

const representante = (over: Partial<DraftRepresentante> = {}): DraftRepresentante => ({
  _id: 1,
  nome: 'Maria Souza',
  tipo_representante: 'contato',
  cargo: '',
  email: 'maria@exemplo.com',
  telefone: '',
  observacoes: '',
  acesso_chamados: false,
  ...over,
});

const os = (over: Partial<DraftOrdemServico> = {}): DraftOrdemServico => ({
  _id: 1,
  ordem_servico: 'OS-001',
  data_emissao: '2026-01-10',
  data_inicio_projeto: '2026-01-15',
  data_fim_projeto: '2026-06-15',
  valor_projeto: 1000,
  numero_parcelas: 1,
  valor_entrada: 0,
  valor_reembolso_km: 0,
  valor_reembolso_refeicao: 0,
  situacao_projeto: 'em_andamento',
  observacoes_projeto: '',
  id_servico: '',
  id_produto_segmento: '',
  produtos_contratados: [{ _id: 1, produto_segmento_id: 'p1' }],
  distribuicao_receita: [{ id_centro_custo: CENTRO_A, percentual_rateio: 100 }],
  cluster_id: 'cl-1',
  setor_cliente: 'AGR',
  setor_cliente_id: 'st-1',
  regiao: 'centro_oeste',
  ...over,
});

describe('isSameRecord', () => {
  it('ignora a ordem das chaves', () => {
    expect(isSameRecord({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('detecta alteração em campo aninhado', () => {
    const antes = os();
    const depois = os({ distribuicao_receita: [{ id_centro_custo: CENTRO_A, percentual_rateio: 90 }] });
    expect(isSameRecord(antes, depois)).toBe(false);
  });

  it('considera igual um clone estrutural', () => {
    const antes = os();
    expect(isSameRecord(antes, structuredClone(antes))).toBe(true);
  });

  it('acusa diferença quando o tipo muda (string vs número)', () => {
    // Erra para o lado seguro: na dúvida a validação roda.
    expect(isSameRecord({ p: 100 }, { p: '100' })).toBe(false);
  });
});

describe('validateNomeCliente', () => {
  it('exige nome', () => {
    expect(validateNomeCliente('   ')).toBe('Nome do cliente é obrigatório');
  });
  it('aceita nome preenchido', () => {
    expect(validateNomeCliente('Agro Amazônia')).toBeNull();
  });
});

describe('validateClustersCliente', () => {
  it('sem cluster, recusa com a mesma frase da RPC', () => {
    expect(validateClustersCliente([])).toBe('Selecione ao menos 1 cluster');
    expect(validateClustersCliente(undefined)).toBe('Selecione ao menos 1 cluster');
  });

  it('um cluster já basta', () => {
    expect(validateClustersCliente(['4b0d0a02-6a0e-4a34-9f2a-2d4e6f7a8b9c'])).toBeNull();
  });
});

describe('validateObservacoesCliente', () => {
  it('exige observação ao inativar', () => {
    const erro = validateObservacoesCliente({ nome: 'X', ativo: false, observacoes: 'curto' });
    expect(erro).toMatch(/inativar/);
  });
  it('exige mínimo de 20 caracteres quando preenchida', () => {
    const erro = validateObservacoesCliente({ nome: 'X', ativo: true, observacoes: 'curto' });
    expect(erro).toMatch(/20 caracteres/);
  });
  it('aceita observação vazia em cliente ativo', () => {
    expect(validateObservacoesCliente({ nome: 'X', ativo: true, observacoes: '' })).toBeNull();
  });
});

describe('validateContribuinteDocumento', () => {
  it('exige razão social', () => {
    expect(validateContribuinteDocumento(contribuinte({ nome_razao_social: '' }))).toMatch(/Razão Social/);
  });
  it('exige CPF/CNPJ', () => {
    expect(validateContribuinteDocumento(contribuinte({ cpf_cnpj: '' }))).toMatch(/CPF\/CNPJ é obrigatório/);
  });
  it('recusa documento com quantidade de dígitos inválida', () => {
    expect(validateContribuinteDocumento(contribuinte({ cpf_cnpj: '123' }))).toMatch(/11 dígitos/);
  });
  it('aceita CPF de 11 dígitos', () => {
    expect(validateContribuinteDocumento(contribuinte({ tipo_pessoa: 'PF', cpf_cnpj: '123.456.789-01' }))).toBeNull();
  });
});

describe('validateContribuinteDados', () => {
  it('exige CEP', () => {
    expect(validateContribuinteDados(contribuinte({ cep: '' }))).toMatch(/CEP é obrigatório/);
  });
  it('exige CNAE apenas para PJ', () => {
    expect(validateContribuinteDados(contribuinte({ cod_cnae: '' }))).toMatch(/CNAE/);
    expect(validateContribuinteDados(contribuinte({ tipo_pessoa: 'PF', cod_cnae: '' }))).toBeNull();
  });
  it('exige número da IE quando a situação é "sim"', () => {
    const erro = validateContribuinteDados(contribuinte(), [{ _tempId: 1, situacao: 'sim', numero_ie: '', uf: 'MT' }]);
    expect(erro).toMatch(/número da IE/);
  });
  it('aceita contribuinte completo', () => {
    expect(validateContribuinteDados(contribuinte())).toBeNull();
  });
});

describe('findDocumentosDuplicados', () => {
  it('marca a segunda ocorrência e devolve o grupo inteiro', () => {
    const lista = [
      contribuinte({ _id: 1, nome_razao_social: 'Primeiro' }),
      contribuinte({ _id: 2, nome_razao_social: 'Segundo' }),
    ];
    const dup = findDocumentosDuplicados(lista);
    expect(dup.has(0)).toBe(false);
    expect(dup.get(1)?.indices).toEqual([0, 1]);
    expect(dup.get(1)?.message).toMatch(/documento repetido em "Primeiro"/);
  });

  it('não acusa duplicidade com documentos distintos', () => {
    const lista = [contribuinte({ _id: 1 }), contribuinte({ _id: 2, cpf_cnpj: '98.765.432/0001-10' })];
    expect(findDocumentosDuplicados(lista).size).toBe(0);
  });

  it('ignora contribuintes sem documento', () => {
    const lista = [contribuinte({ cpf_cnpj: '' }), contribuinte({ _id: 2, cpf_cnpj: '' })];
    expect(findDocumentosDuplicados(lista).size).toBe(0);
  });
});

describe('validateRepresentante', () => {
  it('exige nome, cargo e email', () => {
    expect(validateRepresentante(representante({ nome: '' }))).toMatch(/Nome é obrigatório/);
    expect(validateRepresentante(representante({ tipo_representante: '' }))).toMatch(/Cargo/);
    expect(validateRepresentante(representante({ email: '' }))).toMatch(/Email/);
  });
  it('valida formato de e-mail', () => {
    expect(validateRepresentante(representante({ email: 'maria@' }))).toMatch(/inválido/);
  });
  it('exige 10 dígitos no telefone quando preenchido', () => {
    expect(validateRepresentante(representante({ telefone: '(65) 9999' }))).toMatch(/10 dígitos/);
  });
  it('aceita representante completo', () => {
    expect(validateRepresentante(representante())).toBeNull();
  });
});

describe('validateOrdemServico', () => {
  it('exige empresa, área e região', () => {
    expect(validateOrdemServico(os({ cluster_id: '' }))).toMatch(/Empresa\/Faturamento/);
    expect(validateOrdemServico(os({ setor_cliente_id: '' }))).toMatch(/Área do Negócio/);
    expect(validateOrdemServico(os({ regiao: '' }))).toMatch(/Região/);
  });

  // O cadastro de projeto herda o período da OS e não oferece campo de data:
  // deixar a OS salvar sem início ou fim é o que tornava o projeto insalvável.
  it('exige o período, que é o que o projeto herda', () => {
    expect(validateOrdemServico(os({ data_inicio_projeto: '' }))).toMatch(/Data Início/);
    expect(validateOrdemServico(os({ data_fim_projeto: '' }))).toMatch(/Data Fim/);
  });

  it('recusa fim anterior ao início', () => {
    const erro = validateOrdemServico(os({
      data_inicio_projeto: '2026-06-15', data_fim_projeto: '2026-01-15',
    }));
    expect(erro).toMatch(/Data Fim deve ser posterior/);
  });

  it('exige ao menos um produto e uma linha de rateio', () => {
    expect(validateOrdemServico(os({ produtos_contratados: [] }))).toMatch(/Produto Contratado/);
    expect(validateOrdemServico(os({ distribuicao_receita: [] }))).toMatch(/Centro de Custo/);
  });

  it('recusa centro de custo inválido', () => {
    const erro = validateOrdemServico(os({ distribuicao_receita: [{ id_centro_custo: 'abc', percentual_rateio: 100 }] }));
    expect(erro).toMatch(/centro de custo válido/);
  });

  it('recusa centro de custo repetido no rateio', () => {
    const erro = validateOrdemServico(os({
      distribuicao_receita: [
        { id_centro_custo: CENTRO_A, percentual_rateio: 50 },
        { id_centro_custo: CENTRO_A, percentual_rateio: 50 },
      ],
    }));
    expect(erro).toMatch(/centro de custo repetido/);
  });

  it('exige soma de 100% no rateio', () => {
    const erro = validateOrdemServico(os({
      distribuicao_receita: [
        { id_centro_custo: CENTRO_A, percentual_rateio: 50 },
        { id_centro_custo: CENTRO_B, percentual_rateio: 30 },
      ],
    }));
    expect(erro).toMatch(/100% \(atual: 80.00%\)/);
  });

  it('aceita OS completa', () => {
    expect(validateOrdemServico(os())).toBeNull();
  });
});
