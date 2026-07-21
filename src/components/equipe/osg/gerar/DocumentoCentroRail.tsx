import type { GerarDocumentoController } from '@/hooks/useGerarDocumentoController';
import { CheckCircle2, Layers, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FolhaDocumento } from '@/components/equipe/osg/gerar/FolhaDocumento';
import { PainelAcoes } from '@/components/equipe/osg/gerar/PainelAcoes';
import { BannerVersaoAnterior, HistoricoVersoes } from '@/components/equipe/osg/gerar/HistoricoVersoes';
import { SeletorRail, OpcaoRail } from '@/components/equipe/osg/gerar/gerarKit';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { labelDoBinding } from '@/lib/templates/binding';

export function DocumentoCentroRail({ controller }: { controller: GerarDocumentoController }) {
  const {
  modelos, carregandoModelos, modeloId, setModeloId, carregandoBlocos, clienteId, registros,
  carregandoRegistros, selecao, registroPorBinding, valoresLivres, setValoresLivres,
  empresaId, setEmpresaId, copiado, passoAberto, setPassoAberto, ajustesAbertos,
  setAjustesAbertos, railAberto, setRailAberto, versaoVisualizadaId, setVersaoVisualizadaId,
  abaEfetiva, setAba, documentoGeradoId, documentoRaizId, versoes, congelado,
  porBlocoAlvo, template, nomePorBlocoId, salvarDocumento, blocoOverrideAlvo,
  setBlocoOverrideAlvo, blocoPendente, setBlocoPendente, validarConfirmOpen,
  setValidarConfirmOpen, novaVersaoConfirmOpen, setNovaVersaoConfirmOpen,
  gatingPromptOpen, setGatingPromptOpen, setRecongelarPendente, confirmarValidacao,
  confirmarNovaVersao, confirmarValidacaoEAbrirBloco, revalidar, pessoaEditando, bemEditando,
  matriculaEditando, flagsAtivas, temBlocosComFlags, blocosExcluidos, bindings,
  secoesDesconhecidas, precisaEmpresa, socios, administradores, integralizacoes,
  carregandoListasEfetivo, ehEmpresaPR, sociosSemCadastro, capitalValor, totalQuotas,
  naoLidas, linhasNotificacao, marcarVistas, autorPorId, desconhecidosVisiveis,
  camposPorBinding, escolherRegistro, editarCampo, editarBlocoNaPrevia, matriculasDoCliente, origemClicavel,
  abrirCadastroOrigem, fecharCadastroOrigem, resultado, copiar, nomeModelo, baixando,
  baixar, empresas, bindingsNaoSociedade, modeloPronto, passo1Estado, passo2Estado,
  modoDocumento, empresaLabel, labelsRegistros, resumoPasso2, mensagemPendente,
  blocosFolha, versaoView, modoVisualizacao, blocosFolhaVersao, baixandoVersao,
  baixarVersao, folhaEstado, infoFolha, temPainel, mostraSocios, mostraAdministradores,
  mostraIntegralizacoes,
} = controller;
  return (<>              <div className="order-2 mx-auto w-full min-w-0 max-w-[860px] space-y-3">
                {modoVisualizacao && versaoView && (
                  <BannerVersaoAnterior
                    numero={versaoView.numero}
                    data={versaoView.row.snapshot_validado_em ?? versaoView.row.created_at}
                    autor={autorPorId[versaoView.row.gerado_por_id ?? '']}
                    baixando={baixandoVersao}
                    onBaixar={() => void baixarVersao()}
                    onVoltar={() => setVersaoVisualizadaId(null)}
                  />
                )}
                <FolhaDocumento
                  titulo={nomeModelo}
                  estado={modoVisualizacao ? (versaoView?.erro ? 'erro' : 'pronto') : folhaEstado}
                  mensagemPendente={mensagemPendente}
                  erro={modoVisualizacao ? versaoView?.erro : resultado.erro}
                  blocos={modoVisualizacao ? blocosFolhaVersao : blocosFolha}
                  onEditarBloco={modoVisualizacao ? undefined : editarBlocoNaPrevia}
                  onClickOrigem={modoVisualizacao ? undefined : abrirCadastroOrigem}
                  origemClicavel={modoVisualizacao ? undefined : origemClicavel}
                />
              </div>

              <aside className="order-1 space-y-4 xl:sticky xl:top-4 xl:order-3">
                {versoes.length > 1 && (
                  <HistoricoVersoes
                    versoes={versoes}
                    autores={autorPorId}
                    versaoVisualizadaId={versaoVisualizadaId}
                    onSelecionar={setVersaoVisualizadaId}
                    aberto={railAberto === 'versoes'}
                    onAbertoChange={(aberto) => setRailAberto(aberto ? 'versoes' : null)}
                  />
                )}

                {/* Visualizando uma versão anterior, as ações da head (validar,
                    atualizar, copiar/baixar, trocar modelo) saem de cena — o banner
                    sobre a folha conduz a leitura. */}
                {!modoVisualizacao && (
                  <>
                {/* Validar versão: encerra os cadastros, congela os valores e
                    habilita o ajuste de blocos só deste documento. */}
                {documentoGeradoId ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1.5 rounded-md border border-osg-moss/30 bg-osg-moss/[0.06] px-3 py-2 text-xs font-semibold text-osg-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-osg-moss" />
                      Versão validada · rascunho
                    </div>
                    {/* Commit deliberado: sela esta versão e abre uma nova a
                        partir dela (a anterior fica preservada no histórico). */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/[0.06] hover:text-osg-800"
                          onClick={() => setNovaVersaoConfirmOpen(true)}
                          disabled={salvarDocumento.isPending}
                        >
                          {salvarDocumento.isPending ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Layers className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Atualizar versão
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        Fecha esta versão (fica preservada como está) e abre uma nova a partir dela, com os mesmos
                        dados e ajustes — para seguir editando sem perder o que já validou.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-osg-600 hover:text-osg-800"
                          onClick={() => void revalidar()}
                          disabled={salvarDocumento.isPending}
                        >
                          {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          Atualizar do cadastro
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        Puxa os dados atuais dos cadastros e congela esta versão de novo.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/[0.06] hover:text-osg-800"
                        onClick={() => setValidarConfirmOpen(true)}
                        disabled={salvarDocumento.isPending}
                      >
                        {salvarDocumento.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-1.5 h-4 w-4" />
                        )}
                        Validar versão
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs leading-relaxed">
                      Confirma que os cadastros estão completos e revisados e congela os valores atuais nesta
                      versão do documento. Depois de validar, você pode ajustar blocos só deste documento.
                    </TooltipContent>
                  </Tooltip>
                )}

                <PainelAcoes
                  pronto={folhaEstado === 'pronto'}
                  info={infoFolha}
                  onCopiar={copiar}
                  copiado={copiado}
                  onBaixar={baixar}
                  baixando={baixando}
                />

                {/* As escolhas dos passos, agora compactas: trocar o modelo
                    volta o fluxo aos passos (as seleções zeram); trocar a
                    empresa atualiza a folha na hora. */}
                <div className="space-y-3">
                  <SeletorRail
                    titulo="Modelo"
                    resumo={nomeModelo}
                    aberto={railAberto === 'modelo'}
                    onAbertoChange={(aberto) => setRailAberto(aberto ? 'modelo' : null)}
                  >
                    <div className="space-y-0.5">
                      {modelos
                        .filter((m) => m.ativo)
                        .map((m) => (
                          <OpcaoRail
                            key={m.id}
                            selecionado={m.id === modeloId}
                            onEscolher={() => {
                              setModeloId(m.id);
                              setRailAberto(null);
                            }}
                          >
                            {m.nome}
                          </OpcaoRail>
                        ))}
                    </div>
                  </SeletorRail>

                  {precisaEmpresa && (
                    <SeletorRail
                      titulo="Empresa do contrato"
                      resumo={empresaLabel}
                      aberto={railAberto === 'empresa'}
                      onAbertoChange={(aberto) => setRailAberto(aberto ? 'empresa' : null)}
                    >
                      <div className="space-y-0.5">
                        {empresas.map((r) => (
                          <OpcaoRail
                            key={r.id}
                            selecionado={r.id === empresaId}
                            onEscolher={() => {
                              setEmpresaId(r.id);
                              setRailAberto(null);
                              if (congelado) setRecongelarPendente(true);
                            }}
                          >
                            {r.label}
                          </OpcaoRail>
                        ))}
                      </div>
                    </SeletorRail>
                  )}

                  {bindingsNaoSociedade.length > 0 && (
                    <SeletorRail
                      titulo="Demais papéis"
                      resumo={labelsRegistros.join(' · ')}
                      aberto={railAberto === 'registros'}
                      onAbertoChange={(aberto) => setRailAberto(aberto ? 'registros' : null)}
                    >
                      <div className="space-y-3 p-1.5">
                        {bindingsNaoSociedade.map((b) => (
                          <div key={b.nome} className="space-y-1.5">
                            <Label className={labelCls}>{labelDoBinding(b.nome)}</Label>
                            <Select
                              value={registroPorBinding[b.nome] ?? undefined}
                              onValueChange={(id) => escolherRegistro(b.nome, b.tipo, id)}
                            >
                              <SelectTrigger className={fieldCls}>
                                <SelectValue placeholder="Selecione…" />
                              </SelectTrigger>
                              <SelectContent>
                                {registros[b.tipo].map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </SeletorRail>
                  )}
                </div>
                  </>
                )}
              </aside>
  </>);
}
