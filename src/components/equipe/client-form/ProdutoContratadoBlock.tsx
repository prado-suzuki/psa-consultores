// Bloco de produtos contratados de uma OS, com a empresa de faturamento.
//
// Saiu de ContratosTab quando aquele arquivo passou do teto de 600 linhas do
// AGENTS.md, na reforma para lista mestre e detalhe. E autocontido: recebe a
// lista de produtos e devolve a lista alterada.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { RequiredMark } from "@/components/ui/required-mark";
import type { DraftProdutoContratado } from "@/types/clientForm";
import type { ContratosTabProps } from "./ContratosTab";
import { getEmpresaLabel, getProductLabel, ordenarPorRotulo } from "./contratosLabels";

export default function ProdutoContratadoBlock({
  produtos,
  onChange,
  produtoOptions,
  allClusters,
  readOnly,
  empresaId,
  onEmpresaChange,
}: {
  produtos: DraftProdutoContratado[];
  onChange: (produtos: DraftProdutoContratado[]) => void;
  produtoOptions: ContratosTabProps['produtoSegmentoFullOptions'];
  allClusters: ContratosTabProps['allClusters'];
  readOnly?: boolean;
  /** Empresa/cluster de faturamento da OS (`cluster_id`). Não filtra os produtos. */
  empresaId: string;
  onEmpresaChange: (v: string) => void;
}) {
  // Ordena pelo nome exibido (empresa), não pelo nome do cluster que vem do banco.
  const empresaOptions = useMemo(
    () => allClusters
      .map(c => ({ id: c.id, label: getEmpresaLabel(c) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [allClusters],
  );

  const [addingProductId, setAddingProductId] = useState<string>("__none__");

  const handleAdd = (produtoId: string) => {
    if (produtoId === "__none__") return;
    if (produtos.some(p => p.produto_segmento_id === produtoId)) {
      toast.error("Este produto já foi adicionado a esta OS");
      return;
    }
    onChange([...produtos, { _id: Date.now() + Math.random(), produto_segmento_id: produtoId, horas_contratadas: undefined }]);
    setAddingProductId("__none__");
  };

  const handleHorasChange = (idx: number, value: string) => {
    const updated = [...produtos];
    const num = parseFloat(value);
    updated[idx] = { ...updated[idx], horas_contratadas: isNaN(num) ? undefined : num };
    onChange(updated);
  };

  const handleRemove = (idx: number) => {
    onChange(produtos.filter((_, i) => i !== idx));
  };

  // A empresa de faturamento da OS NÃO restringe os produtos: a lista mostra
  // sempre o catálogo inteiro, apenas agrupado pela empresa de cada produto.
  const renderGroupedSelect = () => {
    const withCluster = produtoOptions.filter(p => p.estrutura_clusters?.name);
    const withoutCluster = produtoOptions.filter(p => !p.estrutura_clusters?.name);
    const groups = withCluster.reduce((acc: Record<string, typeof produtoOptions>, p) => {
      const cName = getEmpresaLabel(p.estrutura_clusters!);
      if (!acc[cName]) acc[cName] = [];
      acc[cName].push(p);
      return acc;
    }, {});
    return (
      <>
        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([name, prods]) => (
          <SelectGroup key={name}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">{name}</SelectLabel>
            {prods.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
          </SelectGroup>
        ))}
        {withoutCluster.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">Sem empresa</SelectLabel>
            {withoutCluster.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
          </SelectGroup>
        )}
      </>
    );
  };

  if (readOnly) {
    return (
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Produtos Contratados</p>
        <div className="flex flex-wrap items-start gap-2 mt-1">
          {produtos.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
          {ordenarPorRotulo(produtos, produtoOptions).map((pc, idx) => (
            <Badge key={idx} variant="secondary" className="max-w-full whitespace-normal break-words text-left text-xs">
              {getProductLabel(pc.produto_segmento_id, produtoOptions)}
              {pc.horas_contratadas != null && ` (${pc.horas_contratadas}h)`}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Empresa filter */}
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa / Faturamento<RequiredMark /></Label>
        <Select value={empresaId} onValueChange={onEmpresaChange}>
          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as empresas</SelectItem>
            {empresaOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Existing products */}
      {produtos.length > 0 && (
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Produtos Adicionados</Label>
          <div className="space-y-2 mt-1">
            {produtos.map((pc, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1.5 pr-1 shrink-0">
                  {getProductLabel(pc.produto_segmento_id, produtoOptions)}
                  <button type="button" className="ml-1 rounded-full hover:bg-destructive/20 p-0.5" onClick={() => handleRemove(idx)}>
                    <X size={12} className="text-destructive" />
                  </button>
                </Badge>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={pc.horas_contratadas ?? ""}
                  onChange={(e) => handleHorasChange(idx, e.target.value)}
                  className="h-7 w-28"
                  placeholder="Horas"
                />
                <span className="text-xs text-muted-foreground shrink-0">hrs contratadas /mês</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add product — entra na OS ao escolher, sem botão de confirmar */}
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Adicionar Produto<RequiredMark /></Label>
        <Select value={addingProductId} onValueChange={handleAdd}>
          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Selecione...</SelectItem>
            {renderGroupedSelect()}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
