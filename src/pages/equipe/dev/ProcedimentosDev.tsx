import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Procedimento,
  useProcedimentosList,
  useRetryProcedimento,
  useDeleteProcedimento,
  useArquivarProcedimento,
  useExpirarProcedimentosTravados,
} from '@/hooks/useProcedimentos';
import { ProcedimentoCard } from '@/components/equipe/dev/procedimentos/ProcedimentoCard';
import { ProcedimentoSheet } from '@/components/equipe/dev/procedimentos/ProcedimentoSheet';
import { AddProcedimentoModal } from '@/components/equipe/dev/procedimentos/AddProcedimentoModal';
import { ReviewProcedimentoModal } from '@/components/equipe/dev/procedimentos/ReviewProcedimentoModal';
import { COMPLEXIDADE_CONFIG, PROCEDIMENTO_PROCESSOS } from '@/components/equipe/dev/procedimentos/theme';

type Aba = 'biblioteca' | 'fila' | 'arquivados';

const ProcedimentosDev = () => {
  const { isAdmin, isLider, isSublider, isTeamMember } = useAuth();

  /**
   * Quem cura: vê o que ainda não foi confirmado, publica, edita, arquiva.
   * Quem sugere: manda documento para a fila.
   *
   * Estes dois recortes são exatamente o que as RLS da tabela já permitem
   * (`select_procedimentos_member` libera o não-confirmado para sublider+;
   * `rls_procedimentos_insert` libera o insert para team_member). Antes a tela
   * exigia `isAdmin` para tudo, então líder e sublíder — os únicos que o banco
   * deixa VER um procedimento pendente — não tinham o botão de confirmá-lo.
   */
  const podeCurar = isAdmin || isLider || isSublider;
  const podeSugerir = isTeamMember;

  const [aba, setAba] = useState<Aba>('biblioteca');
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [busca, setBusca] = useState('');
  const [processo, setProcesso] = useState('');
  const [complexidade, setComplexidade] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [lendo, setLendo] = useState<Procedimento | null>(null);
  const [editando, setEditando] = useState<Procedimento | null>(null);
  const [revisando, setRevisando] = useState<Procedimento | null>(null);

  /**
   * A busca entra na `queryKey` da listagem, então cada letra digitada era uma
   * query nova — e a listagem ainda disparava um UPDATE de expiração dentro do
   * `queryFn`. Ou seja: uma escrita no banco por tecla. O debounce resolve o
   * lado do teclado; a expiração saiu para o efeito abaixo.
   */
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaDigitada), 400);
    return () => clearTimeout(t);
  }, [buscaDigitada]);

  const expirarTravados = useExpirarProcedimentosTravados();
  useEffect(() => {
    expirarTravados.mutate();
    // Uma vez por montagem da página, não por filtro digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filters = useMemo(() => ({
    search: busca || undefined,
    processo: processo || undefined,
    complexity_level: complexidade || undefined,
    status_publicacao: aba === 'arquivados' ? 'arquivado' : 'ativo',
  }), [busca, processo, complexidade, aba]);

  const { data: procedimentos = [], isLoading } = useProcedimentosList(filters);

  const retryMutation = useRetryProcedimento();
  const deleteMutation = useDeleteProcedimento();
  const arquivarMutation = useArquivarProcedimento();

  /**
   * A biblioteca é só o que está publicado. Tudo que ainda não chegou lá
   * (lendo, deu erro, ou esperando confirmação) fica na fila do curador — em
   * aba, não empilhado embaixo da grade, para a vitrine não virar oficina.
   */
  const prontos = procedimentos.filter(
    (p) => p.status_geracao === 'gerado' && p.confirmado_por
  );
  const naFila = procedimentos.filter(
    (p) => p.status_geracao !== 'gerado' || !p.confirmado_por
  );

  const filtroAtivo = Boolean(busca || processo || complexidade);
  const limparFiltros = () => {
    setBuscaDigitada('');
    setBusca('');
    setProcesso('');
    setComplexidade('');
  };

  const listaDaAba = aba === 'fila' ? naFila : prontos;

  const grade = (itens: Procedimento[], vazio: React.ReactNode) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] min-h-[280px] animate-pulse" />
          ))}
        </div>
      );
    }
    if (itens.length === 0) return vazio;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {itens.map((p) => (
          <ProcedimentoCard
            key={p.id}
            procedimento={p}
            podeCurar={podeCurar}
            onRetry={(id) => retryMutation.mutate(id)}
            onReview={(proc) => setRevisando(proc)}
            onDelete={(proc) => deleteMutation.mutate(proc)}
            onAbrir={(proc) => setLendo(proc)}
          />
        ))}
      </div>
    );
  };

  const vazioPorFiltro = (
    <div className="text-center py-20 text-slate-400">
      <p className="text-lg font-medium">Nenhum procedimento com esses filtros</p>
      <button className="text-sm mt-1 underline hover:text-slate-600" onClick={limparFiltros}>
        Limpar filtros
      </button>
    </div>
  );

  const vazioBiblioteca = filtroAtivo ? vazioPorFiltro : (
    <div className="text-center py-20 text-slate-400">
      <p className="text-lg font-medium">Nenhum procedimento publicado ainda</p>
      <p className="text-sm mt-1">
        {podeSugerir
          ? 'Envie um documento de procedimento e a IA transforma ele numa ficha consultável.'
          : 'Assim que a equipe publicar o primeiro procedimento, ele aparece aqui.'}
      </p>
    </div>
  );

  return (
    <DevLayout
      title="Biblioteca de Procedimentos"
      subtitle="Como a Dev executa cada processo, em ficha consultável — com link para o documento oficial"
      headerActions={podeSugerir ? (
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar procedimento
        </Button>
      ) : undefined}
    >
      <DevPageHeader
        hideManualLink
        description={
          podeCurar
            ? 'Cada card é um procedimento da Dev com resumo, etapas e link para o documento oficial — **clique para abrir a ficha completa**. O que chega novo entra em "Na fila", onde você confere o que a IA extraiu antes de publicar para o time.'
            : 'Cada card é um procedimento da Dev com resumo, etapas e link para o documento oficial — **clique para abrir a ficha completa**. Use a busca e os filtros para achar por processo, etapa ou palavra-chave.'
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por título, resumo, etapa ou tag..."
            value={buscaDigitada}
            onChange={(e) => setBuscaDigitada(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={processo || 'all'} onValueChange={(v) => setProcesso(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Processo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os processos</SelectItem>
            {PROCEDIMENTO_PROCESSOS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={complexidade || 'all'} onValueChange={(v) => setComplexidade(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Complexidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda complexidade</SelectItem>
            {Object.entries(COMPLEXIDADE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtroAtivo && (
          <Button variant="ghost" size="sm" className="text-slate-500" onClick={limparFiltros}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        )}

        {!isLoading && (
          <span className="text-sm text-slate-400 ml-auto">
            {listaDaAba.length} {listaDaAba.length === 1 ? 'procedimento' : 'procedimentos'}
          </span>
        )}
      </div>

      {podeCurar ? (
        <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
          <TabsList className="mb-4">
            <TabsTrigger value="biblioteca">Publicados</TabsTrigger>
            <TabsTrigger value="fila">
              Na fila{naFila.length > 0 ? ` (${naFila.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
          </TabsList>

          <TabsContent value="biblioteca">{grade(prontos, vazioBiblioteca)}</TabsContent>

          <TabsContent value="fila">
            {grade(naFila, filtroAtivo ? vazioPorFiltro : (
              <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-medium">Fila vazia</p>
                <p className="text-sm mt-1">Nada esperando leitura ou confirmação.</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="arquivados">
            {grade(prontos, filtroAtivo ? vazioPorFiltro : (
              <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-medium">Nenhum procedimento arquivado</p>
                <p className="text-sm mt-1">Arquivar tira da vitrine sem apagar o histórico.</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      ) : (
        grade(prontos, vazioBiblioteca)
      )}

      {/* Modais e leitura */}
      <AddProcedimentoModal open={addOpen} onOpenChange={setAddOpen} />

      <ProcedimentoSheet
        procedimento={lendo}
        open={!!lendo}
        onOpenChange={(open) => { if (!open) setLendo(null); }}
        podeCurar={podeCurar}
        onEditar={(proc) => { setLendo(null); setEditando(proc); }}
        onArquivar={(proc, arquivar) => { setLendo(null); arquivarMutation.mutate({ proc, arquivar }); }}
        onExcluir={(proc) => deleteMutation.mutate(proc)}
      />

      <ReviewProcedimentoModal
        procedimento={revisando}
        open={!!revisando}
        onOpenChange={(open) => { if (!open) setRevisando(null); }}
        modo="revisar"
      />

      <ReviewProcedimentoModal
        procedimento={editando}
        open={!!editando}
        onOpenChange={(open) => { if (!open) setEditando(null); }}
        modo="editar"
      />
    </DevLayout>
  );
};

export default ProcedimentosDev;
