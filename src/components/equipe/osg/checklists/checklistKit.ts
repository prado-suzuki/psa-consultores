import type { LucideIcon } from 'lucide-react';
import { Building2, ClipboardCheck, FolderKanban, Landmark, User } from 'lucide-react';
import type { ClusterChecklist, LinhaChecklist, StatusChecklist } from '@/lib/checklistDerivado';
import { estadoDoDocumento, type EstadoDocumento } from '@/lib/estadoDocumento';

/**
 * O vocabulário que a página do checklist e a ficha da entidade compartilham.
 *
 * Saiu de `ChecklistPendentes` quando a ficha virou arquivo próprio (teto de 600
 * linhas do AGENTS.md). Rótulo, peso de ordenação e estado da linha são lidos dos
 * dois lados: duplicá-los deixaria a lista e o modal divergindo no dia em que
 * alguém mudasse um.
 */

export const CLUSTER_LABEL: Record<ClusterChecklist, string> = {
  pessoa_pf: 'Pessoas Físicas',
  pessoa_pj: 'Pessoas Jurídicas',
  imovel_rural: 'Imóveis Rurais',
  imovel_urbano: 'Imóveis Urbanos',
  bem: 'Bens e Direitos',
  cliente: 'Documentos do Cliente',
};

export const CLUSTER_ICON: Record<ClusterChecklist, LucideIcon> = {
  pessoa_pf: User,
  pessoa_pj: Building2,
  imovel_rural: Landmark,
  imovel_urbano: Landmark,
  bem: FolderKanban,
  cliente: ClipboardCheck,
};

export const STATUS_LINHA: Record<StatusChecklist, { label: string; classe: string }> = {
  recebido: { label: 'Recebido', classe: 'bg-osg-moss/10 text-osg-moss' },
  pendente: { label: 'Pendente', classe: 'bg-osg-highlighter/25 text-osg-700' },
  nao_aplicavel: { label: 'Não se aplica', classe: 'bg-osg-100 text-osg-500' },
  dispensado: { label: 'Dispensado', classe: 'bg-osg-100 text-osg-500' },
};

/**
 * O vocabulário do consultor para os quatro estados (o portal chama de outro
 * jeito: "Falta enviar" no lugar de "Pendente", por exemplo). A conta em si é a
 * mesma, e mora em `@/lib/estadoDocumento`.
 */
export const ESTADO_LABEL: Record<EstadoDocumento, string> = {
  pendente: 'Pendente',
  em_analise: 'A revisar',
  recusado: 'Recusado',
  aprovado: 'Aprovado',
};

export const ESTADO_CHIP: Record<EstadoDocumento, string> = {
  pendente: 'border-osg-highlighter/50 bg-osg-highlighter/20 text-osg-700 hover:border-osg-highlighter',
  em_analise: 'border-osg-200 bg-osg-100/60 text-osg-600 hover:border-osg-300',
  recusado: 'border-osg-red/30 bg-osg-red/10 text-osg-red hover:border-osg-red/60',
  aprovado: 'border-osg-moss/30 bg-osg-moss/10 text-osg-moss hover:border-osg-moss/60',
};

/** O que fica no topo da ficha: primeiro o que pede ação, depois o resto. */
export const PESO_STATUS: Record<StatusChecklist, number> = {
  pendente: 0, recebido: 1, nao_aplicavel: 2, dispensado: 3,
};

/**
 * O estado de uma linha entre os quatro dos chips, ou `null` para o que não é
 * documento pendente de ninguém (dispensado e não aplicável são ausência de
 * pedido, não estado de documento).
 */
export const estadoDaLinha = (linha: LinhaChecklist): EstadoDocumento | null => {
  if (linha.status === 'dispensado' || linha.status === 'nao_aplicavel') return null;
  return estadoDoDocumento(linha.status === 'recebido', linha.arquivos);
};

/**
 * A caixa marcável do modal de aviso: canal e destinatário usam a MESMA.
 *
 * Existe como função compartilhada e não como classe copiada porque as duas
 * listas ficam empilhadas na mesma coluna. Qualquer divergência de borda ou de
 * fundo entre elas leria como diferença de significado — e não há: nas duas, o
 * analista está marcando o que entra no envio.
 *
 * Apagado, não verde, para o que não pode ir. Verde é a cor do MARCADO, e uma
 * linha morta com cara de linha ativa convida ao clique que não responde.
 */
export const caixaDeEscolhaCls = (
  { bloqueado, marcado }: { bloqueado: boolean; marcado: boolean },
): string => [
  'rounded-xl border px-3 py-3 transition-colors',
  bloqueado ? 'cursor-not-allowed' : 'cursor-pointer',
  bloqueado ? 'border-osg-100 bg-osg-50/50'
    : marcado ? 'border-osg-moss/50 bg-osg-moss/10'
      : 'border-osg-200 bg-background hover:bg-osg-50/60',
].join(' ');
