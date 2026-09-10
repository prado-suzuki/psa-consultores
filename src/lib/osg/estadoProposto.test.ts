import { describe, expect, it } from 'vitest';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import { analisarAlteracao } from '@/lib/osg/alteracaoPorEventos';
import { CAMPOS_DE_CAPITAL, comporEstadoProposto, validarSelecaoDeEventos } from '@/lib/osg/estadoProposto';
import { camposDaEntidade } from '@/lib/templates/vocabulario';

// Dados sinteticos: o contrato do compositor, nao uma fixture juridica.
const pessoa = (id: string, extra: Record<string, string> = {}) => ({
  id, tipoPessoa: 'PF', nome: `Pessoa ${id}`, cpfCnpj: `000.000.000-0${id.slice(-1)}`,
  profissao: 'Medica', endereco: 'Rua Velha, 1', qualificacao: `Pessoa ${id}, medica, Rua Velha, 1`, ...extra,
});

function base(): SnapshotDados {
  return {
    empresaId: 'empresa-1',
    selecao: {
      sociedade: {
        id: 'empresa-1', numeroAlteracao: '0', tituloInstrumento: 'CONTRATO SOCIAL', razaoSocial: 'Empresa',
        cnpj: '', nire: '', objeto: 'Objeto registrado', capitalValor: '100,00',
        capitalExtenso: 'cem reais', totalQuotas: '100', totalQuotasExtenso: 'cem',
        sede: 'Rua A, 10, Centro, Cuiaba, MT, CEP 78000-000', sedeEndereco: 'Rua A, 10', sedeLogradouro: 'Rua A',
        sedeNumero: '10', sedeComplemento: '', sedeBairro: 'Centro', sedeMunicipio: 'Cuiaba', sedeUf: 'MT',
        sedeCep: '78000-000', sedeUfExtenso: 'Mato Grosso',
      },
    },
    registroPorBinding: { sociedade: 'empresa-1' },
    registrosPorLista: {},
    valoresLivres: { observacao: 'Texto da base' },
    itensPorLista: {
      socios: [{ socio: { ...pessoa('p1'), quotas: '100', percentual: '100,000%' } }],
      administradores: [{ administrador: { ...pessoa('p1'), cargo: 'Administradora' } }],
      integralizacoes: [{ integralizador: pessoa('p1'), imoveis: [] }],
      signatarios: [{ signatario: { nome: 'Pessoa p1', papel: 'Socia administradora' } }],
      imoveis: [{ imovel: { id: 'imovel-1', numero: '1' } }],
    },
    total: { quotas: '100', vlrTotal: '100,00', percentual: '100,000%' },
  };
}

/** O cadastro de hoje: sede, profissao, objeto, CNPJ e quadro mudaram. */
function vivo(): SnapshotDados {
  const v = structuredClone(base());
  Object.assign(v.selecao.sociedade, {
    numeroAlteracao: '1', tituloInstrumento: 'PRIMEIRA ALTERACAO', cnpj: '12.345.678/0001-90', nire: '5100000',
    objeto: 'Objeto novo', capitalValor: '300,00',
    capitalExtenso: 'trezentos reais', totalQuotas: '300', totalQuotasExtenso: 'trezentos',
    sede: 'Rua B, 20, Centro, Cuiaba, MT, CEP 78000-000', sedeEndereco: 'Rua B, 20', sedeLogradouro: 'Rua B', sedeNumero: '20',
  });
  const p1 = pessoa('p1', { profissao: 'Engenheira', qualificacao: 'Pessoa p1, engenheira, Rua Velha, 1' });
  v.itensPorLista = {
    socios: [
      { socio: { ...p1, quotas: '100', percentual: '33,333%' } },
      { socio: { ...pessoa('p2'), quotas: '200', percentual: '66,667%' } },
    ],
    administradores: [{ administrador: { ...pessoa('p2'), cargo: 'Administrador' } }],
    integralizacoes: [{ integralizador: pessoa('p2'), imoveis: [] }],
    cessoes: [{ cedente: p1, cessionario: pessoa('p2'), cessao: { quotas: '50' } }],
    doacoes: [{ doador: p1, donatario: pessoa('p2'), doacao: { quotas: '25' } }],
    usufrutos: [{ nuProprietario: pessoa('p2'), usufruto: { quotas: '25' } }],
    gravamesQuotas: [{ nuProprietario: pessoa('p2'), gravame: { quotas: '25' } }],
    quadroUsufruto: [{ titular: p1, usufruto: { plena: '75' } }],
    retirantes: [],
    signatarios: [{ signatario: { nome: 'Pessoa p1' } }, { signatario: { nome: 'Pessoa p2' } }],
    imoveis: [{ imovel: { id: 'imovel-1', numero: '1' } }],
    vertices: [{ vertice: { nome: 'V1' } }],
  };
  v.total = { quotas: '300', vlrTotal: '300,00', percentual: '100,000%' };
  v.valoresLivres = { observacao: 'Texto editado' };
  return v;
}

