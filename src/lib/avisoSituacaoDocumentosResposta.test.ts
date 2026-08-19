import { describe, expect, it } from 'vitest';

import { descreverEnvio } from '@/lib/avisoSituacaoDocumentos';

/**
 * O que se testa aqui é a HONESTIDADE da frase que o analista lê.
 *
 * Não é cosmético: telefone está preenchido em 8 de 38 destinatários, então
 * "enviado" sozinho faria o analista supor WhatsApp na maioria das vezes em que
 * ele não saiu. E a janela de um aviso por dia bloqueia o segundo clique — se a
 * tela não disser, o analista acha que avisou e o cliente nunca soube.
 */
describe('descreverEnvio', () => {
  it('os dois canais saíram: diz os dois, com as contagens', () => {
    const r = descreverEnvio({
      success: true,
      canais: {
        email: { success: true, recipients: 2 },
        whatsapp: { success: true, recipients: 1 },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.texto).toBe('Aviso enviado por e-mail para 2 destinatário(s) e WhatsApp para 1.');
  });

  it('só e-mail, WhatsApp sem telefone: DIZ que o WhatsApp não saiu', () => {
    const r = descreverEnvio({
      success: true,
      canais: {
        email: { success: true, recipients: 2 },
        whatsapp: { skipped: true, reason: 'no_recipient' },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.texto).toContain('e-mail para 2');
    expect(r.texto).toContain('nenhum representante tem telefone cadastrado');
  });

  it('canal de WhatsApp não configurado também é dito, não engolido', () => {
    const r = descreverEnvio({
      canais: {
        email: { success: true, recipients: 1 },
        whatsapp: { skipped: true, reason: 'webhook_nao_configurado' },
      },
    });
    expect(r.texto).toContain('o canal não está configurado');
  });

  it('já avisado hoje: manda tentar amanhã e explica o porquê', () => {
    const r = descreverEnvio({
      success: false,
      canais: {
        email: { skipped: true, reason: 'already_sent_today' },
        whatsapp: { skipped: true, reason: 'already_sent_today' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.texto).toContain('já foi avisado hoje');
    expect(r.texto).toContain('Tente amanhã');
    // A explicação sobre reputação do número saiu: é contexto nosso, não do
    // analista, e alongava a mensagem sem mudar o que ele faz a respeito.
    expect(r.texto).not.toContain('spam');
  });

  it('já avisado hoje num canal, mas o outro saiu: NÃO trata como bloqueio', () => {
    const r = descreverEnvio({
      canais: {
        email: { skipped: true, reason: 'already_sent_today' },
        whatsapp: { success: true, recipients: 1 },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.texto).toContain('WhatsApp para 1');
    expect(r.texto).not.toContain('amanhã');
  });

  it('solicitação nunca enviada: explica em vez de dizer "erro"', () => {
    const r = descreverEnvio({ success: true, skipped: true, reason: 'nunca_enviada' });
    expect(r.ok).toBe(false);
    expect(r.texto).toContain('nunca foi enviada ao cliente');
  });

  it('sem OS: explica o motivo real, que é dado faltando', () => {
    const r = descreverEnvio({ success: true, skipped: true, reason: 'sem_os' });
    expect(r.texto).toContain('produtos na OS');
  });

  it('cliente sem representante com portal: diz qual é o problema', () => {
    const r = descreverEnvio({ success: true, skipped: true, reason: 'no_recipient' });
    expect(r.texto).toContain('representante com acesso ao portal');
  });

  it('403 e afins vêm em `error` e passam direto', () => {
    const r = descreverEnvio({ error: 'Apenas a equipe pode enviar este aviso' });
    expect(r.ok).toBe(false);
    expect(r.texto).toBe('Apenas a equipe pode enviar este aviso');
  });

  it('falha de envio nos dois canais: mostra o erro, não "enviado"', () => {
    const r = descreverEnvio({
      success: false,
      canais: {
        email: { success: false, recipients: 2, erro: 'n8n respondeu 500' },
        whatsapp: { success: false, recipients: 1, erro: 'n8n respondeu 500' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.texto).toContain('n8n respondeu 500');
  });

  it('resposta vazia não vira "enviado" por omissão', () => {
    const r = descreverEnvio({});
    expect(r.ok).toBe(false);
  });
});
