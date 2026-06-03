import { createEntityHooks } from './_createEntityHooks';
import type { Melhoria } from '@/types';
import { melhoriaFromDb, melhoriaToDb } from '@/utils/mapa/dbMappers';

const hooks = createEntityHooks<Melhoria>({
  resource: 'process_improvements',
  defaultOrder: 'created_at',
  fromDb: r => melhoriaFromDb(r) as Melhoria,
  toDb: melhoriaToDb,
});

export const useMelhorias = hooks.useList;
export const useMelhoria = hooks.useById;
export const useCreateMelhoria = hooks.useCreate;
export const useUpdateMelhoria = hooks.useUpdate;
export const useDeleteMelhoria = hooks.useDelete;
