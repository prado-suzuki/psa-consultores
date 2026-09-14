import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AjudaDoCampo } from '@/components/equipe/osg/ComAjuda';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { comArtigo, generoDoOrgao, previaDaClausula } from '@/lib/orgaosGovernancaPadrao';
import type { OrgaoGovernanca, OrgaoGovernancaInput } from '@/hooks/useDomainOrgaoGovernanca';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = cadastro novo. */
  orgao?: OrgaoGovernanca | null;
  onSalvar: (input: OrgaoGovernancaInput) => Promise<unknown>;
  salvando: boolean;
  /** Ordem sugerida para o próximo órgão, quando é cadastro novo. */
  proximaOrdem: number;
}

const VAZIO = {
  nome: '',
  entra_no_contrato: false,
  /** Só o que o consultor TROCOU à mão. Nulo quer dizer "vale o palpite". */
  genero: null as 'M' | 'F' | null,
  membros_minimo: '',
  membros_maximo: '',
  mandato_anos: '',
  cargos: [] as string[],
};

const CARGOS_SUGERIDOS = ['Presidente', 'Vice-Presidente', 'Secretário'];

const TITULO_SECAO = 'text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700';

/*
 * ALTURA FIXA NO RÓTULO, e é por isso que ela existe. O `Label` do kit vem com
 * `leading-none`; virando caixa flex para caber o ícone de ajuda, a linha passa
 * a ter a altura do ícone e o rótulo COM ajuda fica mais alto que o sem. Numa
 * grade de três campos isso desalinha os inputs, que foi o que apareceu na
 * validação de 14/09 em "Mínimo de membros" e em "Vigência, início".
 */
const ROTULO = 'flex h-5 items-center gap-1.5';

/**
 * Cadastro de um órgão de governança.
 *
 * O NOME É LIVRE de propósito. A lista não é fixa: três são padrão da OSG e o
 * cliente acrescenta os dele, com nome próprio. Um seletor fechado aqui
 * impediria o caso real dos gerentes, que um cliente põe nas alçadas.
 *
 * O interruptor do contrato é a decisão que mais pesa nesta tela, e por isso vem
 * com a explicação ao lado em vez de um rótulo seco: é ele que faz o gerador
 * escrever "Compete a..." para aquele órgão. Os gerentes existem na Matriz e
 * ficam fora do contrato, e é exatamente essa diferença que o campo guarda.
 *
 * A VIGÊNCIA DO ÓRGÃO SAIU DA TELA em 14/09, e as colunas continuam no banco.
 * Elas guardavam sem que nada lesse: a listagem não filtra por vigência, o motor
 * as exclui de propósito, e nos 25 órgãos do sandbox nenhuma estava preenchida.
 * O uso que justificaria os campos é manter íntegra uma Matriz assinada cujo
 * órgão foi extinto depois, e esse comportamento não existe. Quando existir, os
 * campos voltam com a regra junto; até lá, campo que promete o que não faz
 * atrapalha mais do que a falta dele.
 *
 * A SEÇÃO "COMPOSIÇÃO" alimenta a cláusula do contrato, e por isso ela existe.
 * Tudo nela é opcional: a Reunião de Sócios não tem membro, mandato nem cargo, e
 * a cláusula dela simplesmente omite o trecho.
 */
