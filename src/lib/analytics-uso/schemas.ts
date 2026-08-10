import * as z from 'zod';
import type {
  AnalyticsArquivosResponse,
  AnalyticsGerencialResponse,
  AnalyticsUsoApiResponse,
} from './types';

const numero = z.number().finite().nonnegative();
const inteiro = numero.int();
const taxa = numero.max(1);
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const mes = z.string().regex(/^\d{4}-\d{2}$/);
const textoNulo = z.string().nullable();

const periodoAplicadoSchema = z
  .object({
    inicio: data,
    fim: data,
  })
  .strict();

const apiTotaisSchema = z
  .object({
    chamadas: inteiro,
    erros: inteiro,
    taxaErro: taxa,
    erros5xx: inteiro,
    erros4xx: inteiro,
    taxa5xx: taxa,
    latMediaMs: numero,
    latP50Ms: numero,
    latP95Ms: numero,
    endpointsAtivos: inteiro,
    usuariosAtivos: inteiro,
    diasAtivos: inteiro,
  })
  .strict();

const apiPorMesSchema = z
  .object({
    mes,
    chamadas: inteiro,
    erros: inteiro,
    taxaErro: taxa,
    latMediaMs: numero,
    latP50Ms: numero,
    latP95Ms: numero,
  })
  .strict();

const apiPorEndpointSchema = z
  .object({
    endpoint: z.string(),
    ferramenta: textoNulo,
    chamadas: inteiro,
    erros: inteiro,
    taxaErro: taxa,
    erros5xx: inteiro,
    erros4xx: inteiro,
    taxa5xx: taxa,
    latMediaMs: numero,
    latP50Ms: numero,
    latP95Ms: numero,
  })
  .strict();

const apiPorFerramentaSchema = z
  .object({
    ferramenta: z.string(),
    chamadas: inteiro,
    erros: inteiro,
    taxaErro: taxa,
    erros5xx: inteiro,
    erros4xx: inteiro,
    taxa5xx: taxa,
    latMediaMs: numero,
    latP50Ms: numero,
    latP95Ms: numero,
    usuarios: inteiro,
  })
  .strict();

const apiPorUsuarioSchema = z
  .object({
    usuario: z.string(),
    email: textoNulo,
    acoesConsulta: inteiro,
    acoesDownload: inteiro,
    acoesSincronizacao: inteiro,
    clusterId: textoNulo,
    automacao: z.boolean(),
    chamadas: inteiro,
    erros: inteiro,
    latMediaMs: numero,
    diasAtivos: inteiro,
    ferramentasUsadas: inteiro,
  })
  .strict();

const gerencialApiPorMesSchema = z
  .object({
    mes,
    usuariosAtivos: inteiro,
    usuariosNovos: inteiro,
    usuariosRetidos: inteiro,
    usuariosBaseRetencao: inteiro,
    taxaRetencao: taxa.nullable(),
    chamadas: inteiro,
    chamadasPorUsuario: numero,
    ferramentasAtivas: inteiro,
    taxaSucesso: taxa,
  })
  .strict();

const gerencialApiPorClusterMesSchema = gerencialApiPorMesSchema.extend({
  clusterId: textoNulo,
});

const gerencialApiPorFerramentaSchema = z
  .object({
    ferramenta: z.string(),
    usuariosAtivos: inteiro,
    chamadas: inteiro,
    coberturaUsuarios: taxa,
    taxaSucesso: taxa,
  })
  .strict();

const gerencialApiPorClusterFerramentaSchema = gerencialApiPorFerramentaSchema.extend({
  clusterId: textoNulo,
});

const gerencialApiPorClusterSchema = z
  .object({
    clusterId: textoNulo,
    usuariosAtivos: inteiro,
    usuariosNovos: inteiro,
    chamadas: inteiro,
    chamadasPorUsuario: numero,
    ferramentasAtivas: inteiro,
    taxaSucesso: taxa,
  })
  .strict();

export const analyticsUsoApiSchema = z
  .object({
    periodo: periodoAplicadoSchema,
    totais: apiTotaisSchema,
    porMes: z.array(apiPorMesSchema),
    porStatus: z.array(
      z.object({ statusCode: inteiro, faixa: z.string(), chamadas: inteiro }).strict(),
    ),
    porEndpoint: z.array(apiPorEndpointSchema),
    porFerramenta: z.array(apiPorFerramentaSchema),
    porTipoOperacao: z.array(
      z.object({ tipoOperacao: z.string(), chamadas: inteiro, erros: inteiro }).strict(),
    ),
    porMetodo: z.array(
      z.object({ metodo: z.string(), chamadas: inteiro, erros: inteiro }).strict(),
    ),
    porUsuario: z.array(apiPorUsuarioSchema),
    gerencial: z
      .object({
        inicioHistorico: data.nullable(),
        porMes: z.array(gerencialApiPorMesSchema),
        porClusterMes: z.array(gerencialApiPorClusterMesSchema),
        porFerramenta: z.array(gerencialApiPorFerramentaSchema),
        porClusterFerramenta: z.array(gerencialApiPorClusterFerramentaSchema),
        porCluster: z.array(gerencialApiPorClusterSchema),
      })
      .strict(),
  })
  .strict() as z.ZodType<AnalyticsUsoApiResponse>;

