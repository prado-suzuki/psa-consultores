/*
 * A tradução do cadastro do Acordo para o motor (GOV-03, passo 4).
 *
 * O que se prova aqui é o que NENHUM outro teste alcança: que as três colunas do
 * quórum viram a frase do documento, que o uuid do signatário vira a pessoa, e
 * que vínculo órfão não escreve linha em branco no preâmbulo.
 */
import { describe, expect, it } from 'vitest';

import type { AcordoCompleto } from '@/hooks/useDomainAcordoQuotistas';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

import { entradaDoAcordo } from './entradaAcordo';

const pessoa = (id: string, nome: string, genero?: string): PessoaRow => ({
  id, denominacao: nome, tipo_pessoa: 'PF', genero: genero ?? null,
} as PessoaRow);

const CADASTRO = {
  acordo: {
    id: 'ac1',
    cliente_id: 'c1',
    versao: 1,
    assinado_em: '2025-09-29',
    vigencia_anos: 10,
    prazo_sigilo_anos: null,
    reuniao_previa_obrigatoria: true,
    mecanismos: ['preferencia', 'lock_up'],
    metodos_avaliacao: ['patrimonio_liquido'],
    consolida_composse: false,
    nao_concorrencia: true,
    nao_concorrencia_prazo_anos: 3,
    nao_concorrencia_area: 'em todos os estados do Brasil',
    nao_concorrencia_multa: 'R$ 1.000.000,00',
    nao_concorrencia_alcanca_parentes: true,
    opcao_compra_prevista: false,
    opcao_compra_quem: null,
    opcao_compra_preco: null,
    opcao_venda_prevista: false,
    juros_valor_subscrito: 'juros de 1% ao mês',
    solucao_litigios: 'arbitragem',
    camara_arbitral: 'Câmara de Comércio Brasil Canadá',
    regime_nomeacao_arbitros: 'partes',
    representante_pessoa_id: 'p3',
    objetos_preferencia: ['quotas', 'imoveis'],
  },
  quoruns: [
    { materia: 'Alterar o contrato social', tipo: 'percentual', percentual: 75,
      base: 'presentes', ordem: 0 },
    { materia: 'Nomear administrador não sócio', tipo: 'unanimidade', percentual: null,
      base: 'capital', ordem: 1 },
    { materia: 'Aumento de capital', tipo: 'percentual', percentual: 75,
      base: 'capital', ordem: 2 },
  ],
  ramos: [{ nome: 'Cristina', ordem: 0 }],
  ordemPreferencia: [{ quem: 'os descendentes dos SIGNATÁRIOS', ordem: 0 }],
  signatarios: [{ pessoa_id: 'p1' }, { pessoa_id: 'p2' }],
  sociedades: [{ empresa_pessoa_id: 'e1' }],
} as unknown as AcordoCompleto;

const PESSOAS = new Map<string, PessoaRow>([
  ['p1', pessoa('p1', 'CRISTINA BOCOLLI', 'F')],
  ['p2', pessoa('p2', 'REGINA BOCOLLI', 'F')],
  ['p3', pessoa('p3', 'LUIZ MARCELO', 'M')],
  ['e1', pessoa('e1', 'ALIANÇA PARTICIPAÇÕES LTDA.')],
]);

describe('entradaDoAcordo', () => {
  it('sem acordo cadastrado, devolve null em vez de um objeto pela metade', () => {
    // O cliente sem acordo é o caso comum enquanto a GOV-03 está sendo adotada.
    // Objeto meio preenchido faria a tela Gerar oferecer listas que não existem.
    expect(entradaDoAcordo(null, PESSOAS)).toBeNull();
    expect(entradaDoAcordo(undefined, PESSOAS)).toBeNull();
  });

  it('as três colunas do quórum viram a frase que o documento escreve', () => {
    /*
     * O banco guarda `tipo`, `percentual` e `base` em três colunas. O documento
     * escreve uma frase. A montagem usa `expressaoDoQuorum`, a MESMA função da
     * prévia da tela, então o que o consultor lê ao preencher é o que sai no
     * Word — duas montagens divergiriam no dia em que uma mudasse.
     */
    const e = entradaDoAcordo(CADASTRO, PESSOAS)!;
    expect(e.quoruns.map((q) => q.expressao)).toEqual([
      '75% (setenta e cinco por cento) dos presentes',
      'todos os quotistas',
      // Porcentagem quando ela fecha: o modelo escreve "75% (setenta e cinco por
      // cento)", e a fração fica para dois terços, que viraria 66,67%.
      '75% (setenta e cinco por cento) do capital social',
    ]);
    expect(e.quoruns.map((q) => q.materia)).toEqual([
      'Alterar o contrato social', 'Nomear administrador não sócio', 'Aumento de capital',
    ]);
  });

  it('o uuid do vínculo vira a pessoa qualificada', () => {
    const e = entradaDoAcordo(CADASTRO, PESSOAS)!;
    expect(e.signatarios.map((p) => p.denominacao))
      .toEqual(['CRISTINA BOCOLLI', 'REGINA BOCOLLI']);
    expect(e.sociedadesRelacionadas.map((p) => p.denominacao))
      .toEqual(['ALIANÇA PARTICIPAÇÕES LTDA.']);
  });

  it('vínculo cuja pessoa não veio é descartado, e não vira linha em branco', () => {
    // A pessoa pode estar fora da consulta por filtro de RLS. Item sem pessoa
    // escreveria uma linha vazia no meio do preâmbulo do acordo.
    const e = entradaDoAcordo(CADASTRO, new Map([['p1', PESSOAS.get('p1')!]]))!;
    expect(e.signatarios.map((p) => p.denominacao)).toEqual(['CRISTINA BOCOLLI']);
    expect(e.sociedadesRelacionadas).toEqual([]);
  });

  it('o representante traz o nome e o gênero, que é quem decide Sr. ou Sra.', () => {
    const e = entradaDoAcordo(CADASTRO, PESSOAS)!;
    expect(e.acordo.representanteNome).toBe('LUIZ MARCELO');
    expect(e.acordo.representanteGenero).toBe('M');

    const semRepresentante = entradaDoAcordo(
      { ...CADASTRO, acordo: { ...CADASTRO.acordo, representante_pessoa_id: null } },
      PESSOAS,
    )!;
    expect(semRepresentante.acordo.representanteNome).toBeNull();
  });

  it('o cabeçalho chega inteiro, campo a campo', () => {
    // Campo que o tradutor esquecer nunca se preenche, e o documento sai sem a
    // cláusula sem erro nenhum. Esta asserção é a rede contra esquecimento.
    const e = entradaDoAcordo(CADASTRO, PESSOAS)!;
    expect(e.acordo).toMatchObject({
      clienteId: 'c1',
      assinadoEm: '2025-09-29',
      vigenciaAnos: 10,
      reuniaoPreviaObrigatoria: true,
      mecanismos: ['preferencia', 'lock_up'],
      metodosAvaliacao: ['patrimonio_liquido'],
      naoConcorrencia: true,
      naoConcorrenciaPrazoAnos: 3,
      naoConcorrenciaAlcancaParentes: true,
      opcaoCompraPrevista: false,
      solucaoLitigios: 'arbitragem',
      camaraArbitral: 'Câmara de Comércio Brasil Canadá',
      regimeNomeacaoArbitros: 'partes',
    });
    expect(e.objetosPreferencia).toEqual(['quotas', 'imoveis']);
  });
});
