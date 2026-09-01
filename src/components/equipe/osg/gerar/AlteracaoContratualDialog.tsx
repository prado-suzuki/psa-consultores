import { useState } from 'react';
import { ArrowLeft, ArrowRight, FileStack, Loader2, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { cn } from '@/lib/utils';
import type { FlagRow } from '@/hooks/useBibliotecaModelos';

interface AlteracaoContratualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome do documento registrado de que esta alteração parte. */
  documentoDeOrigem: string;
  /** Empresa cujo contrato está sendo alterado. */
  empresaLabel?: string;
  /** Flags de evento que ESTE modelo referencia. */
  flags: FlagRow[];
  /**
   * A prova de cada evento derivado, por `tmpl_flag.nome`. Flag sem evidência é
   * evento que o cadastro NÃO sustenta: continua na lista, desligado, porque o
   * consultor pode saber de algo que o cadastro ainda não sabe.
   */
  evidenciaPorFlagNome?: Map<string, string>;
  /** Rascunho local das respostas, por flag_id. */
  respostas: Record<string, boolean>;
  onAlternar: (flagId: string, valor: boolean) => void;
  onConfirmar: () => void;
  salvando: boolean;
}

/**
 * Assistente de ALTERAÇÃO CONTRATUAL.
 *
 * Por que é um modal na folha, e não um passo do assistente de geração: a
 * alteração é o diff sobre um contrato que JÁ VALEU. Perguntar "houve aumento de
 * capital?" antes de existir contrato registrado é perguntar sobre um documento
 * que ainda não produziu efeito nenhum — e num modelo de constituição a pergunta
 * não tem resposta possível. Aqui ela chega no momento certo: o consultor está
 * olhando a peça registrada e diz o que mudou depois dela.
 *
 * O primeiro passo deixou de ser PERGUNTA e virou CONFERÊNCIA. O livro de
 * movimentos (`movimentacao_quotas`) e a janela de `audit_logs` desde o
 * documento registrado já dizem o que aconteceu: cada evento chega marcado, com
 * a evidência que o sustenta ("aumento de capital de R$ 872.674,00 para
 * R$ 4.234.822,00"), e o consultor desmarca o que não quer nesta peça. O que o
 * cadastro não sustenta continua na lista, desligado, porque ele pode saber de
 * algo que o cadastro ainda não sabe.
 *
 * São dois passos porque a segunda tela não é confirmação decorativa: ela diz o
 * que o consultor tem de ter feito ANTES de gerar. O quadro societário já sai do
 * ledger, mas endereço, objeto e administração seguem sendo cadastro atualizado
 * à mão, e gerar com o cadastro velho produz um consolidado velho.
 */
export const AlteracaoContratualDialog = ({
  open,
  onOpenChange,
  documentoDeOrigem,
  empresaLabel,
  flags,
  evidenciaPorFlagNome,
  respostas,
  onAlternar,
  onConfirmar,
  salvando,
}: AlteracaoContratualDialogProps) => {
  const [passo, setPasso] = useState<1 | 2>(1);
  const marcadas = flags.filter((f) => respostas[f.id] === true);

  // Reabrir sempre começa do primeiro passo: o modal é curto e voltar ao meio
  // dele obrigaria a lembrar onde parou.
  const abrirFechar = (aberto: boolean) => {
    if (aberto) setPasso(1);
    onOpenChange(aberto);
  };

  return (
    <Dialog open={open} onOpenChange={abrirFechar}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-4 w-4 text-osg-moss" />
            Gerar alteração contratual
          </DialogTitle>
          <DialogDescription>
            A partir de <span className="font-medium text-foreground">{documentoDeOrigem}</span>
            {empresaLabel ? <> · {empresaLabel}</> : null}
          </DialogDescription>
        </DialogHeader>

        {passo === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">O que mudou desde o registro</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                A lista vem do que o cadastro registra depois do documento anterior: o livro de
                movimentos de quota e as mudanças de endereço e administração. Confira, e desmarque
                o que não deve entrar nesta peça. Cada evento marcado traz a resolução dele.
              </p>
            </div>

            <div className="space-y-2.5">
              {flags.map((flag, i) => {
                const ligada = respostas[flag.id] === true;
                const evidencia = evidenciaPorFlagNome?.get(flag.nome);
                return (
                  <div
                    key={flag.id}
                    className={cn(
                      'flex items-center gap-3 rounded-md border bg-card p-3 pl-4 transition-colors duration-200 animate-osg-card-in motion-reduce:animate-none',
                      ligada ? 'border-osg-moss/50 bg-osg-moss/[0.04]' : 'border-osg-200/80',
                    )}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <ToggleRight
                      aria-hidden
                      className={cn('h-4 w-4 shrink-0', ligada ? 'text-osg-moss' : 'text-slate-300')}
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Label
                        htmlFor={`evento-${flag.id}`}
                        className="block cursor-pointer text-sm font-medium text-foreground"
                      >
                        {flag.descricao || flag.nome}
                      </Label>
                      {/* A evidência é o que substitui a pergunta: em vez de
                          "houve aumento de capital?", os números que provam que
                          houve. Sem evidência, o cadastro não sustenta o evento.
                          Fora do <Label> de propósito: ela é a prova, não o nome
                          do interruptor, e no nome acessível só atrapalharia. */}
                      <p
                        className={cn(
                          'text-xs',
                          evidencia ? 'text-osg-700' : 'text-muted-foreground',
                        )}
                      >
                        {evidencia ?? 'nada no cadastro registra este evento'}
                      </p>
                    </div>
                    <Switch
                      id={`evento-${flag.id}`}
                      checked={ligada}
                      disabled={salvando}
                      onCheckedChange={(v) => onAlternar(flag.id, v)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {marcadas.length === 0
                  ? 'Nenhum evento marcado'
                  : `${marcadas.length} evento${marcadas.length === 1 ? '' : 's'} nesta alteração`}
              </p>
              {marcadas.length > 0 && (
                <ul className="space-y-1.5 rounded-md border border-osg-300/60 bg-osg-50/50 p-3">
                  {marcadas.map((f) => (
                    <li key={f.id} className="flex gap-2 text-sm text-foreground">
                      <span aria-hidden className="text-osg-moss">
                        •
                      </span>
                      {f.descricao || f.nome}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* O aviso que faz o caminho B funcionar. Ver o comentário do
                componente: sem cadastro atualizado, o consolidado sai velho e
                nada no motor tem como perceber. */}
            <div className="space-y-1.5 rounded-md border border-warning/40 bg-warning/10 p-3">
              <p className="text-sm font-semibold text-warning">
                Antes de gerar, o cadastro precisa estar atualizado
              </p>
              <p className="text-xs leading-relaxed text-warning">
                O quadro societário e o capital saem do livro de movimentos, e esses já estão
                conferidos acima. O resto do consolidado é escrito do cadastro de hoje: endereço,
                objeto social e administração já devem refletir o estado DEPOIS do evento. O
                documento anterior fica preservado como está, registrado.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {passo === 1 ? (
            <>
              <Button variant="ghost" onClick={() => abrirFechar(false)} disabled={salvando}>
                Cancelar
              </Button>
              <Button onClick={() => setPasso(2)} disabled={salvando}>
                Continuar
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setPasso(1)} disabled={salvando}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={onConfirmar} disabled={salvando}>
                {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Gerar alteração contratual
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
