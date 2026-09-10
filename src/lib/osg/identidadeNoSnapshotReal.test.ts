import { describe, expect, it } from 'vitest';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import { analisarAlteracao, confirmarPropostaAC } from '@/lib/osg/alteracaoPorEventos';
import {
  mapearAdministrador, mapearCartorio, mapearQuadroSocietario, mapearSociedade,
  type SocioParaMapear,
} from '@/lib/templates/mapeadores';
import { mapearSignatarios } from '@/lib/templates/signatarios';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { CartorioRow } from '@/hooks/useDiagnosticoPatrimonial';

// O SNAPSHOT REAL, e não uma fixture sintética.
//
// A lição que custou esta frente: a suíte inteira ficou verde enquanto o
// documento saía errado, porque as fixtures de `alteracaoPorEventos.test.ts` dão
// `id` a todo mundo à mão e o snapshot que o app grava não dava. Aqui o snapshot
// é montado pelos MAPEADORES DE VERDADE e passa pelo round-trip do jsonb, que é
// o caminho exato de `snapshotParaSelar` → `documento_gerado.snapshot_dados`.
//
// A pergunta é uma: com o cadastro INTOCADO, a comparação acusa alguma coisa?

const ANA = {
  id: 'pessoa-ana', denominacao: 'Ana Tabosa', tipo_pessoa: 'PF', genero: 'F',
  cpf_cnpj: '307.448.200-14', profissao: 'Tabelia', estado_civil: 'solteira',
  endereco_logradouro: 'Rua Barao de Melgaco', endereco_numero: '1200',
  endereco_bairro: 'Centro Sul', endereco_municipio: 'Cuiaba', endereco_uf: 'MT',
  endereco_cep: '78020-800',
} as unknown as PessoaRow;

const EMPRESA = {
  id: 'empresa-1', denominacao: 'Cofre Subterraneo Ltda', tipo_pessoa: 'PJ',
  cpf_cnpj: '66.331.122/0001-79', nire: '51900000789', junta_comercial_uf: 'MT',
  endereco_logradouro: 'Avenida Central', endereco_numero: '10', endereco_complemento: '',
  endereco_bairro: 'Centro', endereco_municipio: 'Cuiaba', endereco_uf: 'MT',
  endereco_cep: '78000-000',
} as unknown as PessoaRow;

const CARTORIO = {
  id: 'cartorio-1', nome_completo: '1o Oficio de Registro de Imoveis de Cuiaba',
  comarca: 'Cuiaba', uf: 'MT',
} as unknown as CartorioRow;

/**
 * O que `snapshotParaSelar` grava, montado pelos mapeadores e serializado como
 * jsonb. Recebe a linha da pessoa para que "mudar o cadastro" no teste seja o
 * que é no app: a MESMA pessoa remapeada em todos os papéis, e não um campo
 * editado à mão em uma ocorrência (o que produziria uma peça internamente
 * incoerente, que é outro defeito e tem outro aviso).
 */
function snapshotDoApp(pessoa: PessoaRow = ANA): SnapshotDados {
  const socios: SocioParaMapear[] = [
    { pessoa, quotas: 500000, vlr_total: 500000, representante: null },
  ];
  const snap: SnapshotDados = {
    empresaId: EMPRESA.id,
    selecao: {
      sociedade: mapearSociedade(EMPRESA, { capitalValor: 1000000, totalQuotas: 1000000 }),
      // O CARTÓRIO é o caso que fazia a pendência aparecer em toda peça que o
      // cita: ele publica `nome`, então caía na comparação de qualificação de
      // pessoa, e sem identidade cobrava "sem id estavel".
      cartorio: mapearCartorio(CARTORIO),
    },
    registroPorBinding: { sociedade: EMPRESA.id, cartorio: CARTORIO.id },
    registrosPorLista: {},
    valoresLivres: {},
    itensPorLista: {
      socios: mapearQuadroSocietario(socios).itens,
      administradores: [mapearAdministrador({ pessoa, cargo: null })],
      signatarios: mapearSignatarios({ socios }),
    },
    total: { quotas: '500.000', vlrTotal: '500.000,00', percentual: '100' },
  };
  // O round-trip do jsonb: é aqui que a proveniência por Symbol morria.
  return JSON.parse(JSON.stringify(snap)) as SnapshotDados;
}