const compor = (eventos: string[], extra: Partial<Parameters<typeof comporEstadoProposto>[0]> = {}) => {
  const b = base();
  const v = vivo();
  const sede = analisarAlteracao(b, v).candidatos.find((c) => c.tipo === 'sede') ?? null;
  return comporEstadoProposto({ base: b, vivo: v, eventosConfirmados: new Set(eventos), bindingsSociedade: ['sociedade'], sede, ...extra });
};

describe('estado proposto = base registrada + eventos confirmados', () => {
  it('so a sede confirmada: endereco novo, e o resto do instrumento como registrado', () => {
    const { estado, pendencias } = compor(['evento_alteracao_endereco']);
    const soc = estado.selecao.sociedade;
    expect(soc).toMatchObject({ sede: 'Rua B, 20, Centro, Cuiaba, MT, CEP 78000-000', sedeLogradouro: 'Rua B', sedeNumero: '20' });
    // Profissao nova NAO entra: a qualificacao publicada permanece.
    expect(estado.itensPorLista.socios).toEqual(base().itensPorLista.socios);
    // Objeto, capital e quadro: os da base. Movimentos pendentes ficam de fora.
    expect(soc.objeto).toBe('Objeto registrado');
    expect(soc.capitalValor).toBe('100,00');
    expect(estado.total).toEqual(base().total);
    expect(estado.itensPorLista.administradores).toEqual(base().itensPorLista.administradores);
    expect(estado.itensPorLista.cessoes).toEqual([]);
    expect(estado.itensPorLista.doacoes).toEqual([]);
    expect(estado.itensPorLista.retirantes).toEqual([]);
    expect(pendencias).toEqual([]);
  });

  it('cessão e doação só liberam as coleções da própria matéria', () => {
    const cessao = compor(['evento_cessao_quotas']).estado.itensPorLista;
    expect(cessao.cessoes).toHaveLength(1);
    expect(cessao.doacoes).toEqual([]);
    expect(cessao.usufrutos).toEqual([]);

    const doacao = compor(['evento_doacao_quotas']).estado.itensPorLista;
    expect(doacao.cessoes).toEqual([]);
    expect(doacao.doacoes).toHaveLength(1);
    expect(doacao.usufrutos).toHaveLength(1);
  });

  it('a peca nova e numerada pelo motor, e a identificacao registral vazia na base e completada', () => {
    const { estado } = compor([]);
    expect(estado.selecao.sociedade).toMatchObject({
      numeroAlteracao: '1', tituloInstrumento: 'PRIMEIRA ALTERACAO', cnpj: '12.345.678/0001-90', nire: '5100000',
    });
    // Sem sede confirmada, a sede e a registrada.
    expect(estado.selecao.sociedade.sede).toBe(base().selecao.sociedade.sede);
  });

  it('identificacao divergente entre base preenchida e cadastro fica na base e vira pendencia', () => {
    const b = base();
    b.selecao.sociedade.cnpj = '11.111.111/0001-11';
    const v = vivo();
    const { estado, pendencias } = comporEstadoProposto({ base: b, vivo: v, eventosConfirmados: new Set(), bindingsSociedade: ['sociedade'] });
    expect(estado.selecao.sociedade.cnpj).toBe('11.111.111/0001-11');
    expect(pendencias.join(' ')).toContain('cnpj');
  });

  it('evento de movimento confirmado: quadro, capital, cessoes e assinaturas vivos, com a qualificacao da base por pessoa', () => {
    const { estado } = compor(['evento_cessao_quotas']);
    expect(estado.selecao.sociedade.capitalValor).toBe('300,00');
    expect(estado.total?.quotas).toBe('300');
    const socios = estado.itensPorLista.socios.map((i) => i.socio as Record<string, string>);
    expect(socios.map((s) => s.id)).toEqual(['p1', 'p2']);
    // p1 ja constava: profissao e qualificacao da BASE; quotas e percentual da lista viva.
    expect(socios[0]).toMatchObject({ profissao: 'Medica', qualificacao: 'Pessoa p1, medica, Rua Velha, 1', quotas: '100', percentual: '33,333%' });
    // p2 ingressa: nao ha antes, entra como esta hoje.
    expect(socios[1]).toMatchObject({ profissao: 'Medica', quotas: '200' });
    expect((estado.itensPorLista.cessoes[0].cedente as Record<string, string>).profissao).toBe('Medica');
    expect(estado.itensPorLista.signatarios).toHaveLength(2);
    // Administracao NAO foi confirmada: a lista e a da base mesmo com o quadro vivo.
    expect(estado.itensPorLista.administradores).toEqual(base().itensPorLista.administradores);
    // E a sede continua a registrada.
    expect(estado.selecao.sociedade.sede).toBe(base().selecao.sociedade.sede);
  });

  it('administracao confirmada sem movimento: administradores e assinaturas vivos, quadro da base', () => {
    const { estado } = compor(['evento_mudanca_administracao']);
    expect((estado.itensPorLista.administradores[0].administrador as Record<string, string>).id).toBe('p2');
    expect(estado.itensPorLista.signatarios).toHaveLength(2);
    expect(estado.itensPorLista.socios).toEqual(base().itensPorLista.socios);
    expect(estado.total).toEqual(base().total);
  });

  it('georref e valores livres sao sempre os de hoje; selecoes multiplas e o vinculo da base ficam', () => {
    const { estado } = compor([]);
    expect(estado.itensPorLista.vertices).toEqual([{ vertice: { nome: 'V1' } }]);
    expect(estado.valoresLivres.observacao).toBe('Texto editado');
    expect(estado.itensPorLista.imoveis).toEqual(base().itensPorLista.imoveis);
    expect(estado.registroPorBinding).toEqual({ sociedade: 'empresa-1' });
    expect(estado.empresaId).toBe('empresa-1');
  });

  it('campo editado a mao na folha desta peca prevalece sobre a base', () => {
    const { estado } = compor([], { camposEditados: new Set(['sociedade.objeto']) });
    expect(estado.selecao.sociedade.objeto).toBe('Objeto novo');
  });

  it('a sede confirmada usa os valores exatos conferidos no candidato, e a base nunca muda', () => {
    const b = base();
    const v = vivo();
    const copia = structuredClone(b);
    const sede = analisarAlteracao(b, v).candidatos.find((c) => c.tipo === 'sede')!;
    // O cadastro mudou de novo depois da conferencia: o estado segue o conferido.
    v.selecao.sociedade.sedeNumero = '999';
    const { estado } = comporEstadoProposto({ base: b, vivo: v, eventosConfirmados: new Set(['evento_alteracao_endereco']), bindingsSociedade: ['sociedade'], sede });
    expect(estado.selecao.sociedade.sedeNumero).toBe('20');
    expect(b).toEqual(copia);
    expect(v.selecao.sociedade.sedeNumero).toBe('999');
  });

  it('binding e lista que a base nao conhecia entram como estao, salvo listas governadas por evento', () => {
    const b = base();
    const v = vivo();
    v.selecao.outorgado = { id: 'p9', tipoPessoa: 'PF', nome: 'Nova' };
    v.itensPorLista.partes = [{ parte: { nome: 'X' } }];
    delete b.itensPorLista.signatarios;
    const { estado } = comporEstadoProposto({ base: b, vivo: v, eventosConfirmados: new Set(), bindingsSociedade: ['sociedade'] });
    expect(estado.selecao.outorgado).toEqual(v.selecao.outorgado);
    expect(estado.itensPorLista.partes).toEqual([{ parte: { nome: 'X' } }]);
    // Assinaturas sao governadas por evento: sem evento e sem base, vazio explicito.
    expect(estado.itensPorLista.signatarios).toEqual([]);
  });

  it('e deterministico e serializavel', () => {
    const a = compor(['evento_alteracao_endereco', 'evento_aumento_capital']);
    const c = compor(['evento_alteracao_endereco', 'evento_aumento_capital']);
    expect(a).toEqual(c);
    expect(JSON.parse(JSON.stringify(a.estado))).toEqual(a.estado);
  });
});

