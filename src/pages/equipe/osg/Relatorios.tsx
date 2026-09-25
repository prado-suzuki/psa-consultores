import { useState } from 'react';
import { Eye, FolderArchive, Printer } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { EstadoVazio } from '@/components/shared/EstadoVazio';
import { TerrasExploradas } from '@/components/equipe/osg/relatorios/TerrasExploradas';
import { EstruturaAtualDoCliente } from '@/components/equipe/osg/relatorios/EstruturaAtualDoCliente';
import type { OrientacaoDoDesenho } from '@/components/equipe/osg/relatorios/EstruturaAtual';
import { PreviaEmModal } from '@/components/equipe/osg/relatorios/PreviaEmModal';
import { PECAS_SO_DE_TELA, nomeDaPeca } from '@/components/equipe/osg/relatorios/catalogoDaBiblioteca';
import { usePersistedState } from '@/hooks/usePersistedState';

/**
 * Cada relatório de tela, pelo id do catálogo.
 *
 * Um mapa e não um `switch` espalhado: o mesmo par (id → componente) é usado
 * para o modal de prévia e para o bloco que só existe na impressão, e duas
 * cópias da mesma decisão divergiriam na primeira peça nova.
 */
function RelatorioDeTela({
  id,
  clienteId,
  modoPrevia = false,
  orientacao,
  onTrocarOrientacao,
}: {
  id: string;
  clienteId: string;
  /** Dentro do modal: o cabeçalho e a rolagem própria da peça saem de cena. */
  modoPrevia?: boolean;
  /** Só o diagrama usa; a tabela ignora. */
  orientacao?: OrientacaoDoDesenho;
  onTrocarOrientacao?: (proxima: OrientacaoDoDesenho) => void;
}) {
  if (id === 'terras') return <TerrasExploradas clienteId={clienteId} modoPrevia={modoPrevia} />;
  if (id === 'estrutura')
    return (
      <EstruturaAtualDoCliente
        clienteId={clienteId}
        modoPrevia={modoPrevia}
        orientacao={orientacao}
        onTrocarOrientacao={onTrocarOrientacao}
      />
    );
  return null;
}

/**
 * Os relatórios de tela do cliente: as terras e áreas exploradas e os
 * produtores por imóvel. Eles NÃO viram arquivo nenhum — existem para serem
 * lidos e impressos (em PDF, pela impressão do navegador), e para isso ficam
 * atrás do olho: marca-se o que entra na impressão e abre-se um por vez, em
 * modal.
 *
 * O cabeçalho da página dizia "diagnóstico patrimonial e quadro societário",
 * que são as duas peças da OUTRA tela — corrigido em 18/09/2026.
 *
 * A geração do deck saiu para "Apresentações". As duas coisas eram a mesma tela
 * com abas; viraram páginas separadas porque o que se faz em cada uma é
 * diferente (imprimir relatório vs. baixar .pptx).
 */
