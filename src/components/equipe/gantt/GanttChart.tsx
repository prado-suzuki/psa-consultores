import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTodayBrazil } from '@/lib/dateUtils';
import {
  ancoraInicial,
  construirEixo,
  geometriaDaBarra,
  passoDoEixo,
  posicaoDeAgora,
  type GanttEscala,
} from '@/lib/ganttTimeline';
import { GanttBarraDeNavegacao } from './GanttBarraDeNavegacao';
import { GanttCabecalhoDoEixo } from './GanttCabecalhoDoEixo';
import { GanttFaixaDoTempo } from './GanttFaixaDoTempo';
import type { GanttGrupo, GanttItem, GanttPapel } from './tiposDeGantt';

/**
 * O Gantt do sistema. Uma implementação só, alimentada por telas diferentes
 * através de `GanttGrupo` — antes disso havia uma cópia para tarefa e outra
 * para entregável, e elas já tinham divergido em cor e em comportamento.
 *
 * O eixo é um período navegável (ver `src/lib/ganttTimeline.ts`), o que traz o
 * caso que a versão de porcentagem não tinha: item fora da janela. Ele não some
 * — vira seta na borda que navega até o período dele.
 */

const LARGURA_DO_NOME = 300;

/** Papel de status → tom cheio. Classe literal porque o Tailwind lê o código. */
const BARRA_POR_PAPEL: Record<GanttPapel, string> = {
  neutro: 'bg-status-neutro',
  fila: 'bg-status-fila',
  andamento: 'bg-status-andamento',
  revisao: 'bg-status-revisao',
  espera: 'bg-status-espera',
  ajuste: 'bg-status-ajuste',
  feito: 'bg-status-feito',
  alerta: 'bg-status-alerta',
};

interface GanttChartProps {
  grupos: GanttGrupo[];
  /** Cabeçalho da coluna fixa: `Responsável / Tarefa`. */
  rotuloDaColuna: string;
  onSelecionarItem?: (item: GanttItem) => void;
  legenda?: ReactNode;
  vazio?: ReactNode;
}

