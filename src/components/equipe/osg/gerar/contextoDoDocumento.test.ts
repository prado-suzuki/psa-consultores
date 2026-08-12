import { describe, expect, it } from 'vitest';
import { origemDe } from '@/lib/templates';
import type { ItemLista } from '@/lib/templates/mapeadores';
import {
  camposComGeoref,
  completarListasDoSnapshot,
  selecaoComOrigemDoSnapshot,
} from '@/components/equipe/osg/gerar/contextoDoDocumento';

const signatario = (nome: string): ItemLista => ({ signatario: { nome, papel: 'Sócio' } });
const vertice = (cod: string): ItemLista => ({ vertice: { codVertice: cod } });

describe('completarListasDoSnapshot — a folha de assinaturas do documento já selado', () => {
  // O defeito real: documento validado ANTES de `signatarios` existir tem o
  // itensPorLista congelado sem a chave. Lista ausente vira laço vazio, o motor
  // descarta o bloco inteiro (regra de bloco sem dado) e a folha reabre sem
  // NENHUMA linha de assinatura, calada.
  it('a chave AUSENTE cai para a fonte viva', () => {
    const snapshot: Record<string, ItemLista[]> = { socios: [], vertices: [] };
    const vivas = { signatarios: [signatario('Camila'), signatario('José Eduardo')], vertices: [] };

    const efetivo = completarListasDoSnapshot(snapshot, vivas);

    expect(efetivo.signatarios).toHaveLength(2);
    expect(efetivo.signatarios[0]).toBe(vivas.signatarios[0]);
    // Sem mutar o snapshot: ele é o retrato do que foi selado.
    expect(snapshot.signatarios).toBeUndefined();
  });

  it('a lista de signatários VAZIA é preservada — congelar significa congelar', () => {
    const snapshot: Record<string, ItemLista[]> = { signatarios: [], vertices: [vertice('V-01')] };
    const efetivo = completarListasDoSnapshot(snapshot, { signatarios: [signatario('Camila')] });

    expect(efetivo.signatarios).toEqual([]);
    expect(efetivo).toBe(snapshot);
  });

  it('vértices recarregam também quando a lista veio vazia: georref não é dado congelável', () => {
    const efetivo = completarListasDoSnapshot(
      { signatarios: [signatario('Camila')], vertices: [] },
      { vertices: [vertice('V-01')] },
    );
    expect(efetivo.vertices).toHaveLength(1);
  });

  it('devolve o MESMO objeto quando não há nada a completar (a identidade é usada depois)', () => {
    const snapshot = { signatarios: [signatario('Camila')], vertices: [vertice('V-01')] };
    expect(completarListasDoSnapshot(snapshot, {})).toBe(snapshot);
  });

  it('sem fonte viva, a chave ausente vira lista vazia em vez de sumir', () => {
    const efetivo = completarListasDoSnapshot({}, {});
    expect(efetivo.signatarios).toEqual([]);
    expect(efetivo.vertices).toEqual([]);
  });
});

describe('selecaoComOrigemDoSnapshot', () => {
  const bindings = [
    { nome: 'sociedade', tipo: 'sociedade' as const, cardinalidade: 'um' as const },
    { nome: 'imovel', tipo: 'matricula' as const, cardinalidade: 'um' as const },
    { nome: 'orfao', tipo: 'pessoa' as const, cardinalidade: 'um' as const },
  ];

  it('religa a origem de cada binding pela id guardada no snapshot', () => {
    const out = selecaoComOrigemDoSnapshot(
      { sociedade: { razaoSocial: 'Acme' }, imovel: { numero: '9.617' }, orfao: { nome: 'X' } },
      bindings,
      { imovel: 'mat-1' },
      'empresa-1',
    );

    expect(origemDe(out.sociedade)).toEqual({ tipo: 'sociedade', id: 'empresa-1' });
    expect(origemDe(out.imovel)).toEqual({ tipo: 'matricula', id: 'mat-1' });
    // Sem id no snapshot não há o que religar — o valor sai sem origem, e não com uma inventada.
    expect(origemDe(out.orfao)).toBeUndefined();
  });

  it('não carimba a origem no objeto do snapshot (copia antes)', () => {
    const campos = { razaoSocial: 'Acme' };
    const out = selecaoComOrigemDoSnapshot({ sociedade: campos }, bindings, {}, 'empresa-1');
    expect(out.sociedade).not.toBe(campos);
    expect(out.sociedade.razaoSocial).toBe('Acme');
    expect(origemDe(campos)).toBeUndefined();
  });
});

describe('camposComGeoref', () => {
  it('publica os campos georef* como "" — chave ausente derruba o render, "" resolve', () => {
    const campos = camposComGeoref({ numero: '9.617' }, {});
    expect(campos.georefArea).toBe('');
    expect(campos.georefPerimetro).toBe('');
    expect(campos.numero).toBe('9.617');
  });

  it('o cabeçalho vivo entra por cima QUANDO TEM VALOR (cobre o snapshot antigo)', () => {
    const campos = camposComGeoref(
      { georefArea: '284,8610', georefSistema: 'SIRGAS2000' },
      { georefArea: '285,0000', georefSistema: '' },
    );
    expect(campos.georefArea).toBe('285,0000');
    // Vivo vazio não apaga o que o snapshot trouxe.
    expect(campos.georefSistema).toBe('SIRGAS2000');
  });
});
