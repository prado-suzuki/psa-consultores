import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));
vi.mock('sonner', () => ({ toast: mocks.toast }));

import { focarCampo, primeiraFalha, validarFormulario } from '@/lib/osg/validacaoFormulario';

// Cenário do aceite (B16), fora do caso MMS: um impedimento sem tipo e uma
// matrícula sem titular. O que quebrava era o silêncio — trocar de aba sem
// dizer o que falta parece botão que não funciona.
beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = `
    <div data-campo="numero"><label>Nº</label><input id="numero" /></div>
    <div data-campo="titular_pessoa_id"><button id="titular">Selecione...</button></div>
  `;
});

describe('falha de validação', () => {
  it('devolve a primeira regra que falhou, na ordem declarada', () => {
    const falha = primeiraFalha([
      { invalido: false, mensagem: 'ok' },
      { invalido: true, mensagem: 'Informe o número da matrícula.', aba: 'dados', campo: 'numero' },
      { invalido: true, mensagem: 'Selecione o titular.', aba: 'titulares' },
    ]);
    expect(falha).toEqual({
      mensagem: 'Informe o número da matrícula.',
      aba: 'dados',
      campo: 'numero',
    });
  });

  it('não avisa nada quando nenhuma regra falha', () => {
    const abrirAba = vi.fn();
    expect(validarFormulario([{ invalido: false, mensagem: 'nunca' }], { abrirAba })).toBe(true);
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(abrirAba).not.toHaveBeenCalled();
  });

  it('avisa o que falta, abre a aba do campo e leva o foco até ele', async () => {
    const abrirAba = vi.fn();
    const pode = validarFormulario(
      [
        { invalido: false, mensagem: 'ok', campo: 'numero' },
        {
          invalido: true,
          mensagem: 'Selecione o titular inicial da matrícula, na aba Titularidade.',
          aba: 'titulares',
          campo: 'titular_pessoa_id',
        },
      ],
      { abrirAba },
    );

    expect(pode).toBe(false);
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Selecione o titular inicial da matrícula, na aba Titularidade.',
    );
    expect(abrirAba).toHaveBeenCalledWith('titulares');
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('titular'));
  });

  it('avisa mesmo quando a falha não aponta campo nem aba (painel sem abas)', () => {
    expect(
      validarFormulario([{ invalido: true, mensagem: 'Selecione o tipo do impedimento.' }]),
    ).toBe(false);
    expect(mocks.toast.error).toHaveBeenCalledWith('Selecione o tipo do impedimento.');
  });

  it('foca o campo pelo marcador, e não quebra quando ele não está montado', () => {
    expect(focarCampo('numero')).toBe(true);
    expect(document.activeElement?.id).toBe('numero');
    expect(focarCampo('campo_que_nao_existe')).toBe(false);
  });
});
