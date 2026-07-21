import type { NavigateFunction } from 'react-router-dom';
import type { ItemDiagnostico } from '@/utils/diagnosticoRoi';

export function temDestino(item: ItemDiagnostico): boolean {
  if (item.alvoEtapaId || item.alvo) return true;
  const fonte = item.camposFonte?.[0] || '';
  return (
    fonte.startsWith('etapa') ||
    fonte.startsWith('processos') ||
    fonte.startsWith('responsaveis') ||
    fonte.startsWith('sistemas') ||
    fonte.startsWith('melhoria')
  );
}

export function editarItemDiagnostico(
  item: ItemDiagnostico,
  navigate: NavigateFunction,
  onEditarEtapas?: (etapaId?: string) => void,
): void {
  if (item.alvoEtapaId) {
    onEditarEtapas?.(item.alvoEtapaId);
    return;
  }
  if (item.alvo) {
    navigate(item.alvo.rota, { state: { focusId: item.alvo.focusId } });
    return;
  }
  const fonte = item.camposFonte?.[0] || '';
  if (fonte.startsWith('etapa')) {
    onEditarEtapas?.();
    return;
  }
  if (fonte.startsWith('processos')) navigate('/equipe/digital/mapa/processos');
  else if (fonte.startsWith('responsaveis')) navigate('/equipe/digital/mapa/responsaveis');
  else if (fonte.startsWith('sistemas')) navigate('/equipe/digital/mapa/sistemas');
  else if (fonte.startsWith('melhoria')) navigate('/equipe/digital/mapa/melhorias');
}
