// O que a tela de checklist do cliente e as peças dela compartilham.
//
// Existe porque as três peças extraídas (ResumoHero, LinhaPendencia,
// ArquivoEnviado) e o componente que as monta leem as mesmas três coisas. Sem um
// lugar comum, elas seriam duplicadas — e o rótulo de estado duplicado é como
// duas partes da mesma tela passam a chamar o mesmo estado por nomes diferentes.
//
// Só estilo e vocabulário aqui: nada que renderize, para o fast refresh continuar
// funcionando nos componentes.
import { estadoDoDocumento, type EstadoDocumento } from '@/lib/estadoDocumento';
import type { PendenciaCliente } from '@/hooks/useDomainPendenciasCliente';

/** Anel de foco do portal do cliente. A área da equipe usa o verde-musgo da OSG. */
export const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

/** O vocabulário do portal para os quatro estados (o consultor usa outro). */
export const ESTADO_LABEL: Record<EstadoDocumento, string> = {
  pendente: 'Falta enviar',
  em_analise: 'Em análise',
  recusado: 'Recusado',
  aprovado: 'Aprovado',
};

export const estadoDaPendencia = (pendencia: PendenciaCliente): EstadoDocumento =>
  estadoDoDocumento(pendencia.recebido, pendencia.arquivos);
