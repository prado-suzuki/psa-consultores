import { describe, it, expect } from 'vitest';
import { TIPOS_ENTIDADE, type TipoEntidade } from './vocabulario';
import {
  mapearBem, mapearCartorio, mapearMatricula, mapearPessoa, mapearSociedade, mapearVertice,
  type Campos, type ItemLista,
} from './mapeadores';
import { listasDoInstrumentoRural, mapearInstrumentoRural, type EntradaInstrumentoRural } from './contextoRural';
import { origemDe } from './origem';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { CartorioRow } from '@/hooks/useDiagnosticoPatrimonial';

// O TESTE DA LISTA, não do caso.
//
// A frente que trouxe a proveniência serializada nasceu de sete entidades com
// sete respostas diferentes para a mesma pergunta ("de qual registro isto veio?"):
// duas gravavam um `id` avulso, duas gravavam um Symbol que o JSON descartava, e
// três não gravavam nada. Testar uma entidade de cada vez foi o que deixou isso
// passar por meses — a suíte inteira ficava verde com o snapshot saindo mudo.
//
// Aqui a asserção é sobre o CONJUNTO: toda entidade declarada no vocabulário
// precisa de uma linha nesta tabela, e toda linha precisa provar que a
// identidade sobrevive ao round-trip do jsonb. Declarar uma nona entidade em
// `vocabulario.ts` e esquecer da identidade dela quebra este teste no ato, com o
// nome do tipo na mensagem.

/** O round-trip que o `snapshot_dados` (jsonb) faz com o contexto. */
const peloJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const PESSOA = { id: 'p1', denominacao: 'Ana Tabosa', tipo_pessoa: 'PF', genero: 'F' } as unknown as PessoaRow;
const PJ = { id: 'e1', denominacao: 'Agro Ltda', tipo_pessoa: 'PJ' } as unknown as PessoaRow;

const MATRICULA = {
  id: 'm1', numero: '2.628', livro: null, folha: null,
  municipio_imovel: null, uf_imovel: null, area_documento: null, area_unidade: null,
  vlr_contabil: null, confrontacoes_texto: null, descricao_psa_completa: null,
  bem: null, cartorio: null, titulares: [],
};

const ENTRADA_RURAL: EntradaInstrumentoRural = {
  instrumento: {
    id: 'x1', tipoExploracao: 'parceria', dataAssinatura: '2022-10-11',
    dataEncerramento: null, dataInicioVigencia: null, vigenciaProrrogavel: false,
    percentualOutorgante: null, percentualExplorador: null, culturas: null,
    incluiPecuaria: false, pecuariaModalidades: [], permitePenhor: false,
    prazoIndivisaoQuantidade: null, prazoIndivisaoUnidade: null, indivisaoProrrogavel: null,
    indivisaoAvisoQuantidade: null, indivisaoAvisoUnidade: null, regraAdministracao: null,
    liquidacaoPeriodicidade: null, liquidacaoNumeroParcelas: null,
  },
  outorgante: PJ,
  partes: [{ pessoa: PESSOA, papel: 'explorador', ordem: 1 }],
  imoveis: [{ matricula: MATRICULA, areaExplorada: null, areaUnidade: 'ha', ordem: 1, origemChave: 'o1' }],
  origens: [{ chave: 'o1', tituloInstrumento: 'Contrato de parceria', dataAssinatura: '2020-01-02' }],
};

/** Onde cada entidade do vocabulário grava a identidade, e qual id ela deve gravar. */
const IDENTIDADE_POR_ENTIDADE: Record<TipoEntidade, { id: string; montar: () => unknown }> = {
  pessoa: { id: 'p1', montar: () => mapearPessoa(PESSOA) },
  sociedade: { id: 'e1', montar: () => mapearSociedade(PJ) },
  bem: {
    id: 'b1',
    montar: () => mapearBem({
      id: 'b1', denominacao: 'Fazenda Santa Fé', referencia_dp: 'DP-01', tipo_bem: 'IR',
      vlr_contabil: 1000, ccir_codigo: null, inscricao_municipal: null,
    } as unknown as Parameters<typeof mapearBem>[0]),
  },
  matricula: { id: 'm1', montar: () => mapearMatricula(MATRICULA) },
  cartorio: {
    id: 'c1',
    montar: () => mapearCartorio({
      id: 'c1', nome_completo: '1º Ofício de Cuiabá', comarca: 'Cuiabá', uf: 'MT',
    } as unknown as CartorioRow),
  },
  instrumento: { id: 'x1', montar: () => mapearInstrumentoRural(ENTRADA_RURAL) },
  // O vértice não tem linha de cadastro: vem do SIGEF, e a identidade é o par
  // (memorial, código do vértice) que o identifica em `psa_osg.georef_detalhe`.
  vertice: {
    id: 'g1:MTV-0001',
    montar: () => mapearVertice({
      sequencia: 1, cod_vertice: 'MTV-0001', longitude_dcm: null, latitude_dcm: null,
      altitude_m: null, cod_vante: null, azimute_dcm: null, dist_vante_m: null, confrontacoes: null,
    }, 'g1').vertice,
  },
  // A origem da posse é item da lista do Considerando V; a `chave` dela É o id
  // da linha de origem (ver entradaRural.ts).
  origemPosse: {
    id: 'o1',
    montar: () => (listasDoInstrumentoRural(ENTRADA_RURAL).origensDaPosse[0] as ItemLista).origemPosse,
  },
};

describe('identidade de TODA entidade usada em documento', () => {
  it('toda entidade do vocabulário tem identidade declarada aqui', () => {
    const declaradas = Object.keys(IDENTIDADE_POR_ENTIDADE).sort();
    expect(declaradas).toEqual([...TIPOS_ENTIDADE].sort());
  });

  it.each(TIPOS_ENTIDADE)('%s grava a origem e ela sobrevive ao jsonb', (tipo) => {
    const { id, montar } = IDENTIDADE_POR_ENTIDADE[tipo];
    const campos = montar();
    expect(origemDe(campos), `${tipo} não gravou origem`).toEqual({ tipo, id });
    expect(origemDe(peloJson(campos)), `${tipo} perdeu a origem no jsonb`).toEqual({ tipo, id });
  });

  it.each(TIPOS_ENTIDADE)('%s continua sendo Campos: todo valor publicado é string', (tipo) => {
    const campos = IDENTIDADE_POR_ENTIDADE[tipo].montar() as Campos;
    for (const [chave, valor] of Object.entries(campos)) {
      expect(typeof valor, `${tipo}.${chave} não é string`).toBe('string');
    }
  });
});
