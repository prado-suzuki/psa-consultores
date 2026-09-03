import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { validarFormulario } from '@/lib/osg/validacaoFormulario';
import { osgTabsListCls, osgTabTriggerCls } from '@/components/equipe/osg/formKit';
import { formScopeCls } from '@/lib/osgFormGrid';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import {
  instrumentosDeOrigem,
  useExploracaoRural,
  useUpsertExploracaoRural,
  type ExploracaoRuralEnriched,
} from '@/hooks/useExploracaoRural';
import { useAllMatriculas } from '@/hooks/useDiagnosticoPatrimonial';
import {
  emptyExploracaoRuralDraft,
  exploracaoRuralParaDraft,
  areaCedidaPorOutrosInstrumentos,
  imoveisComAreaExcedida,
  partesDoPapel,
  statusDaPartilha,
  statusDasFracoes,
  TIPOS_EXPLORACAO_OPCOES,
  type DraftExploracaoRural,
} from '@/lib/exploracaoRuralModalModels';
import { ExploracaoRuralDadosTab } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/ExploracaoRuralDadosTab';
import { PartesPanel } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/PartesPanel';
import { ImoveisPanel } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/ImoveisPanel';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useCapitalSocialVigente } from '@/hooks/useGeracaoDocumento';
import { formatarValor } from '@/lib/templates/extenso';

/**
 * Modal do cadastro de exploração rural (AGR-01), no molde do `MatriculaModal`:
 * `OsgDialog` + abas + rodapé fixo, corpo marcado com `formScopeCls` para as grades
 * medirem o contêiner e não a janela.
 *
 * Grava por UMA chamada — a RPC `salvar_exploracao_rural` põe cabeçalho, partes,
 * imóveis e origens na mesma transação. Sem ela, a terceira gravação falhando
 * deixaria o instrumento pela metade.
 */
interface Props {
  open: boolean;
  clienteId: string;
  exploracao: ExploracaoRuralEnriched | null;
  onClose: () => void;
}

