import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { consultarCnpj, type DadosDoCnpj } from '@/lib/brasilApiCnpj';

/** Consulta a BrasilAPI e avisa por toast quando não encontra; devolve null nesse caso. */
export function useBuscaCnpj() {
  const [buscando, setBuscando] = useState(false);
  const buscar = useCallback(async (cnpj: string): Promise<DadosDoCnpj | null> => {
    setBuscando(true);
    try {
      const encontrado = await consultarCnpj(cnpj);
      if (encontrado) toast.success('Dados preenchidos via CNPJ');
      else toast.error('CNPJ não encontrado na base federal');
      return encontrado;
    } catch {
      toast.error('Não foi possível consultar o CNPJ agora');
      return null;
    } finally {
      setBuscando(false);
    }
  }, []);
  return { buscar, buscando };
}
