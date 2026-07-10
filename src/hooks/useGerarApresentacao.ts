import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Decks da apresentação PSA (segue a separação do pptx original).
export type DeckTipo = 'ambas' | 'patrimonial' | 'societaria';

type ArquivoGerado = { tipo: 'patrimonial' | 'societaria'; nome: string; url: string };

// Contrato com a Edge Function `gerar-apresentacao` (Deno + Storage — sem Cloud Run;
// ver projects/osg/plans/RELATORIO_pendencias_migrations_edge.md §2):
//   body → { clienteId: string; tipo: DeckTipo }
//   resp → { arquivos: ArquivoGerado[] }   (URLs assinadas no Storage)
const EDGE_FN = 'gerar-apresentacao';

function baixar(url: string, nome: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Dispara a geração dos decks .pptx no servidor e baixa o resultado.
 * Enquanto a Edge Function não estiver publicada, falha de forma amigável
 * (o botão fica "pronto para o final", como pedido).
 */
export function useGerarApresentacao(clienteId: string | null) {
  const [gerando, setGerando] = useState<DeckTipo | null>(null);

  const gerar = async (tipo: DeckTipo) => {
    if (!clienteId || gerando) return;
    setGerando(tipo);
    try {
      const { data, error } = await supabase.functions.invoke<{ arquivos: ArquivoGerado[] }>(EDGE_FN, {
        body: { clienteId, tipo },
      });
      if (error) throw error;
      const arquivos = data?.arquivos ?? [];
      if (!arquivos.length) throw new Error('sem-arquivos');
      // baixa em sequência (pequeno atraso p/ o navegador não bloquear múltiplos downloads)
      arquivos.forEach((f, i) => window.setTimeout(() => baixar(f.url, f.nome), i * 400));
      toast({
        title: 'Apresentação gerada',
        description: arquivos.length > 1
          ? `${arquivos.length} arquivos .pptx baixando…`
          : `${arquivos[0].nome} baixando…`,
      });
    } catch {
      // Ainda não publicado no servidor → mensagem informativa (não é erro do usuário).
      toast({
        title: 'Geração ainda não publicada',
        description:
          'Assim que a Edge Function "gerar-apresentacao" subir no servidor, este botão baixa os .pptx no modelo PSA. Por ora, use "Copiar tabela".',
      });
    } finally {
      setGerando(null);
    }
  };

  return { gerar, gerando };
}
