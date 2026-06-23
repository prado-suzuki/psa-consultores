/**
 * Teste do construtor de URL de embed do Looker Studio (RLS único e múltiplo).
 * Valida o CONTRATO de passagem de parâmetros — a parte do RLS que o app controla.
 * (O render visual do iframe NÃO é testável em jsdom.)
 */
import { describe, it, expect } from 'vitest';
import { buildLookerEmbedUrl } from './lookerEmbed';

const BASE = 'https://lookerstudio.google.com/embed/reporting/RID/page/PID';

function decodeParams(url: string): Record<string, string> | null {
  const m = url.match(/[?&]params=([^&]+)/);
  return m ? JSON.parse(decodeURIComponent(m[1])) : null;
}

describe('buildLookerEmbedUrl', () => {
  it('passa valor único na chave prefixada por fonte (dsN.param)', () => {
    const url = buildLookerEmbedUrl(BASE, ['ds108.cluster_id_param'], 'abc');
    expect(decodeParams(url)).toEqual({ 'ds108.cluster_id_param': 'abc' });
  });

  it('replica o MESMO valor em várias fontes (relatório multi-source)', () => {
    const url = buildLookerEmbedUrl(BASE, ['ds0.p', 'ds1.p'], 'abc');
    expect(decodeParams(url)).toEqual({ 'ds0.p': 'abc', 'ds1.p': 'abc' });
  });

  it('suporta MÚLTIPLOS ids num único valor separado por vírgula (UNNEST/SPLIT no BQ)', () => {
    const url = buildLookerEmbedUrl(BASE, ['ds0.cluster_id_param'], '101,102,103');
    expect(decodeParams(url)).toEqual({ 'ds0.cluster_id_param': '101,102,103' });
  });

  it('usa & quando a URL base já tem query string', () => {
    const url = buildLookerEmbedUrl(`${BASE}?x=1`, ['ds0.p'], 'abc');
    expect(url).toContain('?x=1&params=');
  });

  it('valor vazio/undefined retorna a URL base SEM params (caso filter_type=nenhum)', () => {
    expect(buildLookerEmbedUrl(BASE, ['ds0.p'], '')).toBe(BASE);
    expect(buildLookerEmbedUrl(BASE, ['ds0.p'], undefined)).toBe(BASE);
  });

  it('sem nomes de parâmetro retorna a URL base intocada', () => {
    expect(buildLookerEmbedUrl(BASE, [], 'abc')).toBe(BASE);
    expect(buildLookerEmbedUrl(BASE, undefined, 'abc')).toBe(BASE);
  });
});
