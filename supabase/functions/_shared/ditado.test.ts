import { describe, expect, it } from 'vitest';

import {
  configuracaoDitado,
  ehNomeDitado,
  mimeAudioAceito,
  MODELO_TRANSCRICAO_PADRAO,
} from './ditado';

describe('configuração de ditado', () => {
  it('mantém o modelo no servidor e aplica o padrão por nome', () => {
    expect(configuracaoDitado('comentario')).toEqual({ modelo: MODELO_TRANSCRICAO_PADRAO });
    expect(ehNomeDitado('comentario')).toBe(true);
    expect(ehNomeDitado('modelo-escolhido-pelo-front')).toBe(false);
  });

  it('devolve a política de enriquecimento sem misturá-la à transcrição', () => {
    expect(configuracaoDitado('comentario-para-tarefa')).toMatchObject({
      modelo: 'openai/gpt-4o-transcribe',
      enriquecimento: { perfil: 'comentario-para-tarefa', quando: 'oferecer' },
    });
  });
});

describe('mimeAudioAceito', () => {
  it.each(['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/wav'])('aceita %s', (mime) =>
    expect(mimeAudioAceito(mime)).toBe(true),
  );

  it.each(['video/webm', 'audio/mpeg', 'application/octet-stream'])('recusa %s', (mime) =>
    expect(mimeAudioAceito(mime)).toBe(false),
  );
});
