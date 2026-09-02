import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  ApuracaoFiltros,
  CalculadoraPorUfResponse,
  FatoCliente,
  FatoUfProduto,
  NaturezaDestino,
} from "@/lib/ibs-cbs/types";
import {
  agregarPorUf,
  calcularConcentracaoTop3Clientes,
  calcularTotaisPorEstado,
  criarSankeyPorEstado,
  filtrarClientesPorEstado,
  filtrarFatosPorEstado,
  ordenarTopClientes,
} from "@/lib/porEstadoIbsCbsModel";
import { AbaPorEstado } from "./AbaPorEstado";

const mockUseCalculadoraPorUf = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useCalculadoraIbsCbs", () => ({
  useCalculadoraPorUf: mockUseCalculadoraPorUf,
}));

interface SankeyData {
  nodes: Array<{ name: string; valor: number }>;
  links: Array<{ source: number; target: number; value: number }>;
}

let capturedSankeyData: SankeyData | null = null;

// O SVG responsivo do Recharts depende de layout real. O mock mantém a
// fronteira do gráfico e captura o contrato de dados entregue a ela.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-chart">{children}</div>
  ),
  Sankey: ({ data, children }: { data: SankeyData; children?: React.ReactNode }) => {
    capturedSankeyData = data;
    return <div data-testid="sankey-chart">{children}</div>;
  },
  Tooltip: () => null,
  Layer: ({ children }: { children?: React.ReactNode }) => <g>{children}</g>,
  Rectangle: () => <rect />,
}));

const SEM_FILTROS: ApuracaoFiltros = { ufs: [], anexos: [] };

function fato(overrides: Partial<FatoUfProduto> = {}): FatoUfProduto {
  return {
    uf: "SP",
    ncm: "1000",
    xProd: "Produto base",
    anexo: "Anexo I",
    natureza: "interestadual",
    faturamento: 100,
    tributoAntes: 10,
    tributoDepois: 5,
    tributoDepoisIbsCbs: 5,
    tributoDepoisIcmsMonof: 0,
    qtdNFs: 1,
    qtdItens: 1,
    ...overrides,
  };
}

function cliente(overrides: Partial<FatoCliente> = {}): FatoCliente {
  return {
    nome: "Cliente base",
    uf: "SP",
    natureza: "interestadual",
    ncmPrincipal: "1000",
    produtoPrincipal: "Produto base",
    anexoPrincipal: "Anexo I",
    faturamento: 100,
    tributoAntes: 10,
    tributoDepois: 5,
    tributoDepoisIbsCbs: 5,
    tributoDepoisIcmsMonof: 0,
    qtdNFs: 1,
    ...overrides,
  };
}

function resposta(
  fatosPorUfProduto: FatoUfProduto[],
  clientes: FatoCliente[] = [],
  totalClientesDistintos = clientes.length,
): CalculadoraPorUfResponse {
  return { fatosPorUfProduto, clientes, totalClientesDistintos };
}

function setHook(data?: CalculadoraPorUfResponse, options: { isLoading?: boolean; error?: Error } = {}) {
  mockUseCalculadoraPorUf.mockReturnValue({
    data,
    isLoading: options.isLoading ?? false,
    error: options.error ?? null,
  });
}

function renderAba(filtros: ApuracaoFiltros = SEM_FILTROS) {
  return render(
    <TooltipProvider>
      <AbaPorEstado filtros={filtros} idContribuinte="contribuinte-42" />
    </TooltipProvider>,
  );
}

function fatosParaPercentuais(valores: number[], options: { exportacao?: boolean; alivio?: boolean } = {}) {
  const ufs = ["SP", "RJ", "MG", "PR", "SC", "GO", "BA", "ES", "MS", "RO"];
  return valores.map((faturamento, index) =>
    fato({
      uf: ufs[index],
      ncm: String(1000 + index),
      xProd: `Produto ${index + 1}`,
      natureza: options.exportacao && index === valores.length - 1 ? "exportacao" : "interestadual",
      faturamento,
      tributoAntes: options.alivio ? faturamento * 0.2 : faturamento * 0.1,
      tributoDepois: options.alivio ? faturamento * 0.1 : faturamento * 0.1,
    }),
  );
}

