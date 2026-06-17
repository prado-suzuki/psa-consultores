import { createEntityHooks } from './_createEntityHooks';
import type { Documento } from '@/types';

const hooks = createEntityHooks<Documento>({
  resource: 'documentos_processo',
  defaultOrder: 'nome',
});

export const useDocumentos = hooks.useList;
export const useDocumento = hooks.useById;
export const useCreateDocumento = hooks.useCreate;
export const useUpdateDocumento = hooks.useUpdate;
export const useDeleteDocumento = hooks.useDelete;
