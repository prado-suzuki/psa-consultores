import type { GerarDocumentoController } from '@/hooks/useGerarDocumentoController';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, Check, ChevronDown, Database, Landmark, Loader2, Map as MapIcon, Pencil, PieChart, Sparkles, UserCog, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { campoDaEntidade } from '@/lib/templates/vocabulario';
import { labelDoBinding } from '@/lib/templates/binding';
import { BlocosSemDado } from '@/components/equipe/osg/gerar/BlocosSemDado';
import { fraseExcluidosPorFlag } from '@/components/equipe/osg/gerar/resumoDaComposicao';
import { fmtBRL, fmtInt } from '@/components/equipe/osg/quadro-societario/quadroFmt';
import { fieldCls, labelCls, textareaCls } from '@/components/equipe/osg/formKit';
import type { LinhaNotificacao } from '@/hooks/useGerarDocumentoController';

const SecaoPainel = ({ icone, titulo, contagem, children }: { icone: ReactNode; titulo: string; contagem?: number; children: ReactNode }) => (
  <div className="space-y-2.5"><div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600"><span className="text-osg-600 [&>svg]:h-4 [&>svg]:w-4">{icone}</span>{titulo}{contagem != null && <span className="ml-auto rounded-full bg-osg-100 px-1.5 py-px text-xs font-bold tabular-nums text-osg-700">{contagem}</span>}</div>{children}</div>
);
const AvisoPendencia = ({ children, acao, onAcao }: { children: ReactNode; acao?: string; onAcao?: () => void }) => (
  <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning"><div className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{children}</span></div>{acao && <Button variant="outline" size="sm" className="h-8 border-warning/40 bg-white text-sm text-warning hover:bg-warning/20 hover:text-warning" onClick={onAcao}>{acao}</Button>}</div>
);