describe("modelo por estado", () => {
  it("filtra fatos e clientes novamente no client", () => {
    const filtros = { ufs: ["SP"], anexos: ["Anexo I"] };
    const fatos = [fato(), fato({ uf: "RJ" }), fato({ anexo: "Anexo IX" })];
    const clientes = [cliente(), cliente({ uf: "RJ" }), cliente({ anexoPrincipal: "Anexo IX" })];

    expect(filtrarFatosPorEstado(fatos, filtros)).toEqual([fatos[0]]);
    expect(filtrarClientesPorEstado(clientes, filtros)).toEqual([clientes[0]]);
  });

  it("mantém quocientes zerados e agrega UFs sem NaN", () => {
    const fatos = [
      fato({ faturamento: 0, tributoAntes: 10, tributoDepois: 20, qtdNFs: 0 }),
      fato({ faturamento: 0, tributoAntes: 5, tributoDepois: 0, qtdNFs: 0 }),
    ];

    expect(calcularTotaisPorEstado(fatos)).toMatchObject({
      pctInterno: 0,
      pctInterestadual: 0,
      pctExportacao: 0,
      cargaAntesPct: 0,
      cargaDepoisPct: 0,
      deltaPp: 0,
    });
    expect(agregarPorUf(fatos)[0]).toMatchObject({ aliqAntes: 0, aliqDepois: 0, ticketMedio: 0 });
  });

  it("preserva top 6, Outros, links positivos, top 12 e denominador dos clientes", () => {
    const fatos = Array.from({ length: 8 }, (_, indice) =>
      fato({ ncm: String(indice), xProd: `Produto ${indice}`, faturamento: 80 - indice * 10 }),
    );
    const sankey = criarSankeyPorEstado(fatos, "faturamento");
    const clientes = Array.from({ length: 14 }, (_, indice) =>
      cliente({ nome: `Cliente ${indice}`, faturamento: 14 - indice }),
    );

    expect(sankey.nodes.slice(0, 7).map((node) => node.name)).toEqual([
      "Produto 0", "Produto 1", "Produto 2", "Produto 3", "Produto 4", "Produto 5", "Outros produtos",
    ]);
    expect(sankey.links).toHaveLength(8);
    expect(sankey.links.every((link) => link.value > 0)).toBe(true);
    expect(ordenarTopClientes(clientes)).toHaveLength(12);
    expect(calcularConcentracaoTop3Clientes(clientes, 100)).toBe(39);
  });
});

