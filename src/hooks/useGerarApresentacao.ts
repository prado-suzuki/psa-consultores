import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Decks da apresentação PSA (segue a separação do pptx original).
export type DeckTipo = 'ambas' | 'patrimonial' | 'societaria';

type ArquivoGerado = { tipo: 'patrimonial' | 'societaria'; nome: string; b64: string };

// Contrato com a Edge Function `gerar-apresentacao` (Deno; SEM Storage — a função
// gera e devolve os bytes inline em base64, não persiste mais nada):
//   body → { clienteId: string; tipo: DeckTipo }
//   resp → { arquivos: ArquivoGerado[] }   (cada deck em base64)
const EDGE_FN = 'gerar-apresentacao';

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Os bytes voltam inline em base64 (a função não salva no Storage). Decodifica para
// um Blob e baixa via object URL same-origin: respeita o `nome` e garante que todos
// os arquivos venham (o navegador não dispara múltiplos downloads cross-origin de
// forma confiável).
function baixar(b64: string, nome: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const obj = URL.createObjectURL(new Blob([arr], { type: PPTX_MIME }));
  const a = document.createElement('a');
  a.href = obj;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(obj);
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
      // baixa um a um (blob a blob) — garante todos os arquivos e o nome correto
      for (const f of arquivos) baixar(f.b64, f.nome);
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
