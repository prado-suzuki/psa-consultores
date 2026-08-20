import { describe, expect, it } from 'vitest';

import {
  chegouAoCliente, diaLocal, disparoDeHoje, formatarDia, formatarQuando, diaSeguinte,
  montarHistorico, rotuloDoAviso, rotuloDosCanais, canaisEnviadosHoje,
  type EnvioParaHistorico,
} from '@/lib/historicoNotificacoes';

const linha = (over: Partial<EnvioParaHistorico> = {}): EnvioParaHistorico => ({
  tipo: 'cobranca_pendencia',
  canal: 'email',
  status: 'enviado',
  enviado_em: '2026-08-17T17:32:00.000Z',
  entregue_em: null,
  lido_em: null,
  ...over,
} as EnvioParaHistorico);

describe('chegouAoCliente', () => {
  it('enviado, entregue e lido contam', () => {
    expect(['enviado', 'entregue', 'lido'].every(
      (s) => chegouAoCliente(linha({ status: s } as Partial<EnvioParaHistorico>)),
    )).toBe(true);
  });

  /**
   * Decisão de produto: o consultor não vê falha. Quem age é o Digital, avisado
   * pelo Debug V2 — e o consultor não tem como consertar envio quebrado.
   */
  it('falhou, ignorado e pendente NÃO contam', () => {
    expect(['falhou', 'ignorado', 'pendente'].some(
      (s) => chegouAoCliente(linha({ status: s } as Partial<EnvioParaHistorico>)),
    )).toBe(false);
  });
});

describe('montarHistorico', () => {
  it('um clique com dois canais vira UM disparo', () => {
    const h = montarHistorico([
      linha({ canal: 'email', enviado_em: '2026-08-17T17:32:00.000Z' }),
      linha({ canal: 'whatsapp', enviado_em: '2026-08-17T17:32:04.000Z' }),
    ]);
    expect(h).toHaveLength(1);
    expect(h[0].canais).toEqual(['email', 'whatsapp']);
    expect(h[0].linhas).toBe(2);
  });

  it('vários destinatários no mesmo canal continuam UM disparo', () => {
    const h = montarHistorico([
      linha({ enviado_em: '2026-08-17T17:32:00.000Z' }),
      linha({ enviado_em: '2026-08-17T17:32:01.000Z' }),
      linha({ enviado_em: '2026-08-17T17:32:02.000Z' }),
    ]);
    expect(h).toHaveLength(1);
    expect(h[0].linhas).toBe(3);
  });

  it('o instante do disparo é o do PRIMEIRO envio, não o do último', () => {
    const h = montarHistorico([
      linha({ enviado_em: '2026-08-17T17:32:09.000Z' }),
      linha({ enviado_em: '2026-08-17T17:32:00.000Z' }),
    ]);
    expect(h[0].quando).toBe('2026-08-17T17:32:00.000Z');
  });

  it('avisos diferentes no mesmo dia são disparos diferentes', () => {
    const h = montarHistorico([
      linha({ tipo: 'solicitacao_enviada' }),
      linha({ tipo: 'cobranca_pendencia' }),
    ]);
    expect(h).toHaveLength(2);
  });

  it('o mesmo aviso em dias diferentes são disparos diferentes', () => {
    const h = montarHistorico([
      linha({ enviado_em: '2026-08-12T12:15:00.000Z' }),
      linha({ enviado_em: '2026-08-17T17:32:00.000Z' }),
    ]);
    expect(h).toHaveLength(2);
  });

  it('ordena do mais recente para o mais antigo', () => {
    const h = montarHistorico([
      linha({ enviado_em: '2026-08-04T19:40:00.000Z' }),
      linha({ enviado_em: '2026-08-17T17:32:00.000Z' }),
      linha({ enviado_em: '2026-08-12T12:15:00.000Z' }),
    ]);
    expect(h.map((d) => d.dia)).toEqual(['2026-08-17', '2026-08-12', '2026-08-04']);
  });

  it('descarta o que não chegou ao cliente', () => {
    const h = montarHistorico([
      linha({ status: 'falhou', enviado_em: null }),
      linha({ status: 'ignorado', enviado_em: null }),
      linha({ status: 'pendente', enviado_em: null }),
    ]);
    expect(h).toEqual([]);
  });

  it('linha sem data nenhuma não entra, mesmo com status de sucesso', () => {
    const h = montarHistorico([
      linha({ status: 'enviado', enviado_em: null, entregue_em: null, lido_em: null }),
    ]);
    expect(h).toEqual([]);
  });

  it('linha que avançou sem enviado_em usa a data que houver', () => {
    const h = montarHistorico([
      linha({ status: 'lido', enviado_em: null, lido_em: '2026-08-17T17:40:00.000Z' }),
    ]);
    expect(h).toHaveLength(1);
    expect(h[0].quando).toBe('2026-08-17T17:40:00.000Z');
  });

  it('lista vazia devolve lista vazia', () => {
    expect(montarHistorico([])).toEqual([]);
  });
});

