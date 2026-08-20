// Aba de Faturamento do modal de cliente.
//
// ELA É UM ESPELHO, E ISSO É DE PROPÓSITO. Tudo que ela mostra é gravado em
// outro lugar: a identificação e o endereço vêm do contribuinte marcado para
// faturamento (aba Contribuintes), e os valores e o rateio vêm da OS (aba OS).
// Ela não edita nada.
//
// A alternativa era liberar aqui os campos de valor, e foi recusada: são colunas
// de `ordem_servico`, então elas ganhariam uma segunda tela de escrita e as regras
// que moram na aba de OS (entrada maior que o total, parcelas entre 1 e 360, a
// pendência da OS) ficariam de fora ou duplicadas.
//
// Também tinha atalhos que levavam à aba que edita cada coisa, e a Patricia pediu
// para remover. O caminho ficou só na frase do topo, que diz onde cada dado se
// muda. Se a queixa de "não dá para fazer nada aqui" voltar, é ali que se reabre.
//
// LAYOUT EM QUATRO BLOCOS, também a pedido dela: o modal é `max-w-7xl`, ou seja
// 1280px, e quatro seções empilhadas em largura cheia desperdiçavam o horizontal.
// Duas colunas por duas linhas, alinhadas pelo topo para o bloco curto não esticar
// até a altura do maior. Em tela estreita volta a empilhar.
//
// Antes desta versão a aba imprimia nove campos do contribuinte, sem seção e sem
// nenhum dado de OS, então quem faturava não encontrava valor do contrato,
// parcelamento nem rateio.
import { Building2, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarPercentual, resumoRateio } from "@/lib/rateioReceita";
import type { DraftEntity, DraftOrdemServico } from "@/types/clientForm";
import FieldPair from "./FieldPair";
import OsValoresLeitura from "./OsValoresLeitura";
import SecaoFormulario from "./SecaoFormulario";
import { useAcentoArea } from "./acentoArea";

export interface FaturamentoTabProps {
  entities: DraftEntity[];
  /** As OS do cliente. Podem ser mais de uma: hoje o máximo em produção é 2. */
  contratos: DraftOrdemServico[];
  /** Opções de centro de custo, para o rateio mostrar nome e não identificador. */
  centrosCusto: Array<{ id: string; label: string }>;
}

const Vazio = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
    {children}
  </p>
);

/** Cabeçalho do cartão de uma OS, igual nas duas seções que listam por OS. */
const TituloOs = ({ contrato }: { contrato: DraftOrdemServico }) => (
  <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <span className="text-xs font-semibold text-foreground">
      OS {contrato.ordem_servico || "sem número"}
    </span>
    {contrato.situacao_projeto && (
      <span className="text-[11px] text-muted-foreground">· {contrato.situacao_projeto}</span>
    )}
  </div>
);

/**
 * Uma OS: os seis valores do contrato, com o cabeçalho que a identifica.
 *
 * O cabeçalho só aparece quando o cliente tem MAIS DE UMA OS. Com uma só, ele era
 * repetição pura (a seção já diz do que se trata) e custava duas linhas de altura
 * em cada uma das duas seções, o que é justamente o que fazia a aba passar da
 * dobra da tela.
 */
const BlocoValores = ({ contrato, mostrarTitulo }: { contrato: DraftOrdemServico; mostrarTitulo: boolean }) => (
  <div className="rounded-md bg-muted/40 px-3 py-2">
    {mostrarTitulo && <TituloOs contrato={contrato} />}
    <OsValoresLeitura contrato={contrato} colunas={3} />
  </div>
);

/**
 * O rateio de uma OS, em leitura.
 *
 * O percentual vem ANTES do nome, numa coluna estreita alinhado à direita. A
 * primeira versão usava nome à esquerda e percentual empurrado para a borda
 * direita, e a Patricia apontou que num painel largo os dois ficavam longe demais
 * para ler o par. Assim eles ficam colados e os números continuam alinhados
 * verticalmente, que é o que permite somar de relance.
 *
 * Mostra o TOTAL somado de propósito: em produção 3 das 88 OS com rateio não
 * fecham 100%, e sem o total isso passa batido justamente para quem fatura. A
 * conta e a tolerância vêm de `lib/rateioReceita`, as mesmas do editor.
 */
