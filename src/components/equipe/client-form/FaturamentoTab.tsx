// Aba de Faturamento do modal de cliente.
//
// ELA É UM ESPELHO, E ISSO É DE PROPÓSITO. Tudo que ela mostra é gravado em
// outro lugar: quem recebe a nota, os valores e o rateio vêm todos da OS (aba
// OS), e a identificação e o endereço vêm do cadastro do contribuinte que a OS
// aponta (aba Contribuintes). Ela não edita nada.
//
// QUEM RECEBE A NOTA É DECISÃO DA OS, não do cliente (tarefa [5], Sprint 11).
// Antes disso a escolha morava numa marca do contribuinte
// (`contribuinte.contribuinte_faturamento`) e valia para o cliente inteiro, então
// cliente com contribuinte PF e PJ não tinha como faturar uma OS em cada, que é
// exatamente o pedido: "às vezes o cliente é uma pessoa física mas ele quer
// faturar num contribuinte da pessoa jurídica e vice-versa". E quando ninguém
// marcava nada, esta aba mostrava o PRIMEIRO da lista, sem critério estável.
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
import { useState } from "react";
import { Building2, FileText, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatarPercentual, resumoRateio } from "@/lib/rateioReceita";
import type { DraftEntity, DraftOrdemServico } from "@/types/clientForm";
import { getEmpresaLabel } from "./contratosLabels";
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
  /**
   * Os clusters, para traduzir `ordem_servico.cluster_id` em nome de empresa. A
   * empresa faturada é o cluster: a razão social do grupo PSA que emite a nota.
   * Não confundir com o contribuinte, que é a empresa do CLIENTE que a recebe.
   */
  empresas: Array<{ id: string; name: string; nome_empresa?: string | null }>;
}

const Vazio = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
    {children}
  </p>
);

/**
 * A barra que escolhe de qual OS este painel está falando.
 *
 * Ela é o que sustenta o resto do desenho. A aba misturava duas grandezas: os
 * blocos 01 e 02 eram do CLIENTE (um contribuinte só) e os 03 e 04 eram lista de
 * OS. Quando as OS faturavam em contribuintes diferentes, a metade de cima não
 * valia para todas e o painel precisava avisar isso. Mostrando UMA OS por vez, os
 * quatro blocos passam a falar da mesma coisa e o aviso deixa de ser necessário.
 *
 * Aparece mesmo com uma OS só: é a barra que responde "de qual OS é isto", e essa
 * resposta não pode depender de o cliente ter duas.
 *
 * Cada item traz o CONTRIBUINTE da sua OS, sempre, inclusive com uma OS só. É o
 * que torna a barra um resumo de faturamento por OS, e não apenas um seletor: a
 * pergunta da tarefa ("em qual contribuinte vai faturar aquela OS") passa a ter
 * resposta sem clicar em cada uma. Em duas linhas, porque razão social ao lado do
 * número esticaria o item e faria a barra virar parede de texto.
 *
 * `Tabs` em vez de botões soltos por causa do teclado: as setas andam entre as OS
 * e o papel de `tablist` chega ao leitor de tela sem código extra.
 */