const arquivosTotaisSchema = z
  .object({
    enviados: inteiro,
    erros: inteiro,
    naoEntraram: inteiro,
    reenvios: inteiro,
    arquivosAusentesDistintos: inteiro,
    taxaErro: taxa,
    arquivosDistintosComErro: inteiro,
    pastasComErro: inteiro,
    usuariosAtivos: inteiro,
    registrosSemDataIngestao: inteiro,
    registrosTotaisNaView: inteiro,
    automacaoEnviados: inteiro,
    automacaoErros: inteiro,
  })
  .strict();

const arquivosGerencialPorMesSchema = z
  .object({
    mes,
    enviados: inteiro,
    erros: inteiro,
    taxaErro: taxa,
    usuariosAtivosHumanos: inteiro,
    enviadosAutomacao: inteiro,
    participacaoAutomacao: taxa,
    falhasNaoClassificadas: inteiro,
  })
  .strict();

const arquivosGerencialPorClusterMesSchema = arquivosGerencialPorMesSchema.extend({
  clusterId: textoNulo,
});

const arquivosGerencialPorClusterSchema = z
  .object({
    clusterId: textoNulo,
    enviados: inteiro,
    erros: inteiro,
    taxaErro: taxa,
    usuariosAtivosHumanos: inteiro,
    enviadosAutomacao: inteiro,
    participacaoAutomacao: taxa,
    falhasNaoClassificadas: inteiro,
  })
  .strict();

export const analyticsArquivosSchema = z
  .object({
    periodo: periodoAplicadoSchema,
    totais: arquivosTotaisSchema,
    porMes: z.array(
      z
        .object({
          mes,
          enviados: inteiro,
          naoEntraram: inteiro,
          reenvios: inteiro,
          erros: inteiro,
          taxaErro: taxa,
        })
        .strict(),
    ),
    porTipo: z.array(
      z
        .object({
          tipoArquivo: z.string(),
          enviados: inteiro,
          erros: inteiro,
          taxaErro: taxa,
        })
        .strict(),
    ),
    porCausa: z.array(
      z
        .object({
          causa: z.string(),
          impacto: z.enum(['ausente', 'reenvio']),
          erros: inteiro,
          arquivosDistintos: inteiro,
          pct: taxa,
        })
        .strict(),
    ),
    porUsuario: z.array(
      z
        .object({
          usuario: z.string(),
          clusterId: textoNulo,
          automacao: z.boolean(),
          enviados: inteiro,
          erros: inteiro,
          naoEntraram: inteiro,
          erroDuplicidade: inteiro,
          erroNamespace: inteiro,
          erroContribuinte: inteiro,
          erroNaoClassificado: inteiro,
          arquivosDistintosComErro: inteiro,
          ultimoErro: data.nullable(),
        })
        .strict(),
    ),
    porPasta: z.array(
      z
        .object({
          pasta: z.string(),
          cliente: textoNulo,
          erros: inteiro,
          arquivosDistintos: inteiro,
        })
        .strict(),
    ),
    porCliente: z.array(
      z
        .object({
          cliente: z.string(),
          enviados: inteiro,
          naoEntraram: inteiro,
          reenvios: inteiro,
          erros: inteiro,
          taxaErro: taxa,
          tiposArquivo: inteiro,
        })
        .strict(),
    ),
    gerencial: z
      .object({
        porMes: z.array(arquivosGerencialPorMesSchema),
        porClusterMes: z.array(arquivosGerencialPorClusterMesSchema),
        porCluster: z.array(arquivosGerencialPorClusterSchema),
      })
      .strict(),
  })
  .strict() as z.ZodType<AnalyticsArquivosResponse>;

export const analyticsGerencialSchema = z
  .object({
    periodo: periodoAplicadoSchema,
    escopo: z
      .object({
        clusterId: textoNulo,
        usuario: textoNulo,
      })
      .strict(),
    totais: z
      .object({
        pessoasAtivas: inteiro,
        usuariosNovos: inteiro,
        totalAcoes: inteiro,
        acoesPorPessoa: numero,
        ferramentasUtilizadas: inteiro,
      })
      .strict(),
    porMes: z.array(
      gerencialApiPorMesSchema.extend({
        arquivosEnviadosHumanos: inteiro,
      }),
    ),
    porFerramenta: z.array(gerencialApiPorFerramentaSchema),
    porPessoa: z.array(
      z
        .object({
          usuario: z.string(),
          acoesConsulta: inteiro,
          acoesDownload: inteiro,
          chamadas: inteiro,
          diasAtivos: inteiro,
          ferramentasUsadas: inteiro,
          documentosEnviados: inteiro,
        })
        .strict(),
    ),
  })
  .strict() as z.ZodType<AnalyticsGerencialResponse>;

export function parseAnalyticsResponse<T>(schema: z.ZodType<T>, payload: unknown): T {
  const resultado = schema.safeParse(payload);
  if (!resultado.success) {
    const campo = resultado.error.issues[0]?.path.join('.') || 'resposta';
    throw new Error(`A API retornou dados incompatíveis com o dashboard (${campo}).`);
  }
  return resultado.data;
}
