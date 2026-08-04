import { describe, expect, it } from 'vitest';
import {
  alvoDeValor, camposComProcedencia, impedimentoDeVinculo, patchDesfazerTriagem,
  patchVinculo, validarBem, validarMatricula, validarPessoa,
} from './classificarFicha';
import { emptyBemDraft, emptyMatriculaDraft, emptyTitularInicial } from './diagnosticoPatrimonialModalModels';
import { emptyPessoaDraft } from './pessoaModalModel';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

const doc = (categoria: DocumentoArquivoRow['categoria'] = 'pessoais') =>
  ({ id: 'D1', categoria }) as DocumentoArquivoRow;

describe('patchVinculo — 1:1', () => {
  // Vincular a uma entidade nunca pode deixar a marca de triagem para trás: a
  // constraint documento_arquivo_um_dono_apenas (BER-39) recusa os dois juntos.
  it('grava o dono escolhido e zera os outros dois, mais a marca de triagem', () => {
    expect(patchVinculo({ kind: 'pessoa', id: 'P1' })).toEqual({
      pessoa_id: 'P1', bem_id: null, matricula_id: null, triado_em: null,
    });
    expect(patchVinculo({ kind: 'bem', id: 'B1' })).toEqual({
      pessoa_id: null, bem_id: 'B1', matricula_id: null, triado_em: null,
    });
    expect(patchVinculo({ kind: 'matricula', id: 'M1' })).toEqual({
      pessoa_id: null, bem_id: null, matricula_id: 'M1', triado_em: null,
    });
  });

  it('a válvula "é do cliente" grava a marca e zera as três colunas', () => {
    const patch = patchVinculo({ kind: 'cliente' });
    expect(patch.pessoa_id).toBeNull();
    expect(patch.bem_id).toBeNull();
    expect(patch.matricula_id).toBeNull();
    expect(typeof patch.triado_em).toBe('string');
  });

  // Nenhum patch pode sair com marca E dono preenchidos, para nenhum alvo.
  it('nunca produz marca junto com dono', () => {
    const alvos = [
      { kind: 'pessoa', id: 'P1' }, { kind: 'bem', id: 'B1' },
      { kind: 'matricula', id: 'M1' }, { kind: 'cliente' },
    ] as const;
    for (const alvo of alvos) {
      const p = patchVinculo(alvo);
      const preenchidos = [p.pessoa_id, p.bem_id, p.matricula_id, p.triado_em].filter(Boolean);
      expect(preenchidos).toHaveLength(1);
    }
  });
});

describe('patchDesfazerTriagem', () => {
  it('devolve o arquivo ao balde: sem dono e sem marca', () => {
    expect(patchDesfazerTriagem()).toEqual({
      pessoa_id: null, bem_id: null, matricula_id: null, triado_em: null,
    });
  });
});

describe('alvoDeValor', () => {
  it('decodifica o valor do seletor de vínculo', () => {
    expect(alvoDeValor('pessoa:P1')).toEqual({ kind: 'pessoa', id: 'P1' });
    expect(alvoDeValor('matricula:M9')).toEqual({ kind: 'matricula', id: 'M9' });
    expect(alvoDeValor('sem')).toEqual({ kind: 'cliente' });
    expect(alvoDeValor('')).toEqual({ kind: 'cliente' });
  });
});

describe('impedimentoDeVinculo', () => {
  it('exige matrícula para georreferenciamento', () => {
    expect(impedimentoDeVinculo(doc('georreferenciamento'), { kind: 'pessoa', id: 'P1' })).toMatch(/matrícula/i);
    expect(impedimentoDeVinculo(doc('georreferenciamento'), { kind: 'matricula', id: 'M1' })).toBeNull();
  });

  it('não deixa salvar sem arquivo aberto', () => {
    expect(impedimentoDeVinculo(null, { kind: 'pessoa', id: 'P1' })).toMatch(/balde/i);
  });

  it('libera o caso comum', () => {
    expect(impedimentoDeVinculo(doc(), { kind: 'pessoa', id: 'P1' })).toBeNull();
  });
});

