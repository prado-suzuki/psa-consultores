import type { GerarDocumentoController } from '@/hooks/useGerarDocumentoController';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PassoCard } from '@/components/equipe/osg/gerar/gerarKit';
import { EscolhaModelo } from '@/components/equipe/osg/gerar/EscolhaModelo';
import { EscolhaEmpresa } from '@/components/equipe/osg/gerar/EscolhaEmpresa';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { labelDoBinding } from '@/lib/templates/binding';

export function GerarDocumentoEscolhas({ controller }: { controller: GerarDocumentoController }) {
  const navigate = useNavigate();
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
  confirmarNovaVersao, confirmarValidacaoEAbrirBloco, pessoaEditando, bemEditando,
  matriculaEditando, flagsAtivas, temBlocosComFlags, blocosExcluidos, bindings,
  secoesDesconhecidas, precisaEmpresa, socios, administradores, integralizacoes,
  carregandoListasEfetivo, ehEmpresaPR, sociosSemCadastro, capitalValor, totalQuotas,
  naoLidas, linhasNotificacao, marcarVistas, autorPorId, desconhecidosVisiveis,
  camposPorBinding, escolherRegistro, editarCampo, matriculasDoCliente, origemClicavel,
  abrirCadastroOrigem, fecharCadastroOrigem, resultado, copiar, nomeModelo, baixando,
  baixar, empresas, bindingsNaoSociedade, precisaSelecoes, modeloPronto, passo1Estado, passo2Estado,
  modoDocumento, empresaLabel, labelsRegistros, resumoPasso2, mensagemPendente,
  blocosFolha, versaoView, modoVisualizacao, blocosFolhaVersao, baixandoVersao,
  baixarVersao, folhaEstado, infoFolha, temPainel, mostraSocios, mostraAdministradores,
  mostraIntegralizacoes,
} = controller;
  return (
    <>
        {/* Fase de escolhas: só os passos, numa coluna central estreita — a
            folha não aparece enquanto faltar decisão. */}
        {!modoDocumento && (
        <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Passo 1 — modelo */}
        <PassoCard
          numero={1}
          titulo="Escolha o modelo"
          descricao="Qual documento você quer gerar?"
          estado={passo1Estado}
          resumo={
            carregandoBlocos
              ? nomeModelo
              : `${nomeModelo} · ${template.blocos.length} blocos`
          }
          onTrocar={() => setPassoAberto(1)}
        >
          <EscolhaModelo
            modelos={modelos}
            carregando={carregandoModelos}
            modeloId={modeloId}
            onEscolher={(id) => {
              setModeloId(id);
              setPassoAberto(null);
            }}
          />
        </PassoCard>

        {modeloId && carregandoBlocos && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando modelo…
          </div>
        )}

        {modeloId && !carregandoBlocos && template.blocos.length === 0 && (
          <Card className="rounded-md border-osg-300/60 shadow-sm shadow-osg-300/30">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-slate-600">
                Este modelo ainda não tem blocos com conteúdo.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/equipe/osg/work/montagem-documentos')}
              >
                Abrir Montagem de Documentos
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Passo 2 — empresa-alvo (e demais papéis, quando o modelo pedir) */}
        {modeloPronto && precisaSelecoes && (
          <PassoCard
            numero={2}
            titulo={precisaEmpresa ? 'Escolha a empresa do contrato' : 'Escolha os registros do documento'}
            descricao={
              precisaEmpresa
                ? 'Sócios, administradores e capital carregam sozinhos do cadastro dela'
                : 'Aponte de quem é cada papel do documento'
            }
            estado={passo2Estado}
            resumo={resumoPasso2}
            onTrocar={() => setPassoAberto(2)}
            delay={60}
          >
            <div className="space-y-4">
              {precisaEmpresa && (
                <EscolhaEmpresa
                  empresas={empresas.map((r) => ({ id: r.id, row: r.row as PessoaRow }))}
                  empresaId={empresaId}
                  onEscolher={(id) => {
                    setEmpresaId(id);
                    setPassoAberto(null);
                    if (congelado) setRecongelarPendente(true);
                  }}
                  temCliente={!!clienteId}
                  carregando={carregandoRegistros}
                />
              )}

              {bindingsNaoSociedade.length > 0 && (
                <div className="space-y-3">
                  {precisaEmpresa && (
                    <p className="text-xs font-semibold text-slate-600">
                      Este modelo também precisa de:
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {bindingsNaoSociedade.map((b) => {
                      const precisaCliente = b.tipo !== 'cartorio' && !clienteId;
                      return (
                        <div key={b.nome} className="space-y-1.5">
                          <Label className={labelCls}>{labelDoBinding(b.nome)}</Label>
                          <Select
                            value={registroPorBinding[b.nome] ?? undefined}
                            onValueChange={(id) => escolherRegistro(b.nome, b.tipo, id)}
                            disabled={precisaCliente}
                          >
                            <SelectTrigger className={fieldCls}>
                              <SelectValue
                                placeholder={
                                  precisaCliente
                                    ? 'Escolha um cliente na barra acima'
                                    : registros[b.tipo].length === 0
                                      ? 'Nenhum registro cadastrado'
                                      : 'Selecione…'
                                }
                              />
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
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </PassoCard>
        )}
        </div>
        )}
    </>
  );
}
