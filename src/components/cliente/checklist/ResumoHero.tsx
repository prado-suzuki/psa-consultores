import { cn } from '@/lib/utils';

/**
 * O cabeçalho de progresso do checklist do cliente.
 *
 * Saiu de ChecklistDocumentosCliente na mesma extração da LinhaPendencia: é
 * apresentação pura, com quatro números de entrada e nenhuma decisão dentro.
 */
export function ResumoHero({ pct, total, recebidos, faltando }: {
  pct: number; total: number; recebidos: number; faltando: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-white/80 p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] sm:p-7">
      <div aria-hidden className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_240px] lg:items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
            Documentos solicitados
          </span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            Documentos que faltam
          </h2>
          <div className="mt-1 h-[3px] w-8 rounded-full bg-primary" />
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Cada documento aparece junto de quem ele é, e o envio acontece ali mesmo: assim ele já
            chega organizado, e você não precisa renomear nem separar nada.
          </p>
          <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
            <span className="text-4xl font-extrabold leading-none tabular-nums text-primary">{pct}%</span>
            <span className="text-sm text-muted-foreground">{recebidos} de {total} documentos recebidos</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-border lg:border-l lg:pl-7">
          <Metrica label="Falta enviar" value={faltando} tom="atencao" />
          <Metrica label="Recebidos" value={recebidos} tom="neutro" />
        </div>
      </div>
    </section>
  );
}

function Metrica({ label, value, tom }: { label: string; value: number; tom: 'atencao' | 'neutro' }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted/80 px-2 py-3 text-center">
      <div className={cn(
        'text-xl font-bold leading-none tabular-nums',
        tom === 'atencao' ? 'text-amber-600' : 'text-primary',
      )}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}

export default ResumoHero;
