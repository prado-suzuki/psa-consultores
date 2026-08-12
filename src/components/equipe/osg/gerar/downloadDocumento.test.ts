import { describe, expect, it } from 'vitest';
import type { BlocoGerado } from '@/lib/templates';
import { prepararDownloadDocumento } from '@/components/equipe/osg/gerar/downloadDocumento';

const bloco: BlocoGerado = {
  id: 'conteudo',
  tipo: 'livre',
  obrigatorio: true,
  conteudo: 'Instrumento particular.',
  segmentos: [{ tipo: 'texto', texto: 'Instrumento particular.' }],
};

describe('B2 · identificação do download incompleto', () => {
  it('arquivo completo atravessa sem marca nem troca de nome', () => {
    expect(prepararDownloadDocumento('Matrícula digitada', [bloco], false)).toEqual({
      nome: 'Matrícula digitada',
      blocos: [bloco],
    });
  });

  it('arquivo incompleto ganha rascunho no nome e no início do documento', () => {
    const download = prepararDownloadDocumento('Contrato social', [bloco], true);
    expect(download.nome).toBe('Contrato social (rascunho)');
    expect(download.blocos[0].conteudo).toContain('RASCUNHO — DOCUMENTO INCOMPLETO');
    expect(download.blocos[1]).toBe(bloco);
  });
});