/**
 * O recorte do dia é `America/Cuiaba` (UTC−4), o mesmo que a borda usa na chave de
 * idempotência. Em UTC os dois discordariam entre 20h e 00h locais: a tela liberaria
 * o botão e o banco recusaria.
 */
describe('diaLocal — o fuso da casa', () => {
  it('23h59 UTC de 17/08 ainda é dia 17 em Cuiabá', () => {
    expect(diaLocal('2026-08-17T23:59:00.000Z')).toBe('2026-08-17');
  });

  it('02h00 UTC de 18/08 ainda é dia 17 em Cuiabá', () => {
    expect(diaLocal('2026-08-18T02:00:00.000Z')).toBe('2026-08-17');
  });

  it('04h00 UTC de 18/08 já é dia 18 em Cuiabá', () => {
    expect(diaLocal('2026-08-18T04:00:00.000Z')).toBe('2026-08-18');
  });

  it('data inválida devolve vazio em vez de "Invalid Date"', () => {
    expect(diaLocal('nao-e-data')).toBe('');
  });
});

describe('disparoDeHoje', () => {
  const historico = montarHistorico([
    linha({ enviado_em: '2026-08-17T17:32:00.000Z' }),
    linha({ tipo: 'solicitacao_enviada', enviado_em: '2026-08-04T19:40:00.000Z' }),
  ]);

  it('acha o disparo de hoje do aviso pedido', () => {
    const d = disparoDeHoje(historico, 'cobranca_pendencia', '2026-08-17T20:00:00.000Z');
    expect(d?.dia).toBe('2026-08-17');
  });

  it('não confunde aviso: o de hoje é de outro tipo', () => {
    expect(disparoDeHoje(historico, 'solicitacao_enviada', '2026-08-17T20:00:00.000Z')).toBeNull();
  });

  it('amanhã não há disparo de hoje', () => {
    expect(disparoDeHoje(historico, 'cobranca_pendencia', '2026-08-18T20:00:00.000Z')).toBeNull();
  });

  /** O caso da virada: às 20h locais o dia UTC vira, mas o local não. */
  it('às 23h locais de 17/08 ainda encontra o disparo do dia 17', () => {
    const d = disparoDeHoje(historico, 'cobranca_pendencia', '2026-08-18T03:00:00.000Z');
    expect(d?.dia).toBe('2026-08-17');
  });

  /**
   * `disparoDeHoje` responde "houve disparo hoje", que é o que o painel destaca.
   * Ele NÃO decide o bloqueio — quem decide é `canaisEnviadosHoje`, por canal.
   */
  it('encontra o disparo de hoje mesmo com um canal só', () => {
    const h = montarHistorico([linha({ canal: 'email', enviado_em: '2026-08-17T17:32:00.000Z' })]);
    const d = disparoDeHoje(h, 'cobranca_pendencia', '2026-08-17T20:00:00.000Z');
    expect(d).not.toBeNull();
    expect(d?.canais).toEqual(['email']);
  });
});

describe('rótulos', () => {
  it('traduz o nome do aviso', () => {
    expect(rotuloDoAviso('cobranca_pendencia')).toBe('Status da documentação');
    expect(rotuloDoAviso('solicitacao_enviada')).toBe('Solicitação enviada');
    expect(rotuloDoAviso('documento_aprovado')).toBe('Documentação conferida');
  });

  it('tipo desconhecido cai no próprio valor, sem quebrar', () => {
    expect(rotuloDoAviso('coisa_nova')).toBe('coisa_nova');
  });

  it('canais em português, com "e" antes do último', () => {
    expect(rotuloDosCanais(['email'])).toBe('e-mail');
    expect(rotuloDosCanais(['email', 'whatsapp'])).toBe('e-mail e WhatsApp');
  });

  it('formata quando no fuso da casa', () => {
    expect(formatarQuando('2026-08-17T17:32:00.000Z')).toBe('17/08/2026 às 13:32');
  });

  it('data inválida não vira "Invalid Date" na tela', () => {
    expect(formatarQuando('xxx')).toBe('');
  });
});

/**
 * O BLOQUEIO É POR CANAL, decidido em 17/08/2026.
 *
 * O caso que manda: o analista envia e-mail, percebe que esqueceu o WhatsApp, e
 * manda o WhatsApp em seguida. Travar o aviso inteiro impediria isso — e a borda
 * sempre permitiu, porque a chave de idempotência inclui o canal.
 */
