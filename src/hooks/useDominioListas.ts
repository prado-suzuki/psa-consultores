// Aliases de listagem que coexistem com os hooks de entidade.
// Pages que precisam do array completo (ex.: DocumentosPage exibe lista)
// usam `useXLista`. Mantém compatibilidade histórica.

export { useProjetos as useProjetosLista } from './useProjetos';
export { useProcessos as useProcessosLista } from './useProcessos';
export { useEtapas as useEtapasLista } from './useEtapas';
export { useResponsaveis as useResponsaveisLista } from './useResponsaveis';
export { useMelhorias as useMelhoriasLista } from './useMelhorias';
export { useGargalos as useGargalosLista } from './useGargalos';
export { useSistemas as useSistemasLista } from './useSistemas';
export { useDocumentos as useDocumentosLista } from './useDocumentos';
export { useProcesso as useProcessoUnico } from './useProcessos';
