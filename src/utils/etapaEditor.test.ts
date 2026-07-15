// Regressão dos pontos do feedback da Patrícia no editor de etapas:
//  B1 — item cadastrado inline entra JÁ selecionado (inserirVinculoCriado)
//  B2 — cluster do processo tem precedência no cadastro inline (clusterInicial)
//  B3 — nome de etapa é obrigatório (primeiraEtapaSemNome)

import { describe, it, expect } from 'vitest';
import { cleanEtapaName, primeiraEtapaSemNome, inserirVinculoCriado, clusterInicial } from './etapaEditor';
import type { DocRef, ResponsavelEtapa } from '@/types';

describe('cleanEtapaName', () => {
  it('remove o prefixo "Etapa N:" (ruído de import)', () => {
    expect(cleanEtapaName('Etapa 1: Coleta')).toBe('Coleta');
    expect(cleanEtapaName('Etapa 12 : Registrar')).toBe('Registrar');
  });
  it('deixa nomes normais intactos', () => {
    expect(cleanEtapaName('Coleta')).toBe('Coleta');
  });
});

describe('primeiraEtapaSemNome (B3)', () => {
  it('acha a 1ª etapa sem nome', () => {
    expect(primeiraEtapaSemNome([{ name: 'A' }, { name: '' }, { name: 'B' }])).toBe(1);
  });
  it('trata só-espaços e só-prefixo como SEM nome', () => {
    expect(primeiraEtapaSemNome([{ name: '   ' }])).toBe(0);
    expect(primeiraEtapaSemNome([{ name: 'Etapa 3:' }])).toBe(0); // limpa p/ vazio
  });
  it('retorna -1 quando todas têm nome', () => {
    expect(primeiraEtapaSemNome([{ name: 'A' }, { name: 'B' }])).toBe(-1);
  });
});

describe('inserirVinculoCriado (B1)', () => {
  it('documento: PREENCHE a 1ª entrada vazia (a do "Adicionar"), preservando o volume', () => {
    const r = inserirVinculoCriado([{ nome: '', volume: 3 }], 'docsEntrada', 'Matrícula', 'D1');
    expect(r).toHaveLength(1);
    const d = r[0] as DocRef;
    expect(d.nome).toBe('Matrícula');
    expect(d.documentoId).toBe('D1');
    expect(d.volume).toBe(3); // preserva o volume que já estava na linha
  });

  it('documento: ANEXA quando não há entrada vazia (atalho "+ Cadastrar novo")', () => {
    const r = inserirVinculoCriado([{ nome: 'Contrato', volume: 2 }], 'docsSaida', 'Ata', 'D2');
    expect(r).toHaveLength(2);
    const d = r[1] as DocRef;
    expect(d.nome).toBe('Ata');
    expect(d.documentoId).toBe('D2');
    expect(d.volume).toBe(0);
  });

  it('sistema: preenche a string vazia / anexa (o campo é string[])', () => {
    expect(inserirVinculoCriado([''], 'sistemas', 'SPED', 'S1')).toEqual(['SPED']);
    expect(inserirVinculoCriado(['Excel'], 'sistemas', 'SPED', 'S1')).toEqual(['Excel', 'SPED']);
  });

  it('responsável: preenche nome+id e preserva as horas da linha', () => {
    const r = inserirVinculoCriado([{ nome: '', horas: 5 }], 'executadoPor', 'João', 'R1');
    const rp = r[0] as ResponsavelEtapa;
    expect(rp.nome).toBe('João');
    expect(rp.responsavelId).toBe('R1');
    expect(rp.horas).toBe(5);
  });

  it('não muta o array original', () => {
    const orig: DocRef[] = [{ nome: '', volume: 0 }];
    inserirVinculoCriado(orig, 'docsEntrada', 'X', 'D9');
    expect(orig[0].nome).toBe(''); // intacto
  });
});

describe('clusterInicial (B2)', () => {
  it('cluster do processo tem precedência sobre o filtro global', () => {
    expect(clusterInicial('proc', 'global')).toBe('proc');
  });
  it('cai no filtro global quando não há cluster do processo', () => {
    expect(clusterInicial(undefined, 'global')).toBe('global');
    expect(clusterInicial(null, 'global')).toBe('global');
    expect(clusterInicial('', 'global')).toBe('global');
  });
  it('vazio quando não há nenhum', () => {
    expect(clusterInicial(null, null)).toBe('');
    expect(clusterInicial()).toBe('');
  });
});
