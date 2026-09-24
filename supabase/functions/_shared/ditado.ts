import type { NomePerfilEnriquecimento } from './enriquecimentoTexto.ts';

export type ModeloTranscricao = 'google/gemini-3.5-transcribe' | 'openai/gpt-4o-transcribe';

export interface ConfiguracaoEnriquecimentoDitado {
  perfil: NomePerfilEnriquecimento;
  quando: 'automatico' | 'oferecer';
}

export interface Ditado {
  modelo?: ModeloTranscricao;
  modeloAlternativo?: ModeloTranscricao;
  enriquecimento?: ConfiguracaoEnriquecimentoDitado;
}

export const MODELO_TRANSCRICAO_PADRAO: ModeloTranscricao = 'google/gemini-3.5-transcribe';
export const TAMANHO_MAXIMO_AUDIO = 14 * 1024 * 1024;

export const DITADOS = {
  comentario: { modeloAlternativo: 'openai/gpt-4o-transcribe' },
  'comentario-para-tarefa': {
    modelo: 'openai/gpt-4o-transcribe',
    enriquecimento: { perfil: 'comentario-para-tarefa', quando: 'oferecer' },
  },
} satisfies Record<string, Ditado>;

export type NomeDitado = keyof typeof DITADOS;

export function ehNomeDitado(valor: string): valor is NomeDitado {
  return Object.prototype.hasOwnProperty.call(DITADOS, valor);
}

export function configuracaoDitado(nome: NomeDitado): Required<Pick<Ditado, 'modelo'>> & Ditado {
  const configuracao: Ditado = DITADOS[nome];
  return {
    ...configuracao,
    modelo: configuracao.modelo ?? MODELO_TRANSCRICAO_PADRAO,
  };
}

export function mimeAudioAceito(mime: string): boolean {
  const base = mime.toLowerCase().split(';', 1)[0].trim();
  return base === 'audio/webm' || base === 'audio/mp4' || base === 'audio/wav';
}
