import { createEntityHooks } from './_createEntityHooks';
import type { Gargalo } from '@/types';

const hooks = createEntityHooks<Gargalo>({
  resource: 'gargalos',
  defaultOrder: 'nome',
});

export const useGargalos = hooks.useList;
export const useGargalo = hooks.useById;
export const useCreateGargalo = hooks.useCreate;
export const useUpdateGargalo = hooks.useUpdate;
export const useDeleteGargalo = hooks.useDelete;
