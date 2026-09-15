import { useMemo, useState } from 'react';
import { Building2, FileText, Users } from 'lucide-react';

import ListaMestreDetalhe from '@/components/equipe/client-form/ListaMestreDetalhe';
import { PainelFaturamentoOs } from '@/components/equipe/adm-fin/PainelFaturamentoOs';
import { SelecaoDeCliente } from '@/components/equipe/selecao/SelecaoDeCliente';
import { BotaoLimparFiltros } from '@/components/ui/BotaoLimparFiltros';
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
 * As OS do grupo em lista, e o relatório de Faturamento da que estiver aberta.
 *
 * A PRIMEIRA VERSÃO ERA UMA TABELA LARGA, com os vinte campos do relatório em
 * colunas, e a Patricia a recusou ao ver na tela (15/09/2026): "não ajuda eu ver
 * os dados de uma OS por linha". A escolha dela é conferir uma OS por vez — que é
 * como o relatório já se lê no cadastro do cliente —, e a lista serve para achar
 * qual, não para comparar todas.
 *
 * A casca é a `ListaMestreDetalhe`, a mesma de Contribuintes, Representantes, OS
 * e da bancada Produtos & Serviços, em `moldura="pagina"`.
 *
 * OS FILTROS MORAM NO CABEÇALHO DA LISTA, e não acima do painel inteiro: eles
 * recortam a lista, e em cima do painel pareceriam recortar também o relatório
 * aberto. Os três campos são componentes que já existiam — `SelecaoDeCliente` (que
 * busca por CNPJ sozinha) e o `SingleSelectCombobox` das telas de filtro —, com o
 * `BotaoLimparFiltros` da casa, que mostra quantos estão aplicados.
 */
export interface ListaDeOsFaturamentoProps {
  linhas: LinhaFaturamentoOs[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Uma OS na lista.
 *
 * Três informações, que são as que respondem "é esta?": número e situação,
 * cliente, e o valor com a data em que a OS entrou. A linha padrão da casca é de
 * uma altura só e trunca o título — por isso vai `renderLinha`.
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
      'w-full border-b px-3 py-2 text-left transition-colors',
      selecionada ? 'bg-accent/10 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent hover:bg-muted/60',
    )}
  >
    <div className="flex items-baseline justify-between gap-2">
      <span className={cn('truncate text-xs font-semibold', selecionada && 'text-primary')}>
        OS {linha.numero_os || 'sem número'}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground">{linha.situacao_label}</span>
    </div>
    <p className="truncate text-xs text-muted-foreground">{linha.cliente_nome}</p>
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] tabular-nums text-foreground">
        {formatCurrencyDisplay(linha.valor_projeto)}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {linha.entrou_em ? dataHoraCurta(linha.entrou_em).slice(0, 10) : '—'}
      </span>
    </div>
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

  if (error) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        Não foi possível carregar as OS: {error.message}
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <Skeleton className="h-[60vh] w-[260px]" />
        <Skeleton className="h-[60vh] flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-[76vh] min-h-[520px] flex-col gap-2">
      <ListaMestreDetalhe<string>
        moldura="pagina"
        larguraLista="w-[260px]"
        titulo={
          quantidade > 0
            ? `OS (${visiveis.length} de ${linhas.length})`
            : `OS (${linhas.length}) — mais recentes no topo`
        }
        cabecalhoLista={(
          <div className="space-y-2">
            <SelecaoDeCliente
              clientes={clientes}
              value={filtros.clienteId ?? ''}
              onChange={(clienteId) =>
                setFiltros((f) => ({ ...f, clienteId: clienteId || null, osId: null }))
              }
              placeholder="Todos os clientes"
              opcaoVazia="Todos os clientes"
              icone={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
              className="h-8 text-xs"
            />
            <SingleSelectCombobox
              options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
              value={filtros.clusterId}
              onChange={(clusterId) => setFiltros((f) => ({ ...f, clusterId, osId: null }))}
              placeholder="Todas as empresas"
              searchPlaceholder="Buscar empresa..."
              emptyText="Nenhuma empresa fatura OS hoje."
              opcaoVazia="Todas as empresas"
              icone={<Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
              className="h-8 text-xs"
            />
            <SingleSelectCombobox
              options={opcoesOs}
              value={filtros.osId}
              onChange={(osId) => setFiltros((f) => ({ ...f, osId }))}
              placeholder="Todas as OS"
              searchPlaceholder="Buscar OS, cliente ou CNPJ..."
              emptyText="Nenhuma OS com esse texto."
              opcaoVazia="Todas as OS"
              icone={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}
              className="h-8 text-xs"
            />
            <BotaoLimparFiltros
              quantidade={quantidade}
              onClick={() => setFiltros(SEM_FILTRO)}
              className="h-8 w-full justify-center text-xs"
            />
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
              <span className="truncate font-semibold">
                OS {selecionada.numero_os || 'sem número'}
              </span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {selecionada.cliente_nome}
                {selecionada.entrou_em && ` · entrou em ${dataHoraCurta(selecionada.entrou_em)}`}
              </span>
            </span>
          )
        }
        chaveDetalhe={selecionada?.os_id ?? null}
      >
        {/* A moldura de página entrega o slot do detalhe CRU: o padding e a
            rolagem são deste painel, para o relatório longo rolar sem levar a
            lista junto. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {selecionada ? (
            <PainelFaturamentoOs linha={selecionada} />
          ) : (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              Escolha uma OS na lista para ver os dados de faturamento dela.
            </p>
          )}
        </div>
      </ListaMestreDetalhe>
    </div>
  );
}

export default ListaDeOsFaturamento;
