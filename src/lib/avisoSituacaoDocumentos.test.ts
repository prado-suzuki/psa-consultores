import { describe, expect, it } from 'vitest';

import { montarSituacaoDocumentos, temAlgoParaAvisar } from '@/lib/avisoSituacaoDocumentos';
import type { ArquivoDaLinha, LinhaChecklist, StatusChecklist } from '@/lib/checklistDerivado';

const arquivo = (over: Partial<ArquivoDaLinha> = {}): ArquivoDaLinha => ({
  id: 'a1', nome: 'doc.pdf', revisao: 'pendente', motivo: null, fonte: 'cliente', ...over,
});

const linha = (over: Partial<LinhaChecklist> = {}): LinhaChecklist => ({
  chave: 'i1|c', itemId: 'i1', documento: 'CNH', nota: null, ordem: 1,
  granularidade: 'pessoa_pf', doCatalogo: true, confidencial: false,
  instancia: { chave: 'pessoa:p1', alvo: { kind: 'pessoa', id: 'p1' }, cluster: 'pessoa_pf', label: 'João da Silva', detalhe: null },
  status: 'pendente' as StatusChecklist, documentoTipoId: 't1', arquivos: [],
  ...over,
});

describe('montarSituacaoDocumentos', () => {
  it('linha sem arquivo entra em pendentes com a entidade', () => {
    const d = montarSituacaoDocumentos([linha()]);
    expect(d.pendentes).toEqual([{ documento: 'CNH', entidade: 'João da Silva' }]);
    expect(d.recusados).toHaveLength(0);
    expect(d).toMatchObject({ base: 1, recebidos: 0 });
  });

  it('linha com arquivo recusado entra em recusados, com o motivo', () => {
    const d = montarSituacaoDocumentos([
      linha({ arquivos: [arquivo({ revisao: 'recusado', motivo: 'Foto tremida' })] }),
    ]);
    expect(d.recusados).toEqual([
      { documento: 'CNH', entidade: 'João da Silva', motivo: 'Foto tremida' },
    ]);
    expect(d.pendentes).toHaveLength(0);
  });

  it('recebido e aprovado não pede ação e sai das duas listas', () => {
    const d = montarSituacaoDocumentos([
      linha({ status: 'recebido', arquivos: [arquivo({ revisao: 'aprovado' })] }),
    ]);
    expect(temAlgoParaAvisar(d)).toBe(false);
    expect(d).toMatchObject({ base: 1, recebidos: 1 });
  });

  it('em análise não pede ação: quem tem de agir é a PSA, não o cliente', () => {
    const d = montarSituacaoDocumentos([
      linha({ status: 'recebido', arquivos: [arquivo({ revisao: 'pendente' })] }),
    ]);
    expect(temAlgoParaAvisar(d)).toBe(false);
  });

  /**
   * O caso ambíguo que o `estadoDocumento.ts` resolve: pendência recebida com um
   * recusado e um aprovado está resolvida — o bom vale. Não pode ser cobrada, ou
   * o cliente reenviaria algo que já foi aceito.
   */
  it('recusado junto de aprovado na MESMA linha não é cobrado', () => {
    const d = montarSituacaoDocumentos([
      linha({
        status: 'recebido',
        arquivos: [
          arquivo({ id: 'a1', revisao: 'recusado', motivo: 'ilegível' }),
          arquivo({ id: 'a2', revisao: 'aprovado' }),
        ],
      }),
    ]);
    expect(d.recusados).toHaveLength(0);
    expect(d.pendentes).toHaveLength(0);
  });

  it('vários recusados na mesma linha juntam os motivos distintos, sem repetir', () => {
    const d = montarSituacaoDocumentos([
      linha({
        arquivos: [
          arquivo({ id: 'a1', revisao: 'recusado', motivo: 'ilegível' }),
          arquivo({ id: 'a2', revisao: 'recusado', motivo: 'vencido' }),
          arquivo({ id: 'a3', revisao: 'recusado', motivo: 'ilegível' }),
        ],
      }),
    ]);
    expect(d.recusados[0].motivo).toBe('ilegível · vencido');
  });

  it('recusado sem motivo recebe texto de reserva (parâmetro vazio barra o WhatsApp)', () => {
    const d = montarSituacaoDocumentos([
      linha({ arquivos: [arquivo({ revisao: 'recusado', motivo: '  ' })] }),
    ]);
    expect(d.recusados[0].motivo).toBe('Sem motivo registrado; veja no portal.');
    expect(d.recusados[0].motivo).not.toBe('');
  });

  it('não aplicável e dispensado ficam fora, e não entram na base', () => {
    const d = montarSituacaoDocumentos([
      linha({ status: 'nao_aplicavel' as StatusChecklist }),
      linha({ chave: 'i2|c', status: 'dispensado' as StatusChecklist }),
    ]);
    expect(d).toMatchObject({ base: 0, recebidos: 0 });
    expect(temAlgoParaAvisar(d)).toBe(false);
  });

  it('grão cliente não repete o nome do cliente em cada linha', () => {
    const d = montarSituacaoDocumentos([
      linha({
        granularidade: 'cliente',
        instancia: { chave: 'cliente', alvo: { kind: 'cliente' }, cluster: 'cliente', label: 'Grupo Horizonte', detalhe: null },
      }),
    ]);
    expect(d.pendentes[0].entidade).toBe('');
  });

  it('entidade com label e detalhe distintos mostra os dois', () => {
    const d = montarSituacaoDocumentos([
      linha({
        instancia: { chave: 'matricula:m1', alvo: { kind: 'matricula', id: 'm1' }, cluster: 'imovel_rural', label: 'Fazenda Boa Vista', detalhe: 'Matrícula 4.521' },
      }),
    ]);
    expect(d.pendentes[0].entidade).toBe('Fazenda Boa Vista (Matrícula 4.521)');
  });

  it('base e recebidos batem com a contagem da tela num lote misto', () => {
    const d = montarSituacaoDocumentos([
      linha({ chave: '1' }),
      linha({ chave: '2', status: 'recebido', arquivos: [arquivo({ revisao: 'aprovado' })] }),
      linha({ chave: '3', arquivos: [arquivo({ revisao: 'recusado', motivo: 'x' })] }),
      linha({ chave: '4', status: 'nao_aplicavel' as StatusChecklist }),
    ]);
    expect(d).toMatchObject({ base: 3, recebidos: 1 });
    expect(d.pendentes).toHaveLength(1);
    expect(d.recusados).toHaveLength(1);
    expect(temAlgoParaAvisar(d)).toBe(true);
  });
});
