// Fonte única das etapas por CENÁRIO (AS-IS / TO-BE), já enriquecidas (id→nome de
// docs/sistemas/responsáveis) e agrupadas por processo.
//
// É a fundação do modelo por-cenário (paridade no processo, etapas independentes
// por cenário): substitui a leitura de `etapa.ficou` (espelho pareado por id) por
// duas listas independentes. Consumidores (ROI, SOP, telas) devem obter o TO-BE
// daqui — não de `.ficou`. Ver plans/PLANO_tobe_cenarios_refactor.md.

import { useMemo } from 'react';
import type { Etapa } from '@/types';
import {
  useEtapasLista, useEtapasToBeLista,
  useDocumentosLista, useSistemasLista, useResponsaveisLista,
} from '@/hooks/useDominioListas';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { groupEtapasPorProcesso } from '@/utils/groupEtapas';

export interface EtapasPorCenario {
  /** Etapas AS-IS (lista plana, enriquecida). */
  asis: Etapa[];
  /** Etapas TO-BE (lista plana, enriquecida). */
  tobe: Etapa[];
  /** AS-IS agrupadas por process_id (ordenadas por stage_order). */
  asisPorProcesso: Map<string, Etapa[]>;
  /** TO-BE agrupadas por process_id (ordenadas por stage_order). */
  tobePorProcesso: Map<string, Etapa[]>;
}

export function useEtapasPorCenario(): EtapasPorCenario {
  const { data: rawAsis = [] } = useEtapasLista();
  const { data: rawTobe = [] } = useEtapasToBeLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();

  const asis = useMemo(
    () => enrichEtapas(rawAsis, documentos, sistemas, responsaveis),
    [rawAsis, documentos, sistemas, responsaveis],
  );
  const tobe = useMemo(
    () => enrichEtapas(rawTobe, documentos, sistemas, responsaveis),
    [rawTobe, documentos, sistemas, responsaveis],
  );
  const asisPorProcesso = useMemo(() => groupEtapasPorProcesso(asis), [asis]);
  const tobePorProcesso = useMemo(() => groupEtapasPorProcesso(tobe), [tobe]);

  return { asis, tobe, asisPorProcesso, tobePorProcesso };
}
