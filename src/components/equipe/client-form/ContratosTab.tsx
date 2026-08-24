import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITUACAO_PROJETO_OPTIONS, formatCurrencyDisplay, isoToMasked } from "./constants";
import type { DraftEntity, DraftOrdemServico, DraftProdutoContratado } from "@/types/clientForm";
import { createDefaultDraftContract } from "./constants";
import FieldPair from "./FieldPair";
import OsValoresEdicao from "./OsValoresEdicao";
import OsValoresLeitura from "./OsValoresLeitura";
import { RequiredMark } from "@/components/ui/required-mark";
import { useGenerateNextOsNumber } from "@/hooks/useDomainOrdemServicoNumero";
import ListaMestreDetalhe from "./ListaMestreDetalhe";
import ProdutoContratadoBlock from "./ProdutoContratadoBlock";
import SecaoFormulario from "./SecaoFormulario";
import ProdutosPickerDialog from "./ProdutosPickerDialog";
import CentrosCustoPickerDialog from "./CentrosCustoPickerDialog";
import ResumoSelecao from "./ResumoSelecao";
import RateioLista from "./RateioLista";
import { useAcentoArea } from "./acentoArea";
import MarcaPendencia, { CLASSE_CAMPO_PENDENTE, acessibilidadeObrigatorio } from "./MarcaPendencia";
import { getEmpresaLabel, getProductLabel, ordenarPorRotulo } from "./contratosLabels";
import OsPeriodoFields from "./OsPeriodoFields";
import { todayIsoBrazil } from "@/lib/dateUtils";
import { idsAlterados, resolverSelecao, selecaoAposRemover } from "@/lib/listaMestreDetalhe";
import type { FocoPendencia, MapaPendencias } from "@/lib/camposObrigatorios";

interface SetorCliente {
  id: string;
  nome: string;
  sigla: string;
}

const REGIAO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "BRA", label: "BRA - Bahia, Goiás, Distrito Federal" },
  { value: "3NO", label: "3NO - BR-163 Norte" },
  { value: "3SU", label: "3SU - BR-163 Sul, Vale do Araguaia, Serra da Petrovina, Norte do MS" },
  { value: "PAR", label: "PAR - Chapadão do Parecis, região sucroalcooleira, Rondônia" },
  { value: "CBA", label: "CBA - Baixada Cuiabana" },
  { value: "RAO", label: "RAO - Sul do MS, Paraná, SC, Cerrado Mineiro, São Paulo" },
  { value: "MPT", label: "MPT - Mapito, BR-010, Pará" },
];

function getRegiaoLabel(value: string | undefined): string {
  if (!value) return "—";
  return REGIAO_OPTIONS.find(o => o.value === value)?.label || value;
}

/**
 * O campo grava `cluster_id`: a empresa de faturamento É o cluster (razão social
 * e CNPJ são colunas dele — ver `docs/geral/decisoes/empresa-de-faturamento-vive-no-cluster.md`).
 * Exibimos a razão social e caímos no nome do cluster só quando ela não foi
 * preenchida. O rótulo segue "Empresa / Faturamento": é assim que o time
 * conhece o campo — "cluster" é vocabulário interno do sistema.
 */

export interface ContratosTabProps {
  contracts: DraftOrdemServico[];
  setContracts: React.Dispatch<React.SetStateAction<DraftOrdemServico[]>>;
  contribuintes: DraftEntity[];
  isReadOnly: boolean;
  produtoSegmentoFullOptions: Array<{ id: string; codigo: string; nome: string; is_active: boolean; cluster_id: string | null; estrutura_clusters: { name: string; nome_empresa?: string | null } | null }>;
  allClusters: Array<{ id: string; name: string; nome_empresa?: string | null }>;
  CENTRO_CUSTO_OPTIONS: Array<{ id: string; codigo: string; nome: string; label: string }>;
  setoresCliente: SetorCliente[];
  /**
   * O que a edição em curso libera. `'cliente'` veio do "Editar" do rodapé e
   * destrava tudo; `'item'` veio do lápis de uma OS e destrava só ela.
   */
  escopoEdicao?: 'cliente' | 'item' | null;
  /** Abre a edição com escopo de item, a partir da visualização. */
  onRequestItemEdit?: () => void;
  /** As OS como vieram do banco, para marcar na lista o que foi mexido. */
  contratosOriginais?: DraftOrdemServico[];
  /** Faltas de preenchimento, já filtradas pela primeira tentativa de salvar. */
  pendencias?: MapaPendencias | null;
  /** OS a abrir quando o consultor clica no aviso de pendências do rodapé. */
  foco?: FocoPendencia | null;
}

