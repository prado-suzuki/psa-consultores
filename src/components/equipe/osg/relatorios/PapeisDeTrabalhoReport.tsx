import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Presentation } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FiltroDeBusca } from '@/components/equipe/FiltroDeBusca';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import {
  useApresentacoesDaRevisao,
  useBaixarApresentacao,
  useEstudosDoCliente,
  useGerarApresentacaoTributaria,
  useRevisoesDoEstudo,
  type ResultadoDaGeracao,
} from '@/hooks/useDomainPapelDeTrabalho';

/**
 * Gera a seção tributária da apresentação a partir de um papel de trabalho.
 *
 * A pessoa escolhe o cliente na barra de cima, escolhe qual papel de trabalho
 * usar, e clica em gerar. O arquivo baixa e fica na lista, para baixar de novo
 * depois sem regerar.
 *
 * **Nada do que está na tela vai para o arquivo.** O que segue daqui é só o
 * identificador da revisão escolhida; os números são lidos no servidor, direto
 * de onde a conferência os gravou. É o que garante que o slide mostra o que foi
 * aprovado, e não o que a tela achava que estava vendo.
 */

const fmtData = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtTamanho = (bytes: number | null): string =>
  bytes == null ? '—' : `${Math.round(bytes / 1024)} KB`;

/**
 * A cor da área que hospeda o relatório.
 *
 * **O mesmo componente serve à OSG Work e à Digital**, e as duas áreas têm cor
 * própria: a OSG é verde, a Digital usa os tokens padrão do app. Antes disso o
 * verde estava escrito à mão em oito pontos daqui, o que impedia a Digital de
 * usar a tela sem parecer OSG.
 */
export type PaletaDaArea = 'osg' | 'digital';

const PALETA: Record<PaletaDaArea, Record<string, string>> = {
  osg: {
    borda: 'border-osg-200',
    cabecalho: 'border-osg-100 bg-osg-50/60',
    titulo: 'text-osg-moss',
    divisor: 'divide-osg-100',
    vazio: 'border-osg-300 bg-osg-50/40',
    icone: 'text-osg-600',
    destaque: 'text-osg-700',
  },
  digital: {
    borda: 'border-border',
    cabecalho: 'border-border bg-muted/50',
    titulo: 'text-foreground',
    divisor: 'divide-border',
    vazio: 'border-border bg-muted/30',
    icone: 'text-primary',
    destaque: 'text-primary',
  },
};

