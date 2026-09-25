import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EstadoDeFalha } from '@/components/shared/EstadoDeFalha';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Users, Search, Building2, User as UserIcon } from 'lucide-react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import {
  useDeletePessoa,
  useParentescosByCliente,
  usePessoasByCliente,
  type PessoaRow,
  type TipoPessoa,
} from '@/hooks/useQualificacaoDasPartes';
import { PessoaModal } from '@/components/equipe/osg/qualificacao-das-partes/PessoaModal';
import { EstadoVazio } from '@/components/shared/EstadoVazio';

// Rótulos de tipo_empresa; PR e CN ganham destaque em verde na coluna "Papel".
const TIPO_EMPRESA_LABELS: Record<string, string> = {
  PR: 'Proprietária',
  CN: 'Controladora',
  SC: 'Sócia',
};
const TIPOS_EMPRESA_DESTAQUE = new Set(['PR', 'CN']);

interface PessoasTableProps {
  titulo: string;
  icone: React.ReactNode;
  tipo: TipoPessoa;
  pessoas: PessoaRow[];
  buscaAtiva: boolean;
  documentoLabel: string;
  // Exibe a coluna "Papel" (tipo_empresa) — só PJ.
  mostrarPapel?: boolean;
  // Quando presente, exibe a coluna "Filiação" (vínculos de parentesco) — só PF.
  filiacaoPorPessoa?: Map<string, string[]>;
  onNovo: () => void;
  onEditar: (p: PessoaRow) => void;
  onRemover: (p: PessoaRow) => void;
}

/**
 * Coluna "Filiação". Uma pessoa pode ter pai, mãe, tio e o que mais a família
 * tiver: `parentesco` sempre aceitou N linhas, e mostrar só a última escondia o
 * resto do cadastro de quem lê a lista.
 */
const FiliacaoCell = ({ fundador, vinculos }: { fundador: boolean | null; vinculos: string[] }) => {
  if (!fundador && vinculos.length === 0) return <>—</>;
  return (
    <div className="space-y-0.5">
      {fundador && <div className="font-medium text-osg-moss">Fundador</div>}
      {vinculos.map((vinculo) => <div key={vinculo}>{vinculo}</div>)}
    </div>
  );
};

/**
 * As duas tabelas (PJ e PF) têm as mesmas cinco colunas e ficam empilhadas na
 * mesma página. Com o layout automático da tabela, cada uma media as colunas
 * pelo próprio conteúdo e os cabeçalhos saíam desalinhados entre os dois cards;
 * a largura fixa por coluna faz as duas baterem.
 */
const COLUNA = {
  denominacao: 'w-[34%]',
  documento: 'w-[15%]',
  // "Papel" na PJ, "Filiação" na PF: mesma posição, mesma largura.
  qualificacao: 'w-[19%]',
  municipio: 'w-[22%]',
  acoes: 'w-[10%]',
} as const;

