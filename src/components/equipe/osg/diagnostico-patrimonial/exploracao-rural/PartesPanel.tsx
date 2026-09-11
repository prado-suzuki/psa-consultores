import { AlertTriangle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldSection, fieldCls } from '@/components/equipe/osg/formKit';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import { clampFracaoInput, FRACAO_STEP } from '@/components/equipe/osg/diagnostico-patrimonial/fracaoUtils';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { Campo } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/CampoComDica';
import {
  camposFaltandoNaQualificacao,
  fraseDeAdministracao,
  nomeComposseDe,
  novaParte,
  partesDoPapel,
  statusDasFracoes,
  type DraftExploracaoRural,
  type PapelDaParte,
  type ParteDraft,
} from '@/lib/exploracaoRuralModalModels';

/**
 * Aba "Partes": quem é parte do instrumento e em que papel.
 *
 * Três coisas que esta tela mostra e que vêm do levantamento da ALE-3:
 *
 * 1. **O outorgante é campo único, não lista.** A OSG confirmou em 19/08/2026: se
 *    duas empresas cedem, são duas parcerias. É por isso que ele é coluna do
 *    cabeçalho e não linha de `exploracao_rural_parte`.
 * 2. **A soma das frações aparece enquanto se digita.** Na composse ela DEVE fechar
 *    100% — a Cláusula Segunda reparte os frutos por ela. A tolerância não é fixa:
 *    seis sextos somam 100,0002 e isso fecha (ver `statusDasFracoes`).
 * 3. **"Isoladamente" vs "em conjunto" não é campo.** Deriva de quantos
 *    administradores foram nomeados, e a frase resultante aparece para o consultor
 *    conferir sem abrir o gerador.
 *
 * Nada aqui grava sozinho: tudo mexe no rascunho, e a gravação é a RPC do modal, numa
 * transação só.
 *
 * Os avisos que APARECEM na tela falam sempre dos dados deste cliente (o nome que a
 * composse vai receber, quem vai administrar). O lastro de levantamento — qual
 * contrato real provou cada regra — fica nestes comentários, nunca na interface.
 */
interface Props {
  draft: DraftExploracaoRural;
  onChange: (draft: DraftExploracaoRural) => void;
  pessoas: PessoaRow[];
  /**
   * Aviso a mostrar sob o capital social, ou `null` quando não há o que avisar.
   *
   * Chega PRONTO, e não como número: comparar o valor digitado com o vigente exige
   * saber que o rascunho guarda a forma crua ("872674.00") e a tela mostra a
   * formatada ("872.674,00"). Essa conta é do modal, que tem os dois; este painel
   * imprime.
   */
  avisoDoCapital?: string | null;
}

const SEM_PESSOA = '__nenhuma__';

