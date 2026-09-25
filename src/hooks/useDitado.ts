import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';

export type EstadoDitado = 'ocioso' | 'gravando' | 'transcrevendo' | 'erro';

/**
 * Tarefa extraída pela Edge Function. Os campos *_mencionado carregam NOMES como
 * ditados — nunca IDs: quem resolve contra os cadastros permitidos é o frontend
 * (`src/lib/resolverTarefaDitada.ts`).
 */
export interface TarefaSugeridaDoDitado {
  titulo: string;
  descricao: string;
  responsavel_mencionado: string | null;
  cliente_mencionado: string | null;
  projeto_mencionado: string | null;
  horas_estimadas: number | null;
  transcricaoOriginal: string;
  classificacao: {
    nome: string;
    versao: number;
    classe: string;
    certeza: 'alta' | 'media' | 'baixa';
  };
}

export type ResultadoDitado =
  | { texto: string; acao: { tipo: 'inserir_texto' } }
  | {
      texto: string;
      acao: {
        tipo: 'abrir_tarefa';
        titulo: string;
        descricao: string;
        responsavel_mencionado: string | null;
        cliente_mencionado: string | null;
        projeto_mencionado: string | null;
        horas_estimadas: number | null;
        classificacao: TarefaSugeridaDoDitado['classificacao'];
      };
    };

interface UseDitadoOptions {
  ditado: string;
  onResultado: (resultado: ResultadoDitado) => void;
  limiteMs?: number;
}

const LIMITE_PADRAO_MS = 120_000;
const TEMPO_REUSO_MICROFONE_MS = 15_000;

export function escolherMimeTypeDitado(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const tipos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return tipos.find((tipo) => MediaRecorder.isTypeSupported?.(tipo));
}

export function normalizarMimeDitado(mime: string): string {
  const base = mime.toLowerCase().split(';', 1)[0].trim();
  if (base === 'video/webm' || base === 'audio/webm') return 'audio/webm';
  if (base === 'audio/mp4') return 'audio/mp4';
  if (base === 'audio/wav') return 'audio/wav';
  return 'audio/webm';
}

function extensaoDoMime(mime: string): string {
  if (mime.startsWith('audio/mp4')) return 'm4a';
  if (mime.startsWith('audio/wav')) return 'wav';
  return 'webm';
}

function mensagemDoMicrofone(erro: unknown): string {
  if (erro instanceof DOMException) {
    if (erro.name === 'NotAllowedError' || erro.name === 'SecurityError') {
      return 'Permita o acesso ao microfone para usar o ditado.';
    }
    if (erro.name === 'NotFoundError') return 'Nenhum microfone foi encontrado.';
    if (erro.name === 'NotReadableError')
      return 'O microfone está sendo usado por outro aplicativo.';
  }
  return erro instanceof Error ? erro.message : 'Não foi possível iniciar o ditado.';
}

async function mensagemDaEdgeFunction(erro: Error): Promise<string> {
  const contexto = (erro as Error & { context?: unknown }).context;
  if (!(contexto instanceof Response)) return erro.message;
  try {
    const payload = (await contexto.clone().json()) as { error?: unknown };
    return typeof payload.error === 'string' && payload.error ? payload.error : erro.message;
  } catch {
    return erro.message;
  }
}

export function useDitado({ ditado, onResultado, limiteMs = LIMITE_PADRAO_MS }: UseDitadoOptions) {
  const [estado, setEstado] = useState<EstadoDitado>('ocioso');
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limiteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liberacaoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const montadoRef = useRef(true);
  const onResultadoRef = useRef(onResultado);
  onResultadoRef.current = onResultado;

  const limparRelogios = () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    if (limiteRef.current) clearTimeout(limiteRef.current);
    intervaloRef.current = null;
    limiteRef.current = null;
  };

  const liberarMicrofone = () => {
    if (liberacaoRef.current) clearTimeout(liberacaoRef.current);
    liberacaoRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const agendarLiberacaoMicrofone = () => {
    if (liberacaoRef.current) clearTimeout(liberacaoRef.current);
    liberacaoRef.current = setTimeout(liberarMicrofone, TEMPO_REUSO_MICROFONE_MS);
  };

  const parar = () => {
    limparRelogios();
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
      return;
    }
    liberarMicrofone();
  };
  const pararRef = useRef(parar);
  pararRef.current = parar;

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      limparRelogios();
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder?.state === 'recording') recorder.stop();
      liberarMicrofone();
    };
  }, []);

  const enviarAudio = async (partes: Blob[], mimeGravado: string) => {
    if (!montadoRef.current) return;
    const mime = normalizarMimeDitado(mimeGravado);
    const audio = new Blob(partes, { type: mime });
    if (audio.size === 0) {
      setEstado('erro');
      setErro('Nenhum áudio foi capturado.');
      agendarLiberacaoMicrofone();
      return;
    }

    setEstado('transcrevendo');
    try {
      const formulario = new FormData();
      formulario.append('ditado', ditado);
      formulario.append('file', audio, `ditado.${extensaoDoMime(mime)}`);
      const { data, error } = await supabase.functions.invoke<ResultadoDitado>('ditar', {
        body: formulario,
      });
      if (error) throw new Error(await mensagemDaEdgeFunction(error));
      if (!data || typeof data.texto !== 'string' || !data.texto.trim()) {
        throw new Error('A transcrição não devolveu texto.');
      }
      if (!montadoRef.current) return;
      onResultadoRef.current({ ...data, texto: data.texto.trim() });
      setEstado('ocioso');
      setSegundos(0);
    } catch (falha) {
      if (!montadoRef.current) return;
      setEstado('erro');
      setErro(falha instanceof Error ? falha.message : 'Não foi possível transcrever o áudio.');
    } finally {
      if (montadoRef.current) agendarLiberacaoMicrofone();
    }
  };

  const iniciar = async () => {
    if (estado === 'gravando') {
      parar();
      return;
    }
    if (estado === 'transcrevendo') return;
    setErro(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setEstado('erro');
      setErro('Este navegador não oferece gravação de áudio.');
      return;
    }

    try {
      if (liberacaoRef.current) clearTimeout(liberacaoRef.current);
      liberacaoRef.current = null;
      const streamExistente = streamRef.current;
      const stream = streamExistente?.getTracks().some((track) => track.readyState === 'live')
        ? streamExistente
        : await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!montadoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = escolherMimeTypeDitado();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const partes: Blob[] = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (evento) => {
        if (evento.data.size > 0) partes.push(evento.data);
      };
      recorder.onstop = () => {
        recorderRef.current = null;
        void enviarAudio(partes, recorder.mimeType || mimeType || 'audio/webm');
      };
      recorder.onerror = () => {
        limparRelogios();
        liberarMicrofone();
        setEstado('erro');
        setErro('A gravação do áudio falhou.');
      };

      recorder.start();
      const inicio = Date.now();
      setSegundos(0);
      setEstado('gravando');
      intervaloRef.current = setInterval(() => {
        setSegundos(
          Math.min(Math.floor((Date.now() - inicio) / 1000), Math.floor(limiteMs / 1000)),
        );
      }, 250);
      limiteRef.current = setTimeout(() => pararRef.current(), limiteMs);
    } catch (falha) {
      liberarMicrofone();
      setEstado('erro');
      setErro(mensagemDoMicrofone(falha));
    }
  };

  return { estado, segundos, erro, iniciar, parar };
}
