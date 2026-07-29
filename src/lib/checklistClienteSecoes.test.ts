import { describe, expect, it } from 'vitest';
import {
  filtrarSecoes,
  montarSecoes,
  ordemEntidade,
} from '@/lib/checklistClienteSecoes';
import type { ChecklistSolicitadoItem } from '@/hooks/useDocumentoArquivo';

const item = (
  documento: string,
  entidade: string,
  rotulo: string | null,
  recebido = false,
): ChecklistSolicitadoItem => ({
  item_id: `${entidade}:${rotulo ?? 'geral'}:${documento}`,
  documento,
  entidade,
  categoria: 'pessoais',
  categoria_docbox: 'Documentos Pessoais',
  nota: null,
  confidencial: false,
  rotulo_instancia: rotulo,
  recebido,
  arquivo_nome: null,
});

describe('ordemEntidade', () => {
  it('mantém a ordem fixa e joga entidade desconhecida para o fim', () => {
    expect(ordemEntidade('Pessoa Física')).toBeLessThan(ordemEntidade('Pessoa Jurídica'));
    expect(ordemEntidade('Bem')).toBeLessThan(ordemEntidade('Outros'));
    expect(ordemEntidade('Outros')).toBe(99);
  });
});

describe('montarSecoes', () => {
  it('agrupa por entidade e por instância', () => {
    const secoes = montarSecoes([
      item('CPF', 'Pessoa Física', 'Camila'),
      item('RG', 'Pessoa Física', 'Camila'),
      item('CNPJ', 'Pessoa Jurídica', 'MMS Agro'),
    ]);

    expect(secoes.map((s) => s.entidade)).toEqual(['Pessoa Física', 'Pessoa Jurídica']);
    expect(secoes[0].cards).toHaveLength(1);
    expect(secoes[0].cards[0].nome).toBe('Camila');
    expect(secoes[0].cards[0].total).toBe(2);
  });

  it('ordena as seções pela ordem fixa, não pela ordem de chegada', () => {
    const secoes = montarSecoes([
      item('Bem qualquer', 'Bem', 'Trator'),
      item('CPF', 'Pessoa Física', 'Camila'),
      item('Matrícula', 'Matrícula (Imóvel Rural)', 'Fazenda Tarumã'),
    ]);

    expect(secoes.map((s) => s.entidade)).toEqual([
      'Pessoa Física',
      'Matrícula (Imóvel Rural)',
      'Bem',
    ]);
  });

  it('coloca os cards menos preenchidos primeiro', () => {
    const secoes = montarSecoes([
      item('CPF', 'Pessoa Física', 'Quase pronto', true),
      item('RG', 'Pessoa Física', 'Quase pronto', true),
      item('CPF', 'Pessoa Física', 'Nada enviado'),
      item('RG', 'Pessoa Física', 'Nada enviado'),
    ]);

    expect(secoes[0].cards.map((c) => c.nome)).toEqual(['Nada enviado', 'Quase pronto']);
    expect(secoes[0].cards[0].recebidos).toBe(0);
    expect(secoes[0].cards[1].recebidos).toBe(2);
  });

  it('dentro do card, pendentes vêm antes dos recebidos', () => {
    const secoes = montarSecoes([
      item('AAA recebido', 'Pessoa Física', 'Camila', true),
      item('ZZZ pendente', 'Pessoa Física', 'Camila'),
    ]);

    expect(secoes[0].cards[0].itens.map((i) => i.documento)).toEqual([
      'ZZZ pendente',
      'AAA recebido',
    ]);
  });

  it('itens sem instância formam um card geral da entidade', () => {
    const secoes = montarSecoes([item('Contrato social', 'Pessoa Jurídica', null)]);

    expect(secoes[0].cards[0].chave).toBe('Pessoa Jurídica::geral');
    expect(secoes[0].cards[0].nome).toBe('Pessoa Jurídica');
  });

  it('entidade em branco cai em Outros', () => {
    const secoes = montarSecoes([item('Documento solto', '', null)]);

    expect(secoes[0].entidade).toBe('Outros');
  });
});

describe('filtrarSecoes', () => {
  const secoes = montarSecoes([
    item('CPF', 'Pessoa Física', 'Camila Malheiros'),
    item('CNPJ', 'Pessoa Jurídica', 'MMS Agro'),
  ]);

  it('sem termo devolve tudo', () => {
    expect(filtrarSecoes(secoes, '   ')).toEqual(secoes);
  });

  it('acha pelo nome da instância, ignorando caixa', () => {
    const r = filtrarSecoes(secoes, 'camila');
    expect(r).toHaveLength(1);
    expect(r[0].cards[0].nome).toBe('Camila Malheiros');
  });

  it('acha pelo nome do documento', () => {
    const r = filtrarSecoes(secoes, 'cnpj');
    expect(r).toHaveLength(1);
    expect(r[0].entidade).toBe('Pessoa Jurídica');
  });

  it('descarta seções sem card correspondente', () => {
    expect(filtrarSecoes(secoes, 'nada que exista')).toEqual([]);
  });
});
