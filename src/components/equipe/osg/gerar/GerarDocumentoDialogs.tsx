import type { GerarDocumentoController } from '@/hooks/useGerarDocumentoController';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { OverrideBlocoDialog } from '@/components/equipe/osg/OverrideBlocoDialog';
import { PessoaModal } from '@/components/equipe/osg/qualificacao-das-partes/PessoaModal';
import { BemModal } from '@/components/equipe/osg/diagnostico-patrimonial/BemModal';
import { MatriculaModal } from '@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

export function GerarDocumentoDialogs({ controller }: { controller: GerarDocumentoController }) {
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
  baixar, baixarIncompletoOpen, setBaixarIncompletoOpen, confirmarDownloadIncompleto,
  pendenciasDocumento, empresas, bindingsNaoSociedade, modeloPronto, passo1Estado, passo2Estado,
  modoDocumento, empresaLabel, labelsRegistros, resumoPasso2, mensagemPendente,
  blocosFolha, versaoView, modoVisualizacao, blocosFolhaVersao, baixandoVersao,
  baixarVersao, folhaEstado, infoFolha, temPainel, mostraSocios, mostraAdministradores,
  mostraIntegralizacoes,
} = controller;
  return (<>
      <AlertDialog open={baixarIncompletoOpen} onOpenChange={setBaixarIncompletoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Baixar documento incompleto?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Estes campos obrigatórios ainda não foram resolvidos:</p>
                <ul className="list-disc space-y-1 pl-5">
                  {pendenciasDocumento.map((pendencia) => (
                    <li key={pendencia.caminho}>{pendencia.label}</li>
                  ))}
                </ul>
                <p>Se continuar, o arquivo será identificado como rascunho.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e completar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmarDownloadIncompleto();
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Baixar como rascunho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ajuste de bloco (override) escopado a este documento. */}
      {documentoGeradoId && documentoRaizId && (
        <OverrideBlocoDialog
          open={blocoOverrideAlvo !== null}
          onOpenChange={(open) => {
            if (!open) setBlocoOverrideAlvo(null);
          }}
          documentoGeradoId={documentoGeradoId}
          documentoRaizId={documentoRaizId}
          blocoAlvo={blocoOverrideAlvo}
          override={blocoOverrideAlvo ? (porBlocoAlvo.get(blocoOverrideAlvo.id) ?? null) : null}
          modeloId={modeloId}
        />
      )}

      {/* Confirmação do passo "Validar versão". */}
      <AlertDialog open={validarConfirmOpen} onOpenChange={setValidarConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar esta versão do documento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Ao validar, você confirma que <strong>terminou e revisou todos os cadastros</strong>.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Os valores atuais ficam <strong>congelados</strong> nesta versão — não mudam mais sozinhos.
                  </li>
                  <li>
                    Se um cadastro for alterado depois, você será <strong>avisado antes</strong> de atualizar o
                    documento.
                  </li>
                  <li>
                    A partir daqui, você pode <strong>ajustar blocos apenas deste documento</strong>.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvarDocumento.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarValidacao();
              }}
              className="bg-osg-600 hover:bg-osg-700"
            >
              {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Validar versão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Commit deliberado: sela a versão atual e abre uma nova a partir dela. */}
      <AlertDialog open={novaVersaoConfirmOpen} onOpenChange={setNovaVersaoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar para uma nova versão?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  A versão atual é <strong>preservada como está</strong> — não muda mais.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Uma <strong>versão nova</strong> é criada a partir desta, com os mesmos dados e ajustes.
                  </li>
                  <li>
                    Você <strong>continua editando na versão nova</strong>; a anterior fica no histórico.
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvarDocumento.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarNovaVersao();
              }}
              className="bg-osg-600 hover:bg-osg-700"
            >
              {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Atualizar versão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt ativo ao tentar ajustar um bloco antes de validar a versão. */}
      <AlertDialog
        open={gatingPromptOpen}
        onOpenChange={(open) => {
          setGatingPromptOpen(open);
          if (!open) setBlocoPendente(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valide a versão antes de ajustar blocos</AlertDialogTitle>
            <AlertDialogDescription>
              Para ajustar um bloco só deste documento, primeiro valide a versão — assim os valores ficam
              congelados e o ajuste fica preso a este documento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvarDocumento.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarValidacaoEAbrirBloco();
              }}
              className="bg-osg-600 hover:bg-osg-700"
            >
              {salvarDocumento.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Validar versão agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cadastro aberto de um valor da prévia: corrigir o dado sem sair da
          tela — ao fechar, listas e bindings re-derivam do cadastro novo. */}
      {clienteId && (
        <>
          <PessoaModal
            open={pessoaEditando !== null}
            clienteId={clienteId}
            pessoa={pessoaEditando}
            pessoasCliente={registros.pessoa.map((r) => r.row as PessoaRow)}
            onClose={() => fecharCadastroOrigem(pessoaEditando?.id)}
          />
          <BemModal
            open={bemEditando !== null}
            clienteId={clienteId}
            bem={bemEditando}
            pessoasCliente={registros.pessoa.map((r) => r.row as PessoaRow)}
            onClose={() => fecharCadastroOrigem(bemEditando?.id)}
          />
          {/* bemId/bemTipo nulos como no Controle de Matrículas: edição avulsa,
              com todos os campos visíveis. */}
          <MatriculaModal
            open={matriculaEditando !== null}
            bemId={null}
            bemTipo={null}
            matricula={matriculaEditando}
            pessoasCliente={registros.pessoa.map((r) => r.row as PessoaRow)}
            matriculasDoBem={matriculasDoCliente}
            onClose={() => fecharCadastroOrigem(matriculaEditando?.id)}
          />
        </>
      )}</>);
}
