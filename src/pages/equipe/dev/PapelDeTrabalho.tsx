import { useRef } from 'react';
import {
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Minus,
  RotateCcw,
  ShieldAlert,
  Upload,
} from 'lucide-react';

import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePapelDeTrabalhoController, type Analise } from '@/hooks/usePapelDeTrabalhoController';
import type { ProblemaWp } from '@/lib/planejamento-tributario/parser';

/**
 * Conferência do papel de trabalho de Planejamento Tributário.
 *
 * O Fiscal escolhe o WP preenchido e vê **o que o sistema entendeu** antes de
 * qualquer coisa ir para o banco. Nada é gravado nesta tela: o botão de confirmar
 * espera a RPC de importação, que depende dos tipos gerados do banco.
 *
 * ## Por que impedimento e aviso ficam separados
 *
 * Aviso é raro. Medindo os cinco estudos que temos, três não têm nenhuma célula
 * de erro, e nos outros dois quase tudo está em abas que a leitura nem abre. Como
 * é raro, quando aparecer não pode passar batido: por isso o bloco só existe
 * quando há algo, em vez de uma lista sempre presente que viraria paisagem.
 *
 * A diferença entre os dois é o que a pessoa faz a seguir. Impedimento significa
 * consertar a planilha e subir de novo. Aviso significa que grava assim e dá para
 * conferir depois. Se os dois parecessem iguais, ou ela trataria tudo como
 * urgente, ou ignoraria os dois.
 */

const CAIXA = 'rounded-md border px-3 py-2 text-sm';

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | number | undefined }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <p className="text-sm">{valor === undefined || valor === '' ? '—' : valor}</p>
    </div>
  );
}

/**
 * Uma linha de problema. O endereço da célula vem em fonte de código e é o que a
 * pessoa leva para o Excel: sem ele, "a conta não fecha" é uma reclamação que não
 * se pode agir.
 */
function LinhaDeProblema({ problema }: { problema: ProblemaWp }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">{problema.onde}</code>
      <span className="text-sm">{problema.detalhe}</span>
    </li>
  );
}

function Cabecalho({ analise }: { analise: Analise }) {
  const { cabecalho } = analise.leitura;
  const periodo =
    cabecalho.anoInicial && cabecalho.anoFinal
      ? `${cabecalho.anoInicial} a ${cabecalho.anoFinal}`
      : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">O que o arquivo diz de si</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Campo rotulo="Cliente no WP" valor={cabecalho.clienteNoWp} />
        <Campo rotulo="Período" valor={periodo} />
        <Campo rotulo="Ano-base" valor={cabecalho.anoBase} />
        <Campo
          rotulo="Crescimento anual"
          valor={
            cabecalho.crescimentoAnual === undefined
              ? undefined
              : `${(cabecalho.crescimentoAnual * 100).toFixed(1).replace('.', ',')}%`
          }
        />
        <Campo rotulo="Preparado por" valor={cabecalho.preparadoPor} />
        <Campo rotulo="Revisado por" valor={cabecalho.revisadoPor} />
        <Campo rotulo="Arquivo" valor={analise.nomeDoArquivo} />
        <Campo
          rotulo="Régua da leitura"
          valor={`mapa ${analise.versaoDoMapa} · ${tamanhoLegivel(analise.tamanho)}`}
        />
      </CardContent>
    </Card>
  );
}

/**
 * A linha dos anos, escrita por extenso.
 *
 * O intervalo cru brigava com o período do cabeçalho logo acima: o estudo tem
 * três anos, e a leitura acha sete, porque a aba de Venda de Ativos acompanha o
 * cronograma de amortização da dívida. Os números estavam certos e a tela
 * convidava à conclusão errada, então ela passa a dizer de onde vêm os anos a mais.
 */
function anosPorExtenso(analise: Analise): string | undefined {
  const { anos } = analise.resumo;
  if (anos.length === 0) return undefined;

  const primeiro = anos[0];
  const ultimo = anos[anos.length - 1];
  const { anoInicial, anoFinal } = analise.leitura.cabecalho;

  if (anoInicial !== undefined && anoFinal !== undefined && ultimo > anoFinal) {
    return `${anoInicial} a ${anoFinal} no estudo, e até ${ultimo} na venda de ativos`;
  }
  return primeiro === ultimo ? String(primeiro) : `${primeiro} a ${ultimo}`;
}

/**
 * De onde sai cada slide.
 *
 * Substituiu um bloco de contagens cruas, que somava célula, linha de texto e
 * registro com o mesmo peso e não dava para conferir: ninguém sabe se 1.394
 * valores é o número certo, então o número não pegava leitura incompleta, que era
 * a razão de ele existir.
 *
 * Aqui cada linha é um slide da apresentação, e o detalhe está em termos que se
 * conferem abrindo a planilha: "3 cenários em 3 anos", "9 blocos de comentário".
 * Slide sem fonte aparece nomeado, em vez de escondido atrás de um zero.
 */
