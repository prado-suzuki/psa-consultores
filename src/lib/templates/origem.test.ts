import { describe, it, expect } from 'vitest';
import { comOrigem, copiarOrigemProfunda, origemDe } from './origem';

describe('comOrigem / origemDe', () => {
  it('anexa e lê a origem do objeto', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(origemDe(campos)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('devolve undefined para valores sem origem (objeto, primitivo, null)', () => {
    expect(origemDe({ nome: 'Ana' })).toBeUndefined();
    expect(origemDe('Ana')).toBeUndefined();
    expect(origemDe(null)).toBeUndefined();
    expect(origemDe(undefined)).toBeUndefined();
  });

  it('sobrevive a spread — o caminho de derivarCampos e da edição manual', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    const copia = { ...campos, nome: 'Ana Maria' };
    expect(origemDe(copia)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('fica fora de Object.keys/entries — nunca vira placeholder', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(Object.keys(campos)).toEqual(['nome']);
    expect(Object.entries(campos)).toEqual([['nome', 'Ana']]);
  });

  it('DOCUMENTAL: structuredClone descarta a origem (chave Symbol) — não copiar o contexto por aí', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(origemDe(structuredClone(campos))).toBeUndefined();
  });
});

describe('copiarOrigemProfunda', () => {
  // Vivo: estrutura com origem. Snapshot: a mesma forma sem origem (round-trip
  // por JSON). É o cenário da prévia congelada na tela Gerar.
  const vivo = () => ({
    socios: [
      { socio: comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' }), sePF: true },
      { socio: comOrigem({ nome: 'ACME' }, { tipo: 'pessoa', id: 'p2' }), sePF: false },
    ],
  });

  it('religa a origem perdida no snapshot, casando objeto a objeto e item a item', () => {
    const fonte = vivo();
    const destino = JSON.parse(JSON.stringify(fonte)) as ReturnType<typeof vivo>;
    expect(origemDe(destino.socios[0].socio)).toBeUndefined();

    copiarOrigemProfunda(destino, fonte);

    expect(origemDe(destino.socios[0].socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
    expect(origemDe(destino.socios[1].socio)).toEqual({ tipo: 'pessoa', id: 'p2' });
  });

  it('tolera formas divergentes (cadastro mudou) — copia o que casa e ignora o resto', () => {
    const fonte = vivo();
    const destino = { socios: [JSON.parse(JSON.stringify(fonte.socios[0]))] }; // 1 item só
    expect(() => copiarOrigemProfunda(destino, fonte)).not.toThrow();
    expect(origemDe(destino.socios[0].socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('não entra em laço infinito com referências cíclicas (refItem das integralizações)', () => {
    const fonteItem: Record<string, unknown> = { imovel: comOrigem({ n: '1' }, { tipo: 'matricula', id: 'm1' }) };
    fonteItem.refItem = fonteItem; // ciclo
    const destinoItem: Record<string, unknown> = { imovel: { n: '1' } };
    destinoItem.refItem = destinoItem;

    expect(() => copiarOrigemProfunda(destinoItem, fonteItem)).not.toThrow();
    expect(origemDe(destinoItem.imovel)).toEqual({ tipo: 'matricula', id: 'm1' });
  });
});