function Secao({
  titulo,
  meta,
  cor,
  children,
}: {
  titulo: string;
  meta?: string;
  cor: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('overflow-hidden rounded-xl border bg-background shadow-sm', cor.borda)}>
      <header
        className={cn('flex flex-wrap items-center gap-3 border-b px-4 py-2.5', cor.cabecalho)}
      >
        <h3 className={cn('text-sm font-semibold', cor.titulo)}>{titulo}</h3>
        {meta && <span className="ml-auto text-[11px] text-muted-foreground">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

/**
 * Enquanto o molde é provisório, a tela mostra só o que é de formatação.
 *
 * O modelo consolidado chega esta semana. Até lá, célula não mapeada e linha que
 * não veio na leitura dizem mais sobre o molde de teste do que sobre o estudo, e
 * poluem a lista de retoques com coisa que ninguém vai ajustar. Os avisos de
 * `origem` continuam gravados em `wp_apresentacao.problemas`: some da tela, não
 * do registro. **Quando o modelo entrar, é esta linha que sai.**
 */
const SO_FORMATACAO = true;

/**
 * Os pontos que a geração deixou para ajustar.
 *
 * Aparece só quando há algo, e o texto é o que fazer, não o que aconteceu: o
 * arquivo já está pronto e baixado, e isto é a lista de retoques no PowerPoint.
 */
function OQueAjustar({ problemas: todos }: { problemas: ResultadoDaGeracao['problemas'] }) {
  const problemas = SO_FORMATACAO ? todos.filter((p) => p.tipo === 'formatacao') : todos;
  if (problemas.length === 0) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div className="space-y-1">
        <p className="text-[12.5px] font-semibold text-foreground">
          {problemas.length === 1
            ? 'Um ponto para ajustar no PowerPoint'
            : `${problemas.length} pontos para ajustar no PowerPoint`}
        </p>
        <ul className="space-y-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
          {problemas.map((p, i) => (
            <li key={i}>{p.detalhe}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PapeisDeTrabalhoReport({
  clienteId,
  paleta = 'osg',
}: {
  clienteId: string;
  paleta?: PaletaDaArea;
}) {
  const cor = PALETA[paleta];
  const { data: clientes = [] } = useClientesLista();
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? 'cliente';

  const { data: estudos = [], isLoading: carregandoEstudos } = useEstudosDoCliente(clienteId);
  const [estudoId, setEstudoId] = useState('');
  const estudoEscolhido = estudoId || estudos[0]?.id || '';

  const { data: revisoes = [], isLoading: carregandoRevisoes } = useRevisoesDoEstudo(
    estudoEscolhido || null,
  );
  const [revisaoId, setRevisaoId] = useState('');
  /* A mais nova é o que se quer em quase todo caso, então já vem escolhida. */
  const revisaoEscolhida = revisaoId || revisoes[0]?.id || '';

  const { data: geradas = [] } = useApresentacoesDaRevisao(revisaoEscolhida || null);
  const gerar = useGerarApresentacaoTributaria();
  const baixar = useBaixarApresentacao();
  const [ultima, setUltima] = useState<ResultadoDaGeracao | null>(null);

  /* Trocar de cliente ou de estudo desfaz a escolha anterior, senão a tela fica
   * mostrando a revisão de outro cliente por um instante. */
  useEffect(() => {
    setEstudoId('');
    setRevisaoId('');
    setUltima(null);
  }, [clienteId]);
  useEffect(() => {
    setRevisaoId('');
    setUltima(null);
  }, [estudoEscolhido]);

  const revisao = useMemo(
    () => revisoes.find((r) => r.id === revisaoEscolhida),
    [revisoes, revisaoEscolhida],
  );

  /**
   * Baixa o arquivo sem abrir aba.
   *
   * **`window.open` era barrado pelo navegador na primeira vez**, e a pessoa
   * clicava, não acontecia nada, e só depois via o aviso de popup. Buscar os
   * bytes e clicar num link local é o que a `useGerarApresentacao` já faz, e não
   * dispara bloqueio nenhum.
   */
  async function baixaArquivo(url: string, nome: string) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error('O link do arquivo expirou. Tente de novo.');
    const objeto = URL.createObjectURL(await resposta.blob());
    const a = document.createElement('a');
    a.href = objeto;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objeto);
  }

  async function aoGerar() {
    try {
      const r = await gerar.mutateAsync(revisaoEscolhida);
      setUltima(r);
      if (r.url) await baixaArquivo(r.url, r.nomeArquivo);
      toast({
        title: `Apresentação ${r.versao} gerada`,
        description: r.problemas.length
          ? `O arquivo baixou. Há ${r.problemas.length} ponto(s) para ajustar.`
          : 'O arquivo baixou.',
      });
    } catch (e) {
      toast({
        title: 'Não consegui gerar',
        description: e instanceof Error ? e.message : 'Tente de novo.',
        variant: 'destructive',
      });
    }
  }

  async function aoBaixar(caminho: string, nome: string) {
    try {
      await baixaArquivo(await baixar.mutateAsync(caminho), nome);
    } catch (e) {
      toast({
        title: 'Não consegui abrir o arquivo',
        description: e instanceof Error ? e.message : 'Tente de novo.',
        variant: 'destructive',
      });
    }
  }

  if (carregandoEstudos) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>;
  }

  /* Sem papel de trabalho não há o que gerar, e o texto diz onde se importa um. */
  if (estudos.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-16 text-center',
          cor.vazio,
        )}
      >
        <FileSpreadsheet className={cn('h-10 w-10 opacity-50', cor.icone)} aria-hidden />
        <p className="text-sm font-medium text-foreground">
          Este cliente ainda não tem papel de trabalho importado.
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          A importação é feita em Digital Rotina, na tela Papel de Trabalho. Depois que o Fiscal
          subir a planilha, os slides podem ser gerados aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Papéis de Trabalho, Planejamento Tributário ·{' '}
          <span className={cor.destaque}>{clienteNome}</span>
        </h2>
        <span className="text-xs text-muted-foreground">
          Os slides saem com tabelas editáveis, para ajustar no PowerPoint
        </span>
      </div>

      {/*
        A escolha do papel de trabalho usa a caixa de filtro padrão, e não uma
        seção própria: é a mesma moldura das outras ferramentas da equipe, pedida
        pela Patricia em 08/09/2026. Duas colunas e não quatro, porque são dois
        campos, e a grade de quatro deixaria metade da linha vazia.
      */}
      {/*
        **Esta caixa NAO se chama "Filtros de Busca", e e de proposito.**
        A Patricia pediu que o filtro de busca fique igual em toda ferramenta, e
        fica: na Digital ele e a caixa de escolher o cliente, logo acima. Esta
        aqui nao filtra nada, ela escolhe qual revisao virar apresentacao e tem o
        botao que faz isso. Repetir o titulo deixava duas caixas identicas na
        mesma tela, e a pessoa lia a segunda como se fosse continuacao do filtro.
      */}
      <FiltroDeBusca
        titulo="Qual revisão vai para os slides"
        colunas={2}
        descricao="Saem quatro tabelas: premissas, carga tributária, transferência da atividade rural e resumo."
        acoes={
          <Button size="sm" onClick={aoGerar} disabled={!revisaoEscolhida || gerar.isPending}>
            {gerar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Presentation className="mr-2 h-4 w-4" aria-hidden />
            )}
            {gerar.isPending ? 'Gerando…' : 'Gerar os slides'}
          </Button>
        }
      >
        {estudos.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="pt-estudo">Ordem de serviço</Label>
            <Select value={estudoEscolhido} onValueChange={setEstudoId}>
              <SelectTrigger id="pt-estudo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {estudos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.descricao ?? `Planejamento de ${fmtData(e.created_at)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="pt-revisao">Revisão</Label>
          <Select
            value={revisaoEscolhida}
            onValueChange={setRevisaoId}
            disabled={carregandoRevisoes || revisoes.length === 0}
          >
            <SelectTrigger id="pt-revisao">
              <SelectValue placeholder={carregandoRevisoes ? 'Carregando…' : 'Nenhuma revisão'} />
            </SelectTrigger>
            <SelectContent>
              {revisoes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  Revisão {r.versao} · {fmtData(r.created_at)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {revisao && (
            <p className="text-[12.5px] text-muted-foreground">
              {revisao.nome_original ?? 'planilha sem nome'}
              {revisao.ano_inicial && revisao.ano_final
                ? ` · ${revisao.ano_inicial} a ${revisao.ano_final}`
                : ''}
            </p>
          )}
        </div>
      </FiltroDeBusca>

      {ultima && <OQueAjustar problemas={ultima.problemas} />}

      <Secao
        titulo="Já geradas desta revisão"
        cor={cor}
        meta={geradas.length > 0 ? `${geradas.length} arquivo(s)` : undefined}
      >
        {geradas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma ainda. A primeira aparece aqui depois que você gerar.
          </p>
        ) : (
          <ul className={cn('divide-y', cor.divisor)}>
            {geradas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-foreground">
                    {a.nome_arquivo}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtData(a.created_at)} · {fmtTamanho(a.tamanho)}
                    {a.problemas > 0 && (
                      <span className={cn('ml-2 text-warning')}>
                        {a.problemas === 1
                          ? '1 ponto a ajustar no PowerPoint'
                          : `${a.problemas} pontos a ajustar no PowerPoint`}
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => aoBaixar(a.storage_path, a.nome_arquivo)}
                  disabled={baixar.isPending}
                >
                  <Download className="mr-2 h-3.5 w-3.5" aria-hidden />
                  Baixar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