export function ExploracaoRuralModal({ open, clienteId, exploracao, onClose }: Props) {
  const [draft, setDraft] = useState<DraftExploracaoRural>(() => emptyExploracaoRuralDraft());
  const [activeTab, setActiveTab] = useState('dados');
  const upsert = useUpsertExploracaoRural();
  const isEdit = !!exploracao?.id;
  const { data: documentos = [] } = useDocumentosByCliente(open ? clienteId : null);
  const { data: pessoas = [] } = usePessoasByCliente(open ? clienteId : null);
  const { data: todasMatriculas = [] } = useAllMatriculas();
  const { data: exploracoes = [] } = useExploracaoRural(open ? clienteId : null);
  const initialDraftRef = useRef('');

  // Mesmo recorte que o FiscalReport usa: a matrícula é do cliente pelo bem OU pelos
  // titulares — matrícula órfã (sem bem) só se liga ao cliente por este segundo caminho.
  const matriculasDoCliente = useMemo(
    () =>
      todasMatriculas.filter(
        (m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId),
      ),
    [todasMatriculas, clienteId],
  );

  // Um instrumento não nasce de si mesmo — é o CHECK `origem_nao_circular`.
  const outrosInstrumentos = useMemo(
    () => instrumentosDeOrigem(exploracoes, exploracao?.id ?? null),
    [exploracoes, exploracao?.id],
  );

  // Lido SÓ na abertura: enquanto está aberto, o modal é o dono do formulário. Uma
  // identidade nova do objeto (a cada render de quem abriu) não pode reiniciar o que
  // já foi digitado aqui dentro.
  useEffect(() => {
    if (!open) return;
    const next = exploracao
      ? exploracaoRuralParaDraft(exploracao, exploracao.partes, exploracao.imoveis, exploracao.origens)
      : emptyExploracaoRuralDraft();
    setDraft(next);
    setActiveTab('dados');
    initialDraftRef.current = JSON.stringify(next);
  }, [open, exploracao]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current;
  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  const fracoes = statusDasFracoes(draft.partes);
  const composse = draft.tipo_exploracao === 'composse';
  const parceria = draft.tipo_exploracao === 'parceria';
  const semExplorador = partesDoPapel(draft.partes, 'explorador').filter((p) => p.pessoa_id).length === 0;
  const semNomeado =
    partesDoPapel(draft.partes, 'administrador_nomeado').filter((p) => p.pessoa_id).length === 0;

  // ── O capital social da outorgante ────────────────────────────────────────
  //
  // O valor GRAVADO é retrato da data da assinatura (ver a coluna
  // `outorgante_capital_social_na_assinatura`), porque o cadastro também registra
  // contrato que já existe. Mas em instrumento NOVO o retrato é o de hoje, e o
  // sistema já sabe qual é — fazer o consultor digitar um número que está no banco
  // é convite a erro de digitação num valor que vai impresso no preâmbulo.
  //
  // Então: pré-preenche uma vez, quando o campo está vazio, e sai da frente. Nunca
  // sobrescreve o que já tem valor — senão trocar de outorgante apagaria o número
  // que o consultor copiou do papel.
  //
  // E SÓ em instrumento NOVO (`!isEdit`). Num que já existe, o valor do banco é a
  // verdade, inclusive quando é nulo: pré-preencher ali marcaria como alterado um
  // formulário que ninguém tocou e, se salvo, gravaria o capital de HOJE num
  // contrato de 2022 — exatamente o erro que a coluna existe para evitar.
  const outorganteRow = pessoas.find((p) => p.id === draft.outorgante_pessoa_id) ?? null;
  const capitalVigente = useCapitalSocialVigente(
    open && !isEdit && parceria ? outorganteRow : null,
  );

  useEffect(() => {
    if (capitalVigente == null) return;
    setDraft((atual) => (
      atual.outorgante_capital_social_na_assinatura
        ? atual
        : { ...atual, outorgante_capital_social_na_assinatura: String(capitalVigente) }
    ));
  }, [capitalVigente]);

  // O aviso do contrato antigo: o rascunho guarda a forma crua ("872674.00") e a
  // tela mostra a formatada, então a comparação é numérica e acontece aqui, onde os
  // dois lados existem.
  const capitalDigitado = Number(draft.outorgante_capital_social_na_assinatura);
  const avisoDoCapital =
    capitalVigente != null
    && Number.isFinite(capitalDigitado)
    && capitalDigitado > 0
    && capitalDigitado !== capitalVigente
      ? `O capital vigente desta empresa é R$ ${formatarValor(capitalVigente)}. `
        + 'O valor acima é o que este contrato declara.'
      : null;

  // O ping da aba avisa o que a validação diria só depois do clique.
  const pendenciaEmPartes =
    (parceria && (!draft.outorgante_pessoa_id || semExplorador)) ||
    (composse && (fracoes.quantidade === 0 || !fracoes.fecha)) ||
    (composse && draft.regra_administracao === 'nomeados' && semNomeado);

  const indiceSemMatricula = draft.imoveis.findIndex((i) => !i.matricula_id);
  // "Nunca pode ultrapassar 100%" (OSG, 19/08/2026): a area cedida do mesmo imovel,
  // somada entre os instrumentos ATIVOS do mesmo tipo, nao pode passar da area da
  // matricula. Uma matricula sozinha nao sabe disso — a conta so existe olhando todos
  // os instrumentos do cliente juntos.
  const cedidaPorOutros = useMemo(
    () =>
      areaCedidaPorOutrosInstrumentos(
        exploracoes,
        draft.tipo_exploracao,
        exploracao?.id ?? null,
        new Date().toISOString().slice(0, 10),
      ),
    [exploracoes, draft.tipo_exploracao, exploracao?.id],
  );
  const excedidos = imoveisComAreaExcedida(draft.imoveis, matriculasDoCliente, cedidaPorOutros);
  const partilha = statusDaPartilha(draft.percentual_outorgante, draft.percentual_explorador);

  const handleSave = () => {
    // Uma trilha só de falha: a regra diz o que falta, o utilitário avisa, abre a aba
    // onde o campo mora e leva o foco até ele. As regras que dependem de outra tabela
    // (soma das frações, área cedida × área da matrícula) são validadas de novo pela
    // RPC — aqui é para avisar ANTES de a requisição sair.
    const ok = validarFormulario(
      [
        {
          invalido: !draft.tipo_exploracao,
          mensagem: 'Selecione o tipo do instrumento.',
          aba: 'dados',
          campo: 'tipo_exploracao',
        },
        {
          invalido: parceria && !draft.outorgante_pessoa_id,
          mensagem: 'Selecione o outorgante da parceria, na aba Partes.',
          aba: 'partes',
          campo: 'outorgante_pessoa_id',
        },
        {
          invalido: parceria && semExplorador,
          mensagem: 'A parceria precisa de pelo menos um explorador, na aba Partes.',
          aba: 'partes',
        },
        {
          invalido: composse && fracoes.quantidade === 0,
          mensagem: 'A composse precisa de pelo menos um compossuidor, na aba Partes.',
          aba: 'partes',
        },
        {
          invalido: composse && draft.regra_administracao === 'nomeados' && semNomeado,
          mensagem:
            'A regra de administração é “nomeados”: informe pelo menos um administrador, na aba Partes.',
          aba: 'partes',
        },
        {
          invalido: parceria && partilha.preenchida && !partilha.fecha,
          mensagem: partilha.excede
            ? `A partilha soma ${partilha.soma}% e passa de 100%.`
            : `A partilha soma ${partilha.soma}% — faltam ${partilha.faltam}%.`,
          aba: 'dados',
        },
        {
          invalido: indiceSemMatricula >= 0,
          mensagem: `O imóvel ${String(indiceSemMatricula + 1).padStart(2, '0')} do Anexo está sem matrícula.`,
          aba: 'imoveis',
          campo: `imovel_matricula_${indiceSemMatricula}`,
        },
        {
          // A RPC também barra isso, mas avisar aqui poupa a ida ao banco e nomeia o
          // item — a mensagem do banco fala da matrícula, não da posição no Anexo.
          invalido: excedidos.length > 0,
          mensagem: excedidos.some((e) => e.causa === 'somado')
            ? 'A área cedida de um imóvel, somada à de outro instrumento ativo, passa da área do próprio imóvel.'
            : excedidos.length === 1
              ? 'Um imóvel tem área cedida maior que a área do próprio imóvel.'
              : `${excedidos.length} imóveis têm área cedida maior que a área do próprio imóvel.`,
          aba: 'imoveis',
        },
        {
          invalido: composse && fracoes.quantidade > 0 && !fracoes.fecha,
          mensagem: fracoes.excede
            ? `As frações dos compossuidores somam ${fracoes.soma}% e passam de 100%.`
            : `As frações dos compossuidores somam ${fracoes.soma}% — faltam ${fracoes.faltam}%.`,
          aba: 'partes',
        },
      ],
      { abrirAba: setActiveTab },
    );
    if (!ok) return;
    upsert.mutate(
      { draft, clienteId, original: exploracao },
      { onSuccess: onClose },
    );
  };

  const rotuloDoTipo =
    TIPOS_EXPLORACAO_OPCOES.find((t) => t.valor === draft.tipo_exploracao)?.rotulo ?? '';

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => !value && requestClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
              <DialogHeader className="mb-4 space-y-0 text-left">
                <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                  {isEdit ? 'Editar exploração rural' : 'Nova exploração rural'}
                  <span className="rounded-md bg-osg-50 px-2 py-0.5 text-sm font-semibold text-osg-700">
                    {rotuloDoTipo}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <TabsList className={osgTabsListCls}>
                <TabsTrigger value="dados" className={osgTabTriggerCls}>Dados</TabsTrigger>
                <TabsTrigger value="partes" className={osgTabTriggerCls}>
                  Partes
                  {/* Ping enquanto a aba tem pendência obrigatória, como o
                      MatriculaModal faz na aba Titularidade: a falha de validação
                      abre a aba certa, mas o ponto avisa ANTES de o botão ser
                      clicado. */}
                  {pendenciaEmPartes && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-osg-moss opacity-75 motion-reduce:animate-none" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-osg-moss" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="imoveis" className={osgTabTriggerCls}>
                  Imóveis e origens
                  {draft.imoveis.length > 0 && (
                    <span className="ml-1.5 rounded bg-osg-100 px-1.5 font-mono text-[10px] font-bold tabular-nums text-osg-700">
                      {draft.imoveis.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            {/* `formScopeCls`: as grades medem ESTE contêiner (848px aqui), não a
                janela — ver `osgFormGrid`. */}
            <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${formScopeCls}`}>
              <TabsContent value="dados" className="mt-0 focus-visible:ring-0">
                <ExploracaoRuralDadosTab draft={draft} onChange={setDraft} documentos={documentos} />
              </TabsContent>
              <TabsContent value="partes" className="mt-0 focus-visible:ring-0">
                <PartesPanel
                  draft={draft}
                  onChange={setDraft}
                  pessoas={pessoas}
                  avisoDoCapital={avisoDoCapital}
                />
              </TabsContent>
              <TabsContent value="imoveis" className="mt-0 focus-visible:ring-0">
                <ImoveisPanel
                  draft={draft}
                  onChange={setDraft}
                  matriculas={matriculasDoCliente}
                  pessoas={pessoas}
                  instrumentos={outrosInstrumentos}
                  cedidaPorOutros={cedidaPorOutros}
                />
              </TabsContent>
            </div>
            <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
              <Button variant="outline" onClick={requestClose} disabled={upsert.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
                {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? 'Salvar alterações' : 'Cadastrar exploração rural'}
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>
      <UnsavedChangesAlert {...alertProps} />
    </>
  );
}
