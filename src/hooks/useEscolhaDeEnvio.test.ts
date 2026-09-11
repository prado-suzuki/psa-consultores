import { describe, expect, it } from 'vitest';

import {
  motivoDaEscolha, motivoDeBloqueio, temParaEnviar, type EscolhaDeEnvio,
} from './useEscolhaDeEnvio';
import type { DestinatarioAviso } from './useDestinatariosCliente';

/**
 * As duas funções que decidem se o botão de enviar acende.
 *
 * Elas são o ponto único dos TRÊS modais de aviso ao cliente desde 11/09/2026, e
 * é por isso que ganharam teste: antes a regra vivia copiada em cada um, e uma
 * cópia divergente significa a tela prometer um envio que a borda não faz.
 */

const COM_OS_DOIS: DestinatarioAviso = {
  user_id: 'u1', nome: 'Com e-mail e telefone',
  email: 'a@psa.com.br', telefone: '65999999999',
};
const SO_EMAIL: DestinatarioAviso = {
  user_id: 'u2', nome: 'Só e-mail', email: 'b@psa.com.br', telefone: null,
};

/** Monta o estado sem rodar o hook: as duas funções são puras sobre ele. */
function escolha(parcial: Partial<EscolhaDeEnvio> = {}): EscolhaDeEnvio {
  const escolhidos = parcial.escolhidos ?? [];
  const canais = parcial.canais ?? ['email', 'whatsapp'];
  const alcance = parcial.alcance ?? {
    email: escolhidos.filter((d) => d.email).length,
    whatsapp: escolhidos.filter((d) => d.telefone).length,
  };
  return {
    destinatarios: parcial.destinatarios ?? [COM_OS_DOIS, SO_EMAIL],
    carregando: false,
    canais,
    selecionados: escolhidos.map((d) => d.user_id),
    escolhidos,
    alcance,
    canaisEfetivos: parcial.canaisEfetivos
      ?? canais.filter((c) => alcance[c] > 0),
    alternarCanal: () => {},
    alternarDestinatario: () => {},
    ...parcial,
  };
}

describe('temParaEnviar — o mínimo é UM par destinatário-canal', () => {
  it('um destinatário e um canal que o alcança bastam', () => {
    expect(temParaEnviar(escolha({ escolhidos: [SO_EMAIL], canais: ['email'] }))).toBe(true);
  });

  it('ninguém marcado não envia, mesmo com os dois canais ligados', () => {
    expect(temParaEnviar(escolha({ escolhidos: [] }))).toBe(false);
  });

  it('nenhum canal marcado não envia, mesmo com destinatário completo', () => {
    expect(temParaEnviar(escolha({ escolhidos: [COM_OS_DOIS], canais: [] }))).toBe(false);
  });

  /**
   * O caso que a contagem por canal existe para pegar: há marca nos dois lados,
   * mas o canal escolhido não alcança quem foi escolhido. Sem isto o botão
   * acenderia e a borda devolveria um envio vazio.
   */
  it('canal que não alcança o marcado não conta como par', () => {
    expect(temParaEnviar(escolha({ escolhidos: [SO_EMAIL], canais: ['whatsapp'] }))).toBe(false);
  });
});

describe('motivoDeBloqueio — do que se resolve agora para o que não se resolve aqui', () => {
  it('cliente sem representante vem antes de qualquer instrução de marcar', () => {
    expect(motivoDeBloqueio(escolha({ destinatarios: [], escolhidos: [] }), 'para finalizar'))
      .toMatch(/não tem representante com acesso ao portal/);
  });

  it('havendo representante, manda marcar um — e usa a ação de quem chamou', () => {
    expect(motivoDeBloqueio(escolha({ escolhidos: [] }), 'para enviar a solicitação'))
      .toBe('Marque pelo menos um destinatário para enviar a solicitação.');
  });

  it('com destinatário marcado e nenhum canal, cobra o canal', () => {
    expect(motivoDeBloqueio(escolha({ escolhidos: [COM_OS_DOIS], canais: [] }), 'para finalizar'))
      .toBe('Escolha pelo menos um canal para finalizar.');
  });

  it('marca dos dois lados sem alcance explica o desencontro', () => {
    expect(motivoDeBloqueio(escolha({ escolhidos: [SO_EMAIL], canais: ['whatsapp'] }), 'para finalizar'))
      .toMatch(/não alcançam nenhum dos destinatários/);
  });

  it('par completo não tem motivo nenhum', () => {
    expect(motivoDeBloqueio(escolha({ escolhidos: [SO_EMAIL], canais: ['email'] }), 'para finalizar'))
      .toBeUndefined();
  });
});

/**
 * A regra do Alexandre em 11/09/2026, literal: "se ele vai disparar um evento,
 * seja enviar, cobrar ou fechar, ele precisa avisar alguém".
 *
 * As três telas travam pela MESMA conta e falam com as MESMAS palavras — só o
 * fecho da frase muda. Fixar as três juntas aqui é o que faz uma delas não
 * divergir sozinha depois.
 */
describe('a trava do par vale para os três eventos, com a mesma frase', () => {
  const SEM_NINGUEM = { destinatarios: 2, escolhidos: 0, canais: 2, canaisEfetivos: 2 };
  const COMPLETO = { destinatarios: 2, escolhidos: 1, canais: 1, canaisEfetivos: 1 };

  it.each([
    ['para enviar a solicitação', 'Marque pelo menos um destinatário para enviar a solicitação.'],
    ['para enviar a notificação', 'Marque pelo menos um destinatário para enviar a notificação.'],
    ['para avisar o cliente', 'Marque pelo menos um destinatário para avisar o cliente.'],
  ])('%s bloqueia sem destinatário', (acao, esperado) => {
    expect(motivoDaEscolha(SEM_NINGUEM, acao)).toBe(esperado);
  });

  it.each([
    'para enviar a solicitação', 'para enviar a notificação', 'para avisar o cliente',
  ])('%s libera com um par', (acao) => {
    expect(motivoDaEscolha(COMPLETO, acao)).toBeUndefined();
  });

  it('cliente sem representante diz a mesma coisa nas três, sem o fecho da ação', () => {
    const vazio = { destinatarios: 0, escolhidos: 0, canais: 2, canaisEfetivos: 0 };
    const frases = new Set([
      motivoDaEscolha(vazio, 'para enviar a solicitação'),
      motivoDaEscolha(vazio, 'para enviar a notificação'),
      motivoDaEscolha(vazio, 'para avisar o cliente'),
    ]);
    expect(frases.size).toBe(1);
    expect([...frases][0]).toMatch(/Cadastre um antes de continuar/);
  });
});
