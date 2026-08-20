import { describe, expect, it } from 'vitest';
import { montarGavetasChecklist, resumirPendencias } from './checklistCliente';
import type { PendenciaCliente } from '@/hooks/useDomainPendenciasCliente';

const pendencia = (over: Partial<PendenciaCliente> = {}): PendenciaCliente => ({
  solicitacao_item_id: 'item-1',
  documento_tipo_id: 'tipo-1',
  grupo: 'pf',
  documento: 'CPF',
  nota: null,
  granularidade: 'pessoa_pf',
  alvo: { kind: 'pessoa', id: 'p1', nome: 'João', detalhe: null },
  recebido: false,
  recebido_interno: false,
  arquivos: [],
  ...over,
});

describe('montarGavetasChecklist', () => {
  it('agrupa por gaveta e por entidade, sem deduplicar nome de documento', () => {
    const gavetas = montarGavetasChecklist([
      pendencia(),
      pendencia({ alvo: { kind: 'pessoa', id: 'p2', nome: 'Maria', detalhe: null } }),
      pendencia({ solicitacao_item_id: 'item-2', documento: 'Cartão CNPJ', grupo: 'pj',
        alvo: { kind: 'pessoa', id: 'pj1', nome: 'Agro LTDA', detalhe: null } }),
    ]);

    expect(gavetas.map((gaveta) => gaveta.key)).toEqual(['pf', 'pj']);
    // O mesmo CPF pedido a duas pessoas dá duas linhas, uma por entidade.
    expect(gavetas[0].entidades.map((entidade) => entidade.nome)).toEqual(['João', 'Maria']);
    expect(gavetas[0].faltando).toBe(2);
  });

  it('não devolve gaveta sem pendência', () => {
    const gavetas = montarGavetasChecklist([pendencia()]);
    expect(gavetas).toHaveLength(1);
    expect(gavetas[0].key).toBe('pf');
  });

  it('põe entidade com pendência aberta na frente, e o que falta no topo da entidade', () => {
    const gavetas = montarGavetasChecklist([
      pendencia({ alvo: { kind: 'pessoa', id: 'p1', nome: 'Ana', detalhe: null }, recebido: true }),
      pendencia({ solicitacao_item_id: 'item-rg', documento: 'RG',
        alvo: { kind: 'pessoa', id: 'p1', nome: 'Ana', detalhe: null }, recebido: true }),
      pendencia({ alvo: { kind: 'pessoa', id: 'p2', nome: 'Zeca', detalhe: null } }),
      pendencia({ solicitacao_item_id: 'item-rg', documento: 'RG',
        alvo: { kind: 'pessoa', id: 'p2', nome: 'Zeca', detalhe: null }, recebido: true }),
    ]);

    const [pf] = gavetas;
    // Zeca tem pendência aberta e vem antes da Ana, apesar da ordem alfabética.
    expect(pf.entidades.map((entidade) => entidade.nome)).toEqual(['Zeca', 'Ana']);
    expect(pf.entidades[0].pendencias.map((p) => p.documento)).toEqual(['CPF', 'RG']);
    expect(pf).toMatchObject({ faltando: 1, recebidos: 3 });
  });

  it('dá nome à entidade sem denominação, e nomeia o grão cliente', () => {
    const gavetas = montarGavetasChecklist([
      pendencia({ alvo: { kind: 'pessoa', id: 'p1', nome: '  ', detalhe: null } }),
      pendencia({ grupo: 'outros', documento: 'Relação de áreas', granularidade: 'cliente',
        alvo: { kind: 'cliente', id: null, nome: null, detalhe: null } }),
    ]);

    expect(gavetas[0].entidades[0].nome).toBe('Sem identificação');
    expect(gavetas[1].entidades[0]).toMatchObject({ chave: 'cliente', nome: 'Documentos gerais' });
  });

  it('mantém o detalhe da matrícula na entidade', () => {
    const gavetas = montarGavetasChecklist([
      pendencia({ grupo: 'bens_imoveis', documento: 'Matrícula', granularidade: 'matricula_rural',
        alvo: { kind: 'matricula', id: 'm1', nome: 'Fazenda Santa Rita', detalhe: 'Matrícula 12.345' } }),
    ]);

    expect(gavetas[0].entidades[0]).toMatchObject({
      chave: 'matricula:m1', nome: 'Fazenda Santa Rita', detalhe: 'Matrícula 12.345',
    });
  });
});

describe('resumirPendencias', () => {
  it('conta o que falta e o que chegou', () => {
    expect(resumirPendencias([
      pendencia(), pendencia({ recebido: true }), pendencia({ recebido: true }),
    ])).toEqual({ faltando: 1, recebidos: 2, total: 3, pct: 67 });
  });

  it('não divide por zero sem pendência', () => {
    expect(resumirPendencias([])).toEqual({ faltando: 0, recebidos: 0, total: 0, pct: 0 });
  });
});