export function OrgaoGovernancaModal({
  open, onOpenChange, orgao, onSalvar, salvando, proximaOrdem,
}: Props) {
  const editando = !!orgao;
  const [form, setForm] = useState(VAZIO);
  const [cargoDigitado, setCargoDigitado] = useState('');

  useEffect(() => {
    if (!open) return;
    setCargoDigitado('');
    if (!orgao) {
      setForm(VAZIO);
      return;
    }
    /*
     * O gênero gravado só vira "escolha à mão" se DISCORDAR do palpite.
     *
     * Concordando, fica nulo e o palpite segue mandando, e aí renomear o órgão
     * de "Conselho Gestor" para "Diretoria Nova" corrige o artigo sozinho.
     * Discordando, foi alguém que trocou de propósito, e trocar de propósito
     * tem de sobreviver a reabrir o modal.
     */
    const palpite = generoDoOrgao(orgao.nome);
    setForm({
      nome: orgao.nome,
      entra_no_contrato: orgao.entra_no_contrato,
      genero: orgao.genero && orgao.genero !== palpite ? orgao.genero : null,
      membros_minimo: orgao.membros_minimo?.toString() ?? '',
      membros_maximo: orgao.membros_maximo?.toString() ?? '',
      mandato_anos: orgao.mandato_anos?.toString() ?? '',
      cargos: orgao.cargos_do_orgao ?? [],
    });
  }, [open, orgao]);

  const nomeLimpo = form.nome.trim();
  const nomeVazio = !nomeLimpo;
  const palpite = generoDoOrgao(form.nome);
  const generoEfetivo = form.genero ?? palpite;
  /*
   * Sem isto o "trocar" era um botão sem memória visível: depois de clicado, a
   * tela ficava igual a uma que nunca foi tocada, e não havia como saber se o
   * artigo em cena era o palpite ou uma escolha. O link vira "voltar ao
   * automático", que é o desfazer, e o rótulo diz de onde veio o artigo.
   */
  const ajustadoAMao = form.genero !== null && form.genero !== palpite;

  const minimo = form.membros_minimo === '' ? null : Number(form.membros_minimo);
  const maximo = form.membros_maximo === '' ? null : Number(form.membros_maximo);
  const mandato = form.mandato_anos === '' ? null : Number(form.mandato_anos);

  const faixaInvertida = minimo !== null && maximo !== null && maximo < minimo;
  const membrosZerados = (minimo !== null && minimo < 1) || (maximo !== null && maximo < 1);
  const mandatoInvalido = mandato !== null && mandato < 1;

  /*
   * Só trava quando o órgão ENTRA NO CONTRATO. Fora dele o gênero não é usado:
   * o órgão é apenas uma coluna da Matriz, e obrigar a decidir seria pedir uma
   * informação que ninguém vai ler. Dentro dele, gênero em branco sai como
   * "A Diretoria será compostO", que é o defeito que isto evita.
   */
  const precisaEscolherGenero = form.entra_no_contrato && !nomeVazio && generoEfetivo === null;

  const previaDoTitulo = previaDaClausula({
    nome: nomeLimpo,
    genero: generoEfetivo,
    membros_minimo: minimo,
    membros_maximo: maximo,
    mandato_anos: mandato,
    cargos_do_orgao: form.cargos,
  }) || 'Preencha mínimo, máximo ou mandato para ver como a cláusula vai ficar. Em branco, ela não descreve a composição do órgão.';

  const impedeSalvar = nomeVazio || faixaInvertida
    || membrosZerados || mandatoInvalido || precisaEscolherGenero;

  const acrescentarCargo = (bruto: string) => {
    const cargo = bruto.trim();
    if (!cargo) return;
    setForm((f) => (
      f.cargos.some((c) => c.toLocaleLowerCase('pt-BR') === cargo.toLocaleLowerCase('pt-BR'))
        ? f
        : { ...f, cargos: [...f.cargos, cargo] }
    ));
    setCargoDigitado('');
  };

  const salvar = async () => {
    if (impedeSalvar) return;
    await onSalvar({
      nome: form.nome,
      entra_no_contrato: form.entra_no_contrato,
      ordem: orgao?.ordem ?? proximaOrdem,
      // O palpite é GRAVADO, e não recalculado na hora de gerar: assim o
      // documento não muda de artigo se um dia a lista de núcleos mudar.
      genero: generoEfetivo,
      membros_minimo: minimo,
      membros_maximo: maximo,
      mandato_anos: mandato,
      cargos_do_orgao: form.cargos.length > 0 ? form.cargos : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar órgão' : 'Novo órgão de governança'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="orgao-nome" className={ROTULO}>Nome do órgão *</Label>
            <Input
              id="orgao-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Conselho de Administração"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Como este cliente chama a instância. Vira uma coluna da Matriz de Alçadas.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="orgao-contrato" className={ROTULO}>Recebe competência no contrato social</Label>
              {/*
                A frase fala do contrato do cliente, e não do gerador de cláusula,
                que é peça nossa: quem preenche esta tela tem o documento na
                cabeça, não o software que o escreve.
              */}
              <p className="text-xs text-muted-foreground">
                Quando marcado, este órgão ganha uma cláusula própria no contrato, dizendo o
                que compete a ele. Desmarcado, ele continua na Matriz de Alçadas mas fica fora
                do contrato.
              </p>
            </div>
            <Switch
              id="orgao-contrato"
              checked={form.entra_no_contrato}
              onCheckedChange={(v) => setForm((f) => ({ ...f, entra_no_contrato: v }))}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <h4 className={TITULO_SECAO}>Composição</h4>
              {/*
                A CLÁUSULA INTEIRA FICA NO TÍTULO DA SEÇÃO, e não num campo, porque
                ela se monta com o conjunto: artigo, faixa, mandato e cargos. Pendurar
                a prévia num dos campos daria a entender que só aquele a alimenta.
              */}
              <AjudaDoCampo texto={previaDoTitulo} />
              <span className="text-[11px] text-muted-foreground">
                tudo opcional, entra na cláusula do contrato
              </span>
            </div>

            {/*
              O ARTIGO SE MOSTRA, NÃO SE PERGUNTA.
              Pedir "gênero do nome (M/F)" é pedir análise gramatical a quem veio
              cadastrar um órgão. Aqui o sistema arrisca pela primeira palavra do
              nome e escreve a frase que vai sair; o consultor lê e segue, ou
              troca num clique. A pergunta de verdade só aparece quando o palpite
              falha, o que nos sete contratos do acervo nunca aconteceria.
            */}
            {!nomeVazio && generoEfetivo !== null && (
              <div className="flex items-start justify-between gap-3 rounded-md bg-osg-50/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  No contrato vai sair:{' '}
                  <span className="font-medium text-foreground">
                    {comArtigo(nomeLimpo, generoEfetivo)} será
                    {generoEfetivo === 'F' ? ' composta' : ' composto'} por...
                  </span>
                  {ajustadoAMao && <span className="ml-1.5">(ajustado à mão)</span>}
                </p>
                {/*
                  A explicação vive NO PRÓPRIO LINK, e não num ícone de ajuda ao
                  lado da frase. Na validação de 14/09 o ícone ali pareceu
                  explicar a frase, que não precisa de explicação, e o texto
                  falava de artigo, concordância e primeira palavra, que é a
                  mecânica interna. O link só precisa dizer o que o clique faz.
                */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-osg-700 underline underline-offset-2"
                      onClick={() => setForm((f) => ({
                        ...f, genero: ajustadoAMao ? null : (generoEfetivo === 'F' ? 'M' : 'F'),
                      }))}
                    >
                      {ajustadoAMao ? 'voltar ao automático' : 'trocar'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
                    {ajustadoAMao
                      ? 'Volta para o "O" ou "A" que o sistema tinha escolhido pelo nome.'
                      : `Troca para "${comArtigo(nomeLimpo, generoEfetivo === 'F' ? 'M' : 'F')}". Use se a frase acima ficou errada.`}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {precisaEscolherGenero && (
              <div className="space-y-1.5 rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Como se escreve este nome numa frase?
                </p>
                <div className="flex gap-2">
                  {(['M', 'F'] as const).map((g) => (
                    <Button
                      key={g}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setForm((f) => ({ ...f, genero: g }))}
                    >
                      {comArtigo(nomeLimpo, g)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* `items-end` alinha os campos pela base mesmo que um rótulo quebre em duas linhas. */}
            <div className="grid items-end gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="orgao-min" className={ROTULO}>
                  Mínimo de membros
                  <AjudaDoCampo texto="A faixa que o contrato escreve: 'no mínimo 03 (três) e no máximo 06 (seis) membros'. Pondo o mesmo número nos dois campos, a cláusula encolhe para 'composto por 03 (três) membros'." />
                </Label>
                <Input
                  id="orgao-min"
                  type="number"
                  min={1}
                  value={form.membros_minimo}
                  onChange={(e) => setForm((f) => ({ ...f, membros_minimo: e.target.value }))}
                  placeholder="3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orgao-max" className={ROTULO}>Máximo de membros</Label>
                <Input
                  id="orgao-max"
                  type="number"
                  min={1}
                  value={form.membros_maximo}
                  onChange={(e) => setForm((f) => ({ ...f, membros_maximo: e.target.value }))}
                  placeholder="6"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orgao-mandato" className={ROTULO}>Mandato, em anos</Label>
                <Input
                  id="orgao-mandato"
                  type="number"
                  min={1}
                  value={form.mandato_anos}
                  onChange={(e) => setForm((f) => ({ ...f, mandato_anos: e.target.value }))}
                  placeholder="3"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Em branco, a cláusula não fala de quantidade nem de mandato.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="orgao-cargo" className={ROTULO}>
                Cargos do órgão
                <AjudaDoCampo texto="Os postos que o contrato nomeia, não quem os ocupa. Com Presidente e Secretário, a cláusula sai '...composto por 03 (três) membros, sendo Presidente e Secretário'. Em branco, ela não cita cargo." />
              </Label>
              {form.cargos.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.cargos.map((cargo) => (
                    <Badge key={cargo} variant="secondary" className="gap-1 pr-1">
                      {cargo}
                      <button
                        type="button"
                        aria-label={`Tirar ${cargo}`}
                        className="rounded-sm hover:bg-background/60"
                        onClick={() => setForm((f) => ({
                          ...f, cargos: f.cargos.filter((c) => c !== cargo),
                        }))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                id="orgao-cargo"
                value={cargoDigitado}
                onChange={(e) => setCargoDigitado(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ',') return;
                  // Enter aqui acrescenta cargo, não envia o formulário.
                  e.preventDefault();
                  acrescentarCargo(cargoDigitado);
                }}
                onBlur={() => acrescentarCargo(cargoDigitado)}
                placeholder="Digite e tecle Enter"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Comuns:</span>
                {CARGOS_SUGERIDOS.filter((s) => !form.cargos.includes(s)).map((sugestao) => (
                  <Button
                    key={sugestao}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 border border-dashed border-border px-2 text-xs font-normal text-osg-700 transition-colors hover:border-osg-moss hover:bg-osg-50 hover:text-osg-moss"
                    onClick={() => acrescentarCargo(sugestao)}
                  >
                    <Plus className="h-3 w-3" />
                    {sugestao}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {faixaInvertida && (
            <p className="text-xs font-medium text-destructive">
              O máximo de membros não pode ser menor que o mínimo.
            </p>
          )}
          {membrosZerados && (
            <p className="text-xs font-medium text-destructive">
              Um órgão tem pelo menos um membro.
            </p>
          )}
          {mandatoInvalido && (
            <p className="text-xs font-medium text-destructive">
              O mandato é de um ano ou mais. Deixe em branco se não houver mandato.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || impedeSalvar}>
            {editando ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
