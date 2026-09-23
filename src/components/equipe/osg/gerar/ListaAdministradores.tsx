import { ElementTooltip } from '@/components/ui/button-tooltip';
import { rotuloDoAdministrador } from '@/lib/osg/rotuloDoAdministrador';
import type { AdministradorParaMapear, SocioParaMapear } from '@/lib/templates/mapeadores';

export function ListaAdministradores({ administradores, socios }: { administradores: AdministradorParaMapear[]; socios: SocioParaMapear[] }) {
  return (
    <ul className="space-y-1.5">
      {administradores.map((a, i) => {
        const rotulo = rotuloDoAdministrador(a, socios);
        return (
          <li key={a.pessoa.id} className="flex items-baseline gap-2 text-sm text-foreground">
            <span className="w-4 shrink-0 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
            <ElementTooltip text={a.pessoa.denominacao}>
              <span className="min-w-0 flex-1 truncate">{a.pessoa.denominacao}</span>
            </ElementTooltip>
            {rotulo && <span className="shrink-0 text-muted-foreground">{rotulo}</span>}
          </li>
        );
      })}
    </ul>
  );
}