const ListaNotificacoes = ({ linhas, naoLidas, onMarcarLido, marcando }: {
  linhas: LinhaNotificacao[];
  naoLidas: number;
  onMarcarLido: () => void;
  marcando: boolean;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-slate-500">
        {naoLidas > 0 ? `${naoLidas} ${naoLidas > 1 ? 'alterações' : 'alteração'} desde a validação` : 'Tudo em dia desde a validação'}
      </p>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-osg-600 hover:text-osg-700 disabled:opacity-40" onClick={onMarcarLido} disabled={naoLidas === 0 || marcando}>
        {marcando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Marcar como lido
      </Button>
    </div>
    {linhas.length === 0 ? (
      <p className="rounded-md border border-dashed border-osg-200/70 bg-osg-50/40 px-3 py-6 text-center text-sm text-slate-500">Nenhuma alteração desde a validação.</p>
    ) : (
      <ul className="space-y-2">
        {linhas.map((linha) => (
          <li key={linha.key} className="rounded-md border border-osg-200/60 bg-white px-3 py-2 text-sm shadow-sm shadow-osg-300/10">
            <p className="leading-snug text-slate-700">
              {linha.action === 'field' ? <><span className="font-semibold text-slate-700">{linha.label}</span> de <em className="not-italic font-medium text-slate-600">{linha.entityName}</em> alterado para <span className="font-semibold text-osg-700">{linha.newValue}</span></> : <><em className="not-italic font-medium text-slate-600">{linha.entityName}</em> {linha.action === 'created' ? 'adicionado ao cadastro' : linha.action === 'deleted' ? 'removido do cadastro' : 'atualizado'}</>}
            </p>
            <p className="mt-1 text-xs text-slate-400">{linha.meta}</p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export function PainelConferencia({ controller }: { controller: GerarDocumentoController }) {
  const navigate = useNavigate();
  const {
  modelos, carregandoModelos, modeloId, setModeloId, carregandoBlocos, clienteId, registros,
  carregandoRegistros, selecao, registroPorBinding, blocosSemDado, valoresLivres, setValoresLivres,
  empresaId, setEmpresaId, copiado, passoAberto, setPassoAberto, ajustesAbertos,
  setAjustesAbertos, railAberto, setRailAberto, versaoVisualizadaId, setVersaoVisualizadaId,
  abaEfetiva, setAba, documentoGeradoId, documentoRaizId, versoes, congelado,
  porBlocoAlvo, template, nomePorBlocoId, salvarDocumento, blocoOverrideAlvo,
  setBlocoOverrideAlvo, blocoPendente, setBlocoPendente, validarConfirmOpen,
  setValidarConfirmOpen, novaVersaoConfirmOpen, setNovaVersaoConfirmOpen,
  gatingPromptOpen, setGatingPromptOpen, setRecongelarPendente, confirmarValidacao,
  confirmarNovaVersao, confirmarValidacaoEAbrirBloco, pessoaEditando, bemEditando,
  matriculaEditando, flagsAtivas, temBlocosComFlags, blocosExcluidosPorPerfil, bindings,
  secoesDesconhecidas, precisaEmpresa, socios, administradores, integralizacoes,
  carregandoListasEfetivo, ehEmpresaPR, sociosSemCadastro, capitalValor, totalQuotas,
  naoLidas, linhasNotificacao, marcarVistas, autorPorId, desconhecidosVisiveis,
  camposPorBinding, escolherRegistro, editarCampo, matriculasDoCliente, origemClicavel,
  abrirCadastroOrigem, fecharCadastroOrigem, resultado, copiar, nomeModelo, baixando,
  baixar, empresas, bindingsNaoSociedade, modeloPronto, passo1Estado, passo2Estado,
  modoDocumento, empresaLabel, labelsRegistros, resumoPasso2, mensagemPendente,
  blocosFolha, versaoView, modoVisualizacao, blocosFolhaVersao, baixandoVersao,
  baixarVersao, folhaEstado, infoFolha, temPainel, mostraSocios, mostraAdministradores,
  mostraIntegralizacoes,
} = controller;
  return (<>              {temPainel && (
                <Card className="order-3 rounded-md border-osg-300/60 shadow-sm shadow-osg-300/30 xl:sticky xl:top-4 xl:order-1">
                  <CardHeader className="space-y-2 pb-4">
                    {documentoGeradoId ? (
                      <>
                        {/* Validado: a conferência divide o painel com as notificações. */}
                        <div className="flex gap-1 rounded-md bg-osg-50 p-1">
                          <button
                            type="button"
                            onClick={() => setAba('conferencia')}
                            className={cn(
                              'flex-1 rounded px-2 py-1 text-sm font-medium transition-colors',
                              abaEfetiva === 'conferencia'
                                ? 'bg-white text-osg-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700',
                            )}
                          >
                            Conferência
                          </button>
                          <button
                            type="button"
                            onClick={() => setAba('notificacoes')}
                            className={cn(
                              'flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-sm font-medium transition-colors',
                              abaEfetiva === 'notificacoes'
                                ? 'bg-white text-osg-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700',
                            )}
                          >
                            <Bell className="h-4 w-4" />
                            Notificações
                            {naoLidas > 0 && (
                              <span className="rounded-full bg-osg-moss px-1.5 text-xs font-bold tabular-nums text-white">
                                {naoLidas}
                              </span>
                            )}
                          </button>
                        </div>
                        <CardDescription className="text-sm">
                          {abaEfetiva === 'conferencia'
                            ? 'Tudo abaixo veio do cadastro — confira antes de baixar.'
                            : 'Mudanças nos cadastros desde que esta versão foi validada.'}
                        </CardDescription>
                      </>
                    ) : (
                      <>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                          <Database className="h-4 w-4 text-osg-600" /> Conferência dos dados
                        </CardTitle>
                        <span aria-hidden className="block h-[3px] w-10 rounded-full bg-osg-moss" />
                        <CardDescription className="text-sm">
                          Tudo abaixo veio do cadastro — confira antes de baixar.
                        </CardDescription>
                      </>
                    )}
                  </CardHeader>
                  {abaEfetiva === 'conferencia' && (
                  <CardContent className="space-y-6">
                    {carregandoListasEfetivo ? (
                      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do cadastro…
                      </div>
                    ) : (
                      <>
                        {empresaId && (capitalValor != null || totalQuotas != null) && (
                          <div className="divide-y divide-osg-200/60 overflow-hidden rounded-md border border-osg-200/70 bg-osg-50/50">
                            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                              <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <Landmark className="h-3.5 w-3.5 shrink-0 text-osg-600" /> Capital social
                              </p>
                              <p className="whitespace-nowrap text-base font-bold tabular-nums text-osg-700">
                                {capitalValor != null ? fmtBRL.format(capitalValor) : '—'}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                              <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <PieChart className="h-3.5 w-3.5 shrink-0 text-osg-600" /> Quotas
                              </p>
                              <p className="whitespace-nowrap text-base font-bold tabular-nums text-osg-700">
                                {totalQuotas != null ? fmtInt.format(totalQuotas) : '—'}
                              </p>
                            </div>
                          </div>
                        )}

                        {empresaId && mostraSocios && (
                          <SecaoPainel icone={<Users />} titulo="Sócios" contagem={socios.length}>
                            {socios.length === 0 ? (
                              <AvisoPendencia
                                acao={ehEmpresaPR ? 'Abrir Diagnóstico Patrimonial' : 'Abrir Quadro Societário'}
                                onAcao={() =>
                                  navigate(
                                    ehEmpresaPR
                                      ? '/equipe/osg/work/diagnostico-patrimonial'
                                      : '/equipe/osg/work/quadro-societario',
                                  )
                                }
                              >
                                {ehEmpresaPR
                                  ? 'Nenhum bem aprovado para integralização nesta empresa — os sócios da Proprietária vêm do Diagnóstico Patrimonial.'
                                  : 'Nenhum sócio no Quadro Societário desta empresa.'}
                              </AvisoPendencia>
                            ) : (
                              <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                                {socios.map((s, i) => (
                                  <li
                                    key={s.pessoa.id}
                                    className="flex items-baseline gap-2 text-sm text-slate-700"
                                  >
                                    <span className="w-4 shrink-0 text-right tabular-nums text-slate-400">
                                      {i + 1}.
                                    </span>
                                    <span className="min-w-0 flex-1 truncate" title={s.pessoa.denominacao}>
                                      {s.pessoa.denominacao}
                                    </span>
                                    {s.quotas != null && (
                                      <span className="shrink-0 tabular-nums text-slate-500">
                                        {fmtInt.format(s.quotas)} quotas
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {sociosSemCadastro.length > 0 && (
                              <AvisoPendencia
                                acao="Abrir Controle de Matrículas"
                                onAcao={() => navigate('/equipe/osg/work/controle-matriculas')}
                              >
                                {sociosSemCadastro.length} titular(es) sem cadastro (
                                {sociosSemCadastro.map((s) => s.pessoa.denominacao).join(', ')}): entram
                                como sócios, mas a qualificação sai incompleta. Vincule a pessoa na
                                titularidade da matrícula.
                              </AvisoPendencia>
                            )}
                          </SecaoPainel>
                        )}

                        {empresaId && mostraAdministradores && (
                          <SecaoPainel
                            icone={<UserCog />}
                            titulo="Administradores"
                            contagem={administradores.length}
                          >
                            {administradores.length === 0 ? (
                              <AvisoPendencia>
                                Nenhum administrador cadastrado para esta empresa.
                              </AvisoPendencia>
                            ) : (
                              <ul className="space-y-1.5">
                                {administradores.map((a, i) => (
                                  <li
                                    key={a.pessoa.id}
                                    className="flex items-baseline gap-2 text-sm text-slate-700"
                                  >
                                    <span className="w-4 shrink-0 text-right tabular-nums text-slate-400">
                                      {i + 1}.
                                    </span>
                                    <span className="min-w-0 flex-1 truncate" title={a.pessoa.denominacao}>
                                      {a.pessoa.denominacao}
                                    </span>
                                    {a.cargo && (
                                      <span className="shrink-0 text-slate-500">{a.cargo}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </SecaoPainel>
                        )}

                        {empresaId && mostraIntegralizacoes && (
                          <SecaoPainel
                            icone={<MapIcon />}
                            titulo="Imóveis integralizados"
                            contagem={integralizacoes.length}
                          >
                            {integralizacoes.length === 0 ? (
                              <AvisoPendencia
                                acao="Abrir Diagnóstico Patrimonial"
                                onAcao={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
                              >
                                Nenhum imóvel aprovado para integralização nesta empresa.
                              </AvisoPendencia>
                            ) : (
                              <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                                {integralizacoes.map((m) => (
                                  <li key={m.id} className="flex items-baseline gap-2 text-sm text-slate-700">
                                    <span className="shrink-0 tabular-nums text-slate-500">
                                      Matr. {m.numero ?? 's/ nº'}
                                    </span>
                                    <span
                                      className="min-w-0 flex-1 truncate"
                                      title={m.bem?.denominacao ?? undefined}
                                    >
                                      {m.bem?.denominacao ?? ''}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </SecaoPainel>
                        )}

                        {empresaId && temBlocosComFlags && (
                          flagsAtivas.length === 0 ? (
                            <AvisoPendencia
                              acao="Abrir Qualificação das Partes"
                              onAcao={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
                            >
                              Não foi possível identificar o tipo desta empresa — as cláusulas
                              condicionais podem sair erradas. Confira o tipo da empresa no cadastro.
                            </AvisoPendencia>
                          ) : (
                            <div className="space-y-1.5 rounded-md border border-osg-moss/25 bg-osg-moss/[0.05] p-3 text-sm">
                              <p className="flex items-center gap-1.5 font-semibold text-osg-700">
                                <Sparkles className="h-4 w-4" /> Ajustado ao perfil da empresa
                              </p>
                              <p className="text-slate-600">
                                {fraseExcluidosPorFlag(
                                  blocosExcluidosPorPerfil.map((b) => nomePorBlocoId.get(b.id) ?? b.id),
                                )}
                              </p>
                            </div>
                          )
                        )}

                        {empresaId && (mostraSocios || mostraIntegralizacoes) && (
                          <p className="flex items-start gap-1.5 text-xs text-slate-500">
                            <Database className="mt-0.5 h-3 w-3 shrink-0 text-osg-600" />
                            {ehEmpresaPR
                              ? 'Sócios calculados das integralizações aprovadas (participação decrescente); administradores do cadastro.'
                              : 'Preenchido do cadastro, na ordem do registro.'}
                          </p>
                        )}
                      </>
                    )}

                    <BlocosSemDado blocos={blocosSemDado} />

                    {secoesDesconhecidas.length > 0 && (
                      <AvisoPendencia>
                        Partes do modelo não foram reconhecidas e ficaram fora do documento:{' '}
                        <code>{secoesDesconhecidas.map((s) => `#${s}`).join(', ')}</code>. Avise quem
                        montou o modelo.
                      </AvisoPendencia>
                    )}

                    {desconhecidosVisiveis.length > 0 && (
                      <SecaoPainel
                        icone={<Pencil />}
                        titulo="Preencher à mão"
                        contagem={desconhecidosVisiveis.length}
                      >
                        <p className="text-xs text-slate-500">
                          Estes campos do modelo não vêm do cadastro.
                        </p>
                        <div className="space-y-3">
                          {desconhecidosVisiveis.map((ph) => (
                            <div key={ph} className="space-y-1.5">
                              <Label className={cn(labelCls, 'text-sm')}>{ph}</Label>
                              <Input
                                value={valoresLivres[ph] ?? ''}
                                onChange={(e) => {
                                  setValoresLivres((prev) => ({ ...prev, [ph]: e.target.value }));
                                  if (congelado) setRecongelarPendente(true);
                                }}
                                className={cn(fieldCls, 'text-sm')}
                              />
                            </div>
                          ))}
                        </div>
                      </SecaoPainel>
                    )}

                    {bindings.length > 0 && (
                      <Collapsible open={ajustesAbertos} onOpenChange={setAjustesAbertos}>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 rounded-md border border-osg-200/70 bg-osg-50/40 px-3 py-2 text-sm font-semibold text-osg-700 transition-colors hover:bg-osg-50"
                          >
                            <Pencil className="h-4 w-4" /> Ajustar dados manualmente
                            <ChevronDown
                              className={cn(
                                'ml-auto h-4 w-4 transition-transform duration-200',
                                ajustesAbertos && 'rotate-180',
                              )}
                            />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-5 pt-4">
                          <p className="text-xs text-slate-500">
                            Os ajustes valem só para este documento — o cadastro não muda.
                          </p>
                          {bindings.map((b) => (
                            <div key={b.nome} className="space-y-2.5">
                              <p className="text-sm font-semibold text-slate-600">
                                {labelDoBinding(b.nome)}
                              </p>
                              {b.tipo === 'sociedade' && !empresaId && (
                                <p className="text-xs text-slate-500">
                                  Selecione a empresa para preencher.
                                </p>
                              )}
                              <div className="space-y-3">
                                {(camposPorBinding[b.nome] ?? []).map((c) => {
                                  const valor = selecao[b.nome]?.[c.id] ?? '';
                                  const onChange = (v: string) => editarCampo(b.nome, b.tipo, c.id, v);
                                  // Placeholder com campo que não existe no catálogo da
                                  // entidade (ex.: sociedade.objetoSocial em vez de
                                  // sociedade.objeto): não preenche do cadastro — avisar
                                  // em vez de deixar vazio em silêncio.
                                  const foraDoCatalogo = !campoDaEntidade(b.tipo, c.id);
                                  return (
                                    <div key={c.id} className="space-y-1">
                                      <Label className={cn(labelCls, 'text-sm')}>{c.label}</Label>
                                      {c.tipo === 'textarea' ? (
                                        <Textarea
                                          value={valor}
                                          onChange={(e) => onChange(e.target.value)}
                                          rows={4}
                                          className={cn(textareaCls, 'text-sm')}
                                        />
                                      ) : (
                                        <Input
                                          value={valor}
                                          onChange={(e) => onChange(e.target.value)}
                                          className={cn(fieldCls, 'text-sm')}
                                        />
                                      )}
                                      {foraDoCatalogo && (
                                        <p className="flex items-start gap-1 text-xs text-warning">
                                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                          <span>
                                            "{c.id}" não existe no cadastro de {labelDoBinding(b.nome)} —
                                            preencha à mão (ou corrija o campo no modelo).
                                          </span>
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                  )}

                  {abaEfetiva === 'notificacoes' && documentoGeradoId && (
                    <CardContent>
                      <ListaNotificacoes
                        linhas={linhasNotificacao}
                        naoLidas={naoLidas}
                        marcando={marcarVistas.isPending}
                        onMarcarLido={() => marcarVistas.mutate(documentoGeradoId)}
                      />
                    </CardContent>
                  )}
                </Card>
              )}</>);
}