const BlocoRateio = ({
  contrato,
  centrosCusto,
  mostrarTitulo,
}: {
  contrato: DraftOrdemServico;
  centrosCusto: Array<{ id: string; label: string }>;
  mostrarTitulo: boolean;
}) => {
  const acento = useAcentoArea();
  const linhas = contrato.distribuicao_receita || [];
  const { total, fecha, faltam, excede, vazio } = resumoRateio(linhas);

  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      {mostrarTitulo && <TituloOs contrato={contrato} />}

      {vazio ? (
        <p className="text-xs italic text-muted-foreground">
          Sem centro de custo definido para esta OS.
        </p>
      ) : (
        <>
          <ul className="space-y-1">
            {linhas.map((linha, i) => (
              <li
                key={linha._dbId ?? `${linha.id_centro_custo}-${i}`}
                className="grid grid-cols-[3.25rem_1fr] items-baseline gap-x-2 text-sm"
              >
                <span className="tabular-nums text-right font-medium text-foreground">
                  {formatarPercentual(linha.percentual_rateio || 0)}%
                </span>
                <span className="min-w-0 truncate text-muted-foreground">
                  {centrosCusto.find((c) => c.id === linha.id_centro_custo)?.label
                    ?? linha.id_centro_custo}
                </span>
              </li>
            ))}
          </ul>
          <div
            className={cn(
              "-mx-3 -mb-2 mt-1.5 grid grid-cols-[3.25rem_1fr] items-baseline gap-x-2",
              "rounded-b-md border-t px-3 py-1.5 text-[11px] font-medium",
              fecha
                ? cn(acento.positivoFundo, acento.positivoTexto)
                : excede > 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-50 text-amber-700",
            )}
          >
            <span className="text-right tabular-nums">{formatarPercentual(total)}%</span>
            <span>
              {fecha && "fecha 100% ✓"}
              {faltam > 0 && `faltam ${formatarPercentual(faltam)}% para fechar`}
              {excede > 0 && `excedeu ${formatarPercentual(excede)}%`}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default function FaturamentoTab({
  entities,
  contratos,
  centrosCusto,
}: FaturamentoTabProps) {
  const faturamentoEntity = entities.find((e) => e.contribuinte_faturamento) || entities[0];

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Dados de Faturamento
        </h3>
      </div>

      {/* Uma linha só: o texto de três linhas empurrava os cartões para fora da
          tela, e caber sem rolar é o pedido central da Patricia. */}
      <p className="flex items-center gap-1.5 px-3 pt-2 text-[11px] italic text-muted-foreground">
        <Info size={11} className="shrink-0" />
        Só leitura. O contribuinte se troca em Contribuintes; valores e rateio, na aba de OS.
      </p>

      {/*
        SEPARAÇÃO POR CONTENÇÃO, NÃO POR RISCO. Três tentativas de risco entre os
        quadrantes falharam, e o motivo é estrutural: os quatro blocos têm alturas
        diferentes (01 tem 4 campos, 02 tem 5; 03 e 04 dependem de quantas OS o
        cliente tem). Risco que acompanha a linha vira uma reta atravessando o
        painel de ponta a ponta; risco que acompanha o bloco começa e termina em
        altura diferente de cada lado, e é isso que fica torto.

        Então cada bloco virou CARTÃO sobre fundo levemente tingido, e o vão da
        grade faz a separação. Cartão não precisa se alinhar com o vizinho, então
        altura desigual deixa de ser problema. É o mesmo recurso que o modal usa no
        nível de cima e que o kit da OSG usa nos painéis de conteúdo.

        Os cartões de OS lá dentro perderam a borda e ficaram tingidos, senão a
        tela viria com três níveis de moldura e o olho não sabe qual delimita o quê.
      */}
      <div className="grid grid-cols-1 items-start gap-3 bg-muted/30 px-3 py-3 lg:grid-cols-2">
        {/*
          ESQUERDA: quem recebe a nota. DIREITA: o que será faturado.

          A divisão é da Patricia, e ela resolve de vez o alinhamento: as duas
          colunas são pilhas independentes, então ninguém espera que o bloco da
          esquerda termine na mesma altura que o da direita. Também encurta a
          rolagem, porque o par identificação e endereço é curto e cabe ao lado do
          par valores e rateio em vez de embaixo dele.
        */}
        <div className="flex flex-col gap-3">
        <div className="rounded-lg border bg-card p-3">
        <SecaoFormulario numero={1} titulo="Contribuinte de faturamento">
          {faturamentoEntity ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 [&>*]:min-w-0">
              <FieldPair label="Razão Social" value={faturamentoEntity.nome_razao_social} />
              <FieldPair label="CPF / CNPJ" value={faturamentoEntity.cpf_cnpj} />
              <FieldPair
                label="Inscrição Estadual"
                value={faturamentoEntity.inscricao_estadual || "Isento"}
              />
              <FieldPair label="Telefone" value={faturamentoEntity.telefone} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhum contribuinte cadastrado</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Os dados de faturamento aparecem aqui depois de cadastrar um contribuinte marcado
                para faturamento.
              </p>
            </div>
          )}
        </SecaoFormulario>
        </div>

        <div className="rounded-lg border bg-card p-3">
        <SecaoFormulario numero={2} titulo="Endereço de cobrança">
          {faturamentoEntity ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 [&>*]:min-w-0">
              <FieldPair label="CEP" value={faturamentoEntity.cep} />
              <FieldPair label="Número" value={faturamentoEntity.numero} />
              <FieldPair
                label="Endereço"
                value={
                  faturamentoEntity.logradouro
                    ? `${faturamentoEntity.logradouro}${faturamentoEntity.complemento ? `, ${faturamentoEntity.complemento}` : ""}`
                    : undefined
                }
              />
              <FieldPair label="Bairro" value={faturamentoEntity.bairro} />
              <FieldPair
                label="Cidade / UF"
                value={
                  faturamentoEntity.municipio
                    ? `${faturamentoEntity.municipio}${faturamentoEntity.uf ? ` / ${faturamentoEntity.uf}` : ""}`
                    : undefined
                }
              />
            </div>
          ) : (
            <Vazio>Sem contribuinte de faturamento, não há endereço de cobrança.</Vazio>
          )}
        </SecaoFormulario>
        </div>
        </div>

        {/* DIREITA: o que será faturado, as duas seções que vêm da OS. */}
        <div className="flex flex-col gap-3">
        <div className="rounded-lg border bg-card p-3">
        <SecaoFormulario numero={3} titulo="Valores do contrato">
          {contratos.length === 0 ? (
            <Vazio>
              Nenhuma OS cadastrada. Os valores do contrato aparecem aqui depois de cadastrar a OS.
            </Vazio>
          ) : (
            <div className="flex flex-col gap-2">
              {contratos.map((contrato) => (
                <BlocoValores key={contrato._id} contrato={contrato} mostrarTitulo={contratos.length > 1} />
              ))}
            </div>
          )}
        </SecaoFormulario>
        </div>

        <div className="rounded-lg border bg-card p-3">
        <SecaoFormulario numero={4} titulo="Distribuição de receita">
          {/*
            A Patricia sentiu falta de "a empresa na qual será faturada" nesta
            seção. Os centros de custo do rateio SÃO as empresas do grupo PSA
            (Prado Suzuki, PSA Auditores, PSA Norte, Profitto), então quem recebe
            cada fatia já estava dito; o que faltava era a outra ponta, a empresa do
            CLIENTE em quem a nota sai. Ela vive na seção 01, e repetir aqui é o que
            permite ler a divisão sem subir a tela.
          */}
          {faturamentoEntity && (
            <p className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md bg-muted/60 px-3 py-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                Faturado em
              </span>
              <span className="font-medium text-foreground">
                {faturamentoEntity.nome_razao_social || "sem razão social"}
              </span>
              {faturamentoEntity.cpf_cnpj && (
                <span className="font-mono text-muted-foreground">
                  {faturamentoEntity.cpf_cnpj}
                </span>
              )}
            </p>
          )}
          {contratos.length === 0 ? (
            <Vazio>Nenhuma OS cadastrada, então não há receita a distribuir.</Vazio>
          ) : (
            <div className="flex flex-col gap-2">
              {contratos.map((contrato) => (
                <BlocoRateio
                  key={contrato._id}
                  contrato={contrato}
                  centrosCusto={centrosCusto}
                  mostrarTitulo={contratos.length > 1}
                />
              ))}
            </div>
          )}
        </SecaoFormulario>
        </div>
        </div>
      </div>
    </section>
  );
}