export function GanttChart({
  grupos,
  rotuloDaColuna,
  onSelecionarItem,
  legenda,
  vazio,
}: GanttChartProps) {
  const [escala, setEscala] = useState<GanttEscala>('mes');
  /** `null` enquanto a janela ainda acompanha os dados; a navegação a fixa. */
  const [ancoraManual, setAncoraManual] = useState<Date | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const rolagem = useRef<HTMLDivElement>(null);

  const hoje = getTodayBrazil();
  const agora = new Date();

  const intervalos = useMemo(
    () => grupos.flatMap((grupo) => grupo.itens.map((item) => ({ inicio: item.inicio, fim: item.fim }))),
    [grupos],
  );

  // Enquanto o usuário não navegou, a janela segue os dados: uma tela que abre
  // num mês vazio parece quebrada, e é o que aconteceria se a âncora fosse hoje
  // e as tarefas vivessem em outro trimestre.
  const ancora = ancoraManual ?? ancoraInicial(escala, intervalos, hoje);
  const eixo = useMemo(() => construirEixo(escala, ancora, hoje), [escala, ancora, hoje]);
  const linhaDeAgora = posicaoDeAgora(eixo, agora);

  // Navegar reposiciona a rolagem no começo da janela nova; sem isso a tela
  // troca de mês mantendo o scroll antigo e parece não ter mudado nada.
  useLayoutEffect(() => {
    if (rolagem.current) rolagem.current.scrollLeft = 0;
  }, [eixo.titulo, eixo.escala]);

  const alternarGrupo = (id: string) =>
    setAbertos((anteriores) => {
      const proximos = new Set(anteriores);
      if (proximos.has(id)) proximos.delete(id);
      else proximos.add(id);
      return proximos;
    });

  const navegar = (direcao: 1 | -1) => setAncoraManual(passoDoEixo(escala, ancora, direcao));

  if (grupos.length === 0) {
    return <>{vazio}</>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <GanttBarraDeNavegacao
          titulo={eixo.titulo}
          escala={escala}
          onEscala={(proxima) => {
            setEscala(proxima);
            // Trocar de escala mantém onde a pessoa está: a âncora corrente vira
            // manual para a janela nova não pular de volta para os dados.
            setAncoraManual(ancora);
          }}
          onPasso={navegar}
          onHoje={() => setAncoraManual(hoje)}
        />

        <div ref={rolagem} className="max-h-[70vh] overflow-auto">
          <div style={{ width: LARGURA_DO_NOME + eixo.largura }}>
            <GanttCabecalhoDoEixo
              eixo={eixo}
              larguraDoNome={LARGURA_DO_NOME}
              rotuloDaColuna={rotuloDaColuna}
            />

            <div className="divide-y divide-border">
              {grupos.map((grupo) => {
                const aberto = abertos.has(grupo.id);
                const consolidado = intervaloDoGrupo(grupo);
                const geoDoGrupo = consolidado
                  ? geometriaDaBarra(eixo, consolidado.inicio, consolidado.fim)
                  : null;

                return (
                  <div key={grupo.id}>
                    <div className="flex hover:bg-muted/30">
                      <button
                        type="button"
                        onClick={() => alternarGrupo(grupo.id)}
                        aria-expanded={aberto}
                        className="sticky left-0 z-10 flex flex-shrink-0 items-center gap-2 border-r border-border bg-muted/20 px-4 py-3 text-left"
                        style={{ width: LARGURA_DO_NOME }}
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform',
                            !aberto && '-rotate-90',
                          )}
                        />
                        {/* `div` e não `span`: o nome acessível da linha é a
                            concatenação dos dois textos, e elemento em bloco é o
                            que insere o espaço entre eles. */}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{grupo.nome}</div>
                          <div className="truncate text-xs text-muted-foreground">{grupo.resumo}</div>
                        </div>
                      </button>

                      <GanttFaixaDoTempo eixo={eixo} agora={linhaDeAgora} altura="h-14">
                        {!aberto && geoDoGrupo?.fora === null && (
                          <div
                            className="absolute top-5 h-4 rounded-full border border-primary/50 bg-primary/30"
                            style={{ left: geoDoGrupo.esquerda, width: geoDoGrupo.largura }}
                            title={`${format(consolidado!.inicio, 'dd/MM')} – ${format(consolidado!.fim, 'dd/MM')}`}
                          />
                        )}
                      </GanttFaixaDoTempo>
                    </div>

                    {aberto && (
                      <div className="divide-y divide-border/50">
                        {grupo.itens.map((item) => {
                          const geo = geometriaDaBarra(eixo, item.inicio, item.fim);
                          const periodo = `${format(item.inicio, 'dd/MM')} – ${format(item.fim, 'dd/MM')}`;

                          return (
                            <div key={item.id} className="flex hover:bg-muted/20">
                              <button
                                type="button"
                                onClick={() => onSelecionarItem?.(item)}
                                className="sticky left-0 z-10 flex-shrink-0 border-r border-border bg-card px-4 py-2 pl-10 text-left hover:text-primary"
                                style={{ width: LARGURA_DO_NOME }}
                              >
                                <div
                                  className={cn(
                                    'truncate text-sm leading-tight',
                                    item.concluido && 'text-muted-foreground line-through',
                                  )}
                                >
                                  {item.titulo}
                                </div>
                                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {item.detalhe ? `${item.detalhe} • ` : ''}
                                  {periodo}
                                </div>
                              </button>

                              <GanttFaixaDoTempo eixo={eixo} agora={linhaDeAgora} altura="h-11">
                                {geo.fora ? (
                                  <SetaDeBorda
                                    lado={geo.fora}
                                    periodo={periodo}
                                    onIr={() => setAncoraManual(item.inicio)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onSelecionarItem?.(item)}
                                    className={cn(
                                      'absolute top-3.5 flex h-4 items-center rounded-full shadow-sm transition-all hover:scale-y-125 hover:shadow-md',
                                      BARRA_POR_PAPEL[item.papel],
                                      item.concluido && 'opacity-70',
                                    )}
                                    style={{ left: geo.esquerda, width: geo.largura }}
                                    title={`${item.titulo} (${periodo})`}
                                    aria-label={`${item.titulo}, ${periodo}`}
                                  >
                                    {item.progresso != null && (
                                      <span className="absolute left-full ml-1.5 whitespace-nowrap text-xs text-muted-foreground">
                                        {item.progresso}%
                                      </span>
                                    )}
                                  </button>
                                )}
                              </GanttFaixaDoTempo>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {legenda}
    </div>
  );
}

/** O envelope do grupo: do começo mais cedo ao fim mais tarde. */
function intervaloDoGrupo(grupo: GanttGrupo): { inicio: Date; fim: Date } | null {
  if (grupo.itens.length === 0) return null;
  return grupo.itens.reduce(
    (envelope, item) => ({
      inicio: item.inicio < envelope.inicio ? item.inicio : envelope.inicio,
      fim: item.fim > envelope.fim ? item.fim : envelope.fim,
    }),
    { inicio: grupo.itens[0].inicio, fim: grupo.itens[0].fim },
  );
}

/** Item inteiramente fora da janela: a seta diz para que lado, e leva até lá. */
function SetaDeBorda({
  lado,
  periodo,
  onIr,
}: {
  lado: 'antes' | 'depois';
  periodo: string;
  onIr: () => void;
}) {
  const Icone = lado === 'antes' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onIr}
      title={`Fora do período exibido (${periodo}). Ir até lá.`}
      aria-label={`Ir até o período do item (${periodo})`}
      className={cn(
        'absolute top-3 flex h-5 items-center gap-0.5 rounded-full border border-border bg-muted px-1.5 text-muted-foreground hover:text-primary',
        lado === 'antes' ? 'left-1' : 'right-1',
      )}
    >
      {lado === 'antes' && <Icone className="h-3 w-3" />}
      <span className="text-[10px]">{periodo}</span>
      {lado === 'depois' && <Icone className="h-3 w-3" />}
    </button>
  );
}
