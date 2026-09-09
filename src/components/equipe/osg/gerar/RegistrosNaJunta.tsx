import { CheckCircle2, FileClock, Lock } from 'lucide-react';
import { SeletorRail } from '@/components/equipe/osg/gerar/gerarKit';
import type { LinhaRegistrada } from '@/lib/osg/registrosDaSociedade';

/**
 * As peças desta sociedade que já foram à junta, cada uma com o estado do seu
 * marco de registro, e o caminho de volta para completá-lo.
 *
 * É a peça que faltava depois de o marco deixar de ser obrigatório: a tela do
 * gerador mostra UMA peça (a head da combinação cliente+modelo+empresa), então
 * quem registrou a constituição e duas alterações com o protocolo ainda por sair
 * não tinha por onde alcançar as duas primeiras. Aqui elas estão todas, na ordem
 * da sucessão, e o que falta em cada uma está escrito na linha, sem abrir nada.
 */
export function RegistrosNaJunta({
  linhas,
  aberto,
  onAbertoChange,
  onAbrir,
}: {
  linhas: LinhaRegistrada[];
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  onAbrir: (documentoId: string) => void;
}) {
  if (linhas.length === 0) return null;
  // Só conta como pendência o que ALGUÉM pode resolver: peça sem marco nenhum é
  // registro antigo, e não há gesto que a complete.
  const incompletas = linhas.filter((l) => l.registro != null && l.faltando.length > 0).length;
  return (
    <SeletorRail
      titulo="Registros na junta"
      resumo={
        incompletas === 0
          ? `${linhas.length} ${linhas.length === 1 ? 'peça registrada' : 'peças registradas'}`
          : `${incompletas} de ${linhas.length} sem dados completos`
      }
      aberto={aberto}
      onAbertoChange={onAbertoChange}
    >
      <div className="space-y-0.5">
        {linhas.map((linha) => {
          const icone =
            linha.registro == null ? (
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : linha.faltando.length === 0 ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-osg-moss" />
            ) : (
              <FileClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            );
          const corpo = (
            <>
              {icone}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{linha.titulo}</span>
                <span className="block leading-relaxed text-muted-foreground">
                  {linha.registro == null
                    ? 'Registrada antes do marco do registro: não recebe dados por aqui.'
                    : linha.faltando.length === 0
                      ? 'Marco do registro completo'
                      : `Falta: ${linha.faltando.join(', ')}`}
                </span>
              </span>
            </>
          );
          // Peça registrada ANTES de o marco existir não vira clique. Dar-lhe um
          // marco agora significaria inventar a confirmação de um ato que não
          // teve nenhuma, e é o que o banco recusa. Aparecer, porém, ela tem de
          // aparecer: some da lista e a cadeia da sociedade fica com um buraco.
          return linha.registro == null ? (
            <div key={linha.documentoId} className="flex w-full items-start gap-2 px-2.5 py-2 text-xs">
              {corpo}
            </div>
          ) : (
            <button
              key={linha.documentoId}
              type="button"
              onClick={() => onAbrir(linha.documentoId)}
              className="flex w-full items-start gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors hover:bg-osg-50"
            >
              {corpo}
            </button>
          );
        })}
      </div>
    </SeletorRail>
  );
}
