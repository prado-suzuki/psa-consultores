import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

interface LinhaDeCnpj {
  cliente_id: string;
  cpf_cnpj: string | null;
}

/**
 * Os CNPJs de cada cliente, para o campo de cliente se deixar buscar por CNPJ.
 *
 * CLIENTE NÃO TEM CNPJ: a coluna não existe em `cliente`. O documento mora em
 * `contribuinte`, e um cliente tem vários — daí o índice ser um mapa de
 * `cliente_id` para lista, e não um campo a mais na lista de clientes.
 *
 * A consulta é SEPARADA da lista de clientes de propósito. Acoplar os dois
 * mudaria a forma do que já está em cache sob `clientes-list` / `clientes-lista`
 * (duas chaves distintas, em hooks distintos), e este mapa serve as duas. Como
 * ele é indexado por cliente e a chave não tem parâmetro, o React Query serve
 * a mesma resposta a todas as telas que pedirem — uma consulta por sessão, não
 * uma por tela.
 *
 * Falha aqui NÃO derruba o campo: sem dado, o mapa fica vazio, o CNPJ some da
 * lista e a busca por nome continua inteira. É de propósito — o CNPJ é um
 * atalho, e atalho que cai não pode levar o caminho principal junto.
 *
 * Nada disto tem relação com a consulta de CNPJ da Receita que preenche
 * endereço no cadastro de cliente (`useExternalConsults`, BrasilAPI): aquela
 * chama API externa e escreve em formulário; esta só lê a própria tabela.
 */
export function useCnpjsPorCliente() {
  const consulta = useQuery({
    queryKey: ['clientes-cnpjs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribuinte')
        .select('cliente_id, cpf_cnpj')
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente);

      if (error) {
        console.error('Erro ao buscar CNPJs dos clientes:', error);
        throw new Error(`Erro ao carregar CNPJs dos clientes: ${error.message}`);
      }

      return data as LinhaDeCnpj[];
    },
  });

  return useMemo(() => {
    const mapa: Record<string, string[]> = {};
    for (const linha of consulta.data ?? []) {
      if (!linha.cliente_id || !linha.cpf_cnpj) continue;
      (mapa[linha.cliente_id] ??= []).push(linha.cpf_cnpj);
    }
    return mapa;
  }, [consulta.data]);
}
