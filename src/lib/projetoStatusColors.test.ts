import { describe, expect, it } from 'vitest';

import { STATUS_LABELS } from '@/lib/projetosCadastro';
import {
  projectStatusColors,
  projectStatusConfig,
  projectStatusList,
} from '@/lib/projetoStatusColors';

describe('projetoStatusColors', () => {
  it('cobre exatamente os status oferecidos no formulário', () => {
    expect(Object.keys(projectStatusColors).sort()).toEqual(Object.keys(STATUS_LABELS).sort());
  });

  it('mantém os rótulos alinhados com STATUS_LABELS', () => {
    for (const status of projectStatusList) {
      expect(status.label).toBe(STATUS_LABELS[status.key]);
    }
  });

  it('lista os status na ordem do ciclo de vida', () => {
    expect(projectStatusList.map((status) => status.key)).toEqual([
      'planned',
      'active',
      'on_hold',
      'completed',
      'cancelled',
    ]);
  });

  it('cai em um fallback neutro para status fora da lista', () => {
    // `org_projects.status` é text livre no banco: um valor legado não pode
    // quebrar o render da pílula.
    expect(projectStatusConfig('arquivado')).toEqual({
      key: 'arquivado',
      label: 'arquivado',
      dot: 'bg-muted-foreground',
      badge: 'bg-muted text-muted-foreground border-border',
    });
    expect(projectStatusConfig(null).label).toBe('Sem status');
    expect(projectStatusConfig('active')).toBe(projectStatusColors.active);
  });
});
