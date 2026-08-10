import { describe, expect, it } from 'vitest';
import usoApiFixture from './__fixtures__/uso-api.json';
import arquivosFixture from './__fixtures__/arquivos.json';
import { montarCatalogoAnalytics, montarGerencialAnalytics } from './composicao';
import type { AnalyticsArquivosResponse, AnalyticsUsoApiResponse } from './types';

const usoApi = usoApiFixture as unknown as AnalyticsUsoApiResponse;
const arquivos = arquivosFixture as unknown as AnalyticsArquivosResponse;

describe('composições locais dos dois endpoints', () => {
  it('deriva o catálogo sem depender de um payload de filtros', () => {
    const catalogo = montarCatalogoAnalytics(usoApi, arquivos);

    expect(catalogo.ferramentas).toEqual(
      [...new Set(usoApi.porFerramenta.map((item) => item.ferramenta))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    );
    expect(catalogo.usuariosApi).toHaveLength(usoApi.porUsuario.length);
    expect(catalogo.usuariosArquivos).toHaveLength(arquivos.porUsuario.length);
    expect(catalogo.clusters).toEqual([...catalogo.clusters].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  });

  it('combina somente agregados prontos na visão gerencial', () => {
    const gerencial = montarGerencialAnalytics(usoApi, arquivos);
    const totalSerie = gerencial.porMes.reduce(
      (total, item) => total + item.chamadas + item.arquivosEnviadosHumanos,
      0,
    );

    expect(gerencial.periodo).toEqual(usoApi.periodo);
    expect(gerencial.totais.totalAcoes).toBe(totalSerie);
    expect(gerencial.totais.pessoasAtivas).toBe(gerencial.porPessoa.length);
    expect(gerencial.porPessoa.map((item) => item.usuario)).toEqual(
      gerencial.porPessoa
        .map((item) => item.usuario)
        .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    );
  });
});