const BarraOs = ({
  contratos,
  selecionadaId,
  onSelecionar,
  contribuinteDaOs,
}: {
  contratos: DraftOrdemServico[];
  selecionadaId: string;
  onSelecionar: (id: string) => void;
  contribuinteDaOs: (contrato: DraftOrdemServico) => DraftEntity | undefined;
}) => {
  const acento = useAcentoArea();
  return (
    <Tabs value={selecionadaId} onValueChange={onSelecionar}>
      {/* `h-auto` e `flex-wrap`: número de OS é comprido e o cliente pode ter
          várias. Envolver é melhor que rolar na horizontal, que esconde OS sem
          dizer que existem. */}
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        {contratos.map((c) => {
          // O acento vem de um token de classe montado em tempo de execução, e
          // variante do Tailwind (`data-[state=active]:`) não interpola string.
          // Como a seleção já é conhecida aqui, a comparação é em JavaScript.
          const ativa = String(c._id) === selecionadaId;
          const contribuinte = contribuinteDaOs(c);
          return (
            <TabsTrigger
              key={c._id}
              value={String(c._id)}
              // Borda transparente na inativa para a ativa não empurrar o layout
              // ao ganhar a dela. `h-auto` e `items-start` porque o item tem duas
              // linhas e o padrão do componente é altura fixa centralizada.
              className={cn(
                "h-auto flex-col items-start gap-0.5 rounded-md border px-2.5 py-1.5 text-xs",
                ativa
                  ? cn(acento.botaoSuave, "shadow-none")
                  : "border-transparent text-muted-foreground hover:bg-muted/60",
              )}
            >
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">OS {c.ordem_servico || "sem número"}</span>
                {c.situacao_projeto && (
                  <span className="text-[11px] opacity-70">· {c.situacao_projeto}</span>
                )}
              </span>
              {/* Teto de largura com corte: razão social de cliente PJ passa de
                  40 caracteres e um item largo empurra os outros para a linha de
                  baixo, escondendo OS que existem. */}
              <span className="max-w-[15rem] truncate pl-5 text-[11px] font-normal opacity-80">
                {contribuinte
                  ? contribuinte.nome_razao_social || "sem razão social"
                  : "sem contribuinte"}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

/**
 * O rateio de uma OS, em leitura.
 *
 * O percentual vem ANTES do nome, numa coluna estreita alinhado à direita. A
 * primeira versão usava nome à esquerda e percentual empurrado para a borda
 * direita, e a Patricia apontou que num painel largo os dois ficavam longe demais
 * para ler o par. Assim eles ficam colados e os números continuam alinhados
 * verticalmente, que é o que permite somar de relance.
 *
 * NÃO mostra a faixa de conferência do total ("fecha 100% ✓", "faltam 40%"), e
 * isso reverte uma decisão anterior. Ela existia aqui porque 3 das 88 OS com
 * rateio não fecham 100% em produção, e a ideia era que quem fatura notasse. A
 * decisão nova (Patricia, 21/08) é que conferir soma pertence a quem preenche: a
 * faixa fica no editor (`RateioLista`), que a tem própria, e a leitura mostra as
 * fatias sem o veredito. As fatias ficam, porque quanto vai para cada empresa é o
 * conteúdo da seção, não a validação dela.
 */
const BlocoRateio = ({
  contrato,
  centrosCusto,
}: {
  contrato: DraftOrdemServico;
  centrosCusto: Array<{ id: string; label: string }>;
}) => {
  const linhas = contrato.distribuicao_receita || [];
  const { vazio } = resumoRateio(linhas);

  return (
    <div>
      {vazio ? (
        <p className="text-xs italic text-muted-foreground">
          Sem centro de custo definido para esta OS.
        </p>
      ) : (
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
      )}
    </div>
  );
};

export default function FaturamentoTab({
  entities,
  contratos,
  centrosCusto,
  empresas,
}: FaturamentoTabProps) {
  const [osEscolhidaId, setOsEscolhidaId] = useState<string | null>(null);

  // A OS mostrada é DERIVADA, não só o que está no estado: as OS podem mudar na
  // aba vizinha enquanto o cadastro está aberto (uma nova, ou a escolhida
  // excluída), e um id órfão no estado renderizaria um painel vazio sem
  // explicação. Recair na primeira é mais honesto que não mostrar nada, e evita
  // o `useEffect` de sincronizar estado com props.
  const osSelecionada =
    contratos.find((c) => String(c._id) === osEscolhidaId) ?? contratos[0];

  // `_dbId` no teste não é zelo excessivo: contribuinte criado nesta sessão ainda
  // não tem id, e sem ele `undefined === undefined` casaria a OS sem contribuinte
  // com o primeiro contribuinte novo da lista.
  const contribuinteDaOs = (contrato: DraftOrdemServico) =>
    entities.find((e) => e._dbId && e._dbId === contrato.contribuinte_id);

  // Os QUATRO blocos falam da mesma OS, inclusive identificação e endereço. Era
  // aqui que a aba se contradizia: eles vinham de um contribuinte só, escolhido
  // para o cliente inteiro, enquanto os valores e o rateio já eram por OS.
  const contribuinteEmFoco = osSelecionada ? contribuinteDaOs(osSelecionada) : undefined;

  // A empresa que EMITE a nota, do lado do grupo PSA. O contribuinte é quem a
  // recebe, do lado do cliente. São as duas pontas, e a aba mostrava só uma.
  const clusterDaOs = osSelecionada
    ? empresas.find((e) => e.id === osSelecionada.cluster_id)
    : undefined;
  const empresaFaturada = clusterDaOs ? getEmpresaLabel(clusterDaOs) : undefined;


  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/*
        CABEÇALHO COM A BARRA DE OS. O título diz o que é o painel e a barra diz
        de qual OS ele está falando, e as duas coisas moram juntas porque a
        segunda é o recorte da primeira. A barra vai em LINHA PRÓPRIA, abaixo do
        título: número de OS é comprido, e com três ou quatro elas apertariam o
        título até truncar.
      */}
      <div className="border-b bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Dados de Faturamento
        </h3>
        {osSelecionada && (
          <div className="mt-2">
            <BarraOs
              contratos={contratos}
              selecionadaId={String(osSelecionada._id)}
              onSelecionar={setOsEscolhidaId}
              contribuinteDaOs={contribuinteDaOs}
            />
          </div>
        )}
      </div>

      {/* Uma linha só: o texto de três linhas empurrava o conteúdo para fora da
          tela, e caber sem rolar é o pedido central da Patricia.

          A frase diz o ESCOPO antes de dizer onde se edita. Com o painel
          recortado por OS, quem não percebeu a barra lê os quatro blocos como se
          fossem do cliente, e a leitura fica errada sem nada acusando. */}
      <p className="flex items-center gap-1.5 px-4 pt-2 text-[11px] italic text-muted-foreground">
        <Info size={11} className="shrink-0" />
        {osSelecionada
          ? "Os quatro blocos são da OS selecionada acima. Só leitura: contribuinte, valores e rateio se trocam na aba de OS; o cadastro do contribuinte, em Contribuintes."
          : "Só leitura. Contribuinte, valores e rateio se trocam na aba de OS; o cadastro do contribuinte, em Contribuintes."}
      </p>

      {!osSelecionada ? (
        /* Cliente sem OS nenhuma: não há recorte possível, e os quatro blocos
           ficariam vazios sem dizer por quê. Um estado só, explicando. */
        <div className="px-4 py-6">
          <Vazio>
            Nenhuma OS cadastrada. Os dados de faturamento aparecem aqui depois de cadastrar a
            OS e escolher o contribuinte que recebe a nota.
          </Vazio>
        </div>
      ) : (
        /*
          UM BLOCO SÓ, a pedido da Patricia: as quatro molduras internas saíram e
          o fundo tingido que as separava também. Antes cada seção era um cartão
          sobre fundo tingido, arranjo que existia para acomodar alturas
          desiguais — os blocos 03 e 04 cresciam com o número de OS. Mostrando uma
          OS por vez eles têm altura fixa, então a moldura por seção perdeu a
          razão de existir.

          As DUAS COLUNAS ficam: o modal tem 1280px, e empilhar as quatro seções
          em largura cheia devolveria a rolagem que a divisão foi feita para
          resolver. Esquerda, quem recebe a nota; direita, o que será faturado.
        */
        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 px-4 py-4 lg:grid-cols-2">
          {/* Duas PILHAS, e não quatro células soltas na grade. Com células
              soltas a ordem do DOM seria 01, 03, 02, 04, e em tela estreita
              (uma coluna) as seções empilhariam fora da sequência numerada. */}
          <div className="flex flex-col gap-5">
          {/* "da OS" no título não é redundância. Sem isso o bloco se lê como
              campo do CLIENTE, que era o que ele era antes de a escolha passar
              para a OS, e quem olha não tem como saber que o nome ali muda ao
              trocar de OS na barra. O selo "Faturado em" cumpria esse papel
              quando a seção era lista; sem ele, o escopo tem de vir no título. */}
          <SecaoFormulario numero={1} titulo="Contribuinte de faturamento da OS">
            {contribuinteEmFoco ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-2 [&>*]:min-w-0">
                {/* Os rótulos do contribuinte seguem a leitura da aba
                    Contribuintes, que é o cadastro de origem: "Razão Social /
                    Nome Completo" porque o contribuinte pode ser pessoa física, e
                    "CPF/CNPJ" sem espaços, como lá. */}
                <FieldPair
                  label="Razão Social / Nome Completo"
                  value={contribuinteEmFoco.nome_razao_social}
                />
                <FieldPair label="CPF/CNPJ" value={contribuinteEmFoco.cpf_cnpj} />
                <FieldPair
                  label="Inscrição Estadual"
                  value={contribuinteEmFoco.inscricao_estadual || "Isento"}
                />
                <FieldPair label="Telefone" value={contribuinteEmFoco.telefone} />
              </div>
            ) : (
              /* OS sem contribuinte escolhido existe de verdade e não é erro de
                 tela: cliente sem contribuinte cadastrado ficou nulo na carga, e
                 OS criada junto com o cliente nasce sem, porque a escolha exige
                 contribuinte já salvo. */
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Esta OS ainda não tem contribuinte
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Escolha o contribuinte de faturamento na aba de OS. Ele precisa estar
                  cadastrado e salvo em Contribuintes para aparecer na lista.
                </p>
              </div>
            )}
          </SecaoFormulario>

          <SecaoFormulario numero={2} titulo="Endereço de cobrança">
            {contribuinteEmFoco ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-2 [&>*]:min-w-0">
                <FieldPair label="CEP" value={contribuinteEmFoco.cep} />
                <FieldPair label="Número" value={contribuinteEmFoco.numero} />
                <FieldPair
                  label="Endereço"
                  value={
                    contribuinteEmFoco.logradouro
                      ? `${contribuinteEmFoco.logradouro}${contribuinteEmFoco.complemento ? `, ${contribuinteEmFoco.complemento}` : ""}`
                      : undefined
                  }
                />
                <FieldPair label="Bairro" value={contribuinteEmFoco.bairro} />
                <FieldPair
                  label="Cidade / UF"
                  value={
                    contribuinteEmFoco.municipio
                      ? `${contribuinteEmFoco.municipio}${contribuinteEmFoco.uf ? ` / ${contribuinteEmFoco.uf}` : ""}`
                      : undefined
                  }
                />
              </div>
            ) : (
              <Vazio>Sem contribuinte nesta OS, não há endereço de cobrança.</Vazio>
            )}
          </SecaoFormulario>
          </div>

          {/* DIREITA: o que será faturado, as duas seções que vêm da OS. */}
          <div className="flex flex-col gap-5">
          {/* Sem cabeçalho de OS e sem selo de contribuinte: a barra do topo já
              diz qual OS é, e a seção 01 já diz em quem ela fatura. Os dois
              existiam porque esta seção era lista de várias OS. */}
          <SecaoFormulario numero={3} titulo="Valores do contrato">
            <OsValoresLeitura contrato={osSelecionada} colunas={3} />
          </SecaoFormulario>

          {/*
            A Patricia sentiu falta de "a empresa na qual será faturada" nesta
            seção. Os centros de custo do rateio SÃO as empresas do grupo PSA
            (Prado Suzuki, PSA Auditores, PSA Norte, Profitto), então quem recebe
            cada fatia já estava dito; o que faltava era a outra ponta, a empresa
            do CLIENTE em quem a nota sai.

            E a outra ponta é a EMPRESA FATURADA, que é o cluster do grupo PSA que
            emite a nota (`ordem_servico.cluster_id`). Ela existia só no formulário
            de edição da OS: nem a visualização da OS nem esta aba a mostravam,
            então quem lia o rateio via para quais empresas a receita se divide sem
            ver de qual delas a nota sai. Vem ANTES do rateio, na ordem do próprio
            título da seção: primeiro de quem é a receita, depois como ela se
            divide.
          */}
          {/*
            Os rótulos são os MESMOS da visualização da OS, palavra por palavra.
            "Empresa faturada" era invenção desta aba: o campo se chama
            "Empresa / Faturamento" em toda a OS, e nome diferente para a mesma
            coluna faz quem confere as duas telas achar que são dados diferentes.
          */}
          <SecaoFormulario numero={4} titulo="Empresa / Faturamento e Distribuição de Receita">
            <div className="mb-3 border-b pb-2.5">
              <FieldPair label="Empresa / Faturamento" value={empresaFaturada} />
            </div>
            {/* A Distribuição era a única sem título dentro da seção: as outras
                três seções nomeiam o que mostram, e ela vinha como lista solta.

                `font-bold` e não `font-semibold`: é o peso do rótulo do
                `FieldPair`, que é quem desenha todos os outros rótulos do painel.
                Um grau mais leve fazia este parecer apagado ao lado deles. */}
            <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
              Distribuição de Receita
            </p>
            <BlocoRateio contrato={osSelecionada} centrosCusto={centrosCusto} />
          </SecaoFormulario>
          </div>
        </div>
      )}
    </section>
  );
}
