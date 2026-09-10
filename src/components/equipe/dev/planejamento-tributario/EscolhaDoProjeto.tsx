import { useEffect, useState } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useProjetosDaOrdemDeServico,
  type ProjetoDaOrdemDeServico,
} from '@/hooks/useDomainPapelDeTrabalho';

/**
 * Pergunta a que projeto da OS o papel de trabalho pertence.
 *
 * **Por que perguntar, em vez de deduzir.** Uma ordem de serviço tem vários
 * projetos: o Agro Amazônia tem Planejamento Tributário, Recuperação de Créditos
 * e Levantamento de Créditos na mesma OS. O planejamento se prendia só à OS, e
 * ninguém sabia de qual projeto o papel de trabalho era. Sem essa resposta, o
 * aviso de nova revisão teria de ir para todos os projetos, incomodando quem não
 * tem nada com aquele trabalho. Decisão do Bernardo em 08/09/2026.
 *
 * **Aparece na hora de gravar, e não antes.** Escolher o projeto só faz sentido
 * depois de a planilha ter sido conferida: se ela for recusada, não há revisão e
 * a pergunta não se aplica.
 *
 * **Da segunda vez em diante ele mostra o que já está ligado**, em vez de
 * perguntar do zero. Trocar continua possível, porque errar o projeto na primeira
 * revisão não pode virar sentença.
 */
export function EscolhaDoProjeto({
  aberto,
  onFechar,
  ordemServicoId,
  projetoAtual,
  gravando,
  onConfirmar,
}: {
  aberto: boolean;
  onFechar: () => void;
  ordemServicoId: string;
  /** O projeto já ligado ao planejamento, quando ele existe. */
  projetoAtual: string | null;
  gravando: boolean;
  onConfirmar: (projeto: ProjetoDaOrdemDeServico) => void;
}) {
  const { data: projetos = [], isLoading } = useProjetosDaOrdemDeServico(
    aberto ? ordemServicoId : null,
  );
  const [escolhido, setEscolhido] = useState('');

  /* Reabrir o modal volta ao que está ligado, não ao que foi escolhido antes. */
  useEffect(() => {
    if (aberto) setEscolhido(projetoAtual ?? '');
  }, [aberto, projetoAtual]);

  const projeto = projetos.find((p) => p.id === escolhido);
  const trocando = projetoAtual !== null && escolhido !== '' && escolhido !== projetoAtual;
  /* Projetos da OS em que a pessoa não está: aparecem, marcados, sem poder escolher. */
  const fora = projetos.filter((p) => !p.podeVincular).length;
  const nenhumDisponivel = projetos.length > 0 && fora === projetos.length;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !gravando && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>A que projeto este papel de trabalho pertence?</DialogTitle>
          <DialogDescription>
            Esta ordem de serviço tem mais de um projeto. O projeto que você escolher é quem recebe
            o aviso de que existe papel de trabalho novo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="ep-projeto">
              Projeto
              <RequiredMark />
            </Label>
          </div>
          <Select
            value={escolhido}
            onValueChange={setEscolhido}
            disabled={isLoading || projetos.length === 0 || gravando}
          >
            <SelectTrigger id="ep-projeto">
              <SelectValue
                placeholder={
                  isLoading
                    ? 'Carregando…'
                    : projetos.length === 0
                      ? 'Esta OS não tem projeto cadastrado'
                      : 'Selecione o projeto'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {projetos.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={!p.podeVincular}>
                  {p.name}
                  {!p.podeVincular && ' — você não está neste projeto'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/*
            Sem projeto na OS não há como cumprir a regra, e o texto diz o que
            fazer em vez de deixar a pessoa presa num modal que não fecha nada.
          */}
          {!isLoading && projetos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum projeto foi cadastrado nesta ordem de serviço. Peça para cadastrar o projeto
              antes de subir o papel de trabalho, senão não há a quem avisar.
            </p>
          )}

          {/*
            Todos os projetos da OS são de outras pessoas. Antes disso o modal
            deixava escolher e a função recusava depois, com a revisão já gravada
            sem vínculo: a pessoa andava até a parede.
          */}
          {!isLoading && nenhumDisponivel && (
            <p className="text-sm text-muted-foreground">
              Você não está em nenhum dos projetos desta ordem de serviço, e só quem é líder,
              responsável ou membro pode ligar o papel de trabalho a um projeto. Peça para ser
              incluído no projeto certo, ou peça a quem está nele para subir o arquivo.
            </p>
          )}

          {trocando && (
            <p className="text-sm text-warning">
              Você está trocando o projeto deste planejamento. As revisões que já existem continuam
              as mesmas; o aviso desta em diante vai para o projeto novo.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={gravando}>
            Cancelar
          </Button>
          <Button onClick={() => projeto && onConfirmar(projeto)} disabled={!projeto || gravando}>
            {gravando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FolderOpen className="mr-2 h-4 w-4" aria-hidden />
            )}
            {gravando ? 'Gravando…' : 'Gravar a revisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
