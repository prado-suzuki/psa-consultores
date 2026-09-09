// Para QUEM o aviso vai, e para quem já foi.
//
// Pedido da Luana (OSG, 09/09/2026): o modal dizia "2 destinatários" e o painel
// lateral dizia quando e por onde. Nenhum dos dois dizia o nome nem o e-mail, e o
// analista mandava sem saber para onde estava mandando.
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

import { cn } from '@/lib/utils';
import type { DestinatarioAviso } from '@/hooks/useDestinatariosCliente';
import {
  formatarQuando, rotuloDoAviso, rotuloDosCanais,
  type DestinoDoDisparo, type DisparoHistorico,
} from '@/lib/historicoNotificacoes';

/** "Fulano · fulano@x.com" quando o cadastro reconhece o contato; só o contato quando não. */
function descreverDestino(destino: DestinoDoDisparo, nomes: Map<string, string>): {
  nome: string | null; contatos: string[];
} {
  const contatos = [destino.email, destino.telefone].filter(Boolean) as string[];
  const nome = contatos.map((c) => nomes.get(c)).find(Boolean) ?? null;
  return { nome, contatos };
}

/**
 * Quem vai receber, lido do cadastro de agora.
 *
 * Lista nome e contato em vez de contar linhas. A contagem enganava: dois
 * representantes com o mesmo e-mail liam "2 destinatários" e recebiam UMA
 * mensagem, porque a chave de idempotência da borda é por destino. Com os dois
 * nomes e o mesmo e-mail à vista, o analista vê que é cadastro duplicado.
 */
export function ListaDeDestinatarios({ destinatarios, carregando }: {
  destinatarios: readonly DestinatarioAviso[];
  carregando: boolean;
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
    <ul className="mt-3 space-y-1.5">
      {destinatarios.map((d) => (
        <li
          key={d.user_id}
          className="rounded-lg border border-osg-100 bg-background px-3 py-2"
        >
          <p className="truncate text-[13px] font-semibold text-osg-700">
            {d.nome?.trim() || 'Representante sem nome'}
          </p>
          <div className="mt-0.5 space-y-0.5">
            <Contato Icone={Mail} valor={d.email} ausente="sem e-mail cadastrado" />
            <Contato Icone={MessageCircle} valor={d.telefone} ausente="sem telefone cadastrado" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Contato ausente aparece esmaecido, não some: é o que explica canal desligado. */
function Contato({ Icone, valor, ausente }: {
  Icone: typeof Mail;
  valor: string | null;
  ausente: string;
}) {
  return (
    <p className={cn(
      'flex items-center gap-1.5 truncate text-xs',
      valor ? 'text-osg-500' : 'text-osg-300',
    )}>
      <Icone className="h-3 w-3 shrink-0" />
      {valor ?? ausente}
    </p>
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
          <p className="mt-0.5 text-xs text-osg-500">{rotuloDoAviso(d.tipo)}</p>
          <p className="text-xs text-osg-500">{rotuloDosCanais(d.canais)}</p>

          {d.destinos.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 border-t border-osg-100 pt-1.5">
              {d.destinos.map((destino) => {
                const { nome, contatos } = descreverDestino(destino, nomes);
                return (
                  <li key={contatos.join('|')} className="truncate text-[11px] text-osg-500">
                    {nome && <span className="font-medium text-osg-600">{nome} · </span>}
                    {contatos.join(' · ')}
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
