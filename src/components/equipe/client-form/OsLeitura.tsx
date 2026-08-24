// Uma OS no modo de LEITURA, dentro do painel de detalhe da aba de OS.
//
// Saiu de dentro da `ContratosTab` quando o arquivo cruzou o teto de 600 linhas
// do AGENTS.md. Não é casca para reduzir contagem: é a responsabilidade de
// mostrar uma OS para quem só quer conferir, que é diferente da de editá-la e não
// compartilha estado nenhum com ela.
//
// A LEITURA NÃO É SUBCONJUNTO DA EDIÇÃO, e é por isso que ela fica desatualizada
// sozinha. Campo novo entra no formulário porque é lá que se digita, e ninguém se
// lembra de espelhar aqui. Aconteceu com as DUAS pontas do faturamento: a empresa
// que emite a nota (`cluster_id`) e o contribuinte que a recebe
// (`contribuinte_id`) existiam na edição desde sempre e nunca apareceram aqui. A
// Patricia apontou a primeira; a segunda tinha o mesmo furo.
import { Badge } from "@/components/ui/badge";
import type { DraftEntity, DraftOrdemServico } from "@/types/clientForm";
import { SITUACAO_PROJETO_OPTIONS, isoToMasked } from "./constants";
import { getEmpresaLabel } from "./contratosLabels";
import FieldPair from "./FieldPair";
import OsValoresLeitura from "./OsValoresLeitura";
import ProdutoContratadoBlock from "./ProdutoContratadoBlock";

export interface OsLeituraProps {
  contrato: DraftOrdemServico;
  /** Clusters, para traduzir `cluster_id` no nome da empresa que fatura. */
  allClusters: Array<{ id: string; name: string; nome_empresa?: string | null }>;
  /** Contribuintes do cliente, para traduzir `contribuinte_id` na razão social. */
  contribuintes: DraftEntity[];
  produtoSegmentoFullOptions: Array<{
    id: string;
    codigo: string;
    nome: string;
    is_active: boolean;
    cluster_id: string | null;
    estrutura_clusters: { name: string; nome_empresa?: string | null } | null;
  }>;
  CENTRO_CUSTO_OPTIONS: Array<{ id: string; label: string }>;
  /** Rótulo da área do negócio, que depende da lista de setores da aba. */
  setorLabel: (id: string | undefined, fallback: string | undefined) => string;
  /** Rótulo da região, na mesma tradução que a edição usa. */
  regiaoLabel: (value: string | undefined) => string;
}

export default function OsLeitura({
  contrato,
  allClusters,
  contribuintes,
  produtoSegmentoFullOptions,
  CENTRO_CUSTO_OPTIONS,
  setorLabel,
  regiaoLabel,
}: OsLeituraProps) {
  const cluster = allClusters.find((c) => c.id === contrato.cluster_id);
  const contribuinte = contribuintes.find(
    // `_dbId` no teste: contribuinte criado nesta sessão ainda não tem id, e sem
    // isso `undefined === undefined` casaria OS sem contribuinte com o primeiro
    // contribuinte novo da lista.
    (e) => e._dbId && e._dbId === contrato.contribuinte_id,
  );
  const dist = contrato.distribuicao_receita || [];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 [&>*]:min-w-0">
      <FieldPair
        label="Data Início"
        value={contrato.data_inicio_projeto ? isoToMasked(contrato.data_inicio_projeto) : "—"}
      />
      <FieldPair
        label="Data Fim"
        value={contrato.data_fim_projeto ? isoToMasked(contrato.data_fim_projeto) : "—"}
      />
      <FieldPair
        label="Data Emissão"
        value={contrato.data_emissao ? isoToMasked(contrato.data_emissao) : "—"}
      />
      <FieldPair
        label="Situação do Projeto"
        value={
          SITUACAO_PROJETO_OPTIONS.find((o) => o.value === contrato.situacao_projeto)?.label || "—"
        }
      />
      <FieldPair
        label="Área do Negócio"
        value={setorLabel(contrato.setor_cliente_id, contrato.setor_cliente)}
      />
      <FieldPair label="Região" value={regiaoLabel(contrato.regiao)} />

      {/* O contribuinte é a ponta do CLIENTE: fica aqui em cima, junto do que
          identifica a OS. A empresa que emite a nota é a ponta do grupo PSA e
          desceu para encostar no rateio, que é a divisão da receita dela. */}
      <FieldPair
        label="Contribuinte de Faturamento"
        value={contribuinte?.nome_razao_social || "—"}
      />

      <div className="col-span-2 min-w-0 md:col-span-3">
        <OsValoresLeitura contrato={contrato} />
      </div>
      <div className="col-span-2 min-w-0 md:col-span-3">
        <ProdutoContratadoBlock
          produtos={contrato.produtos_contratados || []}
          onChange={() => {}}
          produtoOptions={produtoSegmentoFullOptions}
          allClusters={allClusters}
          readOnly
          empresaId="__all__"
          onEmpresaChange={() => {}}
        />
      </div>
      {/* Entre os produtos e o rateio de propósito: ela fecha o que foi vendido e
          abre para quem a receita se divide. A leitura desce dos produtos para a
          empresa que emite a nota e daí para as fatias dela.

          Rótulo miúdo mais pílula com borda, o mesmo par da Distribuição de
          Receita logo abaixo, e não o `FieldPair` do grupo de cima. Empresa e
          rateio são as duas metades da mesma informação (de quem é a receita e
          como ela se divide), então formatá-las igual é o que faz o olho ler as
          duas como um bloco. */}
      <div className="col-span-2 min-w-0 md:col-span-3">
        <p className="text-[10px] font-bold uppercase text-muted-foreground">
          Empresa / Faturamento
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {cluster ? getEmpresaLabel(cluster) : "—"}
          </Badge>
        </div>
      </div>
      {dist.length > 0 && (
        <div className="col-span-2 min-w-0 md:col-span-3">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            Distribuição de Receita
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap gap-2">
            {dist.map((cc, idx) => {
              const ccOpt = CENTRO_CUSTO_OPTIONS.find((o) => o.id === cc.id_centro_custo);
              return (
                <Badge key={idx} variant="outline" className="text-xs">
                  {ccOpt?.label || cc.id_centro_custo}: {cc.percentual_rateio}%
                </Badge>
              );
            })}
          </div>
        </div>
      )}
      {contrato.observacoes_projeto && (
        <div className="col-span-2 min-w-0 md:col-span-3">
          <FieldPair label="Observações" value={contrato.observacoes_projeto} />
        </div>
      )}
    </div>
  );
}