// ── Helpers ────────────────────────────────────────────────────────────


function getProductCodigos(produtos: DraftProdutoContratado[], options: ContratosTabProps['produtoSegmentoFullOptions']) {
  return produtos
    .map(pc => options.find(o => o.id === pc.produto_segmento_id))
    .filter(Boolean)
    .map(p => `${p!.codigo} — ${p!.nome}`)
    .join(', ');
}

function getContribuinteLabel(contribuinte: DraftEntity): string {
  const nome = contribuinte.nome_razao_social.trim() || "Sem razão social";
  const documento = contribuinte.cpf_cnpj.trim() || "CPF/CNPJ não informado";
  return `${nome} (${documento})`;
}



// ── Main Component ────────────────────────────────────────────────────

export default function ContratosTab({
  contracts, setContracts,
  contribuintes,
  isReadOnly,
  produtoSegmentoFullOptions, allClusters, CENTRO_CUSTO_OPTIONS,
  setoresCliente,
  escopoEdicao,
  onRequestItemEdit,
  contratosOriginais,
  pendencias,
  foco,
}: ContratosTabProps) {
  const setorById = (id: string) => setoresCliente.find(s => s.id === id);
  const setorLabel = (id: string | undefined, sigla: string | undefined) => {
    if (!id && !sigla) return "—";
    const s = id ? setorById(id) : undefined;
    if (s) return `${s.sigla} - ${s.nome}`;
    return sigla || "—";
  };
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [osEmpresaId, setOsEmpresaId] = useState<string>("__all__");
  const [pickerAberto, setPickerAberto] = useState(false);
  const [centrosAberto, setCentrosAberto] = useState(false);
  const { mutateAsync: generateNextOsNumber, isPending: isCreatingOs } = useGenerateNextOsNumber();

  /**
   * Criar e remover OS pertencem ao escopo de cliente; o lápis abre o escopo de
   * item. Sem essa separação, abrir uma OS para conferir um valor deixava o
   * cadastro inteiro editável sem avisar.
   */
  const escopoCliente = !isReadOnly && escopoEdicao !== 'item';
  /**
   * O lápis abre uma OS para edição. Vale na visualização, como porta de entrada
   * do escopo de item, e continua valendo depois do "Pronto" — sem isso a tela
   * virava beco sem saída: fechada a OS, não havia como reabrir, só salvar. Em
   * escopo de cliente ele some, porque ali os campos já estão abertos.
   */
  const mostrarEditarPorLinha = isReadOnly ? !!onRequestItemEdit : escopoEdicao === 'item';
  /** A lixeira vale nas duas frentes: vendo a OS ou com ela aberta. */
  const mostrarRemover = !isReadOnly || !!onRequestItemEdit;
  /**
   * Criar OS: onde já dá para editar, e na visualização de quem pode entrar em
   * edição — a mesma regra da lixeira acima.
   *
   * A condição anterior sumia com o botão depois do primeiro uso: criar uma OS
   * num cliente que já existe chama `onRequestItemEdit()`, que tira a tela da
   * visualização e põe o escopo em 'item', e aí as duas metades ficavam falsas.
   * "Não sair com uma OS a mais sem perceber" passou a ser garantido pelo
   * `editingContractId == null` no `acaoCriar`, que é onde essa regra já mora
   * nas outras duas abas de lista.
   */
  const mostrarCriarOs = !isReadOnly || !!onRequestItemEdit;

  // Mantém sempre algo selecionado, inclusive quando a lista chega depois.
  const selecaoEfetiva = resolverSelecao(contracts, selecionadoId);
  useEffect(() => {
    if (selecaoEfetiva !== selecionadoId) setSelecionadoId(selecaoEfetiva);
  }, [selecaoEfetiva, selecionadoId]);

  // O aviso do rodapé manda abrir uma OS específica. Só reage à mudança do
  // pedido: se dependesse da seleção, escolher outra OS na lista seria desfeito
  // no mesmo instante.
  //
  // Abrir em edição faz parte do pedido: no escopo por item o detalhe abre em
  // leitura, e ali não existe campo para receber a moldura vermelha nem o
  // cursor. O aviso levava a pessoa até a OS certa e ela continuava sem ver
  // nada apontado — era metade do defeito da tarefa [6].
  useEffect(() => {
    if (foco?.itemId == null) return;
    setSelecionadoId(foco.itemId);
    if (!mostrarEditarPorLinha) return;
    const alvo = contracts.find((c) => c._id === foco.itemId);
    if (alvo) startEditContract(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco]);

  const acento = useAcentoArea();

  const empresasOrdenadas = useMemo(
    () => allClusters.slice().sort((a, b) => getEmpresaLabel(a).localeCompare(getEmpresaLabel(b))),
    [allClusters],
  );

  // A OS guarda uma FK: contribuintes criados neste mesmo formulário só entram
  // na lista depois de salvos e, portanto, de receberem um id do banco.
  const contribuintesSalvos = useMemo(
    () => contribuintes
      .filter((contribuinte): contribuinte is DraftEntity & { _dbId: string } => Boolean(contribuinte._dbId))
      .slice()
      .sort((a, b) => getContribuinteLabel(a).localeCompare(getContribuinteLabel(b))),
    [contribuintes],
  );

  const alterados = useMemo(
    () => idsAlterados(contracts, contratosOriginais ?? []),
    [contracts, contratosOriginais],
  );

  /**
   * Toda alteração cai direto na lista de OS do formulário — não existe
   * "adicionar/aplicar" intermediário. A gravação no banco continua sendo
   * só o "Salvar Alterações" do rodapé, que valida todas as OS.
   */
  const updateContract = (id: number, patch: Partial<DraftOrdemServico>) => {
    setContracts(prev => prev.map(c => (c._id === id ? ({ ...c, ...patch } as DraftOrdemServico) : c)));
  };

  // `_dbId` no tipo de propósito: é o id da linha no banco. As transformações
  // precisam preservá-lo (`{ ...row }`) — se ele se perde, o save trata a linha
  // como nova e insere uma segunda cópia do mesmo centro de custo.
  const updateDistribuicao = (
    id: number,
    fn: (dist: Array<{ id_centro_custo: string; percentual_rateio: number; _dbId?: string }>) => Array<{ id_centro_custo: string; percentual_rateio: number; _dbId?: string }>,
  ) => {
    setContracts(prev => prev.map(c => (c._id === id ? ({ ...c, distribuicao_receita: fn(c.distribuicao_receita || []) } as DraftOrdemServico) : c)));
  };

  const handleEmpresaChange = (id: number, v: string) => {
    setOsEmpresaId(v);
    updateContract(id, { cluster_id: v === "__all__" ? "" : v });
  };

  const startEditContract = (cont: DraftOrdemServico) => {
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    setSelecionadoId(cont._id);
    setEditingContractId(cont._id);
    setOsEmpresaId(cont.cluster_id || "__all__");
  };

  const createOs = async () => {
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    const osNumber = await generateNextOsNumber(contracts);
    const hoje = todayIsoBrazil();
    const novaOs = {
      ...createDefaultDraftContract(),
      // Emissão é a data em que a OS foi emitida: gravada uma vez, na criação, e
      // travada no formulário. Início é o começo combinado do trabalho — nasce
      // igual a hoje só como ponto de partida e continua editável.
      data_emissao: hoje,
      data_inicio_projeto: hoje,
      ordem_servico: osNumber,
      _id: Date.now() + Math.random(),
    } as unknown as DraftOrdemServico;
    setContracts(prev => [...prev, novaOs]);
    setSelecionadoId(novaOs._id);
    setEditingContractId(novaOs._id);
    setOsEmpresaId("__all__");
  };

  const removeContract = (id: number) => {
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    // A seleção vai para o vizinho antes da lista encolher: assim o consultor
    // continua no mesmo ponto em vez de ser jogado para o começo.
    setSelecionadoId(selecaoAposRemover(contracts, id));
    setContracts(prev => prev.filter(c => c._id !== id));
    if (editingContractId === id) setEditingContractId(null);
  };

  const cont = contracts.find((c) => c._id === selecaoEfetiva) ?? null;
  const isEditingThis = cont != null && editingContractId === cont._id;
  const linhaEditavel = isEditingThis || escopoCliente;
  const dist = cont?.distribuicao_receita || [];

  /** A frase da falta de um campo da OS aberta, e as seções que acusam. */
  const camposDoItem = cont ? pendencias?.camposPorItem.get(cont._id) : undefined;
  const falta = (campo: string) => camposDoItem?.get(campo);
  /** Id da frase da falta, para o campo apontar com `aria-describedby`. */
  const idFalta = (campo: string) => `pend-os-${cont?._id}-${campo}`;
  const secoesPendentes = cont ? pendencias?.secoesPorItem.get(cont._id) : undefined;
  const secaoPendente = (numero: number) => secoesPendentes?.has(numero) ?? false;

  return (
    <ListaMestreDetalhe
      titulo={`OS - Ordem de Serviço (${contracts.length})`}
      acaoCriar={mostrarCriarOs && editingContractId == null ? (
        <Button size="sm" onClick={createOs} disabled={isCreatingOs} className={cn('gap-1.5 h-7 text-xs', acento.botao)}>
          <Plus size={14} /> {isCreatingOs ? "Criando..." : "Criar nova OS"}
        </Button>
      ) : null}
      linhas={contracts.map((c) => ({
        id: c._id,
        titulo: `OS ${c.ordem_servico}`,
        subtitulo: getProductCodigos(c.produtos_contratados || [], produtoSegmentoFullOptions) || "Sem produto contratado",
        etiqueta: <span className="text-xs font-bold text-foreground">{formatCurrencyDisplay(c.valor_projeto)}</span>,
        alterado: alterados.has(c._id),
        pendente: pendencias?.itens.has(c._id) ?? false,
      }))}
      selecionadoId={selecaoEfetiva}
      chaveDetalhe={`${selecaoEfetiva}:${linhaEditavel ? "edicao" : "leitura"}`}
      onSelecionar={setSelecionadoId}
      vazio="Nenhuma OS cadastrada."
      cabecalhoDetalhe={cont ? `OS ${cont.ordem_servico}` : null}
      acoesDetalhe={cont ? (
        <>
          {mostrarRemover && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="outline" aria-label={`Remover OS ${cont.ordem_servico}`} className="h-9 w-9 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 size={18} />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Remover OS</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover OS</AlertDialogTitle>
                  <AlertDialogDescription>
                    A OS "{cont.ordem_servico}" sai da lista. Ela só deixa de existir quando você salvar, e "Cancelar" desfaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeContract(cont._id)}>Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isEditingThis ? (
            <Button size="sm" variant="outline" className={cn('gap-1.5 text-xs', acento.botaoSuave)} onClick={() => setEditingContractId(null)}>
              <Check size={12} /> Pronto
            </Button>
          ) : (
            mostrarEditarPorLinha && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" aria-label={`Editar OS ${cont.ordem_servico}`} className="h-9 w-9" onClick={() => startEditContract(cont)}>
                    <Pencil size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar OS</TooltipContent>
              </Tooltip>
            )
          )}
        </>
      ) : null}
    >
      {cont && (
        <>
                {/* Leitura */}
                {!linhaEditavel && (
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 [&>*]:min-w-0">
                      <FieldPair label="Data Início" value={cont.data_inicio_projeto ? isoToMasked(cont.data_inicio_projeto) : "—"} />
                      <FieldPair label="Data Fim" value={cont.data_fim_projeto ? isoToMasked(cont.data_fim_projeto) : "—"} />
                      <FieldPair label="Data Emissão" value={cont.data_emissao ? isoToMasked(cont.data_emissao) : "—"} />
                      <FieldPair label="Situação do Projeto" value={SITUACAO_PROJETO_OPTIONS.find((o) => o.value === cont.situacao_projeto)?.label || "—"} />
                      <FieldPair label="Área do Negócio" value={setorLabel(cont.setor_cliente_id, cont.setor_cliente)} />
                      <FieldPair label="Região" value={getRegiaoLabel(cont.regiao)} />
                      <div className="col-span-2 min-w-0 md:col-span-3">
                        <OsValoresLeitura contrato={cont} />
                      </div>
                      <div className="col-span-2 min-w-0 md:col-span-3">
                        <ProdutoContratadoBlock
                          produtos={cont.produtos_contratados || []}
                          onChange={() => {}}
                          produtoOptions={produtoSegmentoFullOptions}
                          allClusters={allClusters}
                          readOnly
                          empresaId="__all__"
                          onEmpresaChange={() => {}}
                        />
                      </div>
                      {dist.length > 0 && (
                        <div className="col-span-2 min-w-0 md:col-span-3">
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground">Distribuição de Receita</p>
                          <div className="flex flex-wrap gap-2 mt-1 min-w-0">
                            {dist.map((cc, idx) => {
                              const ccOpt = CENTRO_CUSTO_OPTIONS.find((o) => o.id === cc.id_centro_custo);
                              return <Badge key={idx} variant="outline" className="text-xs">{ccOpt?.label || cc.id_centro_custo}: {cc.percentual_rateio}%</Badge>;
                            })}
                          </div>
                        </div>
                      )}
                      {cont.observacoes_projeto && (
                        <div className="col-span-2 min-w-0 md:col-span-3"><FieldPair label="Observações" value={cont.observacoes_projeto} /></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Edição — cada campo grava direto na OS */}
                {linhaEditavel && (
                  <div className="space-y-6">
                    <SecaoFormulario numero={1} titulo="Período">
                      <OsPeriodoFields
                        contrato={cont}
                        onChange={(patch) => updateContract(cont._id, patch)}
                        falta={falta}
                        idFalta={idFalta}
                      />
                    </SecaoFormulario>

                    <SecaoFormulario numero={2} titulo="Classificação" pendente={secaoPendente(2)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 [&>*]:min-w-0">
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Área do Negócio<RequiredMark /></Label>
                        <div className="mt-1">
                          <Select
                            value={cont.setor_cliente_id || "__none__"}
                            onValueChange={(v) => {
                              if (v === "__none__") {
                                updateContract(cont._id, { setor_cliente_id: "", setor_cliente: "" });
                              } else {
                                const setor = setoresCliente.find(s => s.id === v);
                                updateContract(cont._id, { setor_cliente_id: v, setor_cliente: setor?.sigla || "" });
                              }
                            }}
                          >
                            <SelectTrigger
                              {...acessibilidadeObrigatorio(idFalta('setor_cliente_id'), falta('setor_cliente_id'))}
                              className={cn("h-8", falta('setor_cliente_id') && CLASSE_CAMPO_PENDENTE)}
                            ><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione...</SelectItem>
                              {setoresCliente.map((setor) => (
                                <SelectItem key={setor.id} value={setor.id}>{setor.sigla} - {setor.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <MarcaPendencia id={idFalta('setor_cliente_id')}>{falta('setor_cliente_id')}</MarcaPendencia>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Região<RequiredMark /></Label>
                        <div className="mt-1">
                          <Select
                            value={cont.regiao || "__none__"}
                            onValueChange={(v) => updateContract(cont._id, { regiao: v === "__none__" ? "" : v })}
                          >
                            <SelectTrigger
                              {...acessibilidadeObrigatorio(idFalta('regiao'), falta('regiao'))}
                              className={cn("h-8", falta('regiao') && CLASSE_CAMPO_PENDENTE)}
                            ><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione...</SelectItem>
                              {REGIAO_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <MarcaPendencia id={idFalta('regiao')}>{falta('regiao')}</MarcaPendencia>
                        </div>
                      </div>
                    </div>
                    </SecaoFormulario>

                    <SecaoFormulario
                      numero={3}
                      titulo="Produtos contratados"
                      pendente={secaoPendente(3)}
                      acao={(
                        <Button type="button" size="sm" variant="outline" className={cn('gap-1.5 text-xs', acento.botaoSuave)} onClick={() => setPickerAberto(true)}>
                          <Plus size={14} /> Produtos
                        </Button>
                      )}
                    >
                      <ResumoSelecao
                        substantivo="produto"
                        vazio={'Nenhum produto contratado. Use "Produtos" para marcar os desta OS.'}
                        itens={ordenarPorRotulo(cont.produtos_contratados || [], produtoSegmentoFullOptions).map((pc) => ({
                          rotulo: getProductLabel(pc.produto_segmento_id, produtoSegmentoFullOptions),
                          detalhe: pc.horas_contratadas != null ? pc.horas_contratadas + "h" : undefined,
                        }))}
                      />
                      {/* Sem campo para apontar: a falta é da seleção inteira,
                          feita por diálogo. O `role="alert"` do MarcaPendencia já
                          anuncia a frase quando ela aparece. */}
                      <MarcaPendencia id={idFalta('produtos_contratados')}>{falta('produtos_contratados')}</MarcaPendencia>
                    </SecaoFormulario>

                    <ProdutosPickerDialog
                      open={pickerAberto}
                      onOpenChange={setPickerAberto}
                      produtos={produtoSegmentoFullOptions}
                      selecionados={(cont.produtos_contratados || []).map((pc) => ({
                        produto_segmento_id: pc.produto_segmento_id,
                        horas_contratadas: pc.horas_contratadas,
                      }))}
                      onConfirmar={(escolhidos) => {
                        const atuais = cont.produtos_contratados || [];
                        // Preserva o _id local de quem já estava na lista: perdê-lo
                        // faria o save tratar a linha como nova e duplicar o produto.
                        const produtos = escolhidos.map((e) => {
                          const anterior = atuais.find((pc) => pc.produto_segmento_id === e.produto_segmento_id);
                          return {
                            ...(anterior ?? { _id: Date.now() + Math.random() }),
                            produto_segmento_id: e.produto_segmento_id,
                            horas_contratadas: e.horas_contratadas,
                          };
                        });
                        updateContract(cont._id, { produtos_contratados: produtos as DraftProdutoContratado[] });
                      }}
                    />

                    <SecaoFormulario numero={4} titulo="Valores">
                      <OsValoresEdicao contrato={cont} onChange={(patch) => updateContract(cont._id, patch)} />
                    </SecaoFormulario>

                    <SecaoFormulario
                      numero={5}
                      titulo="Distribuição de receita (centros de custo)"
                      pendente={secaoPendente(5)}
                      acao={(
                        <Button type="button" size="sm" variant="outline" className={cn('gap-1.5 text-xs', acento.botaoSuave)} onClick={() => setCentrosAberto(true)}>
                          <Plus size={14} /> Centros de custo
                        </Button>
                      )}
                    >
                      <div className="space-y-4">
                        {/* A empresa que fatura pertence ao rateio, não à
                            classificação: é ela que define para onde a receita vai. */}
                        <div className="grid max-w-5xl gap-4 md:grid-cols-2">
                          <div>
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa / Faturamento<RequiredMark /></Label>
                            <div className="mt-1">
                              <Select value={osEmpresaId} onValueChange={(v) => handleEmpresaChange(cont._id, v)}>
                                <SelectTrigger
                                  {...acessibilidadeObrigatorio(idFalta('cluster_id'), falta('cluster_id'))}
                                  className={cn("h-9", falta('cluster_id') && CLASSE_CAMPO_PENDENTE)}
                                >
                                  <SelectValue placeholder="Selecione a empresa que fatura" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  <SelectItem value="__all__">Selecione a empresa que fatura</SelectItem>
                                  {empresasOrdenadas.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {/* Uma linha só: o gatilho do select repete o
                                          conteúdo do item, e em duas linhas ele ficava
                                          espremido. O cluster vai ao lado, herdando a
                                          cor do item (com opacidade) para continuar
                                          legível quando a linha fica realçada. */}
                                      <span className="flex items-baseline gap-2">
                                        <span className="font-medium">{getEmpresaLabel(c)}</span>
                                        {c.nome_empresa?.trim() && c.nome_empresa.trim() !== c.name && (
                                          <span className="text-[11px] opacity-60">{c.name}</span>
                                        )}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <MarcaPendencia id={idFalta('cluster_id')}>{falta('cluster_id')}</MarcaPendencia>
                            </div>
                          </div>

                          <div>
                            {/* A marca de obrigatório acompanha a regra de
                                `pendenciasOrdemServico`: sem contribuinte salvo o
                                campo não pode ser exigido, então prometer
                                obrigatoriedade ali seria pedir o impossível. */}
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">
                              Contribuinte de faturamento
                              {contribuintesSalvos.length > 0 && <RequiredMark />}
                            </Label>
                            <div className="mt-1">
                              <Select
                                value={cont.contribuinte_id || "__none__"}
                                onValueChange={(v) => updateContract(cont._id, { contribuinte_id: v === "__none__" ? "" : v })}
                                disabled={contribuintesSalvos.length === 0}
                              >
                                <SelectTrigger
                                  {...acessibilidadeObrigatorio(idFalta('contribuinte_id'), falta('contribuinte_id'))}
                                  className={cn("h-9", falta('contribuinte_id') && CLASSE_CAMPO_PENDENTE)}
                                >
                                  <SelectValue placeholder="Selecione o contribuinte" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  <SelectItem value="__none__">Selecione o contribuinte</SelectItem>
                                  {contribuintesSalvos.map((contribuinte) => (
                                    <SelectItem key={contribuinte._dbId} value={contribuinte._dbId}>
                                      {getContribuinteLabel(contribuinte)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <MarcaPendencia id={idFalta('contribuinte_id')}>{falta('contribuinte_id')}</MarcaPendencia>
                              {contribuintesSalvos.length === 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">Cadastre e salve um contribuinte para selecioná-lo nesta OS.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <RateioLista
                            rateios={dist}
                            opcoes={CENTRO_CUSTO_OPTIONS}
                            onPercentual={(idx, pct) =>
                              updateDistribuicao(cont._id, (d) => d.map((row, i) => (i === idx ? { ...row, percentual_rateio: pct } : row)))}
                            onRemover={(idx) =>
                              updateDistribuicao(cont._id, (d) => d.filter((_, i) => i !== idx))}
                          />
                          <MarcaPendencia id={idFalta('distribuicao_receita')}>{falta('distribuicao_receita')}</MarcaPendencia>
                        </div>
                      </div>
                    </SecaoFormulario>

                    <CentrosCustoPickerDialog
                      open={centrosAberto}
                      onOpenChange={setCentrosAberto}
                      opcoes={CENTRO_CUSTO_OPTIONS}
                      selecionados={dist}
                      onConfirmar={(rateios) => {
                        // Preserva o _dbId de quem já existia: sem ele o save trata a
                        // linha como nova e grava um segundo rateio do mesmo centro.
                        updateDistribuicao(cont._id, (atual) =>
                          rateios.map((r) => {
                            const anterior = atual.find((x) => x.id_centro_custo === r.id_centro_custo);
                            return anterior ? { ...anterior, percentual_rateio: r.percentual_rateio } : r;
                          }));
                      }}
                    />

                    <SecaoFormulario numero={6} titulo="Observações">
                      <Textarea value={cont.observacoes_projeto || ""} onChange={(e) => updateContract(cont._id, { observacoes_projeto: e.target.value })} placeholder="Insira observações relevantes sobre o projeto..." className="min-h-[60px]" />
                    </SecaoFormulario>
                  </div>
                )}
        </>
      )}
    </ListaMestreDetalhe>
  );
}
