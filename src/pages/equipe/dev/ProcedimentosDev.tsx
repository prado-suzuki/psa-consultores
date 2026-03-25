import { useState, useMemo } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { PageAccessGate } from '@/components/auth/PageAccessGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProcedimentosList, Procedimento } from '@/hooks/useProcedimentos';
import { ProcedimentoCard } from '@/components/equipe/dev/procedimentos/ProcedimentoCard';
import { AddProcedimentoModal } from '@/components/equipe/dev/procedimentos/AddProcedimentoModal';
import { ReviewProcedimentoModal } from '@/components/equipe/dev/procedimentos/ReviewProcedimentoModal';
import { useRetryProcedimento, useDeleteProcedimento } from '@/hooks/useProcedimentos';

const PROCESSOS = [
  'EFD', 'XMLs', 'PERDCOMP', 'Selic', 'IBS/CBS',
  'Balancetes', 'PIS/COFINS', 'Cruzamento de Dados', 'Correções SPED',
];

const ProcedimentosDev = () => {
  const { isAdmin, isTeamMember } = useAuth();
  // Approximate leader check: admin has full access; for simplicity treat isAdmin as leader-level
  const isLeaderOrAdmin = isAdmin;

  const [search, setSearch] = useState('');
  const [processo, setProcesso] = useState<string>('');
  const [complexidade, setComplexidade] = useState<string>('');
  const [statusPub, setStatusPub] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [reviewProc, setReviewProc] = useState<Procedimento | null>(null);

  const filters = useMemo(() => ({
    search: search || undefined,
    processo: processo || undefined,
    complexidade: complexidade || undefined,
    status_publicacao: statusPub || undefined,
  }), [search, processo, complexidade, statusPub]);

  const { data: procedimentos = [], isLoading } = useProcedimentosList(
    filters,
    // Enable polling if any card is processing
    true,
  );

  const retryMutation = useRetryProcedimento();
  const deleteMutation = useDeleteProcedimento();

  return (
    <DevLayout title="Biblioteca de Procedimentos" subtitle="Procedimentos técnicos gerados por IA">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por título ou tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={processo} onValueChange={(v) => setProcesso(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os processos</SelectItem>
              {PROCESSOS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={complexidade} onValueChange={(v) => setComplexidade(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Complexidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="simples">Simples</SelectItem>
              <SelectItem value="intermediario">Intermediário</SelectItem>
              <SelectItem value="avancado">Avançado</SelectItem>
            </SelectContent>
          </Select>

          {isLeaderOrAdmin && (
            <Select value={statusPub} onValueChange={(v) => setStatusPub(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="em_revisao">Em revisão</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {isLeaderOrAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar procedimento
          </Button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] min-h-[280px] animate-pulse" />
          ))}
        </div>
      ) : procedimentos.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">Nenhum procedimento encontrado</p>
          <p className="text-sm mt-1">Use o botão acima para adicionar o primeiro procedimento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {procedimentos.map((p) => (
            <ProcedimentoCard
              key={p.id}
              procedimento={p}
              isLeaderOrAdmin={isLeaderOrAdmin}
              onRetry={(id) => retryMutation.mutate(id)}
              onReview={(proc) => setReviewProc(proc)}
              onDelete={(proc) => deleteMutation.mutate(proc)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddProcedimentoModal open={addOpen} onOpenChange={setAddOpen} />
      <ReviewProcedimentoModal
        procedimento={reviewProc}
        open={!!reviewProc}
        onOpenChange={(open) => { if (!open) setReviewProc(null); }}
      />
    </DevLayout>
  );
};

export default ProcedimentosDev;
