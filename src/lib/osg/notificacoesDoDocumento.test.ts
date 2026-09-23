import { describe, expect, it } from 'vitest';
import type { NotificacaoLog } from '@/hooks/useNotificacoesDocumento';
import { semCarimbosDeSistema } from '@/lib/osg/notificacoesDoDocumento';

const log = (id: string, changed_fields: NotificacaoLog['changed_fields'], action = 'updated'): NotificacaoLog => ({
  id, entity_type: 'movimentacao_quotas', entity_id: `e-${id}`, entity_name: 'Cessão', action,
  changed_fields, performed_by: 'u1', performed_at: '2026-09-22T12:00:00Z',
});

describe('semCarimbosDeSistema', () => {
  it('o carimbo do registro nos movimentos não vira notificação', () => {
    const carimbo = log('1', {
      documento_gerado_id: { old: '3b53f1ac-0000-4000-8000-000000000000', new: '690a8517-0000-4000-8000-000000000000' },
    });
    expect(semCarimbosDeSistema([carimbo])).toEqual([]);
  });

  it('mudança de verdade fica, sem o carimbo que veio junto', () => {
    const misto = log('2', { quotas: { old: 10, new: 20 }, documento_gerado_id: { old: null, new: 'doc' } });
    const [restante] = semCarimbosDeSistema([misto]);
    expect(restante.changed_fields).toEqual({ quotas: { old: 10, new: 20 } });
  });

  it('criação, exclusão e log sem diff seguem como estão', () => {
    const logs = [log('3', null, 'created'), log('4', null, 'deleted'), log('5', {}, 'updated')];
    expect(semCarimbosDeSistema(logs)).toEqual(logs);
  });
});
