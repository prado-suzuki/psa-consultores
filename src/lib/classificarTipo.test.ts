import { describe, expect, it } from 'vitest';
import {
  destinoDoAlvo, destinoDoNovo, tiposParaDestino, tiposPedidos, type ItemPedido,
} from './classificarTipo';
import type { ChecklistPadraoRow } from '@/hooks/useOsgChecklist';
import type { NovoCadastro } from './classificarFicha';

const tipo = (
  id: string,
  documento: string,
  granularidade: ChecklistPadraoRow['granularidade'],
  extra: Partial<ChecklistPadraoRow> = {},
): ChecklistPadraoRow =>
  ({
    id,
    documento,
    granularidade,
    entidade: 'Pessoa Física',
    ordem: 1,
    ativo: true,
    ...extra,
  }) as ChecklistPadraoRow;

const CATALOGO: ChecklistPadraoRow[] = [
  tipo('T-RG', 'RG / CNH', 'pessoa_pf', { ordem: 4 }),
  tipo('T-CPF', 'CPF', 'pessoa_pf', { ordem: 2 }),
  tipo('T-CNPJ', 'CNPJ', 'pessoa_pj', { entidade: 'Pessoa Jurídica', ordem: 15 }),
  tipo('T-MAT-R', 'Matrícula do imóvel (inteiro teor)', 'matricula_rural', {
    entidade: 'Matrícula (Imóvel Rural)', ordem: 28,
  }),
  tipo('T-MAT-U', 'Matrícula do imóvel (inteiro teor)', 'matricula_urbana', {
    entidade: 'Matrícula (Imóvel Urbano)', ordem: 35,
  }),
  tipo('T-IPTU', 'IPTU / Inscrição Municipal', 'matricula_urbana', {
    entidade: 'Matrícula (Imóvel Urbano)', ordem: 34,
  }),
  tipo('T-AREAS', 'Relação de áreas exploradas por imóvel', 'cliente', { entidade: 'Bem', ordem: 38 }),
  tipo('T-VELHO', 'Documento aposentado', 'pessoa_pf', { ordem: 1, ativo: false }),
];

describe('tiposParaDestino — o recorte que evita a lista de 67', () => {
  it('traz só a granularidade do destino, na ordem do catálogo', () => {
    const { tipos, semRecorte } = tiposParaDestino(CATALOGO, 'PF');
    expect(tipos.map((t) => t.id)).toEqual(['T-CPF', 'T-RG']);
    expect(semRecorte).toBe(false);
  });

  it('ignora tipo aposentado', () => {
    expect(tiposParaDestino(CATALOGO, 'PF').tipos.map((t) => t.id)).not.toContain('T-VELHO');
  });

  it('matrícula junta rural e urbana, porque a espécie ainda não se sabe', () => {
    const { tipos } = tiposParaDestino(CATALOGO, 'matricula');
    expect(tipos.map((t) => t.id)).toEqual(['T-MAT-R', 'T-IPTU', 'T-MAT-U']);
  });

  // Duas opções com o mesmo texto seriam impossíveis de escolher, e acontece de
  // verdade: "Matrícula do imóvel (inteiro teor)" existe na rural e na urbana.
  it('desambigua pela entidade só o nome que se repete no recorte', () => {
    const rotulos = tiposParaDestino(CATALOGO, 'matricula').tipos.map((t) => t.rotulo);
    expect(rotulos).toContain('Matrícula do imóvel (inteiro teor) (Matrícula (Imóvel Rural))');
    expect(rotulos).toContain('Matrícula do imóvel (inteiro teor) (Matrícula (Imóvel Urbano))');
    // o que não repete fica com o nome limpo
    expect(rotulos).toContain('IPTU / Inscrição Municipal');
  });

  // O catálogo real não tem nenhuma linha com granularidade 'bem': os 13
  // documentos de bem do seed foram cadastrados como 'cliente'. O recorte vazio
  // não pode virar uma lista vazia na tela.
  it('recorte vazio cai no catálogo inteiro e avisa', () => {
    const { tipos, semRecorte } = tiposParaDestino(CATALOGO, 'bem');
    expect(semRecorte).toBe(true);
    expect(tipos).toHaveLength(7);
  });

  it('o "ver todos" ignora o recorte sem se declarar vazio', () => {
    const { tipos, semRecorte } = tiposParaDestino(CATALOGO, 'PF', true);
    expect(semRecorte).toBe(false);
    expect(tipos.map((t) => t.id)).toContain('T-CNPJ');
  });
});