describe('validarPessoa', () => {
  it('cobra o nome e valida o tamanho do documento, com os textos dos modais', () => {
    expect(validarPessoa(emptyPessoaDraft())).toBe('Nome completo é obrigatório');
    expect(validarPessoa({ ...emptyPessoaDraft(), tipo_pessoa: 'PJ' })).toBe('Razão social é obrigatória');
    expect(validarPessoa({ ...emptyPessoaDraft(), denominacao: 'Maria', cpf_cnpj: '123' }))
      .toBe('CPF deve ter 11 dígitos');
    expect(validarPessoa({ ...emptyPessoaDraft(), tipo_pessoa: 'PJ', denominacao: 'ACME', cpf_cnpj: '123' }))
      .toBe('CNPJ deve ter 14 dígitos');
    expect(validarPessoa({ ...emptyPessoaDraft(), denominacao: 'Maria', cpf_cnpj: '428.917.360-05' })).toBeNull();
  });
});

describe('validarBem', () => {
  const base = { ...emptyBemDraft(), referencia_dp: 'IR-01', denominacao: 'Fazenda' };

  it('imóvel não pede valor contábil nem titular (os titulares vivem na matrícula)', () => {
    expect(validarBem({ ...base, tipo_bem: 'IR' }, emptyTitularInicial())).toBeNull();
  });

  it('bem sem matrícula pede valor contábil e titular inicial', () => {
    const movel = { ...base, tipo_bem: 'AP' as const };
    expect(validarBem(movel, emptyTitularInicial())).toBe('Valor contábil é obrigatório');
    expect(validarBem({ ...movel, vlr_contabil: '1000' }, emptyTitularInicial()))
      .toBe('Selecione o titular inicial do bem');
    expect(validarBem({ ...movel, vlr_contabil: '1000' }, { ...emptyTitularInicial(), titular_pessoa_id: 'P1' }))
      .toBeNull();
  });

  it('recusa fração fora de 0–100', () => {
    const titular = { ...emptyTitularInicial(), titular_pessoa_id: 'P1', fracao: '120' };
    expect(validarBem({ ...base, tipo_bem: 'AP', vlr_contabil: '1' }, titular))
      .toBe('Fração do titular deve estar entre 0 e 100');
  });
});

describe('validarMatricula', () => {
  const cheia = {
    ...emptyMatriculaDraft(),
    numero: '18442',
    cartorio_id: 'CT1',
    municipio_imovel: 'Sinop',
    uf_imovel: 'MT',
    area_documento: '120',
  };
  const titular = { ...emptyTitularInicial(), titular_pessoa_id: 'P1' };

  it('exige o imóvel antes de tudo', () => {
    expect(validarMatricula(cheia, titular, '')).toMatch(/imóvel/i);
  });

  it('cobra os campos obrigatórios do modal', () => {
    expect(validarMatricula(emptyMatriculaDraft(), titular, 'B1')).toBe('Número da matrícula é obrigatório');
    expect(validarMatricula({ ...cheia, cartorio_id: '' }, titular, 'B1')).toBe('Selecione o cartório');
    expect(validarMatricula({ ...cheia, area_documento: '' }, titular, 'B1'))
      .toBe('Área do documento é obrigatória');
  });

  it('exige titular inicial', () => {
    expect(validarMatricula(cheia, emptyTitularInicial(), 'B1')).toBe('Selecione o titular inicial da matrícula');
    expect(validarMatricula(cheia, titular, 'B1')).toBeNull();
  });
});

describe('camposComProcedencia', () => {
  it('lista só o que foi preenchido nesta sessão, com o rótulo do campo', () => {
    const inicial = emptyPessoaDraft();
    const atual = { ...inicial, denominacao: 'Maria', cpf_cnpj: '428.917.360-05' };
    expect(camposComProcedencia(inicial, atual, { denominacao: 'Nome', cpf_cnpj: 'CPF/CNPJ', profissao: 'Profissão' }))
      .toEqual(['Nome', 'CPF/CNPJ']); // segue a ordem do mapa de rótulos
  });

  it('campo apagado não conta como procedência', () => {
    const inicial = { ...emptyPessoaDraft(), denominacao: 'Maria' };
    const atual = { ...inicial, denominacao: '' };
    expect(camposComProcedencia(inicial, atual, { denominacao: 'Nome' })).toEqual([]);
  });
});
