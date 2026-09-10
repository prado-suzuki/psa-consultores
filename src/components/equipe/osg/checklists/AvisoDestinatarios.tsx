// Para QUEM o aviso vai, e para quem já foi.
//
// Pedido da Luana (OSG, 09/09/2026): o modal dizia "2 destinatários" e o painel
// lateral dizia quando e por onde. Nenhum dos dois dizia o nome nem o e-mail, e o
// analista mandava sem saber para onde estava mandando.
//
// Em 10/09/2026 a lista deixou de ser só informativa: cada representante virou uma
// caixa marcável, como já eram os canais. O analista podia ver para quem ia, mas
// não podia dizer "esse não" — e com dois sócios no mesmo cliente, cobrar quem já
// entregou a parte dele é o tipo de mensagem que gera resposta irritada.
//
// A ASSIMETRIA ENTRE OS DOIS PAINÉIS É DE PROPÓSITO, e é o ponto de desenho aqui:
//
//   Antes de enviar  → nome e contato vêm do cadastro de agora. É o que VAI
//                      acontecer, então o cadastro atual é a fonte certa.
//   Depois de enviar → o contato vem da linha gravada. É o que ACONTECEU, e o
//                      cadastro de hoje não tem autoridade sobre ontem.
//
// O nome no histórico é complemento do contato, nunca substituto: `notificacao_envio`
// não guarda nome, então ele só pode ser resolvido pelo cadastro atual — um palpite.
// Em 09/09/2026 um representante deste módulo foi renomeado e outro removido no
// mesmo dia; um painel que trocasse o contato pelo nome resolvido passaria a exibir
// gente que não recebeu nada. Contato sempre visível é o que impede isso.
import { CheckCircle2, Mail, MessageCircle } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  jaRecebeuHoje, podeReceberAgora, type DestinatarioAviso,
} from '@/hooks/useDestinatariosCliente';
import {
  formatarQuando, rotuloDoAviso, rotuloDosCanais, soAHora,
  type CanalAviso, type DestinoDoDisparo, type DisparoHistorico,
} from '@/lib/historicoNotificacoes';
import { caixaDeEscolhaCls } from './checklistKit';
import { ComTooltip } from './avisoKit';

/** "Fulano · fulano@x.com" quando o cadastro reconhece o contato; só o contato quando não. */
function descreverDestino(destino: DestinoDoDisparo, nomes: Map<string, string>): {
  nome: string | null; contatos: string[];
} {
  const contatos = [destino.email, destino.telefone].filter(Boolean) as string[];
  const nome = contatos.map((c) => nomes.get(c)).find(Boolean) ?? null;
  return { nome, contatos };
}

/**
 * Quem vai receber, lido do cadastro de agora — e quem o analista escolheu.
 *
 * Lista nome e contato em vez de contar linhas. A contagem enganava: dois
 * representantes com o mesmo e-mail liam "2 destinatários" e recebiam UMA
 * mensagem, porque a chave de idempotência da borda é por destino. Com os dois
 * nomes e o mesmo e-mail à vista, o analista vê que é cadastro duplicado.
 *
 * A LISTA MOSTRA TODOS, inclusive quem não pode receber. Sumir com o
 * representante sem e-mail deixaria o analista achar que o cliente tem um sócio
 * a menos; apagado e com o motivo escrito, ele vê que existe e por que ficou de
 * fora.
 */