const Relatorios = () => {
  const { clienteId } = useOsgWork();

  /** O que entra na impressão dos relatórios de tela — marcação independente. */
  const [paraImprimir, setParaImprimir] = useState<string[]>([]);
  /** A única peça aberta por vez: a prévia em modal. */
  const [aberta, setAberta] = useState<string | null>(null);

  /**
   * COMO O DIAGRAMA SE ARRUMA, e por que a escolha mora AQUI.
   *
   * Esta página monta duas instâncias do mesmo relatório — a da prévia e a do
   * bloco que só existe na impressão, mais abaixo. Com o estado dentro do
   * componente, a orientação escolhida na tela não chegaria ao papel: sairia
   * sempre a de abertura. Persistida, ela também sobrevive ao fechar o modal,
   * como os filtros por página da casa.
   *
   * Abre na horizontal, que é o desenho que já existia e a forma convencional
   * do organograma de estrutura.
   */
  const [orientacao, setOrientacao] = usePersistedState<OrientacaoDoDesenho>(
    'osg.relatorios.estrutura.orientacao',
    'horizontal',
  );

  const alternarImpressao = (id: string) =>
    setParaImprimir((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  const todosDeTela = paraImprimir.length === PECAS_SO_DE_TELA.length;
  const emPrevia = PECAS_SO_DE_TELA.find((p) => p.id === aberta) ?? null;

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.relatorios.label}
      subtitle={TELAS_OSG_WORK.relatorios.descricao}
    >
      {!clienteId ? (
        <EstadoVazio
          titulo="Selecione um cliente na barra acima para abrir os relatórios deste cliente."
          icone={<FolderArchive className="h-10 w-10 text-muted-foreground opacity-50" />}
          acao={<span className="text-xs text-muted-foreground">A lista de relatórios aparece aqui.</span>}
        />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <>
            {/* MARCA-SE o que interessa e age-se no rodapé: a ação é imprimir,
                que é como estes viram PDF. O "Ver" é outra coisa — abre um por
                vez, em modal, e não mexe na marcação. */}
            <div className="overflow-hidden rounded-xl border border-osg-200">
              <div className="flex items-center gap-3 border-b border-osg-200 bg-muted/50 px-4 py-2">
                <Checkbox
                  checked={todosDeTela}
                  onCheckedChange={() =>
                    setParaImprimir(todosDeTela ? [] : PECAS_SO_DE_TELA.map((p) => p.id))
                  }
                  aria-label="Marcar todos os relatórios de tela"
                />
                {/* Plural: a coluna lista mais de um relatório. */}
                <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Relatórios
                </span>
              </div>

              {PECAS_SO_DE_TELA.map((peca) => (
                <div key={peca.id} className="flex items-center gap-3 border-b border-osg-100 px-4 py-2.5">
                  <Checkbox
                    checked={paraImprimir.includes(peca.id)}
                    onCheckedChange={() => alternarImpressao(peca.id)}
                    aria-label={peca.nome}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{peca.nome}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{peca.origem}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => setAberta(peca.id)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Ver
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  {paraImprimir.length === 0
                    ? 'Selecione os relatórios que devem entrar na impressão.'
                    : `${paraImprimir.length} de ${PECAS_SO_DE_TELA.length} · sai em PDF pela impressão`}
                </span>
                {/* O botão APARECE com a marcação, em vez de ficar desligado:
                    sem nada marcado ele não tem o que imprimir, e um botão
                    cinza permanente só ensina a ignorá-lo. */}
                {paraImprimir.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir
                  </Button>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Estes relatórios não geram arquivos .pptx. Eles serão incluídos na área Fiscal do
              pacote de abertura de demanda, junto aos arquivos de Documentos do Cliente.
            </p>

            {/* O QUE VAI PARA O PAPEL. Fica fora da tela e só existe na
                impressão: marcar já basta para imprimir, sem precisar abrir
                cada relatório antes. O `data-area-de-impressao` é o que liga a
                regra de `@media print` — ver `index.css`, onde ela é opt-in
                para não mudar o que as outras telas já imprimem. */}
            <div data-area-de-impressao className="hidden print:block">
              {PECAS_SO_DE_TELA.filter((p) => paraImprimir.includes(p.id)).map((peca) => (
                <section key={peca.id} className="mb-6">
                  <h2 className="mb-3 text-base font-semibold text-foreground">{peca.nome}</h2>
                  {/* Sem `onTrocarOrientacao`: no papel não há o que alternar. */}
                  <RelatorioDeTela id={peca.id} clienteId={clienteId} orientacao={orientacao} />
                </section>
              ))}
            </div>
          </>
        </div>
      )}

        {clienteId && emPrevia && (
          <PreviaEmModal aberta onFechar={() => setAberta(null)} titulo={nomeDaPeca(emPrevia.id)}>
            <RelatorioDeTela
              id={emPrevia.id}
              clienteId={clienteId}
              modoPrevia
              orientacao={orientacao}
              onTrocarOrientacao={setOrientacao}
            />
          </PreviaEmModal>
        )}
    </OsgLayout>
  );
};

export default Relatorios;
