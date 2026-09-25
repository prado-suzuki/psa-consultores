/**
 * Seção "Perfis de IA" do Controle de Acessos — a gestão dos registros de
 * `enriquecimento_perfil`, a configuração que a edge function `enriquecer-texto`
 * aplica a cada chamada.
 *
 * Irmã da aba Agente e por isso do mesmo tamanho: aqui também a pergunta é "a IA
 * se comporta como?", só que estes perfis são os do ENRIQUECIMENTO DE TEXTO
 * (ditado → tarefa etc.), não as respostas do balão. Sem exclusão física de
 * propósito — o `nome` é citado pelo código; desativar é o caminho.
 *
 * Toda leitura/escrita vem de `useDomainEnriquecimentoPerfis`. Nada de
 * atualização otimista: a resposta do banco chega, o toast sai e aí a consulta
 * é invalidada — a lista reflete o que o banco GRAVOU, não o que a tela achou.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button.variants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Info,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAlternarEnriquecimentoPerfil,
  useCriarEnriquecimentoPerfil,
  useEditarEnriquecimentoPerfil,
  useEnriquecimentoPerfis,
} from '@/hooks/useDomainEnriquecimentoPerfis';
import {
  descricaoDoTipoDeSaida,
  nomeDeExibicao,
  type PerfilEnriquecimento,
  type ValoresDoPerfil,
} from '@/lib/enriquecimentoPerfis';
import { PerfilEnriquecimentoForm } from '@/components/acessos/enriquecimento/PerfilEnriquecimentoForm';

const AVISO_DE_EFEITO =
  'As alterações passam a valer nas próximas chamadas das Edge Functions. Não é necessário republicá-las.';

export function EnriquecimentoPerfisTab() {
  const { isAdmin } = useAuth();
  const perfis = useEnriquecimentoPerfis(isAdmin);
  const criar = useCriarEnriquecimentoPerfil();
  const editar = useEditarEnriquecimentoPerfil();
  const alternar = useAlternarEnriquecimentoPerfil();

  const [formAberto, setFormAberto] = useState(false);
  const [perfilEmEdicao, setPerfilEmEdicao] = useState<PerfilEnriquecimento | null>(null);
  /** Perfil aguardando a confirmação da desativação; `null` = diálogo fechado. */
  const [desativacaoPendente, setDesativacaoPendente] = useState<PerfilEnriquecimento | null>(null);

  if (!isAdmin) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Os perfis de IA são de administradores: eles mudam o comportamento do enriquecimento de
            texto em produção.
          </p>
        </CardContent>
      </Card>
    );
  }

  const salvandoFormulario = criar.isPending || editar.isPending;

  const abrirNovo = () => {
    setPerfilEmEdicao(null);
    setFormAberto(true);
  };

  const abrirEdicao = (perfil: PerfilEnriquecimento) => {
    setPerfilEmEdicao(perfil);
    setFormAberto(true);
  };

  const fecharFormulario = () => {
    setFormAberto(false);
    setPerfilEmEdicao(null);
  };

  const salvar = (valores: ValoresDoPerfil) => {
    const aoFalhar = (erro: unknown) =>
      toast.error(erro instanceof Error ? erro.message : 'Falha ao salvar o perfil');

    if (perfilEmEdicao) {
      editar.mutate({ original: perfilEmEdicao, valores }, {
        onSuccess: (atualizado) => {
          toast.success(`Perfil "${nomeDeExibicao(atualizado)}" atualizado`);
          fecharFormulario();
        },
        onError: aoFalhar,
      });
    } else {
      criar.mutate(valores, {
        onSuccess: (criado) => {
          toast.success(`Perfil "${nomeDeExibicao(criado)}" criado`);
          fecharFormulario();
        },
        onError: aoFalhar,
      });
    }
  };

  const ativar = (perfil: PerfilEnriquecimento) => {
    // Ativar é reversível e barato: sem diálogo. A desativação, não — ver abaixo.
    alternar.mutate({ perfil, ativo: true }, {
      onSuccess: () => toast.success(`Perfil "${nomeDeExibicao(perfil)}" ativado`),
      onError: (erro: unknown) =>
        toast.error(erro instanceof Error ? erro.message : 'Falha ao ativar o perfil'),
    });
  };

  const confirmarDesativacao = () => {
    const perfil = desativacaoPendente;
    setDesativacaoPendente(null);
    if (!perfil) return;
    alternar.mutate({ perfil, ativo: false }, {
      onSuccess: () => toast.success(`Perfil "${nomeDeExibicao(perfil)}" desativado`),
      onError: (erro: unknown) =>
        toast.error(erro instanceof Error ? erro.message : 'Falha ao desativar o perfil'),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Perfis de IA
              </CardTitle>
              <CardDescription>
                Configuração dos perfis de enriquecimento de texto. O código chama cada perfil pelo
                nome técnico, por isso não há exclusão: desativar é o caminho.
              </CardDescription>
            </div>
            <Button size="sm" onClick={abrirNovo} disabled={salvandoFormulario}>
              <Plus className="mr-1 h-4 w-4" />
              Novo perfil
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{AVISO_DE_EFEITO}</p>
          </div>

          {perfis.isError && (
            <div role="alert" className="flex items-start justify-between gap-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Não consegui carregar os perfis</p>
                  <p className="text-muted-foreground">
                    {perfis.error instanceof Error ? perfis.error.message : 'Erro desconhecido.'}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => perfis.refetch()}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          )}

          {perfis.isLoading && (
            <div className="space-y-2" aria-label="Carregando perfis">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          )}

          {perfis.data && perfis.data.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
              <p className="text-sm font-medium text-foreground">Nenhum perfil de IA ainda</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Cada perfil define instruções, modelo e formato de saída para um uso do
                enriquecimento de texto — o ditado que vira tarefa é um deles.
              </p>
              <Button size="sm" className="mt-3" onClick={abrirNovo}>
                <Plus className="mr-1 h-4 w-4" />
                Novo perfil
              </Button>
            </div>
          )}

          {perfis.data && perfis.data.length > 0 && (
            <div className="space-y-2">
              {perfis.data.map((perfil) => (
                <div
                  key={perfil.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {nomeDeExibicao(perfil)}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {perfil.nome}
                      </Badge>
                      <Badge variant={perfil.ativo ? 'default' : 'outline'}>
                        {perfil.ativo ? 'ativo' : 'inativo'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{descricaoDoTipoDeSaida(perfil.contrato_saida)}</span>
                      <span>modelo: {perfil.modelo}</span>
                      <span>temperatura: {perfil.temperatura}</span>
                      <span>
                        atualizado em{' '}
                        {format(parseISO(perfil.updated_at), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirEdicao(perfil)}
                      disabled={salvandoFormulario}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                    {perfil.ativo ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDesativacaoPendente(perfil)}
                        disabled={alternar.isPending}
                      >
                        <PowerOff className="mr-1 h-4 w-4" />
                        Desativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ativar(perfil)}
                        disabled={alternar.isPending}
                      >
                        <Power className="mr-1 h-4 w-4" />
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PerfilEnriquecimentoForm
        aberto={formAberto}
        perfil={perfilEmEdicao}
        salvando={salvandoFormulario}
        onSalvar={salvar}
        onFechar={fecharFormulario}
      />

      {desativacaoPendente && (
        <AlertDialog open onOpenChange={(aberto) => !aberto && setDesativacaoPendente(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Desativar o perfil &quot;{nomeDeExibicao(desativacaoPendente)}&quot;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                As chamadas que usarem o nome técnico{' '}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  {desativacaoPendente.nome}
                </code>{' '}
                passarão a falhar enquanto ele estiver inativo. O efeito vale já na próxima chamada
                da Edge Function.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: 'destructive' })}
                onClick={confirmarDesativacao}
              >
                Desativar perfil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
