import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useMovimentosDaEmpresa, useQuadroDaEmpresa } from '@/hooks/useMovimentacaoQuotas';
import { procedenciaDosMovimentos } from '@/lib/osg/projecaoQuadro';
import { AjudaSocietaria } from './AjudaSocietaria';
import { AtosSocietarios } from './AtosSocietarios';
import { DoarQuotasDialog } from './DoarQuotasDialog';
import { EscolherMovimentoDialog } from './EscolherMovimentoDialog';
import {
  ehTipoDeMovimento,
  GESTOS_DA_CONTROLADORA,
  type GestoDaControladora,
} from './gestosSocietarios';
import { InstituirUsufrutoDialog } from './InstituirUsufrutoDialog';
import { MovimentoModal } from './MovimentoModal';
import { fmtBRL, fmtInt } from './quadroFmt';
import { CabecalhoDoCard, cardDoQuadroCls, FaixaDeResumo } from './quadroKit';
import { TabelaSocios, type LinhaSocio } from './TabelaSocios';
import { UsufrutoEVotoCard } from './UsufrutoEVoto';

/**
 * Quadro societário da Controladora (CN) e demais: o saldo, e o gesto de
 * registrar o movimento que o muda.
 *
 * Antes daqui a tela era um CRUD da tabela `quadro_societario`: "vincular sócio"
 * inseria uma linha, o lápis editava quotas e valor, e a lixeira fazia DELETE
 * físico. O quadro só sabia o estado de hoje, e o de ontem era apagado: a
 * cessão de quotas, que é o fato que a alteração contratual descreve, não tinha
 * como ser expressa. Agora cada gesto é um movimento no livro (aporte, cessão,
 * doação, redução) e o saldo é consequência: não há o que editar numa soma, e
 * remover sócio é registrar para quem as quotas foram.
 *
 * Há UM comando de registro, e ele abre a escolha do gesto antes do formulário
 * (`EscolherMovimentoDialog`). Antes eram três botões concorrendo no cabeçalho
 * mais um ícone por linha de sócio; o ícone abria o avulso já em Cessão, o que
 * fazia um clique na linha significar um gesto que ninguém tinha escolhido, e
 * "Doar quotas" e a Doação do select disputavam o mesmo nome com sentidos
 * diferentes. O custo é um clique a mais para quem já sabe.
 *
 * O corpo da tabela é o SALDO, com a procedência de cada linha ao lado do nome
 * (constituição, ou o ato que a produziu).
 */