export function PartesPanel({ draft, onChange, pessoas, avisoDoCapital }: Props) {
  const parceria = draft.tipo_exploracao === 'parceria';
  const composse = draft.tipo_exploracao === 'composse';
  const fracoes = statusDasFracoes(draft.partes);

  let numero = 0;
  const next = () => String(++numero).padStart(2, '0');

  const setPartes = (partes: ParteDraft[]) => onChange({ ...draft, partes });

  const adicionar = (papel: PapelDaParte) => {
    const ordem = partesDoPapel(draft.partes, papel).length;
    setPartes([...draft.partes, novaParte(papel, ordem)]);
  };

  const alterar = (id: string, patch: Partial<ParteDraft>) =>
    setPartes(draft.partes.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const remover = (id: string) => setPartes(draft.partes.filter((p) => p.id !== id));

  const listaDePapel = (papel: PapelDaParte) => partesDoPapel(draft.partes, papel);
  const nomeDaComposse = nomeComposseDe(draft.partes, pessoas);
  const frase = fraseDeAdministracao(draft.regra_administracao, draft.partes, pessoas);

  return (
    <>
      {parceria && (
        <FieldSection number={next()} title="Outorgante">
          <Campo
            label="Pessoa ou empresa"
            required
            campo="outorgante_pessoa_id"
            dica="A pessoa ou empresa que cede o uso da terra. É sempre uma só por instrumento: se duas cedem, são dois contratos."
          >
            <PessoaSelect
              value={draft.outorgante_pessoa_id}
              pessoas={pessoas}
              onChange={(v) => onChange({ ...draft, outorgante_pessoa_id: v })}
            />
          </Campo>
          {/* O capital que o PREÂMBULO declara. Vem pré-preenchido com o capital
              vigente quando a outorgante é escolhida, e é editável porque o
              cadastro também registra contrato ANTIGO — nesse caso o número certo
              é o que está no papel, não o de hoje. Ver a coluna
              `outorgante_capital_social_na_assinatura`. */}
          <Campo
            label="Capital social na assinatura"
            campo="outorgante_capital_social_na_assinatura"
            dica="O capital que a empresa declara no preâmbulo do contrato. Sai pré-preenchido com o capital de hoje; se estiver cadastrando um contrato antigo, corrija para o valor que está no papel."
          >
            <CurrencyInput
              value={draft.outorgante_capital_social_na_assinatura}
              onChange={(v) => onChange({ ...draft, outorgante_capital_social_na_assinatura: v })}
              className={`${fieldCls} font-mono`}
            />
          </Campo>
          {/* Só aparece quando o valor digitado DIFERE do vigente: é o caso do
              contrato antigo, e o consultor deve saber que está declarando um
              capital que não é o atual — não é erro, é a razão do campo existir. */}
          {avisoDoCapital && (
            <p className="col-span-full text-xs text-muted-foreground">{avisoDoCapital}</p>
          )}
          <AvisoQualificacao
            pessoa={pessoas.find((p) => p.id === draft.outorgante_pessoa_id) ?? null}
          />
        </FieldSection>
      )}

      {parceria && (
        <ListaDePartes
          numero={next()}
          titulo="Exploradores"
          dica="Quem recebe a terra e explora a produção. Pode ser mais de uma pessoa no mesmo contrato, e nenhuma delas tem fração individual."
          vazio="Nenhum explorador. O contrato precisa de ao menos um."
          rotuloAdicionar="Adicionar explorador"
          itens={listaDePapel('explorador')}
          pessoas={pessoas}
          parteExploradora
          onAdicionar={() => adicionar('explorador')}
          onAlterar={alterar}
          onRemover={remover}
        />
      )}

      {composse && (
        <ListaDePartes
          numero={next()}
          titulo="Compossuidores"
          dica="Quem divide a posse do imóvel. A fração de cada um define a parte que lhe cabe dos frutos, e o total precisa fechar 100%."
          hint={
            fracoes.quantidade > 0 ? (
              <span
                className={
                  fracoes.fecha ? 'tabular-nums text-osg-moss' : 'tabular-nums text-destructive'
                }
              >
                {fracoes.soma}%
                {fracoes.fecha
                  ? ' • fecha'
                  : fracoes.excede
                    ? ' • excede 100%'
                    : ` • faltam ${fracoes.faltam}%`}
              </span>
            ) : undefined
          }
          vazio="Nenhum compossuidor. A composse precisa de ao menos um."
          rotuloAdicionar="Adicionar compossuidor"
          itens={listaDePapel('compossuidor')}
          pessoas={pessoas}
          comFracao
          parteExploradora
          onAdicionar={() => adicionar('compossuidor')}
          onAlterar={alterar}
          onRemover={remover}
        >
          {/* Derivado, nunca digitado — e é sobre os dados DESTE cliente, por isso pode
              aparecer na tela. É também o motivo de a ORDEM das partes importar. */}
          {nomeDaComposse && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              O contrato vai chamar esta composse de{' '}
              <span className="font-medium text-osg-700">{nomeDaComposse}</span> — o primeiro
              compossuidor da lista, seguido de “E OUTROS”.
            </p>
          )}
        </ListaDePartes>
      )}

      {composse && draft.regra_administracao === 'nomeados' && (
        <ListaDePartes
          numero={next()}
          titulo="Administradores nomeados"
          dica="As pessoas autorizadas a praticar os atos mais sensíveis em nome da composse, como locar, arrendar ou dar garantia. A mesma pessoa pode ser compossuidora e administradora."
          vazio="Nenhum administrador nomeado. Com a regra “nomeados”, o contrato precisa de ao menos um."
          rotuloAdicionar="Adicionar administrador"
          itens={listaDePapel('administrador_nomeado')}
          pessoas={pessoas}
          onAdicionar={() => adicionar('administrador_nomeado')}
          onAlterar={alterar}
          onRemover={remover}
        >
          {/* Não é campo: 1 nomeado age isoladamente, 2+ em conjunto. A frase mostra o
              resultado para os nomeados escolhidos aqui. */}
          {frase && (
            <p className="mt-2 rounded-md border border-osg-100 bg-osg-50/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {frase}{' '}
              <span className="text-muted-foreground">
                Isso acompanha a quantidade de nomeados: com um só, o contrato diz
                “isoladamente”.
              </span>
            </p>
          )}
        </ListaDePartes>
      )}

      {!parceria && !composse && (
        <FieldSection number={next()} title="Partes">
          <p className="text-sm text-muted-foreground">
            Só parceria e composse têm modelo de contrato mapeado. Para os outros tipos, o cadastro
            guarda o instrumento e os imóveis, sem partes.
          </p>
        </FieldSection>
      )}
    </>
  );
}

