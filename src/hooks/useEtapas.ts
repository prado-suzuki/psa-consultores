import { createEntityHooks } from './_createEntityHooks';
import type { Etapa } from '@/types';
import { etapaFromDb, etapaToDb } from '@/utils/mapa/dbMappers';

const hooks = createEntityHooks<Etapa>({
  resource: 'process_stages',
  defaultOrder: 'stage_order',
  fromDb: r => etapaFromDb(r) as Etapa,
  toDb: e => etapaToDb(e, { scenario: 'AS-IS' }),
});

export const useEtapas = hooks.useList;
export const useEtapa = hooks.useById;
export const useCreateEtapa = hooks.useCreate;
export const useUpdateEtapa = hooks.useUpdate;
export const useDeleteEtapa = hooks.useDelete;

// Upsert da projeção TO-BE — vive em arquivo dedicado porque usa um
// `onConflict` composto (id, scenario) que o factory genérico não cobre.
export { useUpsertEtapaToBe } from './useEtapaToBe';
export type { UpsertEtapaToBeInput } from './useEtapaToBe';
