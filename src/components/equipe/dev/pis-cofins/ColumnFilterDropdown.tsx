import { useState, useMemo } from "react";
import { Filter, ArrowUpNarrowWide, ArrowDownNarrowWide } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColumnFilterDropdownProps {
  columnKey: string;
  uniqueValues: string[];
  activeSort: { key: string; direction: "asc" | "desc" } | null;
  activeFilter: Set<string> | null;
  onSort: (key: string, direction: "asc" | "desc") => void;
  onFilter: (key: string, values: Set<string> | null) => void;
}

export function ColumnFilterDropdown({
  columnKey,
  uniqueValues,
  activeSort,
  activeFilter,
  onSort,
  onFilter,
}: ColumnFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set());

  const isActive =
    (activeSort?.key === columnKey) ||
    (activeFilter != null && activeFilter.size < uniqueValues.length);

  const sorted = useMemo(
    () => [...uniqueValues].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [uniqueValues],
  );

  const handleOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(activeFilter ? new Set(activeFilter) : new Set(uniqueValues));
    }
    setOpen(nextOpen);
  };

  const toggleValue = (v: string) =>
    setDraft((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });

  const selectAll = () => setDraft(new Set(uniqueValues));
  const clearAll = () => setDraft(new Set());

  const confirm = () => {
    if (draft.size === uniqueValues.length || draft.size === 0) {
      onFilter(columnKey, null);
    } else {
      onFilter(columnKey, new Set(draft));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "ml-1 inline-flex items-center justify-center rounded p-0.5 transition-colors hover:bg-accent/50",
            isActive ? "text-primary" : "text-muted-foreground opacity-60 hover:opacity-100",
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-56 p-0"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Sort section */}
        <div className="border-b px-3 py-2 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ordenação</p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={activeSort?.key === columnKey && activeSort.direction === "asc" ? "default" : "outline"}
              className="flex-1 text-xs h-7"
              onClick={() => { onSort(columnKey, "asc"); setOpen(false); }}
            >
              <ArrowUpNarrowWide className="h-3.5 w-3.5 mr-1" /> Asc
            </Button>
            <Button
              size="sm"
              variant={activeSort?.key === columnKey && activeSort.direction === "desc" ? "default" : "outline"}
              className="flex-1 text-xs h-7"
              onClick={() => { onSort(columnKey, "desc"); setOpen(false); }}
            >
              <ArrowDownNarrowWide className="h-3.5 w-3.5 mr-1" /> Desc
            </Button>
          </div>
        </div>

        {/* Filter section */}
        <div className="px-3 py-2 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtrar valores</p>
          <div className="flex gap-2 text-xs">
            <button className="text-primary hover:underline" onClick={selectAll}>Selecionar tudo</button>
            <span className="text-muted-foreground">|</span>
            <button className="text-destructive hover:underline" onClick={clearAll}>Limpar</button>
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-1 pr-2">
              {sorted.map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer text-sm py-0.5 hover:bg-muted/50 rounded px-1">
                  <Checkbox
                    checked={draft.has(v)}
                    onCheckedChange={() => toggleValue(v)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate font-mono text-xs">{v || "(vazio)"}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <Button size="sm" className="w-full h-7 text-xs" onClick={confirm}>
            Confirmar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
