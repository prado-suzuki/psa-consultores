import { describe, expect, it } from 'vitest';
import { DASHBOARDS, DASHBOARD_PADRAO, resolverDashboard } from './registro';

describe('registro de dashboards', () => {
  it('resolve pelo id e cai no padrão quando o id não existe', () => {
    expect(resolverDashboard('controle-uso-envio').id).toBe('controle-uso-envio');
    expect(resolverDashboard('painel-que-nao-existe')).toBe(DASHBOARD_PADRAO);
    expect(resolverDashboard(null)).toBe(DASHBOARD_PADRAO);
  });

  // As proximas tres travam o contrato para quem for adicionar a segunda
  // entrada: id duplicado silenciaria um dashboard, e id com caractere
  // especial quebraria o link assim que alguem salvasse a URL.
  it('não tem id duplicado', () => {
    const ids = DASHBOARDS.map((dashboard) => dashboard.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa ids seguros para URL', () => {
    for (const dashboard of DASHBOARDS) {
      expect(dashboard.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('descreve cada dashboard para o seletor e o subtítulo', () => {
    for (const dashboard of DASHBOARDS) {
      expect(dashboard.nome.trim()).not.toBe('');
      expect(dashboard.descricao.trim()).not.toBe('');
    }
  });
});
