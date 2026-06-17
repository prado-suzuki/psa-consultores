import { createEntityHooks } from './_createEntityHooks';
import type { Sistema } from '@/types';

const hooks = createEntityHooks<Sistema>({
  resource: 'sistemas_processo',
  defaultOrder: 'nome',
});

export const useSistemas = hooks.useList;
export const useSistema = hooks.useById;
export const useCreateSistema = hooks.useCreate;
export const useUpdateSistema = hooks.useUpdate;
export const useDeleteSistema = hooks.useDelete;