describe('tiposPedidos — o recorte pela solicitação', () => {
  const pedido = (extra: Partial<ItemPedido> = {}): ItemPedido => ({
    id: 'i1',
    itemPadraoId: 'T-CPF',
    granularidade: 'pessoa_pf',
    status: 'ativo',
    documento: 'CPF',
    entidade: 'Pessoa Física',
    ordem: 2,
    ...extra,
  });

  const ITENS: ItemPedido[] = [
    pedido({ id: 'i2', itemPadraoId: 'T-RG', documento: 'RG / CNH', ordem: 4 }),
    pedido(),
    pedido({ id: 'i3', itemPadraoId: 'T-CNPJ', granularidade: 'pessoa_pj', documento: 'CNPJ' }),
    pedido({ id: 'i4', itemPadraoId: 'T-DIRPF', status: 'dispensado', documento: 'DIRPF' }),
    pedido({ id: 'avulso-1', itemPadraoId: null, documento: 'Escritura da Fazenda', ordem: 9 }),
  ];
  const AVULSOS = { 'avulso-1': 'T-AVULSO' };

  it('traz só o que foi pedido para o grão do destino, na ordem do pedido', () => {
    expect(tiposPedidos(ITENS, AVULSOS, 'PF').map((t) => t.id))
      .toEqual(['T-CPF', 'T-RG', 'T-AVULSO']);
  });

  // Dispensado é o analista dizendo que não é mais esperado.
  it('item dispensado não vira opção', () => {
    expect(tiposPedidos(ITENS, AVULSOS, 'PF').map((t) => t.id)).not.toContain('T-DIRPF');
  });

  // O avulso está fora do catálogo por construção; a solicitação é o caminho.
  it('resolve o item manual pelo tipo avulso', () => {
    const avulso = tiposPedidos(ITENS, AVULSOS, 'PF').find((t) => t.id === 'T-AVULSO');
    expect(avulso?.rotulo).toBe('Escritura da Fazenda');
  });

  // Sem id não há o que gravar: opção quebrada é pior que opção ausente.
  it('pula o item manual sem tipo avulso', () => {
    expect(tiposPedidos(ITENS, {}, 'PF').map((t) => t.id)).toEqual(['T-CPF', 'T-RG']);
  });

  it('grão sem nada pedido devolve lista vazia, para o chamador cair no catálogo', () => {
    expect(tiposPedidos(ITENS, AVULSOS, 'matricula')).toEqual([]);
  });
});

describe('destino da leva', () => {
  const pessoas = [{ id: 'P1', tipo: 'PF' }, { id: 'E1', tipo: 'PJ' }];

  it('sai do cadastro apontado quando o vínculo é a quem já existe', () => {
    expect(destinoDoAlvo({ kind: 'pessoa', id: 'E1' }, pessoas)).toBe('PJ');
    expect(destinoDoAlvo({ kind: 'pessoa', id: 'P1' }, pessoas)).toBe('PF');
    expect(destinoDoAlvo({ kind: 'bem', id: 'B1' }, pessoas)).toBe('bem');
    expect(destinoDoAlvo({ kind: 'matricula', id: 'M1' }, pessoas)).toBe('matricula');
    expect(destinoDoAlvo({ kind: 'cliente' }, pessoas)).toBe('cliente');
  });

  // Pessoa desconhecida na lista cai em PF em vez de quebrar: o recorte é
  // conveniência, e o modal tem o "ver todos" como saída.
  it('pessoa fora da lista cai em PF', () => {
    expect(destinoDoAlvo({ kind: 'pessoa', id: 'FANTASMA' }, pessoas)).toBe('PF');
  });

  it('sai do rascunho quando o cadastro é novo', () => {
    const pf = { tipo: 'pessoa', values: { tipo_pessoa: 'PF' } } as NovoCadastro;
    const pj = { tipo: 'pessoa', values: { tipo_pessoa: 'PJ' } } as NovoCadastro;
    expect(destinoDoNovo(pf)).toBe('PF');
    expect(destinoDoNovo(pj)).toBe('PJ');
    expect(destinoDoNovo({ tipo: 'bem', values: {} } as NovoCadastro)).toBe('bem');
    expect(destinoDoNovo({ tipo: 'matricula', values: {} } as NovoCadastro)).toBe('matricula');
  });
});
