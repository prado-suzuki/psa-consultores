import { useMemo, useState } from 'react';

import ListaMestreDetalhe from '@/components/equipe/client-form/ListaMestreDetalhe';
import { TabelasDaOs } from '@/components/equipe/adm-fin/TabelasDaOs';
import { FiltroDeBusca } from '@/components/equipe/FiltroDeBusca';
import { SelecaoDeCliente } from '@/components/equipe/selecao/SelecaoDeCliente';
import { BotaoLimparFiltros } from '@/components/ui/BotaoLimparFiltros';
import { Label } from '@/components/ui/label';
import { SingleSelectCombobox } from '@/components/ui/SingleSelectCombobox';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyDisplay } from '@/components/equipe/client-form/constants';
import { dataHoraCurta } from '@/lib/dateUtils';
import {
  SEM_FILTRO,
  filtrarLinhas,
  opcoesDeCliente,
  opcoesDeEmpresa,
  opcoesDeOs,
  quantidadeDeFiltros,
  type FiltrosDeFaturamento,
  type LinhaFaturamentoOs,
} from '@/lib/admFinFaturamentoOs';
import { cn } from '@/lib/utils';

/**
 * As OS do grupo em lista, e os dados de faturamento da que estiver aberta.
 *
 * OS FILTROS FICAM NA `FiltroDeBusca`, a caixa "Filtros de Busca" que a Patricia
 * pediu em 08/09/2026 para todas as ferramentas da equipe. Antes eles estavam
 * empilhados dentro da coluna da lista, em 260px, e ela recusou: "filtros
 * amontoados", "totalmente desproporcionais e fora do padrão". A caixa resolve as
 * duas coisas de uma vez — cada campo ganha rótulo e a largura da grade, e a tela
 * passa a se parecer com as outras ferramentas em vez de inventar a própria
 * barra.
 *
 * A coluna da esquerda fica só com o que ela é: a lista de OS, para escolher qual
 * abrir. O detalhe são os dados em tabela (`TabelasDaOs`).
 */