describe('canaisEnviadosHoje', () => {
  const AGORA = '2026-08-17T20:00:00.000Z';

  it('só e-mail hoje: o WhatsApp continua livre', () => {
    const h = montarHistorico([
      linha({ canal: 'email', enviado_em: '2026-08-17T12:15:00.000Z' }),
    ]);
    const r = canaisEnviadosHoje(h, 'cobranca_pendencia', AGORA);
    expect(r.email).toBe('2026-08-17T12:15:00.000Z');
    expect(r.whatsapp).toBeUndefined();
  });

  it('os dois hoje: nenhum livre', () => {
    const h = montarHistorico([
      linha({ canal: 'email', enviado_em: '2026-08-17T12:15:00.000Z' }),
      linha({ canal: 'whatsapp', enviado_em: '2026-08-17T18:02:00.000Z' }),
    ]);
    const r = canaisEnviadosHoje(h, 'cobranca_pendencia', AGORA);
    expect(Object.keys(r).sort()).toEqual(['email', 'whatsapp']);
  });

  it('cliques em horas diferentes guardam a hora de CADA canal', () => {
    const h = montarHistorico([
      linha({ canal: 'email', enviado_em: '2026-08-17T12:15:00.000Z' }),
      linha({ canal: 'whatsapp', enviado_em: '2026-08-17T18:02:00.000Z' }),
    ]);
    const r = canaisEnviadosHoje(h, 'cobranca_pendencia', AGORA);
    expect(r.email).toBe('2026-08-17T12:15:00.000Z');
    expect(r.whatsapp).toBe('2026-08-17T18:02:00.000Z');
  });

  it('vários destinatários no mesmo canal guardam o PRIMEIRO', () => {
    const h = montarHistorico([
      linha({ canal: 'email', enviado_em: '2026-08-17T12:15:09.000Z' }),
      linha({ canal: 'email', enviado_em: '2026-08-17T12:15:00.000Z' }),
    ]);
    expect(canaisEnviadosHoje(h, 'cobranca_pendencia', AGORA).email)
      .toBe('2026-08-17T12:15:00.000Z');
  });

  it('envio de ontem não bloqueia canal nenhum hoje', () => {
    const h = montarHistorico([
      linha({ canal: 'email', enviado_em: '2026-08-16T12:15:00.000Z' }),
    ]);
    expect(canaisEnviadosHoje(h, 'cobranca_pendencia', AGORA)).toEqual({});
  });

  it('envio de outro aviso hoje não bloqueia este', () => {
    const h = montarHistorico([
      linha({ tipo: 'solicitacao_enviada', canal: 'email', enviado_em: '2026-08-17T12:15:00.000Z' }),
    ]);
    expect(canaisEnviadosHoje(h, 'cobranca_pendencia', AGORA)).toEqual({});
  });

  it('histórico vazio não bloqueia nada', () => {
    expect(canaisEnviadosHoje([], 'cobranca_pendencia', AGORA)).toEqual({});
  });

  it('o painel continua com UMA linha, mesmo com os dois cliques separados', () => {
    const h = montarHistorico([
      linha({ canal: 'email', enviado_em: '2026-08-17T12:15:00.000Z' }),
      linha({ canal: 'whatsapp', enviado_em: '2026-08-17T18:02:00.000Z' }),
    ]);
    expect(h).toHaveLength(1);
    expect(h[0].canais).toEqual(['email', 'whatsapp']);
    // E o instante da linha é o do primeiro clique, não o do segundo.
    expect(h[0].quando).toBe('2026-08-17T12:15:00.000Z');
  });
});

describe('formatarDia', () => {
  it('inverte AAAA-MM-DD para o formato que o analista lê', () => {
    expect(formatarDia('2026-08-17')).toBe('17/08/2026');
    expect(formatarDia('2026-01-01')).toBe('01/01/2026');
  });

  it('entrada quebrada devolve vazio em vez de "undefined/undefined"', () => {
    expect(formatarDia('')).toBe('');
    expect(formatarDia('2026-08')).toBe('');
  });
});

describe('diaSeguinte', () => {
  it('anda um dia', () => {
    expect(diaSeguinte('2026-08-17')).toBe('2026-08-18');
  });

  it('vira o mes e o ano', () => {
    expect(diaSeguinte('2026-08-31')).toBe('2026-09-01');
    expect(diaSeguinte('2026-12-31')).toBe('2027-01-01');
  });

  it('acerta o 29 de fevereiro de ano bissexto', () => {
    expect(diaSeguinte('2028-02-28')).toBe('2028-02-29');
    expect(diaSeguinte('2028-02-29')).toBe('2028-03-01');
    // 2026 nao e bissexto: 28/02 vai direto para marco.
    expect(diaSeguinte('2026-02-28')).toBe('2026-03-01');
  });

  it('o dia de HOJE em Cuiaba mais um bate com o texto do bloqueio', () => {
    // O caso que o fuso quebra: 20h05 em Cuiaba ja e o dia seguinte em UTC.
    // `diaLocal` tem de dizer 17, e o seguinte tem de ser 18 - nao 19.
    const noite = new Date('2026-08-18T00:05:00.000Z');
    expect(diaLocal(noite)).toBe('2026-08-17');
    expect(diaSeguinte(diaLocal(noite))).toBe('2026-08-18');
  });
});
