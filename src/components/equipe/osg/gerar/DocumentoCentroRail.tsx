import type { GerarDocumentoController } from '@/hooks/useGerarDocumentoController';
import { CheckCircle2, FileStack, Layers, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FolhaDocumento } from '@/components/equipe/osg/gerar/FolhaDocumento';
import { PainelAcoes } from '@/components/equipe/osg/gerar/PainelAcoes';
import { BannerVersaoAnterior, HistoricoVersoes } from '@/components/equipe/osg/gerar/HistoricoVersoes';
import { SeletorRail, OpcaoRail } from '@/components/equipe/osg/gerar/gerarKit';
import { SelecaoRegistrosLista } from '@/components/equipe/osg/gerar/SelecaoRegistrosLista';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { labelDoBinding } from '@/lib/templates/binding';

export function DocumentoCentroRail({ controller }: { controller: GerarDocumentoController }) {
  const {
  modelos, carregandoModelos, modeloId, setModeloId, carregandoBlocos, clienteId, registros,
  carregandoRegistros, selecao, registroPorBinding, registrosPorLista,
  alternarRegistroDaLista, listasDeSelecao, valoresLivres, setValoresLivres,
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
  documentoRegistrado, alteracaoEmCurso, podeReverEventos, podeGerarAlteracao,
  podeRegistrarNaJunta, resumoDaAlteracao, motivoDeBloqueio,
  abrirAlteracao, setRegistrarConfirmOpen, registrandoDocumento,
  modoDocumento, empresaLabel, labelsRegistros, resumoPasso2, mensagemPendente,
  blocosFolha, versaoView, modoVisualizacao, blocosFolhaVersao, baixandoVersao,
  baixarVersao, folhaEstado, infoFolha, temPainel, mostraSocios, mostraAdministradores,
  mostraIntegralizacoes,
} = controller;
  // Documento registrado na junta: peça travada. Nada de editar bloco na prévia,
  // nada de clicar na origem para abrir cadastro — o que valeu, valeu. A exceção
  // é quando já há alteração em curso: aí a tela não é mais a do registrado, é a
  // do documento novo compondo ao vivo.
  const travado = !!documentoRegistrado && !alteracaoEmCurso;
  const somenteLeitura = modoVisualizacao || travado;
  // O assistente segue alcançável depois de validar: a folha passa a renderizar do
  // snapshot, então mudar uma resposta aqui só reescreve o texto depois de
  // "Atualizar do cadastro". É o que a tooltip diz, em vez de a tela calar.
  const reverEventos = podeReverEventos ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-osg-600 hover:text-osg-800"
          onClick={abrirAlteracao}
        >
          Rever os eventos
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        Reabre o assistente com as respostas gravadas.
        {congelado
          ? ' Com a versão já validada, mudar uma resposta aparece no texto depois de "Atualizar do cadastro".'
          : ''}
      </TooltipContent>
    </Tooltip>
  ) : null;
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
                  onEditarBloco={somenteLeitura ? undefined : editarBlocoNaPrevia}
                  onClickOrigem={somenteLeitura ? undefined : abrirCadastroOrigem}
                  origemClicavel={somenteLeitura ? undefined : origemClicavel}
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
                {/* Documento REGISTRADO na junta: acabou a edição. O caminho
                    para mudar a sociedade a partir daqui não é editar esta peça,
                    é gerar outra que a substitua. */}
                {travado ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                      <Lock className="h-3.5 w-3.5 text-slate-500" />
                      Registrado na junta
                    </div>
                    <p className="px-1 text-[11px] leading-relaxed text-slate-500">
                      Esta peça está travada: ela já produziu efeito e não se reescreve.
                    </p>
                    {podeGerarAlteracao && (
                      <Button
                        variant="outline"
                        className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/[0.06] hover:text-osg-800"
                        onClick={abrirAlteracao}
                      >
                        <FileStack className="mr-1.5 h-4 w-4" />
                        Gerar alteração contratual
                      </Button>
                    )}
                  </div>
                ) : alteracaoEmCurso ? (
                  <div className="space-y-2">
                    {/* A folha aqui já é o documento NOVO, composto ao vivo:
                        resoluções pelos eventos marcados e consolidado do
                        cadastro atualizado. Validar é que o faz existir. */}
                    <div className="space-y-1 rounded-md border border-osg-moss/30 bg-osg-moss/[0.06] px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-osg-700">
                        <FileStack className="h-3.5 w-3.5 text-osg-moss" />
                        Alteração contratual
                      </div>
                      <p className="text-[11px] leading-relaxed text-osg-700/80">{resumoDaAlteracao}</p>
                    </div>
                    {reverEventos}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/[0.06] hover:text-osg-800"
                          onClick={() => setValidarConfirmOpen(true)}
                          disabled={salvarDocumento.isPending || !!motivoDeBloqueio}
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
                        {motivoDeBloqueio
                          ? `${motivoDeBloqueio}. Conserte antes de validar: selar uma folha em erro grava um documento que não existe como texto.`
                          : 'Cria a alteração contratual como documento próprio, apontando para a peça registrada que ela substitui, e congela os valores atuais nela.'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : documentoGeradoId ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1.5 rounded-md border border-osg-moss/30 bg-osg-moss/[0.06] px-3 py-2 text-xs font-semibold text-osg-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-osg-moss" />
                      Versão validada · rascunho
                    </div>
                    {reverEventos}
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
                    {/* Fim da linha do documento: ele foi levado à junta e
                        registrado. Daqui em diante só se muda por outro
                        documento, e é isso que destrava o assistente de
                        alteração contratual.

                        Só para modelo de escopo `sociedade`: a junta comercial
                        registra ato societário, e um contrato de parceria ou uma
                        descrição de imóvel não têm o que registrar lá. Registrar
                        carimba o ledger de quotas, o que numa peça avulsa não
                        significaria nada. */}
                    {podeRegistrarNaJunta && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-slate-500 hover:text-slate-800"
                          onClick={() => setRegistrarConfirmOpen(true)}
                          disabled={registrandoDocumento || salvarDocumento.isPending || !!motivoDeBloqueio}
                        >
                          {registrandoDocumento ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Lock className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Registrar na junta
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs leading-relaxed">
                        {motivoDeBloqueio
                          ? `${motivoDeBloqueio}. Registrar é o gesto irreversível: ele carimba o ledger e vira o status dos bens.`
                          : 'Marca que esta peça foi registrada e a trava para edição. Depois disso, a forma de mudar a sociedade é gerar uma alteração contratual a partir dela.'}
                      </TooltipContent>
                    </Tooltip>
                    )}
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/[0.06] hover:text-osg-800"
                        onClick={() => setValidarConfirmOpen(true)}
                        disabled={salvarDocumento.isPending || !!motivoDeBloqueio}
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
                      {motivoDeBloqueio
                        ? `${motivoDeBloqueio}. Conserte antes de validar: selar uma folha em erro grava um documento que não existe como texto.`
                        : 'Confirma que os cadastros estão completos e revisados e congela os valores atuais nesta versão do documento. Depois de validar, você pode ajustar blocos só deste documento.'}
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

                  {/* Caminho de volta da seleção múltipla: com o documento em
                      cena os passos saem da tela, e sem isto não haveria como
                      acrescentar ou tirar uma matrícula da lista. */}
                  {listasDeSelecao.map((lista) => {
                    const marcados = registrosPorLista[lista.nome] ?? [];
                    return (
                      <SeletorRail
                        key={lista.nome}
                        titulo={lista.papel.label}
                        resumo={`${marcados.length} selecionado${marcados.length === 1 ? '' : 's'}`}
                        aberto={railAberto === `lista:${lista.nome}`}
                        onAbertoChange={(aberto) => setRailAberto(aberto ? `lista:${lista.nome}` : null)}
                      >
                        <SelecaoRegistrosLista
                          compacto
                          nome={lista.nome}
                          registros={registros[lista.papel.tipo]}
                          selecionados={marcados}
                          onAlternar={(registroId) => alternarRegistroDaLista(lista.nome, registroId)}
                        />
                      </SeletorRail>
                    );
                  })}

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
