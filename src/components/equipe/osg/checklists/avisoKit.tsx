// As peças visuais do modal de aviso ao cliente.
//
// Saíram de `ModalAvisarCliente` em 10/09/2026, quando o modal passou a deixar o
// analista escolher DESTINATÁRIO além de canal e o arquivo cruzou o teto de 600
// linhas do AGENTS.md. O que ficou lá é a decisão e o envio; o que veio para cá é
// o desenho, que agora é lido também pela lista de destinatários.
//
// Componentes só: as funções puras que estas peças usam moram em
// `checklistKit.ts` (classes) e em `@/lib/historicoNotificacoes` (formatação),
// para o arquivo não misturar exportação de componente com exportação de função.
import { CheckCircle2, Mail } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { soAHora, type CanalAviso } from '@/lib/historicoNotificacoes';
import { caixaDeEscolhaCls } from './checklistKit';

/** Rótulo de seção, no mesmo tratamento dos da tela do checklist. */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-osg-500">
      {children}
    </span>
  );
}

/**
 * Envolve num tooltip só quando existe motivo para explicar.
 *
 * Sem motivo, devolve o filho intocado: tooltip que repete o que já está escrito na
 * tela é ruído, e todo elemento envolvido ganha um `TooltipTrigger` que interfere
 * em foco e teclado sem entregar nada.
 */
