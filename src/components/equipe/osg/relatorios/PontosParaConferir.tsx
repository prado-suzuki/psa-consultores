import { AlertTriangle } from 'lucide-react';

/** Onde o ponto se corrige: é o que a pessoa faz com ele. `Sistema` é falha nossa. */
export type OndeCorrige = 'Cadastro' | 'Planilha' | 'PowerPoint' | 'Sistema';

export interface PontoParaConferir {
  /** A parte do arquivo: "Organograma", "Diagnóstico Patrimonial", "Planejamento Tributário · 3.1 Premissas". */
  parte: string;
  detalhe: string;
  corrige: OndeCorrige;
}

/** Os pontos por parte do arquivo, na ordem em que cada parte apareceu. */
function agruparPorParte(
  pontos: readonly PontoParaConferir[],
): Array<{ parte: string; pontos: PontoParaConferir[] }> {
  const grupos = new Map<string, PontoParaConferir[]>();
  for (const p of pontos) {
    const g = grupos.get(p.parte);
    if (g) g.push(p);
    else grupos.set(p.parte, [p]);
  }
  return [...grupos].map(([parte, lista]) => ({ parte, pontos: lista }));
}

/** Todos os avisos da última geração, por parte do arquivo e com onde se corrigem; só aparece se houver ponto. */
export function PontosParaConferir({ pontos }: { pontos: readonly PontoParaConferir[] }) {
  if (pontos.length === 0) return null;
  return (
    <section
      aria-labelledby="pontos-para-conferir"
      className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div>
          <h2 id="pontos-para-conferir" className="text-[12.5px] font-semibold text-foreground">
            {pontos.length === 1 ? 'Um ponto para conferir' : `${pontos.length} pontos para conferir`}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Da última geração. Cadastro e planilha se corrigem na origem, antes de gerar de novo;
            PowerPoint, no arquivo baixado. Sistema é falha nossa: avise o suporte da PSA Digital.
          </p>
        </div>
        {agruparPorParte(pontos).map((g) => (
          <div key={g.parte}>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.parte}</h3>
            <ul className="mt-0.5 space-y-0.5 text-[12.5px] leading-relaxed text-foreground/90">
              {g.pontos.map((p, i) => (
                <li key={i}>
                  <span className="mr-1.5 font-medium text-muted-foreground">{p.corrige}:</span>
                  {p.detalhe}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