describe('o aviso "sem id estavel" no snapshot que o app realmente grava', () => {
  it('cadastro intocado nao acusa nada: nem pendencia, nem candidato', () => {
    const base = snapshotDoApp();
    const atual = snapshotDoApp();
    const { candidatos, pendencias } = analisarAlteracao(base, atual);
    expect(pendencias).toEqual([]);
    expect(candidatos).toEqual([]);
  });

  it('o cartorio nao vira candidato de qualificacao, mesmo publicando `nome`', () => {
    const base = snapshotDoApp();
    const atual = snapshotDoApp();
    // A serventia foi renomeada no cadastro. Isso nao e qualificacao de parte.
    (atual.selecao.cartorio as Record<string, string>).nome = '2o Oficio de Registro de Imoveis de Cuiaba';
    const { candidatos, pendencias } = analisarAlteracao(base, atual);
    expect(candidatos).toEqual([]);
    expect(pendencias.join(' ')).not.toContain('cartorio-1');
    expect(pendencias.join(' ')).not.toContain('sem id estavel');
  });

  it('o endereco do socio continua sendo detectado (o aviso sumiu, a deteccao nao)', () => {
    const base = snapshotDoApp();
    const mudou = { ...ANA, endereco_logradouro: 'Rua Nova', endereco_numero: '99' } as PessoaRow;
    const { candidatos, pendencias } = analisarAlteracao(base, snapshotDoApp(mudou));
    expect(pendencias).toEqual([]);
    expect(candidatos.map((c) => c.id)).toEqual(['enderecoSocio:pessoa-ana']);
    expect(candidatos[0].elegivel).toBe(true);
  });

  // Em peça NOVA o endereço aprovado chega a todos os papéis PELO ID, sem
  // precisar do casamento por CPF que o acervo ainda exige (ver
  // `aplicarEnderecosDeSocios`): aqui o administrador nem CPF tem.
  it('o endereco aprovado alcanca a administracao pelo id, sem depender do CPF', () => {
    const base = snapshotDoApp();
    const admin = base.itensPorLista.administradores[0].administrador as Record<string, string>;
    delete admin.cpfCnpj;
    const mudou = { ...ANA, endereco_logradouro: 'Rua Nova', endereco_numero: '99' } as PessoaRow;
    const atual = snapshotDoApp(mudou);
    delete (atual.itensPorLista.administradores[0].administrador as Record<string, string>).cpfCnpj;

    const { estadoProposto } = confirmarPropostaAC({
      baseDocumentoId: 'documento-1', base, atual,
      selecionados: ['enderecoSocio:pessoa-ana'],
      causaSede: 'mudanca_fisica', causaQualificacao: 'mudanca_de_domicilio',
      confirmadoEm: '2026-09-10T15:00:00Z',
    });
    const aplicado = estadoProposto.itensPorLista.administradores[0].administrador as Record<string, string>;
    expect(aplicado.endereco).toContain('Rua Nova');
    expect(aplicado.qualificacao).toContain('Rua Nova');
  });

  // O aviso continua verdadeiro quando é verdade: peca do ACERVO, gravada antes
  // desta frente, em que o administrador nao carrega identidade nenhuma.
  it('ocorrencia realmente sem identidade continua avisando', () => {
    const base = snapshotDoApp();
    const semIdentidade = { ...(base.itensPorLista.administradores[0].administrador as Record<string, string>) };
    delete semIdentidade.__motorOrigemTipo;
    delete semIdentidade.__motorOrigemId;
    base.itensPorLista.administradores = [{ administrador: semIdentidade }];
    const atual = snapshotDoApp();
    const { pendencias } = analisarAlteracao(base, atual);
    expect(pendencias.join(' ')).toContain('sem id estavel');
    expect(pendencias.join(' ')).toContain('"Ana Tabosa"');
    expect(pendencias.join(' ')).toContain('na lista "administradores"');
  });
});