const PessoasTable = ({
  titulo, icone, tipo, pessoas, buscaAtiva, documentoLabel, mostrarPapel, filiacaoPorPessoa, onNovo, onEditar, onRemover,
}: PessoasTableProps) => (
  <Card variant="tabela">
    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-base flex items-center gap-2">
        {icone}
        {titulo} ({pessoas.length})
      </CardTitle>
      {/* O botão só fica no cabeçalho quando a lista tem conteúdo; vazia, a
          caixa de baixo é quem o oferece, e a mesma ação não aparece duas
          vezes no mesmo card. */}
      {pessoas.length > 0 && (
        <Button size="sm" className="gap-1.5" onClick={onNovo}>
          <Plus className="h-3.5 w-3.5" /> Nova {tipo}
        </Button>
      )}
    </CardHeader>
    <CardContent>
      {pessoas.length === 0 ? (
        buscaAtiva ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma pessoa encontrada.
          </p>
        ) : (
          <EstadoVazio
            titulo={`Nenhuma ${tipo === 'PJ' ? 'pessoa jurídica' : 'pessoa física'} cadastrada para este cliente.`}
            descricao="As partes daqui alimentam o checklist de documentos, a calculadora de ITCMD, o quadro societário e a geração de contratos."
            icone={icone}
            acao={
              <Button size="sm" className="gap-1.5" onClick={onNovo}>
                <Plus className="h-4 w-4" /> Nova {tipo}
              </Button>
            }
          />
        )
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className={COLUNA.denominacao}>Denominação</TableHead>
                <TableHead className={COLUNA.documento}>{documentoLabel}</TableHead>
                {mostrarPapel && <TableHead className={COLUNA.qualificacao}>Papel</TableHead>}
                {filiacaoPorPessoa && <TableHead className={COLUNA.qualificacao}>Filiação</TableHead>}
                <TableHead className={COLUNA.municipio}>Município/UF</TableHead>
                <TableHead className={`${COLUNA.acoes} text-right`}>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pessoas.map((p) => (
                <TableRow key={p.id} {...rowActivateProps(() => onEditar(p))}>
                  <TableCell className="font-medium">{p.denominacao}</TableCell>
                  <TableCell className="font-mono text-xs">{p.cpf_cnpj ?? '—'}</TableCell>
                  {mostrarPapel && (
                    <TableCell className="text-xs">
                      {p.tipo_empresa ? (
                        <span
                          className={
                            TIPOS_EMPRESA_DESTAQUE.has(p.tipo_empresa)
                              ? 'font-medium text-osg-moss'
                              : 'text-muted-foreground'
                          }
                        >
                          {TIPO_EMPRESA_LABELS[p.tipo_empresa] ?? p.tipo_empresa}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {filiacaoPorPessoa && (
                    <TableCell className="text-xs text-muted-foreground">
                      <FiliacaoCell fundador={p.is_fundador} vinculos={filiacaoPorPessoa.get(p.id) ?? []} />
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground">
                    {[p.endereco_municipio, p.endereco_uf].filter(Boolean).join('/') || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover pessoa</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{p.denominacao}"? Os vínculos de parentesco
                              associados também serão removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onRemover(p)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const QualificacaoDasPartes = () => {
  const { clienteId } = useOsgWork();
  const [busca, setBusca] = useState('');

  const { data: pessoas = [], isLoading: loadingPessoas, error: erroPessoas,
          refetch: recarregarPessoas } = usePessoasByCliente(clienteId || null);
  const { data: parentescos = [] } = useParentescosByCliente(clienteId || null);

  // Todos os vínculos de parentesco de cada pessoa, ex.: ["Pai de João",
  // "Mãe de Maria", "Tio(a) de Tobias"]. A relação é 1:N e a coluna mostra a
  // lista inteira; guardar só o último apagava pai, mãe ou tio da tela.
  const filiacaoPorPessoa = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const v of parentescos) {
      const resumo = v.tipo ? `${v.tipo}: ${v.parente_denominacao}` : v.parente_denominacao;
      const acumulado = map.get(v.pessoa_id);
      if (acumulado) acumulado.push(resumo);
      else map.set(v.pessoa_id, [resumo]);
    }
    return map;
  }, [parentescos]);

  const [pessoaModal, setPessoaModal] = useState<{
    open: boolean;
    pessoa: PessoaRow | null;
    defaultTipo: TipoPessoa;
  }>({ open: false, pessoa: null, defaultTipo: 'PJ' });

  const deletePessoa = useDeletePessoa();

  const { pjs, pfs } = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtradas = q
      ? pessoas.filter((p) =>
          (p.denominacao ?? '').toLowerCase().includes(q) ||
          (p.cpf_cnpj ?? '').toLowerCase().includes(q),
        )
      : pessoas;
    return {
      pjs: filtradas.filter((p) => p.tipo_pessoa === 'PJ'),
      // Fundadores sempre no topo; sort estável preserva a ordem original no restante.
      pfs: filtradas
        .filter((p) => p.tipo_pessoa === 'PF')
        .sort((a, b) => Number(b.is_fundador ?? false) - Number(a.is_fundador ?? false)),
    };
  }, [pessoas, busca]);

  const buscaAtiva = busca.trim().length > 0;

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.qualificacaoDasPartes.label}
      subtitle={TELAS_OSG_WORK.qualificacaoDasPartes.descricao}
    >
      {/* TEXTO DE APOIO DA TELA, e sem `aria-describedby`: o padrão da casa
          (§3 de `docs/geral/texto-explicativo-na-tela.md`) pede o par id +
          `aria-describedby` NO CAMPO que o texto descreve. Aqui não há campo —
          é prosa de página, logo abaixo do título, e o leitor de tela já a
          anuncia na ordem do documento. Pendurar o atributo na `div` que
          contém o próprio parágrafo não é anunciado por tecnologia assistiva
          nenhuma. */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Os dados cadastrados aqui alimentam o checklist de documentos, a calculadora de ITCMD, o quadro societário e a geração de contratos.
        </p>
        {!clienteId ? (
          <EstadoVazio
            titulo="Selecione um cliente na barra acima para abrir a qualificação das partes deste cliente."
            icone={<Users className="h-10 w-10 text-muted-foreground opacity-50" />}
          />
        ) : loadingPessoas ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Carregando...</p>
            </CardContent>
          </Card>
        ) : erroPessoas ? (
          <EstadoDeFalha oQue="as pessoas deste cliente" erro={erroPessoas}
                         aoTentarDeNovo={() => recarregarPessoas()} />
        ) : (
          <>
            {/* Sem pessoa nenhuma (PJ e PF), filtrar é procurar no vazio: o
                card de Filtros só aparece a partir do primeiro cadastro
                (EX-37; a Qualificação não estava na lista do card, mas é o
                mesmo princípio). */}
            {pessoas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <Label htmlFor="busca-pessoas" className="text-xs font-semibold text-muted-foreground">Buscar pessoa</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="busca-pessoas"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Nome ou CPF/CNPJ"
                      className="h-9 pl-8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

            <PessoasTable
              titulo="Pessoas Jurídicas"
              icone={<Building2 className="h-4 w-4 text-muted-foreground" />}
              tipo="PJ"
              documentoLabel="CNPJ"
              mostrarPapel
              pessoas={pjs}
              buscaAtiva={buscaAtiva}
              onNovo={() => setPessoaModal({ open: true, pessoa: null, defaultTipo: 'PJ' })}
              onEditar={(p) => setPessoaModal({ open: true, pessoa: p, defaultTipo: 'PJ' })}
              onRemover={(p) => deletePessoa.mutate(p)}
            />
            <PessoasTable
              titulo="Pessoas Físicas"
              icone={<UserIcon className="h-4 w-4 text-muted-foreground" />}
              tipo="PF"
              documentoLabel="CPF"
              pessoas={pfs}
              buscaAtiva={buscaAtiva}
              filiacaoPorPessoa={filiacaoPorPessoa}
              onNovo={() => setPessoaModal({ open: true, pessoa: null, defaultTipo: 'PF' })}
              onEditar={(p) => setPessoaModal({ open: true, pessoa: p, defaultTipo: 'PF' })}
              onRemover={(p) => deletePessoa.mutate(p)}
            />
          </>
        )}
      </div>

      {clienteId && (
        <PessoaModal
          open={pessoaModal.open}
          clienteId={clienteId}
          pessoa={pessoaModal.pessoa}
          pessoasCliente={pessoas}
          defaultTipo={pessoaModal.defaultTipo}
          onClose={() => setPessoaModal((prev) => ({ ...prev, open: false, pessoa: null }))}
        />
      )}
    </OsgLayout>
  );
};

export default QualificacaoDasPartes;
