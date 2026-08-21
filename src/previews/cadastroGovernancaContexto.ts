/**
 * Os dados que o sistema JÁ TEM, para o documento do mockup sair preenchido.
 *
 * Não são inventados: saíram do banco de desenvolvimento (sandbox
 * `vgzomuwnsdgrxbkyoavq`), do cliente "Aurora Transportes S.A.", que tem três PJ
 * e oito PF cadastradas. Foi consulta de leitura, e os valores estão copiados
 * aqui porque o mockup não conversa com banco.
 *
 * O ponto que isso prova: a qualificação completa de um sócio, que no contrato
 * ocupa cinco linhas e é repetida em três documentos, já está toda no cadastro.
 * A tabela `pessoa` tem 41 colunas e guarda PF e PJ no mesmo lugar (a PJ é a que
 * tem `nire`, `junta_comercial_uf`, `objeto_social` e `tipo_empresa`).
 *
 * ACHADO DE QUALIDADE DE DADO, para quem for usar isto: no cliente lido há PF
 * com `genero = 'F'` e `profissao = 'Empresária'` num registro chamado "Diego".
 * O gerador usa o gênero para concordar a cláusula, então dado torto ali sai
 * torto no contrato.
 */

/** A holding, que é a sociedade objeto do contrato. */
export const SOCIEDADE = {
  razaoSocial: 'Rondon Participações Ltda',
  cnpj: '50.487.876/7424-05',
  nire: '51202298061',
  juntaUf: 'MT',
  endereco: 'Rua Karina Barros 118, Centro, Sorriso, MT, 53290-000',
};

export type SocioCadastro = {
  nome: string;
  cpf: string;
  nacionalidade: string;
  naturalidade: string;
  nascimento: string;
  profissao: string;
  estadoCivil: string;
  regimeBens: string;
  rg: string;
  orgao: string;
  endereco: string;
  genero: 'M' | 'F';
};

/** Três das oito pessoas físicas do cliente, as que têm qualificação completa. */
export const SOCIOS: SocioCadastro[] = [
  {
    nome: 'Carla Almeida',
    cpf: '469.837.327-15',
    nacionalidade: 'brasileira',
    naturalidade: 'Sorriso/MT',
    nascimento: '20/05/1987',
    profissao: 'empresária',
    estadoCivil: 'casada',
    regimeBens: 'comunhão parcial de bens',
    rg: '38369657',
    orgao: 'SESP/MT',
    endereco: 'Rua Sérgio Almeida, n.º 1013, Centro, Sorriso, MT, CEP 51015-000',
    genero: 'F',
  },
  {
    nome: 'Diego Almeida',
    cpf: '268.470.227-60',
    nacionalidade: 'brasileiro',
    naturalidade: 'Sorriso/MT',
    nascimento: '20/03/1990',
    profissao: 'empresário',
    estadoCivil: 'casado',
    regimeBens: 'comunhão parcial de bens',
    rg: '75692815',
    orgao: 'Detran/MT',
    endereco: 'Rua Tânia Lima, n.º 636, Centro, Sorriso, MT, CEP 25286-000',
    genero: 'M',
  },
  {
    nome: 'Carla Pires',
    cpf: '834.735.747-16',
    nacionalidade: 'brasileira',
    naturalidade: 'Chopinzinho/PR',
    nascimento: '26/02/1987',
    profissao: 'empresária',
    estadoCivil: 'casada',
    regimeBens: 'comunhão parcial de bens',
    rg: '99437803',
    orgao: 'Detran/MT',
    endereco: 'Rua Marina Barros, n.º 718, Centro, Sorriso, MT, CEP 61632-000',
    genero: 'F',
  },
];

/** Quais colunas do cadastro alimentam cada pedaço da qualificação. */
export const COLUNA = {
  nome: 'pessoa.denominacao',
  cpf: 'pessoa.cpf_cnpj',
  nacionalidade: 'pessoa.nacionalidade',
  naturalidade: 'pessoa.naturalidade_municipio + naturalidade_uf',
  nascimento: 'pessoa.data_nascimento',
  profissao: 'pessoa.profissao',
  estadoCivil: 'pessoa.estado_civil',
  regimeBens: 'pessoa.regime_bens',
  rg: 'pessoa.documento_identidade_numero',
  orgao: 'pessoa.documento_identidade_orgao',
  endereco: 'pessoa.endereco_logradouro … endereco_cep',
  razaoSocial: 'pessoa.denominacao (tipo_pessoa = PJ)',
  cnpj: 'pessoa.cpf_cnpj (tipo_pessoa = PJ)',
  nire: 'pessoa.nire',
  juntaUf: 'pessoa.junta_comercial_uf',
} as const;

export const TELA_PESSOAS = 'Qualificação das Partes';