export interface ListaDeOsFaturamentoProps {
  linhas: LinhaFaturamentoOs[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Uma OS na lista, em DUAS COLUNAS: a data em que a OS entrou, e o resto.
 *
 * Pedido dela em 15/09/2026, olhando a tela. A data era a ponta direita da
 * primeira linha, disputando a largura com o número da OS, e é ela que dá a
 * ordem da lista — a lista inteira existe ordenada por essa data. Em coluna
 * própria, à esquerda, ela vira a régua: passar o olho por cima responde "de
 * quando é cada uma" sem ler o resto.
 *
 * `min-w-0` em TODO flex ou grid que contém texto truncado, e isso não é zelo:
 * sem ele o item tem largura mínima igual à do conteúdo, o texto empurra a
 * coluna e a lista ganha barra de rolagem horizontal — foi o que apareceu na
 * primeira versão, e ela apontou ("isso aqui nem deveria ter uma barra p mover
 * p lado ali embaixo").
 */
const LinhaDaOs = ({
  linha,
  selecionada,
  onSelecionar,
}: {
  linha: LinhaFaturamentoOs;
  selecionada: boolean;
  onSelecionar: () => void;
}) => (
  <button
    type="button"
    onClick={onSelecionar}
    aria-current={selecionada ? 'true' : undefined}
    className={cn(
      'grid w-full min-w-0 grid-cols-[4.75rem_1fr] gap-x-3 border-b border-l-2 px-3 py-2 text-left transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      selecionada ? 'border-l-primary bg-accent/10' : 'border-l-transparent hover:bg-muted/60',
    )}
  >
    {/* A data alinha pelo topo com o número da OS, e não pelo centro do bloco:
        o lado direito tem três linhas e o esquerdo uma, e centrar deixaria a
        data flutuando no meio de um item vizinho. */}
    <span className="whitespace-nowrap pt-px text-[11px] tabular-nums text-muted-foreground">
      {linha.entrou_em ? dataHoraCurta(linha.entrou_em).slice(0, 10) : '—'}
    </span>

    <span className="min-w-0">
      <span className={cn('block truncate text-xs font-semibold', selecionada && 'text-primary')}>
        OS {linha.numero_os || 'sem número'}
      </span>
      <span className="block truncate text-xs text-muted-foreground">{linha.cliente_nome}</span>
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] tabular-nums text-foreground">
          {formatCurrencyDisplay(linha.valor_projeto)}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{linha.situacao_label}</span>
      </span>
    </span>
  </button>
);

export function ListaDeOsFaturamento({ linhas, isLoading, error }: ListaDeOsFaturamentoProps) {
  const [filtros, setFiltros] = useState<FiltrosDeFaturamento>(SEM_FILTRO);
  const [osEscolhidaId, setOsEscolhidaId] = useState<string | null>(null);

  const clientes = useMemo(() => opcoesDeCliente(linhas), [linhas]);
  const empresas = useMemo(() => opcoesDeEmpresa(linhas), [linhas]);

  // O campo de OS lista o que os OUTROS dois filtros já deixaram passar: com 155
  // OS, oferecer todas depois de escolher um cliente é devolver ao campo o
  // trabalho que o filtro de cima acabou de fazer.
  const semFiltroDeOs = useMemo(
    () => filtrarLinhas(linhas, { ...filtros, osId: null }),
    [linhas, filtros],
  );
  const opcoesOs = useMemo(
    () =>
      opcoesDeOs(semFiltroDeOs).map((o) => ({
        value: o.id,
        label: `OS ${o.numero}`,
        hint: o.cliente,
        // O documento sem pontuação entra como palavra de busca: quem tem a nota
        // na mão digita os dígitos, não o número da OS.
        keywords: [o.cliente, o.documento ?? '', (o.documento ?? '').replace(/\D/g, '')],
      })),
    [semFiltroDeOs],
  );

  const visiveis = useMemo(() => filtrarLinhas(linhas, filtros), [linhas, filtros]);

  // A OS aberta é DERIVADA: trocar um filtro pode tirar da lista a que estava
  // aberta, e um id órfão no estado deixaria o painel vazio sem explicação.
  // Recair na primeira da lista é mais honesto que não mostrar nada.
  const selecionada = visiveis.find((l) => l.os_id === osEscolhidaId) ?? visiveis[0];

  const quantidade = quantidadeDeFiltros(filtros);

  return (
    <div className="space-y-5">
      <FiltroDeBusca
        colunas={3}
        acoes={
          <BotaoLimparFiltros quantidade={quantidade} onClick={() => setFiltros(SEM_FILTRO)} />
        }
      >
        <div className="space-y-2">
          <Label htmlFor="fat-cliente">Cliente</Label>
          <SelecaoDeCliente
            id="fat-cliente"
            clientes={clientes}
            value={filtros.clienteId ?? ''}
            onChange={(clienteId) =>
              setFiltros((f) => ({ ...f, clienteId: clienteId || null, osId: null }))
            }
            loading={isLoading}
            placeholder="Todos os clientes"
            opcaoVazia="Todos os clientes"
            className="w-full min-w-0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fat-empresa">Empresa / Faturamento</Label>
          <SingleSelectCombobox
            id="fat-empresa"
            options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
            value={filtros.clusterId}
            onChange={(clusterId) => setFiltros((f) => ({ ...f, clusterId, osId: null }))}
            placeholder="Todas as empresas"
            searchPlaceholder="Buscar empresa..."
            emptyText="Nenhuma empresa fatura OS hoje."
            opcaoVazia="Todas as empresas"
            className="w-full min-w-0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fat-os">OS</Label>
          <SingleSelectCombobox
            id="fat-os"
            options={opcoesOs}
            value={filtros.osId}
            onChange={(osId) => setFiltros((f) => ({ ...f, osId }))}
            placeholder="Todas as OS"
            searchPlaceholder="Buscar OS, cliente ou CNPJ..."
            emptyText="Nenhuma OS com esse texto."
            opcaoVazia="Todas as OS"
            className="w-full min-w-0"
          />
        </div>
      </FiltroDeBusca>

      {error ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar as OS: {error.message}
        </p>
      ) : isLoading ? (
        <div className="flex gap-4">
          <Skeleton className="h-[60vh] w-[260px]" />
          <Skeleton className="h-[60vh] flex-1" />
        </div>
      ) : (
        <div className="flex h-[70vh] min-h-[480px] flex-col">
          <ListaMestreDetalhe<string>
            moldura="pagina"
            // 360px, e não os 228px que a casca usa dentro do modal: a linha
            // tem duas colunas (data e o resto) e o nome do cliente ainda vem
            // com o prefixo `[TESTE] ` no sandbox, então no padrão o nome
            // truncava em toda linha. Duas medidas pedidas por ela, olhando a
            // tela em 15/09/2026 — 240 → 300 → 360.
            larguraLista="w-[360px]"
            titulo={
              quantidade > 0
                ? `OS (${visiveis.length} de ${linhas.length})`
                : `OS (${linhas.length}) — mais recentes no topo`
            }
            // O cabeçalho das duas colunas da linha, fixo no topo da coluna
            // enquanto ela rola. `px-0.5` recompõe os 12px de recuo das linhas
            // sobre os 10px que a casca dá a esta faixa: sem isso o rótulo fica
            // 2px à esquerda da data que ele nomeia.
            cabecalhoLista={(
              <div className="grid grid-cols-[4.75rem_1fr] gap-x-3 px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Entrou em</span>
                <span>Ordem de serviço</span>
              </div>
            )}
            linhas={visiveis.map((l) => ({ id: l.os_id, titulo: l.numero_os || 'sem número' }))}
            selecionadoId={selecionada?.os_id ?? null}
            onSelecionar={setOsEscolhidaId}
            renderLinha={({ linha, selecionada: estaAberta, selecionar }) => {
              const os = visiveis.find((l) => l.os_id === linha.id);
              if (!os) return null;
              return <LinhaDaOs linha={os} selecionada={estaAberta} onSelecionar={selecionar} />;
            }}
            vazio={
              quantidade > 0
                ? 'Nenhuma OS com esses filtros.'
                : 'Nenhuma OS cadastrada neste ambiente.'
            }
            cabecalhoDetalhe={
              selecionada && (
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-semibold">
                    OS {selecionada.numero_os || 'sem número'}
                  </span>
                  <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">
                    {selecionada.cliente_nome}
                    {selecionada.entrou_em && ` · entrou em ${dataHoraCurta(selecionada.entrou_em)}`}
                  </span>
                </span>
              )
            }
            chaveDetalhe={selecionada?.os_id ?? null}
          >
            {/* A moldura de página entrega o slot do detalhe CRU: o padding e a
                rolagem são deste painel, para as tabelas rolarem sem levar a
                lista junto. */}
            <div className="min-w-0 flex-1 overflow-y-auto p-4">
              {selecionada ? (
                <TabelasDaOs linha={selecionada} />
              ) : (
                <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  Escolha uma OS na lista para ver os dados de faturamento dela.
                </p>
              )}
            </div>
          </ListaMestreDetalhe>
        </div>
      )}
    </div>
  );
}

export default ListaDeOsFaturamento;