export const QuadroEmpresaControladora = ({
  empresa, pessoasCliente,
}: {
  empresa: PessoaRow;
  pessoasCliente: PessoaRow[];
}) => {
  const navigate = useNavigate();
  // A porta guarda o gesto que estava marcado: voltar por "Trocar movimento"
  // reabre com ele marcado, e abrir pelo cabeçalho não marca nada.
  const [porta, setPorta] = useState<{ aberta: boolean; inicial: GestoDaControladora | null }>({
    aberta: false, inicial: null,
  });
  const [gesto, setGesto] = useState<GestoDaControladora | null>(null);
  const botaoRegistrar = useRef<HTMLButtonElement>(null);

  const { data: quadro = [], isLoading } = useQuadroDaEmpresa(empresa.id);
  const { data: livro } = useMovimentosDaEmpresa(empresa.id);

  const totalQuotas = quadro.reduce((acc, s) => acc + s.quotas, 0);
  const capitalTotal = quadro.reduce((acc, s) => acc + s.vlrTotal, 0);
  const valorNominal = totalQuotas > 0 ? capitalTotal / totalQuotas : null;

  // De onde vem o saldo de cada sócio: "Constituição", ou o ato que o produziu.
  const procedencia = useMemo(
    () => procedenciaDosMovimentos(livro?.movimentos ?? [], empresa.id, livro?.atos ?? []),
    [livro, empresa.id],
  );

  const linhas = useMemo<LinhaSocio[]>(
    () => quadro.map((s) => ({
      pessoaId: s.pessoaId,
      denominacao: s.denominacao,
      tipoPessoa: s.tipoPessoa,
      cpfCnpj: s.cpfCnpj,
      quotas: s.quotas,
      valor: s.vlrTotal,
      percentual: totalQuotas > 0 ? (s.quotas / totalQuotas) * 100 : 0,
      procedencia: [...new Set(s.movimentoIds.map((id) => procedencia.get(id)).filter(Boolean))] as string[],
    })),
    [quadro, totalQuotas, procedencia],
  );

  // Por que cada gesto NÃO está disponível agora. Só o que a porta consegue
  // responder sem número: saldo zero e ausência de sócio PF. Limite de quotas,
  // ônus e impedimento de cessão continuam no formulário, que é onde há o
  // número para checá-los. Carregando não é "nenhum sócio": dizer isso faria o
  // consultor concluir que a empresa está vazia enquanto a consulta corre.
  const indisponibilidade = useMemo(() => {
    if (isLoading) {
      const carregando = 'Carregando o quadro desta empresa.';
      return {
        cessao: carregando, doacao: carregando, doacaoComOnus: carregando,
        instituicao: carregando, reducao: carregando,
      } satisfies Partial<Record<GestoDaControladora, string>>;
    }
    if (quadro.length === 0) {
      const vazio = 'Ainda não há sócio no quadro: o primeiro movimento é o aporte.';
      return {
        cessao: vazio, doacao: vazio, doacaoComOnus: vazio, instituicao: vazio, reducao: vazio,
      } satisfies Partial<Record<GestoDaControladora, string>>;
    }
    // A doação em ato é entre pessoas físicas (reserva, gravames e origem
    // legítima/disponível são institutos de sucessão), e o formulário só lista
    // sócio PF como doador.
    return quadro.some((s) => s.tipoPessoa === 'PF')
      ? {}
      : { doacaoComOnus: 'Não há sócio pessoa física no quadro, e a doação em ato é entre pessoas físicas.' };
  }, [isLoading, quadro]);

  const tipoDoAvulso = gesto && ehTipoDeMovimento(gesto) ? gesto : null;
  const trocarGesto = () => {
    setPorta({ aberta: true, inicial: gesto });
    setGesto(null);
  };

  // O restauro automático de foco do Radix devolve o foco ao que estava ativo
  // quando o diálogo montou — e na passagem seletor → formulário isso é o fundo
  // da página, porque o seletor já estava desmontando. Aqui o foco volta ao
  // comando que abriu tudo.
  const algoAberto = porta.aberta || gesto !== null;
  const jaEsteveAberto = useRef(false);
  useEffect(() => {
    if (!jaEsteveAberto.current) {
      jaEsteveAberto.current = algoAberto;
      return;
    }
    if (algoAberto) return;
    // Depois da animação de fechamento, que é quando o Radix devolve o foco.
    const t = window.setTimeout(() => botaoRegistrar.current?.focus(), 300);
    return () => window.clearTimeout(t);
  }, [algoAberto]);

  return (
    <div className="space-y-4">
      <Card
        className={cn(cardDoQuadroCls, 'animate-osg-rise motion-reduce:animate-none')}
        style={{ animationDelay: '60ms' }}
      >
        <CabecalhoDoCard
          icone={<Users className="h-4 w-4 text-muted-foreground" />}
          titulo={`Lista de Sócios (${quadro.length})`}
          acoes={
            <Button
              ref={botaoRegistrar}
              size="sm"
              className="h-9 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
              onClick={() => setPorta({ aberta: true, inicial: null })}
            >
              <Plus className="h-3.5 w-3.5" /> Registrar movimento
            </Button>
          }
          apoio={
            <FaixaDeResumo
              itens={[
                { rotulo: 'Capital social', valor: fmtBRL.format(capitalTotal) },
                { rotulo: 'Quotas', valor: fmtInt.format(totalQuotas) },
                {
                  rotulo: 'Valor nominal',
                  valor: valorNominal != null ? fmtBRL.format(valorNominal) : '—',
                  ajuda: <AjudaSocietaria chave="valorNominal" rotulo="valor nominal" />,
                },
              ]}
              nota="Saldo apurado pelos movimentos de quotas."
            />
          }
        />
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <TabelaSocios
              linhas={linhas}
              totalQuotas={totalQuotas}
              capital={capitalTotal}
              vazio={
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">
                    O quadro começa com um aporte. Use Registrar movimento para informar quem recebe
                    as quotas.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
                    className="mt-2 text-sm font-medium text-osg-700 underline-offset-2 hover:underline"
                  >
                    Ir para Qualificação das Partes
                  </button>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      <UsufrutoEVotoCard empresa={empresa} quadro={quadro} pessoasCliente={pessoasCliente} />

      <AtosSocietarios movimentos={livro?.movimentos ?? []} atos={livro?.atos ?? []} />

      <EscolherMovimentoDialog
        open={porta.aberta}
        empresa={empresa}
        opcoes={GESTOS_DA_CONTROLADORA}
        indisponibilidade={indisponibilidade}
        valorInicial={porta.inicial}
        onEscolher={(escolhido) => {
          setPorta({ aberta: false, inicial: null });
          setGesto(escolhido);
        }}
        onClose={() => setPorta({ aberta: false, inicial: null })}
      />

      <MovimentoModal
        open={tipoDoAvulso !== null}
        tipo={tipoDoAvulso ?? 'aporte'}
        empresa={empresa}
        quadro={quadro}
        pessoasCliente={pessoasCliente}
        onClose={() => setGesto(null)}
        onTrocar={trocarGesto}
      />
      <InstituirUsufrutoDialog
        open={gesto === 'instituicao'}
        empresa={empresa}
        quadro={quadro}
        pessoasCliente={pessoasCliente}
        onClose={() => setGesto(null)}
        onTrocar={trocarGesto}
      />
      <DoarQuotasDialog
        open={gesto === 'doacaoComOnus'}
        empresa={empresa}
        quadro={quadro}
        pessoasCliente={pessoasCliente}
        onClose={() => setGesto(null)}
        onTrocar={trocarGesto}
      />
    </div>
  );
};