function DeOndeSaiCadaSlide({ analise }: { analise: Analise }) {
  const semFonte = analise.slides.filter((s) => !s.temFonte).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">De onde sai cada slide</CardTitle>
        <p className="text-sm text-muted-foreground">
          {semFonte === 0
            ? 'Todos os slides têm de onde sair.'
            : semFonte === 1
              ? '1 slide sairia vazio.'
              : `${semFonte} slides sairiam vazios.`}
        </p>
      </CardHeader>
      <CardContent className="divide-y divide-border/60">
        {analise.slides.map((s) => (
          <div
            key={s.slide}
            className="grid grid-cols-1 gap-1 py-2.5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,14rem)_minmax(0,11rem)_1fr] md:items-baseline md:gap-4"
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              {s.temFonte ? (
                <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              {s.slide}
            </p>
            <p className="pl-6 text-sm text-muted-foreground md:pl-0">{s.fonte}</p>
            <p className={`pl-6 text-sm md:pl-0 ${s.temFonte ? '' : 'text-muted-foreground'}`}>
              {s.detalhe}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Os anos e as abas, que confirmam que a leitura pegou as colunas certas. */
function ComoFoiLido({ analise }: { analise: Analise }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
        <Campo rotulo="Anos" valor={anosPorExtenso(analise)} />
        <Campo rotulo="Abas lidas" valor={analise.resumo.abasLidas.join(' \u00b7 ')} />
      </CardContent>
    </Card>
  );
}

const PapelDeTrabalho = () => {
  const { estado, analise, erro, analisar, limpar } = usePapelDeTrabalhoController();
  const entrada = useRef<HTMLInputElement>(null);

  const escolher = () => entrada.current?.click();

  const impedimentos = analise?.decisao.impedimentos ?? [];
  const avisos = analise?.decisao.avisos ?? [];
  const aceito = analise?.decisao.veredito !== 'recusa';

  return (
    <DevLayout
      title="Papel de Trabalho"
      subtitle="Confira o que o sistema entendeu do WP antes de gravar"
    >
      <div className="space-y-4">
        <input
          ref={entrada}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void analisar(arquivo);
            /* Zera para o mesmo arquivo poder ser escolhido de novo depois de um ajuste. */
            e.target.value = '';
          }}
        />

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Button onClick={escolher} disabled={estado === 'lendo'}>
              <Upload className="mr-2 h-4 w-4" />
              {estado === 'lendo' ? 'Lendo…' : 'Escolher o WP'}
            </Button>
            {analise && (
              <Button variant="ghost" onClick={limpar}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Começar de novo
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              O arquivo é lido aqui no navegador. Nada sai daqui enquanto você não confirmar.
            </p>
          </CardContent>
        </Card>

        {estado === 'vazio' && (
          <Card>
            <CardContent className="py-16 text-center">
              <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Escolha o papel de trabalho preenchido, no modelo atual, para conferir o que o
                sistema entendeu dele.
              </p>
            </CardContent>
          </Card>
        )}

        {estado === 'falhou' && erro && (
          <div className={`${CAIXA} border-destructive/40 bg-destructive/5 text-destructive`}>
            {erro}
          </div>
        )}

        {analise && (
          <>
            {impedimentos.length > 0 && (
              <Card className="border-destructive/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <ShieldAlert className="h-4 w-4" />
                    {impedimentos.length === 1
                      ? '1 coisa impede a importação'
                      : `${impedimentos.length} coisas impedem a importação`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Isto não entra no sistema. Corrija a planilha e escolha o arquivo de novo.
                  </p>
                  <ul className="space-y-1.5">
                    {impedimentos.map((p, i) => (
                      <LinhaDeProblema key={`${p.onde}-${i}`} problema={p} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {avisos.length > 0 && (
              <Card className="border-warning/40 bg-warning/10">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    {avisos.length === 1 ? '1 aviso' : `${avisos.length} avisos`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    O número existe e foi lido. Dá para gravar assim e conferir depois, mas vale
                    olhar cada célula antes.
                  </p>
                  <ul className="space-y-1.5">
                    {avisos.map((p, i) => (
                      <LinhaDeProblema key={`${p.onde}-${i}`} problema={p} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Cabecalho analise={analise} />
            <DeOndeSaiCadaSlide analise={analise} />
            <ComoFoiLido analise={analise} />

            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 py-4">
                <Button disabled title="A gravação entra quando os tipos do banco forem gerados">
                  Confirmar e gravar a revisão
                </Button>
                <p className="text-sm text-muted-foreground">
                  {aceito
                    ? 'A gravação ainda não está ligada. Esta tela confere; a revisão entra no banco na próxima etapa.'
                    : 'Enquanto houver impedimento, não há o que gravar.'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DevLayout>
  );
};

export default PapelDeTrabalho;
