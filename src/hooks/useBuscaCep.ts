import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { consultarViaCep, type EnderecoDoCep } from '@/lib/viaCep';

/** Consulta o ViaCEP e avisa por toast quando não encontra; devolve null nesse caso. */
export function useBuscaCep() {
  const [buscando, setBuscando] = useState(false);
  const buscar = useCallback(async (cep: string): Promise<EnderecoDoCep | null> => {
    setBuscando(true);
    try {
      const encontrado = await consultarViaCep(cep);
      if (!encontrado) toast.error('CEP não encontrado');
      return encontrado;
    } catch {
      toast.error('Não foi possível consultar o CEP agora');
      return null;
    } finally {
      setBuscando(false);
    }
  }, []);
  return { buscar, buscando };
}