describe('validarSelecaoDeEventos: dependencias entre eventos', () => {
  const movimentos = new Map<string, string[]>([
    ['evento_cessao_quotas', ['c1']],
    ['evento_doacao_quotas', ['d1']],
    ['evento_mudanca_socios', ['c1', 'd1', 'a1']],
    ['evento_aumento_capital', ['a1']],
  ]);
  it('mudanca de socios sem a causa que a produziu e incoerente', () => {
    const erros = validarSelecaoDeEventos(new Set(['evento_mudanca_socios']), movimentos);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain('cessão');
  });
  it('com a cessao (ou o aporte) marcada, fecha', () => {
    expect(validarSelecaoDeEventos(new Set(['evento_mudanca_socios', 'evento_cessao_quotas']), movimentos)).toEqual([]);
    expect(validarSelecaoDeEventos(new Set(['evento_mudanca_socios', 'evento_aumento_capital']), movimentos)).toEqual([]);
    expect(validarSelecaoDeEventos(new Set(['evento_mudanca_socios', 'evento_doacao_quotas']), movimentos)).toEqual([]);
  });
  it('a causa sozinha e legitima: o efeito fica pendente para a proxima peca', () => {
    expect(validarSelecaoDeEventos(new Set(['evento_cessao_quotas']), movimentos)).toEqual([]);
    expect(validarSelecaoDeEventos(new Set(), movimentos)).toEqual([]);
  });
});


