import { useEffect, useState } from 'react';
import { ArrowRight, Trash2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CelulaEditada, LinhaDaGrade } from '@/lib/protocoloRemuneracao';

/**
 * Escreve a regra de UM item do protocolo, para todas as colunas de uma vez.
 *
 * **Por item, e não por célula.** Quem preenche pensa por assunto: a conversa
 * com a família anda item por item ("e o carro, como fica?"), e a planilha é
 * organizada assim. Uma caixa por célula seriam 156 aberturas num protocolo de
 * 52 itens e 3 colunas; por item são 52, e as colunas aparecem lado a lado, que
 * é justamente a comparação que o consultor está fazendo.
 *
 * **Campo de texto livre, e não lista de opções.** A célula do protocolo JÁ É a
 * frase do documento: no Potrich, "R$ 45.000,00 por Fundador" e "Há cada 02
 * (dois) anos ou 150 mil km, o que ocorrer primeiro". Não há o que escolher,
 * há o que redigir.
 *
 * **Deixar em branco apaga a regra.** É o que a pessoa espera de um campo que
 * ela esvaziou, e é diferente de escrever "Não se aplica", que é uma resposta
 * que a consultoria dá de propósito e aparece nos documentos reais.
 */
export function ProtocoloLinhaModal({
  open,
  onOpenChange,
  linha,
  salvando,
  onSalvar,
  onTirarDoProtocolo,
  onProxima,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  linha: LinhaDaGrade | null;
  salvando: boolean;
  onSalvar: (celulas: CelulaEditada[]) => Promise<unknown>;
  onTirarDoProtocolo: () => void;
  /** Ausente quando a linha aberta é a última do protocolo. */
  onProxima?: () => void;
}) {
  const [textos, setTextos] = useState<Record<string, string>>({});

  /*
   * Recarrega ao trocar de linha, e não só ao abrir: o botão "Salvar e ir para o
   * próximo" troca a linha com a caixa aberta, e sem o `linha_id` na dependência
   * o item seguinte apareceria com o texto do anterior.
   */
  useEffect(() => {
    if (!linha) return;
    setTextos(
      Object.fromEntries(linha.celulas.map((c) => [c.beneficiario_id, c.texto ?? ''])),
    );
  }, [linha?.linha_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!linha) return null;

  const celulas = (): CelulaEditada[] =>
    linha.celulas.map((c) => ({
      beneficiario_id: c.beneficiario_id,
      texto: textos[c.beneficiario_id] ?? '',
    }));

  const salvar = async (irParaProxima: boolean) => {
    await onSalvar(celulas());
    if (irParaProxima && onProxima) onProxima();
    else onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{linha.item}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {linha.celulas.map((c) => (
            <div key={c.beneficiario_id} className="space-y-1.5">
              <Label htmlFor={`regra-${c.beneficiario_id}`}>{c.beneficiario}</Label>
              <Textarea
                id={`regra-${c.beneficiario_id}`}
                rows={3}
                value={textos[c.beneficiario_id] ?? ''}
                onChange={(e) =>
                  setTextos((antes) => ({ ...antes, [c.beneficiario_id]: e.target.value }))
                }
                placeholder="O que vale para este grupo neste item. Em branco, nada é escrito no documento."
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {/*
            Tirar fica longe dos botões de salvar, e não na mesma ponta: um clique
            errado aqui apaga parágrafo escrito à mão, sem desfazer.
          */}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onTirarDoProtocolo}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Tirar do protocolo
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
              Cancelar
            </Button>
            {onProxima && (
              <Button variant="outline" onClick={() => salvar(true)} disabled={salvando}>
                Salvar e ir para o próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button onClick={() => salvar(false)} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