export function ListaDeDestinatarios({
  destinatarios, carregando, selecionados, onAlternar, jaHoje, proximoEm, enviando,
}: {
  destinatarios: readonly DestinatarioAviso[];
  carregando: boolean;
  selecionados: ReadonlySet<string>;
  onAlternar: (userId: string) => void;
  /** O disparo deste aviso hoje, para saber quem já recebeu. */
  jaHoje: DisparoHistorico | null;
  /** `18/08/2026` — a partir de quando quem já recebeu volta a poder. */
  proximoEm: string;
  enviando: boolean;
}) {
  if (carregando) return <p className="mt-3 text-xs text-osg-500">Carregando destinatários...</p>;

  if (destinatarios.length === 0) {
    return (
      <p className="mt-3 text-xs leading-relaxed text-osg-500">
        Nenhum representante com acesso ao portal. Complete o cadastro do cliente
        para liberar o envio.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {destinatarios.map((d) => {
        const enviados = jaRecebeuHoje(d, jaHoje);
        const semContato = !d.email && !d.telefone;
        const podeReceber = podeReceberAgora(d, jaHoje);
        // Recebeu por tudo que tinha: é bloqueio de dedup, não de cadastro, e a
        // frase precisa dizer qual dos dois é.
        const jaRecebeuTudo = !semContato && !podeReceber;
        const bloqueado = !podeReceber || enviando;
        const marcado = selecionados.has(d.user_id);

        const canaisQueSairam = (['email', 'whatsapp'] as CanalAviso[])
          .filter((c) => enviados[c]);

        const motivo = semContato
          ? 'Este representante não tem e-mail nem telefone cadastrado. Complete o '
            + 'cadastro do cliente para poder incluí-lo no envio.'
          : jaRecebeuTudo
            ? `Já recebeu esta notificação hoje por ${rotuloDosCanais(canaisQueSairam)}. `
              + `Uma nova poderá ser enviada a partir de ${proximoEm}.`
            : undefined;

        return (
          <li key={d.user_id}>
            <ComTooltip texto={motivo}>
              <label className={cn('flex items-start gap-3',
                caixaDeEscolhaCls({ bloqueado, marcado }))}>
                {jaRecebeuTudo
                  ? <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-osg-300" />
                  : (
                    <Checkbox
                      checked={marcado}
                      onCheckedChange={() => onAlternar(d.user_id)}
                      disabled={bloqueado}
                      className="mt-0.5 h-[18px] w-[18px]"
                    />
                  )}
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13px] font-semibold',
                    bloqueado ? 'text-osg-300' : 'text-osg-700')}>
                    {d.nome?.trim() || 'Representante sem nome'}
                  </span>
                  <span className="mt-0.5 block space-y-0.5">
                    <Contato
                      Icone={Mail}
                      valor={d.email}
                      ausente="sem e-mail cadastrado"
                      enviadoEm={enviados.email}
                      apagado={bloqueado}
                    />
                    <Contato
                      Icone={MessageCircle}
                      valor={d.telefone}
                      ausente="sem telefone cadastrado"
                      enviadoEm={enviados.whatsapp}
                      apagado={bloqueado}
                    />
                  </span>
                </span>
              </label>
            </ComTooltip>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Contato ausente aparece esmaecido, não some: é o que explica canal desligado.
 *
 * Contato que JÁ RECEBEU hoje ganha o horário na própria linha. É a informação
 * que decide o clique seguinte — se o e-mail saiu às 9h e o WhatsApp não saiu, o
 * analista precisa ver isso sem abrir tooltip nenhum.
 */
function Contato({ Icone, valor, ausente, enviadoEm, apagado }: {
  Icone: typeof Mail;
  valor: string | null;
  ausente: string;
  enviadoEm?: string;
  apagado: boolean;
}) {
  return (
    <span className={cn(
      'flex items-center gap-1.5 truncate text-xs',
      !valor || apagado ? 'text-osg-300' : 'text-osg-500',
    )}>
      <Icone className="h-3 w-3 shrink-0" />
      <span className="truncate">{valor ?? ausente}</span>
      {enviadoEm && (
        <span className="shrink-0 text-osg-300">· enviado hoje às {soAHora(enviadoEm)}</span>
      )}
    </span>
  );
}

/** O painel lateral: um cartão por disparo, agora dizendo também para quem foi. */
export function PainelDeHistorico({ historico, jaHoje, nomes, carregando, erro }: {
  historico: readonly DisparoHistorico[];
  /** O disparo de hoje deste aviso, para marcar com o visto. */
  jaHoje: DisparoHistorico | null;
  nomes: Map<string, string>;
  carregando: boolean;
  erro: boolean;
}) {
  if (carregando) return <p className="mt-3 text-sm text-osg-500">Carregando...</p>;

  // Painel que não carregou e painel vazio são coisas diferentes, e o analista
  // precisa saber qual é: sem isso, uma falha de leitura pareceria "nunca
  // avisamos" e ele mandaria um aviso repetido.
  if (erro) {
    return (
      <p className="mt-3 text-sm text-osg-red">
        Não foi possível carregar o histórico. Recarregue antes de enviar.
      </p>
    );
  }

  if (historico.length === 0) {
    return <p className="mt-3 text-sm text-osg-500">Nenhuma notificação enviada ainda.</p>;
  }

  return (
    <ul className="mt-3 space-y-3">
      {historico.map((d) => (
        <li
          key={d.chave}
          className={cn(
            'rounded-lg border bg-background px-3 py-2',
            d === jaHoje ? 'border-osg-moss/30' : 'border-osg-100',
          )}
        >
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-osg-700">
            {formatarQuando(d.quando)}
            {d === jaHoje && <CheckCircle2 className="h-3.5 w-3.5 text-osg-moss" />}
          </p>
          {/* Aviso e canais na MESMA frase, com o "por" no meio: em duas linhas
              soltas lia-se "Solicitação enviada" / "e-mail e WhatsApp", que
              parecem duas informações e não uma. */}
          <p className="mt-0.5 text-xs text-osg-500">
            {rotuloDoAviso(d.tipo)} por {rotuloDosCanais(d.canais)}
          </p>

          {/* NOME E CONTATO EM LINHAS PRÓPRIAS, e não `truncate` numa só.
              O painel tem 260px: "Alexandre Silva · automacao@psaconsultores.com.br"
              virava "Alexandre Silva · automacao@psa…", que esconde exatamente o
              que o painel existe para responder — PARA ONDE foi. E-mail cortado
              não serve nem para conferir nem para copiar.

              `break-words` porque endereço não tem espaço para quebrar sozinho. */}
          {d.destinos.length > 0 && (
            <ul className="mt-1.5 space-y-1 border-t border-osg-100 pt-1.5">
              {d.destinos.map((destino) => {
                const { nome, contatos } = descreverDestino(destino, nomes);
                return (
                  <li key={contatos.join('|')} className="text-[11px] leading-snug text-osg-500">
                    {nome && (
                      <span className="block font-medium text-osg-600">{nome}</span>
                    )}
                    {contatos.map((contato) => (
                      <span key={contato} className="block break-words">{contato}</span>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
