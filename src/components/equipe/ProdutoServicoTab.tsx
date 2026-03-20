import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Package, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useProdutoServicoList, useProdutoServicoSave, useProdutoServicoDelete,
  useProdutoSegmentoList, useServicosPrestadosList,
  type ProdutoServico,
} from '@/hooks/useCategorias';

export default function ProdutoServicoTab() {
  const [selectedProdutoId, setSelectedProdutoId] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useProdutoServicoList();
  const { save } = useProdutoServicoSave();
  const { remove } = useProdutoServicoDelete();
  const { data: produtos = [] } = useProdutoSegmentoList();
  const { data: servicos = [] } = useServicosPrestadosList();

  const produtosAtivos = useMemo(() => produtos.filter(p => p.is_active), [produtos]);

  // Count links per product
  const countByProduto = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      map[i.produto_segmento_id] = (map[i.produto_segmento_id] || 0) + 1;
    });
    return map;
  }, [items]);

  // Set of servico IDs linked to selected product
  const linkedServicoIds = useMemo(() => {
    if (!selectedProdutoId) return new Set<string>();
    return new Set(
      items.filter(i => i.produto_segmento_id === selectedProdutoId).map(i => i.servico_prestado_id)
    );
  }, [items, selectedProdutoId]);

  // Find the ProdutoServico record for a given servico
  const findLink = useCallback(
    (servicoId: string): ProdutoServico | undefined =>
      items.find(i => i.produto_segmento_id === selectedProdutoId && i.servico_prestado_id === servicoId),
    [items, selectedProdutoId]
  );

  const handleToggle = useCallback(async (servicoId: string, servicoNome: string) => {
    if (!selectedProdutoId || savingIds.has(servicoId)) return;
    const prod = produtosAtivos.find(p => p.id === selectedProdutoId);
    const entityName = `${prod?.codigo || '?'} → ${servicoNome}`;

    setSavingIds(prev => new Set(prev).add(servicoId));
    try {
      const existing = findLink(servicoId);
      if (existing) {
        await remove(existing);
      } else {
        await save(selectedProdutoId, servicoId, entityName);
      }
    } catch {
      // errors handled inside hooks
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(servicoId);
        return next;
      });
    }
  }, [selectedProdutoId, savingIds, produtosAtivos, findLink, remove, save]);

  // Auto-select first product if none selected
  const effectiveProdutoId = selectedProdutoId && produtosAtivos.some(p => p.id === selectedProdutoId)
    ? selectedProdutoId
    : produtosAtivos[0]?.id ?? null;

  if (effectiveProdutoId !== selectedProdutoId && effectiveProdutoId) {
    setSelectedProdutoId(effectiveProdutoId);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-3">
        <Link2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
        {items.length} vínculos cadastrados · Selecione um produto e marque os serviços
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-4">
        {/* Left panel — Products */}
        <Card className="border-border/60">
          <div className="px-3 py-2 border-b border-border/40">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Produtos</span>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-1">
              {produtosAtivos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto ativo</p>
              ) : (
                produtosAtivos.map(p => {
                  const count = countByProduto[p.id] || 0;
                  const isSelected = p.id === selectedProdutoId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProdutoId(p.id)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-md flex items-center gap-2 transition-colors text-sm',
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted/50 text-foreground'
                      )}
                    >
                      <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">{p.codigo} — {p.nome}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 min-w-[20px] justify-center">
                        {count}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right panel — Services checkboxes */}
        <Card className="border-border/60">
          <div className="px-3 py-2 border-b border-border/40">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Serviços
              {selectedProdutoId && (
                <span className="ml-1 normal-case">
                  — {(() => { const p = produtosAtivos.find(p => p.id === selectedProdutoId); return p ? `${p.codigo} — ${p.nome}` : ''; })()}
                </span>
              )}
            </span>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-3 space-y-1">
              {!selectedProdutoId ? (
                <p className="text-sm text-muted-foreground text-center py-6">Selecione um produto</p>
              ) : servicos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum serviço cadastrado</p>
              ) : (
                servicos.map(s => {
                  const isLinked = linkedServicoIds.has(s.id);
                  const isSaving = savingIds.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors',
                        isLinked ? 'bg-primary/5' : 'hover:bg-muted/50',
                        isSaving && 'opacity-60 pointer-events-none'
                      )}
                    >
                      <Checkbox
                        checked={isLinked}
                        disabled={isSaving}
                        onCheckedChange={() => handleToggle(s.id, s.nome)}
                      />
                      <span className="text-sm flex-1">{s.nome}</span>
                      {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </>
  );
}