export function ComTooltip({ texto, children }: {
  texto?: string;
  children: React.ReactNode;
}) {
  if (!texto) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Um número grande com rótulo, no molde do `Metric` do cabeçalho da tela.
 *
 * Os dois números são a informação central do modal — é o que vai ser cobrado do
 * cliente. Antes eram duas frases soltas no meio de outras, e o analista tinha de
 * LER para saber o que ia sair. Zero fica esmaecido em vez de escondido: "0
 * documentos recusados" é informação, e omitir a caixa faria o layout dançar
 * entre clientes.
 *
 * A COR SAIU DO DOURADO. Eu tinha pintado o fundo de `osg-highlighter/15`, e
 * ficava um amarelo lavado que não conversava com nada em volta — o dourado da
 * casa é MARCA-TEXTO (`TextoFormatado.tsx`), não fundo de cartão. O tratamento
 * certo é o do `Metric` do cabeçalho: tijolo bege `bg-osg-50`, número em
 * `osg-700`, rótulo minúsculo em caixa alta. O único desvio é o carmim no número
 * de recusados, porque ali a cor carrega significado — documento devolvido.
 */
export function Numero({ valor, rotulo, tom }: {
  valor: number;
  rotulo: string;
  tom: 'pendente' | 'reenviar';
}) {
  const vazio = valor === 0;
  return (
    <div className="rounded-xl bg-osg-50 px-4 py-3">
      <div className={cn(
        'text-3xl font-extrabold leading-none tabular-nums',
        vazio ? 'text-osg-300' : tom === 'pendente' ? 'text-osg-700' : 'text-osg-red',
      )}>
        {valor}
      </div>
      <div className={cn(
        'mt-1.5 text-[10px] font-bold uppercase leading-tight tracking-wide',
        vazio ? 'text-osg-300' : 'text-osg-500',
      )}>
        {rotulo}
      </div>
    </div>
  );
}

/**
 * Uma caixa de canal, desenhada como ESCOLHA e não como status.
 *
 * O desenho anterior era uma linha de texto com um marcador verde ao lado, e lia
 * como indicador de estado — o analista não percebia que dava para desmarcar.
 * Agora é um cartão com borda, que muda de cor quando selecionado.
 *
 * AS CONTAS SÃO SOBRE OS SELECIONADOS, não sobre o cliente inteiro (10/09/2026).
 * Com dois representantes e só um marcado, o canal precisa refletir o que vai
 * acontecer NESTE envio: se o marcado não tem telefone, o WhatsApp aparece
 * desligado ainda que o outro tenha.
 *
 * O motivo de estar desabilitada aparece em três lugares, cada um para um jeito de
 * olhar: a nota embaixo do nome para quem lê, o cursor de proibido para quem passa o
 * mouse, e o tooltip para quem quer a frase inteira com data. "WhatsApp desabilitado"
 * sozinho faria o analista achar que é defeito da tela.
 */
export function LinhaCanal({
  rotulo, nomeNoTexto, contato, Icone, marcado, onAlternar, carregando, semSelecao,
  aReceber, jaReceberam, enviadoEm, proximoEm, enviando,
}: {
  canal: CanalAviso;
  /** O nome do canal como título: "E-mail", "WhatsApp". */
  rotulo: string;
  /** O nome dentro de uma frase: "por e-mail", "por WhatsApp". */
  nomeNoTexto: string;
  /** O que falta no cadastro quando não há alcance: "e-mail", "telefone". */
  contato: string;
  Icone: typeof Mail;
  marcado: boolean;
  onAlternar: () => void;
  carregando: boolean;
  /** Ninguém marcado na lista de destinatários. Muda a frase, não só o número. */
  semSelecao: boolean;
  /** Selecionados que este canal alcança e que AINDA não receberam hoje. */
  aReceber: number;
  /** Selecionados que este canal alcança e que JÁ receberam hoje. */
  jaReceberam: number;
  /** O instante do primeiro envio deste canal hoje, quando houve. */
  enviadoEm?: string;
  /** `18/08/2026` — a partir de quando libera. */
  proximoEm: string;
  enviando: boolean;
}) {
  // Ninguém selecionado alcança este canal, e a razão muda a frase: ou falta
  // cadastro, ou o cadastro existe e a mensagem já saiu hoje.
  const semDestinatario = aReceber === 0 && jaReceberam === 0;
  const todosJaReceberam = aReceber === 0 && jaReceberam > 0;
  const bloqueado = carregando || aReceber === 0 || enviando;

  const nota = carregando ? 'carregando...'
    : semSelecao ? 'nenhum destinatário marcado'
      : semDestinatario ? `nenhum marcado tem ${contato} cadastrado`
        : todosJaReceberam
          ? `os marcados já receberam hoje${enviadoEm ? `, às ${soAHora(enviadoEm)}` : ''}`
          : `${aReceber} ${aReceber === 1 ? 'destinatário' : 'destinatários'}`
            + (jaReceberam > 0 ? ` · ${jaReceberam} já recebeu hoje` : '');

  // O tooltip só existe onde a tela não cabe a frase inteira: o motivo do bloqueio.
  // Onde o canal está livre, a nota já diz tudo, e um tooltip repetiria.
  const motivo = semSelecao
    ? 'Marque ao menos um destinatário na lista acima para liberar os canais.'
    : todosJaReceberam
      ? `Todos os destinatários marcados já receberam a notificação por `
        + `${nomeNoTexto} hoje. Uma nova poderá ser enviada a partir de ${proximoEm}.`
      : semDestinatario
        ? `Nenhum dos destinatários marcados tem ${contato} cadastrado. `
          + 'Marque outro representante ou complete o cadastro do cliente.'
        : undefined;

  return (
    <ComTooltip texto={motivo}>
      <label className={cn('flex items-center gap-3', caixaDeEscolhaCls({ bloqueado, marcado }))}>
        {/* Um ✓ no lugar do checkbox quando não há o que marcar: checkbox
            desabilitado convida ao clique justamente onde não há nada para
            clicar. E em cinza, não em verde — verde é a cor do SELECIONADO. */}
        {todosJaReceberam
          ? <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-osg-300" />
          : (
            <Checkbox
              checked={marcado}
              onCheckedChange={onAlternar}
              disabled={bloqueado}
              className="h-[18px] w-[18px]"
            />
          )}
        <Icone className={cn('h-4 w-4 shrink-0',
          bloqueado ? 'text-osg-300' : marcado ? 'text-osg-moss' : 'text-osg-500')} />
        <span className="min-w-0">
          <span className={cn('block text-sm font-semibold',
            bloqueado ? 'text-osg-300' : 'text-osg-700')}>
            {rotulo}
          </span>
          <span className={cn('block text-xs',
            bloqueado ? 'text-osg-300' : 'text-osg-500')}>
            {nota}
          </span>
        </span>
      </label>
    </ComTooltip>
  );
}
