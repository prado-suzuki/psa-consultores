import { Search, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { categoriaClienteList } from '@/lib/categoriaClienteColors';

/* ── Tipos ─────────────────────────────────────────────────────────── */

export interface ClientesFilterValue {
  search: string;
  status: string;
  tipo: string;
  categoria: string;
}

export type ClientesFilterField = keyof ClientesFilterValue;

interface ClientesFilterBarProps {
  value: ClientesFilterValue;
  onChange: (field: ClientesFilterField, value: string) => void;
  onClear: () => void;
  resultCount: number;
  canCreate?: boolean;
  onNewCliente?: () => void;
}

interface SegmentOption {
  value: string;
  label: string;
}

interface CategoriaOption {
  value: string;
  label: string;
  dot: string;
}

/* ── Opções dos filtros ────────────────────────────────────────────── */

const STATUS_OPTIONS: SegmentOption[] = [
  { value: "", label: "Todos" },
  { value: "true", label: "Ativo" },
  { value: "false", label: "Inativo" },
];

const TIPO_OPTIONS: SegmentOption[] = [
  { value: "", label: "Todos" },
  { value: "Sim", label: "Fixo" },
  { value: "Não", label: "Pontuais" },
  { value: "Em Análise", label: "Em Análise" },
];

const CATEGORIA_OPTIONS: CategoriaOption[] = categoriaClienteList.map((c) => ({
  value: c.key,
  label: c.key,
  dot: c.dot,
}));

/*
 * Trilho dos grupos de filtro. Fica numa constante porque STATUS/TIPO e
 * CATEGORIA já haviam divergido: os dois primeiros eram um segmented control com
 * fundo, e a categoria eram chips soltos com borda própria — mesma função, dois
 * desenhos, e a linha de filtros parecia montada por duas pessoas diferentes.
 *
 * `bg-muted`, e não `bg-foreground/[0.06]` como era antes. O antigo usava token,
 * então passava por certo, mas era CEGO PARA A ÁREA: `--foreground` é quase a
 * mesma tinta escura em toda área, e 6% dela dava o mesmo cinza na Tax, na OSG e
 * na base. `--muted` é o token de superfície rebaixada — o `index.css` diz, no
 * comentário dele, que existe para "barras de filtro, cabeçalho de tabela,
 * zebra" — e esse varia de verdade.
 */
const TRILHO_DE_GRUPO = "inline-flex flex-wrap p-1 rounded-lg bg-muted";

/* ── Rótulo de grupo ───────────────────────────────────────────────── */

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </label>
  );
}

/* ── Segmented control (Status / Tipo) ─────────────────────────────── */

function Segment({
  ariaLabel,
  options,
  value,
  onValueChange,
}: {
  ariaLabel: string;
  options: SegmentOption[];
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={TRILHO_DE_GRUPO}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || "__all__"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Chips de categoria ────────────────────────────────────────────── */

function CategoriaChips({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className={TRILHO_DE_GRUPO} role="group" aria-label="Filtrar por categoria">
      {CATEGORIA_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(active ? "" : opt.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", opt.dot)} aria-hidden />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Seção de filtros ──────────────────────────────────────────────── */

const ClientesFilterBar = ({
  value,
  onChange,
  onClear,
  resultCount,
  canCreate = false,
  onNewCliente,
}: ClientesFilterBarProps) => {
  const hasActiveFilters =
    !!value.search || !!value.status || !!value.tipo || !!value.categoria;

  return (
    <section className="bg-card p-6 rounded-xl shadow-sm border border-border">
      <div className="flex flex-col gap-6">
        {/* Linha de topo: busca + contador + limpar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={value.search}
              onChange={(e) => onChange("search", e.target.value)}
              placeholder="Pesquisar por todos os clientes..."
              className={cn(
                "block w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground",
                "placeholder:text-muted-foreground transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
              )}
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              <span className="text-foreground">{resultCount}</span>{" "}
              cliente{resultCount !== 1 ? "s" : ""} encontrado
              {resultCount !== 1 ? "s" : ""}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClear}
                className="text-sm font-medium text-primary px-3 py-1.5 rounded transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Limpar Filtros
              </button>
            )}
            {canCreate && onNewCliente && (
              <Button size="sm" onClick={onNewCliente}>
                <Plus className="h-4 w-4 mr-1.5" />
                Novo cliente
              </Button>
            )}
          </div>
        </div>

        {/* Grupos de filtro */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div>
            <GroupLabel>Status</GroupLabel>
            <Segment
              ariaLabel="Filtrar por status"
              options={STATUS_OPTIONS}
              value={value.status}
              onValueChange={(v) => onChange("status", v)}
            />
          </div>
          <div>
            <GroupLabel>Tipo</GroupLabel>
            <Segment
              ariaLabel="Filtrar por tipo de cliente"
              options={TIPO_OPTIONS}
              value={value.tipo}
              onValueChange={(v) => onChange("tipo", v)}
            />
          </div>
          <div>
            <GroupLabel>Categoria</GroupLabel>
            <CategoriaChips
              value={value.categoria}
              onValueChange={(v) => onChange("categoria", v)}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientesFilterBar;