describe("AbaPorEstado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedSankeyData = null;
  });

  it("reaplica UF e anexo no client mesmo enviando os mesmos filtros ao hook", () => {
    const filtros = { ufs: ["SP"], anexos: ["Anexo I"] };
    setHook(
      resposta(
        [
          fato({ xProd: "Produto permitido" }),
          fato({ uf: "RJ", ncm: "2000", xProd: "Produto de outra UF" }),
          fato({ ncm: "3000", xProd: "Produto de outro anexo", anexo: "Anexo IX" }),
        ],
        [
          cliente({ nome: "Cliente permitido" }),
          cliente({ nome: "Cliente outra UF", uf: "RJ" }),
          cliente({ nome: "Cliente outro anexo", anexoPrincipal: "Anexo IX" }),
        ],
        99,
      ),
    );

    renderAba(filtros);

    expect(mockUseCalculadoraPorUf).toHaveBeenCalledWith("contribuinte-42", filtros);
    expect(screen.getByText("Cliente permitido")).toBeInTheDocument();
    expect(screen.queryByText("Cliente outra UF")).not.toBeInTheDocument();
    expect(screen.queryByText("Cliente outro anexo")).not.toBeInTheDocument();
    expect(screen.getByText("1 clientes no filtro")).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "p.text-2xl" })).toBeInTheDocument();
    expect(capturedSankeyData?.nodes.map((node) => node.name)).toContain("Produto permitido");
    expect(capturedSankeyData?.nodes.map((node) => node.name)).not.toContain("Produto de outra UF");
  });

  it("exibe KPIs, agrega UFs, preserva textos principais e abre o drill-down", async () => {
    const user = userEvent.setup();
    setHook(
      resposta(
        [
          fato({
            natureza: "interno",
            faturamento: 600,
            tributoAntes: 120,
            tributoDepois: 60,
            qtdNFs: 2,
            qtdItens: 4,
            xProd: "Máquina paulista",
          }),
          fato({
            ncm: "2000",
            xProd: "Peça exportada",
            natureza: "exportacao",
            faturamento: 100,
            tributoAntes: 0,
            tributoDepois: 0,
            qtdNFs: 1,
          }),
          fato({
            uf: "RJ",
            ncm: "3000",
            xProd: "Máquina carioca",
            faturamento: 300,
            tributoAntes: 30,
            tributoDepois: 60,
            qtdNFs: 3,
          }),
        ],
        [cliente({ nome: "Comprador SP" }), cliente({ nome: "Comprador RJ", uf: "RJ" })],
        2,
      ),
    );

    renderAba();

    expect(screen.getByText("2 clientes distintos")).toBeInTheDocument();
    expect(screen.getByText("60 / 30 / 10")).toBeInTheDocument();
    expect(screen.getAllByText("-3.00 pp").length).toBeGreaterThan(0);
    expect(screen.getByText("Reforma alivia carga")).toBeInTheDocument();
    expect(screen.getByText("Fluxo Produto → Destino")).toBeInTheDocument();
    expect(screen.getByText("Mapa de exposição por UF")).toBeInTheDocument();
    expect(screen.getByText("Detalhamento por UF")).toBeInTheDocument();
    expect(screen.getByText("Top 12 Clientes — Quem está demandando")).toBeInTheDocument();
    expect(screen.getByText("Notas metodológicas")).toBeInTheDocument();
    expect(screen.getByText("Exportação em curso")).toBeInTheDocument();
    expect(screen.getByTitle("Ver detalhamento de SP")).toHaveTextContent(/R\$\s*700/);
    expect(screen.getByTitle("Ver detalhamento de SP")).toHaveTextContent("3 NFs · alíq 8.6%");

    await user.click(screen.getByTitle("Ver detalhamento de SP"));

    expect(await screen.findByText("Destino: SP")).toBeInTheDocument();
    expect(screen.getByText("Produtos vendidos para SP (2 NCMs)")).toBeInTheDocument();
    expect(screen.getByText("Clientes em SP (1)")).toBeInTheDocument();
    expect(screen.getByText("Máquina paulista")).toBeInTheDocument();
    expect(screen.queryByText("Máquina carioca")).not.toBeInTheDocument();
  });

  it("mantém todos os quocientes em zero quando os denominadores são zero", () => {
    setHook(
      resposta(
        [
          fato({ faturamento: 0, tributoAntes: 50, tributoDepois: 80, qtdNFs: 0 }),
          fato({ uf: "RJ", ncm: "2000", faturamento: 0, tributoAntes: 20, tributoDepois: 0, qtdNFs: 0 }),
        ],
        [cliente({ faturamento: 500 })],
      ),
    );

    const { container } = renderAba();

    expect(screen.getByText("0 / 0 / 0")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "P" && element.textContent === "Antes: 0.00% · Depois: 0.00%",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Top 3 concentram", { exact: false })).toHaveTextContent("0.0%");
    expect(screen.getByText("Sem fluxo de faturamento para esta seleção")).toBeInTheDocument();
    expect(screen.getByTitle("Ver detalhamento de SP")).toHaveTextContent("0 NFs · alíq 0.0%");
    expect(container).not.toHaveTextContent(/NaN|Infinity/);
  });

  it("envia ao Sankey somente links positivos, top 6 produtos e Outros produtos", () => {
    const valores = [80, 70, 60, 50, 40, 30, 20, 10, 0, -5];
    const naturezas: NaturezaDestino[] = ["interno", "interestadual", "exportacao"];
    setHook(
      resposta(
        valores.map((faturamento, index) =>
          fato({
            uf: index % 2 ? "RJ" : "SP",
            ncm: String(1000 + index),
            xProd: `Produto ${index + 1}`,
            natureza: naturezas[index % naturezas.length],
            faturamento,
          }),
        ),
      ),
    );

    renderAba();

    expect(capturedSankeyData).not.toBeNull();
    expect(capturedSankeyData!.nodes.slice(0, 7).map((node) => node.name)).toEqual([
      "Produto 1",
      "Produto 2",
      "Produto 3",
      "Produto 4",
      "Produto 5",
      "Produto 6",
      "Outros produtos",
    ]);
    expect(capturedSankeyData!.nodes.slice(7).map((node) => node.name)).toEqual([
      "Interno (MT)",
      "Interestadual",
      "Exportação",
    ]);
    expect(capturedSankeyData!.links).toHaveLength(8);
    expect(capturedSankeyData!.links.every((link) => link.value > 0)).toBe(true);
    expect(capturedSankeyData!.links.filter((link) => link.source === 6).map((link) => link.value)).toEqual([20, 10]);
  });

  it("troca a métrica do fluxo e mostra o vazio específico de tributo", async () => {
    const user = userEvent.setup();
    setHook(resposta([fato({ faturamento: 100, tributoDepois: 0 })]));
    renderAba();

    expect(screen.getByTestId("sankey-chart")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tributo IBS/CBS" }));

    expect(screen.getByText("Onde cada produto está sendo vendido — espessura por tributo IBS/CBS")).toBeInTheDocument();
    expect(screen.getByText("Sem fluxo de tributo para esta seleção")).toBeInTheDocument();
    expect(screen.queryByTestId("sankey-chart")).not.toBeInTheDocument();
  });

  it("ordena clientes por faturamento e limita a listagem aos 12 primeiros", () => {
    const clientes = Array.from({ length: 14 }, (_, index) =>
      cliente({ nome: `Cliente rank ${String(index + 1).padStart(2, "0")}`, faturamento: 1400 - index * 100 }),
    ).reverse();
    setHook(resposta([fato({ faturamento: 20_000 })], clientes));

    renderAba();

    const titulo = screen.getByText("Top 12 Clientes — Quem está demandando");
    const card = titulo.closest(".border-border");
    expect(card).not.toBeNull();
    const rows = within(card as HTMLElement).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(12);
    expect(rows.map((row) => within(row).getByText(/Cliente rank/).textContent)).toEqual(
      Array.from({ length: 12 }, (_, index) => `Cliente rank ${String(index + 1).padStart(2, "0")}`),
    );
    expect(screen.queryByText("Cliente rank 13")).not.toBeInTheDocument();
    expect(screen.queryByText("Cliente rank 14")).not.toBeInTheDocument();
  });

  it("mantém os limiares estritos em 80%, exportação zero e delta zero", () => {
    setHook(resposta(fatosParaPercentuais([30, 25, 25, 20])));
    renderAba();

    expect(screen.getByText("80.0%", { selector: "p.text-2xl" })).toBeInTheDocument();
    expect(screen.getByText("Concentração moderada")).toBeInTheDocument();
    expect(screen.getByText("Manter monitoramento — concentração dentro de patamar aceitável")).toBeInTheDocument();
    expect(screen.getByText("Oportunidade: exportação")).toBeInTheDocument();
    expect(screen.getByText("Aumento agregado de carga")).toBeInTheDocument();
    expect(screen.getByText("Reforma aumenta carga")).toBeInTheDocument();
  });

  it("aciona insights de alta concentração, exportação positiva e alívio apenas após os limiares", () => {
    setHook(resposta(fatosParaPercentuais([31, 25, 25, 19], { exportacao: true, alivio: true })));
    renderAba();

    expect(screen.getByText("81.0%", { selector: "p.text-2xl" })).toBeInTheDocument();
    expect(screen.getByText("Alta concentração geográfica")).toBeInTheDocument();
    expect(screen.getByText("Diversificar canais de distribuição para UFs com presença incipiente")).toBeInTheDocument();
    expect(screen.getByText("Exportação em curso")).toBeInTheDocument();
    expect(screen.getByText("Alívio agregado de carga")).toBeInTheDocument();
  });

  it("considera exatamente 60% uma distribuição saudável", () => {
    setHook(resposta(fatosParaPercentuais([20, 20, 20, 10, 10, 10, 10])));
    renderAba();

    expect(screen.getByText("60.0%", { selector: "p.text-2xl" })).toBeInTheDocument();
    expect(screen.getByText("Distribuição saudável")).toBeInTheDocument();
  });

  it("renderiza dois placeholders durante o loading", () => {
    setHook(undefined, { isLoading: true });
    const { container } = renderAba();

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
    expect(screen.queryByText("Fluxo Produto → Destino")).not.toBeInTheDocument();
  });

  it("renderiza o erro retornado pelo hook", () => {
    setHook(undefined, { error: new Error("serviço indisponível") });
    renderAba();

    expect(screen.getByText("Falha ao carregar: serviço indisponível")).toBeInTheDocument();
  });

  it("renderiza o texto vazio quando não há fatos para os filtros atuais", () => {
    setHook(resposta([fato({ uf: "RJ" })]));
    renderAba({ ufs: ["SP"], anexos: [] });

    expect(
      screen.getByText("Nenhum dado para os filtros atuais. Tente remover restrições de UF ou Anexo."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Fluxo Produto → Destino")).not.toBeInTheDocument();
  });
});