describe('estado proposto: endereco de socio aprovado', () => {
  /** O cadastro mudou o endereco de p1 (e a profissao, que ninguem aprovou). */
  function vivoComEndereco(): SnapshotDados {
    const v = vivo();
    const novo = 'Rua Nova, 99';
    for (const item of v.itensPorLista.socios) {
      (item.socio as Record<string, string>).endereco = novo;
    }
    (v.itensPorLista.cessoes[0].cedente as Record<string, string>).endereco = novo;
    return v;
  }

  const comEndereco = (eventos: string[]) => {
    const b = base();
    const v = vivoComEndereco();
    const candidatos = analisarAlteracao(b, v).candidatos;
    return comporEstadoProposto({
      base: b, vivo: v, eventosConfirmados: new Set(eventos), bindingsSociedade: ['sociedade'],
      sede: candidatos.find((c) => c.tipo === 'sede') ?? null,
      enderecosDeSocios: candidatos.filter((c) => c.tipo === 'enderecoSocio' && c.elegivel),
    });
  };

  it('sem o evento, o endereco aprovado nao existe e a lista sai vazia', () => {
    const { estado } = comEndereco(['evento_alteracao_endereco']);
    const socio = estado.itensPorLista.socios[0].socio as Record<string, string>;
    expect(socio.endereco).toBe('Rua Velha, 1');
    expect(estado.itensPorLista.requalificados).toEqual([]);
  });

  it('com o evento, o endereco vence a base — e so ele', () => {
    const { estado } = comEndereco(['evento_alteracao_qualificacao']);
    const socio = estado.itensPorLista.socios[0].socio as Record<string, string>;
    expect(socio.endereco).toBe('Rua Nova, 99');
    // A profissao mudou no cadastro junto, e continua a que foi registrada.
    expect(socio.profissao).toBe('Medica');
    // A prosa derivada acompanha o endereco aprovado, nao o cadastro inteiro.
    expect(socio.qualificacao).toContain('Rua Nova, 99');
    expect(socio.qualificacao).not.toContain('Engenheira');
  });

  it('o endereco entra tambem onde a lista ficou congelada na base', () => {
    // Sem evento de movimento, `administradores` e a lista da base; ainda assim a
    // pessoa nao pode ter dois enderecos dentro da mesma peca.
    const { estado } = comEndereco(['evento_alteracao_qualificacao']);
    const admin = estado.itensPorLista.administradores[0].administrador as Record<string, string>;
    expect(admin.endereco).toBe('Rua Nova, 99');
    expect(admin.cargo).toBe('Administradora');
  });

  it('a lista de requalificados nomeia so quem foi aprovado, com a qualificacao composta', () => {
    const { estado } = comEndereco(['evento_alteracao_qualificacao']);
    expect(estado.itensPorLista.requalificados).toHaveLength(1);
    const item = estado.itensPorLista.requalificados[0] as Record<string, Record<string, string> | string>;
    expect(item.ordem).toBe('1');
    expect(item.ordemRomana).toBe('i');
    const p = item.requalificado as Record<string, string>;
    expect(p.id).toBe('p1');
    expect(p.endereco).toBe('Rua Nova, 99');
    expect(p.profissao).toBe('Medica');
  });

  // O defeito de 09/09/2026, medido no app: preambulo e capital com o endereco
  // novo, clausula de administracao com o antigo. `administradores[].administrador`
  // nao carrega `id` no snapshot real, e a aplicacao exigia id.
  it('alcanca a clausula de administracao, cujo item nao carrega id', () => {
    const b = base();
    const semId = { ...(b.itensPorLista.administradores[0].administrador as Record<string, string>) };
    delete semId.id;
    b.itensPorLista.administradores = [{ administrador: semId }];
    const v = vivo();
    const novo = 'Rua Nova, 99';
    for (const item of v.itensPorLista.socios) (item.socio as Record<string, string>).endereco = novo;
    (v.itensPorLista.cessoes[0].cedente as Record<string, string>).endereco = novo;
    const candidatos = analisarAlteracao(b, v).candidatos;
    const { estado } = comporEstadoProposto({
      base: b, vivo: v, eventosConfirmados: new Set(['evento_alteracao_qualificacao']),
      bindingsSociedade: ['sociedade'], sede: null,
      enderecosDeSocios: candidatos.filter((c) => c.tipo === 'enderecoSocio' && c.elegivel),
    });
    const admin = estado.itensPorLista.administradores[0].administrador as Record<string, string>;
    expect(admin.endereco).toBe(novo);
    expect(admin.qualificacao).toContain(novo);
    // Uma pessoa, uma qualificacao: socio e administrador nao podem divergir.
    expect((estado.itensPorLista.socios[0].socio as Record<string, string>).endereco).toBe(novo);
  });

  it('endereco aprovado convive com a sede confirmada, sem uma escrever na outra', () => {
    const { estado } = comEndereco(['evento_alteracao_endereco', 'evento_alteracao_qualificacao']);
    expect(estado.selecao.sociedade.sedeLogradouro).toBe('Rua B');
    expect((estado.itensPorLista.socios[0].socio as Record<string, string>).endereco).toBe('Rua Nova, 99');
  });

  it('com movimento confirmado, o ingressante entra com a qualificacao de hoje e o aprovado prevalece', () => {
    const { estado } = comEndereco([
      'evento_alteracao_qualificacao', 'evento_cessao_quotas', 'evento_mudanca_socios',
    ]);
    const [p1, p2] = estado.itensPorLista.socios.map((i) => i.socio as Record<string, string>);
    expect(p1.endereco).toBe('Rua Nova, 99');
    expect(p1.profissao).toBe('Medica');
    // p2 nao constava na base: nao ha "antes" a preservar, e nem por isso ele
    // vira requalificado — nao houve alteracao de endereco dele.
    expect(p2.id).toBe('p2');
    expect(estado.itensPorLista.requalificados).toHaveLength(1);
  });
});


