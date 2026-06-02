import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Glue entre o domínio OSG (matrícula/bem/cartório/titulares) e o vocabulário de
// campos do gerador. Para o documento "Descrição de Imóvel Rural", a matrícula é a
// âncora dos dados do cliente. Outros tipos de documento terão resolvers próprios.

const UF_EXTENSO: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará',
  PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
  SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

/** Converte a sigla da UF para o nome por extenso (ex.: "MT" → "Mato Grosso"). Mantém o valor se já vier por extenso. */
export function ufPorExtenso(uf: string | null | undefined): string {
  if (!uf) return '';
  return UF_EXTENSO[uf.trim().toUpperCase()] ?? uf;
}

/**
 * Busca uma matrícula e mapeia seus dados para os campos de ENTRADA do vocabulário
 * (mesmas chaves que o usuário preencheria à mão). Campos sem dado ficam de fora.
 */
export function useEntradasMatricula(matriculaId: string | null) {
  return useQuery({
    queryKey: ['entradas-matricula', matriculaId],
    enabled: !!matriculaId,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from('matricula')
        .select(`
          numero, livro, folha, municipio_imovel, uf_imovel,
          area_documento, area_unidade, confrontacoes_texto, descricao_psa_completa,
          bem:bem_id ( denominacao, vlr_contabil, ccir_codigo ),
          cartorio:cartorio_id ( nome_completo, comarca, uf ),
          titularidade ( titular:titular_pessoa_id ( denominacao ) )
        `)
        .eq('id', matriculaId!)
        .single();
      if (error) throw error;

      const m = data as unknown as {
        numero: string | null; livro: string | null; folha: string | null;
        municipio_imovel: string | null; uf_imovel: string | null;
        area_documento: number | null; area_unidade: string | null;
        confrontacoes_texto: string | null; descricao_psa_completa: string | null;
        bem: { denominacao: string | null; vlr_contabil: number | null; ccir_codigo: string | null } | null;
        cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
        titularidade: Array<{ titular: { denominacao: string | null } | null }>;
      };

      const valores: Record<string, string> = {};
      const set = (chave: string, valor: unknown) => {
        if (valor !== null && valor !== undefined && valor !== '') valores[chave] = String(valor);
      };

      // Área: o gerador trabalha em hectares; converte se a matrícula estiver em m².
      let areaHa = m.area_documento ?? null;
      if (areaHa != null && m.area_unidade === 'm2') areaHa = areaHa / 10000;
      set('areaHa', areaHa);

      const proprietarios = (m.titularidade ?? [])
        .map((t) => t.titular?.denominacao)
        .filter(Boolean);

      set('denominacao', m.bem?.denominacao);
      set('proprietario', proprietarios.join(' e '));
      set('valorContabil', m.bem?.vlr_contabil);
      set('municipio', m.municipio_imovel);
      set('uf', ufPorExtenso(m.uf_imovel));
      set('matricula', m.numero);
      set('livro', m.livro);
      set('folha', m.folha);
      set('cartorio', m.cartorio?.nome_completo);
      set('comarca', m.cartorio?.comarca);
      set('ufCartorio', ufPorExtenso(m.cartorio?.uf));
      set('ccir', m.bem?.ccir_codigo);
      set('confrontacoes', m.confrontacoes_texto ?? m.descricao_psa_completa);

      return valores;
    },
  });
}