function ListaDePartes({
  numero, titulo, dica, hint, vazio, rotuloAdicionar, itens, pessoas, comFracao, parteExploradora,
  onAdicionar, onAlterar, onRemover, children,
}: {
  numero: string;
  titulo: string;
  dica: string;
  hint?: React.ReactNode;
  vazio: string;
  rotuloAdicionar: string;
  itens: ParteDraft[];
  pessoas: PessoaRow[];
  comFracao?: boolean;
  parteExploradora?: boolean;
  onAdicionar: () => void;
  onAlterar: (id: string, patch: Partial<ParteDraft>) => void;
  onRemover: (id: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <FieldSection
      number={numero}
      title={titulo}
      hint={hint}
      actions={
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={onAdicionar}>
          <Plus className="h-3.5 w-3.5" />
          {rotuloAdicionar}
        </Button>
      }
    >
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <div className="space-y-1">
          {itens.map((item, indice) => {
            const pessoa = pessoas.find((p) => p.id === item.pessoa_id) ?? null;
            return (
              <div
                key={item.id}
                className="group rounded-lg border border-osg-200/70 bg-card px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    {/* A dica fica na primeira linha só: repetida em todas viraria
                        ruído, e o campo é o mesmo em todas. */}
                    <Campo label="Pessoa" dica={indice === 0 ? dica : undefined}>
                      <PessoaSelect
                        value={item.pessoa_id}
                        pessoas={pessoas}
                        onChange={(v) => onAlterar(item.id, { pessoa_id: v })}
                      />
                    </Campo>
                  </div>
                  {comFracao && (
                    <div className="w-36 shrink-0">
                      <Campo
                        label="Fração (%)"
                        dica={
                          indice === 0
                            ? 'Parte que cabe a este compossuidor. Aceita quatro casas decimais, para frações como um terço caberem sem truncar.'
                            : undefined
                        }
                      >
                        <Input
                          type="number"
                          step={FRACAO_STEP}
                          min={0}
                          max={100}
                          value={item.fracao}
                          onChange={(e) => onAlterar(item.id, { fracao: clampFracaoInput(e.target.value) })}
                          className={`${fieldCls} font-mono`}
                        />
                      </Campo>
                    </div>
                  )}
                  {/* Revelada no hover, como o resto da OSG. `focus-within` mantém a
                      linha operável por teclado — sem ele, quem navega por Tab não
                      alcança o botão. */}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-within:opacity-100 focus:opacity-100"
                    onClick={() => onRemover(item.id)}
                    aria-label="Remover parte"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <AvisoQualificacao pessoa={pessoa} parteExploradora={parteExploradora} />
              </div>
            );
          })}
        </div>
      )}
      {children}
    </FieldSection>
  );
}

/**
 * Escolhe uma pessoa do cadastro do cliente. Exportado porque a origem da posse
 * escolhe a MESMA coisa no diálogo dela — um segundo Select inline faria as duas
 * telas divergirem no rótulo do vazio e na marca de PJ.
 */
export function PessoaSelect({
  value, pessoas, onChange,
}: { value: string | null; pessoas: PessoaRow[]; onChange: (v: string | null) => void }) {
  return (
    <Select
      value={value ?? SEM_PESSOA}
      onValueChange={(v) => onChange(v === SEM_PESSOA ? null : v)}
    >
      <SelectTrigger className={fieldCls}>
        <SelectValue placeholder={pessoas.length ? 'Selecionar pessoa…' : 'Nenhuma pessoa cadastrada'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEM_PESSOA}>— selecionar —</SelectItem>
        {pessoas.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.tipo_pessoa === 'PJ' && <span className="mr-2 font-mono text-[10px]">PJ</span>}
            {p.denominacao}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Avisa que a qualificação da pessoa está incompleta para o preâmbulo do contrato.
 *
 * Não bloqueia a gravação: o instrumento é um fato do cadastro e existe mesmo com a
 * pessoa pela metade. O que ele evita é o contrato sair com lacuna no meio da frase,
 * descoberta só na hora de gerar.
 */
function AvisoQualificacao({
  pessoa, parteExploradora,
}: { pessoa: PessoaRow | null; parteExploradora?: boolean }) {
  const faltando = camposFaltandoNaQualificacao(pessoa, { parteExploradora });
  if (!pessoa || faltando.length === 0) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-warning">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        Qualificação incompleta para o contrato: {faltando.join(', ')}. Dá para cadastrar assim, mas
        o texto sai com lacuna.
      </span>
    </p>
  );
}