// Defeito medido no app em 09/09/2026: o aumento saia
// "R$ 700.000,00 (quinhentos mil reais)" — algarismo novo, extenso do capital
// anterior, duas vezes no documento. `CAMPOS_DE_CAPITAL` listava
// `capitalValorExtenso`, que nao e id de campo nenhum, e nao listava
// `capitalExtenso`, que e o real. Nome fantasma nao falha: so nunca casa.
describe('capital: os campos seguem o movimento, e todos existem', () => {
  it('todo campo de capital existe no vocabulario de sociedade', () => {
    const ids = new Set(camposDaEntidade('sociedade').map((c) => c.id));
    expect(CAMPOS_DE_CAPITAL.filter((k) => !ids.has(k))).toEqual([]);
  });

  it('com evento de movimento, o extenso acompanha o algarismo', () => {
    const { estado } = compor(['evento_aumento_capital']);
    expect(estado.selecao.sociedade.capitalValor).toBe('300,00');
    expect(estado.selecao.sociedade.capitalExtenso).toBe('trezentos reais');
    expect(estado.selecao.sociedade.totalQuotasExtenso).toBe('trezentos');
  });

  it('sem evento de movimento, capital inteiro fica o da base', () => {
    const { estado } = compor(['evento_alteracao_endereco']);
    expect(estado.selecao.sociedade.capitalValor).toBe('100,00');
    expect(estado.selecao.sociedade.capitalExtenso).toBe('cem reais');
  });
});
