import { createEntityHooks } from './_createEntityHooks';
import type { Processo } from '@/types';
import { processoFromDb, processoToDb } from '@/utils/mapa/dbMappers';

const hooks = createEntityHooks<Processo>({
  resource: 'processes',
  defaultOrder: 'order_index',
  fromDb: r => processoFromDb(r) as Processo,
  toDb: processoToDb,
});

export const useProcessos = hooks.useList;
export const useProcesso = hooks.useById;
export const useCreateProcesso = hooks.useCreate;
export const useUpdateProcesso = hooks.useUpdate;
export const useDeleteProcesso = hooks.useDelete;
