import { useRef } from 'react';
import { AlertTriangle, FileSpreadsheet, RotateCcw, ShieldAlert, Upload } from 'lucide-react';

import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

function Contagem({ analise }: { analise: Analise }) {
  const { resumo } = analise;
  const blocos = [
    { rotulo: 'Valores', n: resumo.valores, onde: 'Resumo, DRE e apuração' },
    { rotulo: 'Carga tributária', n: resumo.farol, onde: 'aba Farol' },
    { rotulo: 'Comentários', n: resumo.comentarios, onde: 'caixas de texto do slide' },
    { rotulo: 'Bens', n: resumo.bens, onde: 'anexo de bens' },
    { rotulo: 'Dívidas', n: resumo.dividas, onde: 'anexo de dívidas' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">O que foi lido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {blocos.map((b) => (
            <div key={b.rotulo}>
              <p className="text-2xl font-semibold tabular-nums">{b.n.toLocaleString('pt-BR')}</p>
              <p className="text-sm">{b.rotulo}</p>
              <p className="text-xs text-muted-foreground">{b.onde}</p>
            </div>
          ))}
        </div>
        {resumo.anos.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo rotulo="Anos encontrados" valor={resumo.anos.join(', ')} />
              <Campo rotulo="Cenários" valor={resumo.cenarios.join(' · ')} />
            </div>
          </>
        )}
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
              <Card className="border-amber-400/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-500">
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
            <Contagem analise={analise} />

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
