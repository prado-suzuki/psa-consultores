import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Search, FileText, AlertTriangle } from 'lucide-react';
import '@/index.css';
import { currentAmbiente } from '@/config/api';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { useAllMatriculas } from '@/hooks/useDiagnosticoPatrimonial';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import {
  emptyExploracaoDraft, explosacoesListaFixture, matriculasFixture, pessoasFixture,
  type ExploracaoListaItemFixture, type ExploracaoRuralDraft, type TipoExploracao,
} from './contratosExploracaoModel';
import { ExploracaoRuralModal } from '@/components/equipe/osg/oficina-de-contratos/exploracao-rural/ExploracaoRuralModal';

// Preview isolado da ALE-3 — mesmo padrão do sisifo-preview.html
// (contratos-exploracao-preview.html + este .tsx): entry Vite avulso, fora do
// roteamento da aplicação e fora do bundle de produção (vite.config.ts não lista
// este .html em rollupOptions.input). Serve pra conferir o cadastro rodando sem
// login e sem banco — os componentes de dentro (ExploracaoRuralModal e as duas
// abas) são reais e reaproveitáveis; só os dados aqui fora são fixture.
//
// O mockup estático anterior (docs/osg/contratos_exploracao/mockup.html)
// continua no repositório como primeira versão/rascunho visual — este arquivo é
// a versão em código real que, se aprovada, vira o cadastro de verdade.

const INSTRUMENTOS_DE_ORIGEM_FIXTURE = [
  { ref: 'ER 01', label: 'ER 01 — Parceria Modelo Agro Ltda. → José da Silva' },
  { ref: 'ER 04', label: 'ER 04 — Parceria Modelo Agro Ltda. → Antigo Parceiro (vencida)' },
];

function draftDeExemplo(tipo: TipoExploracao): ExploracaoRuralDraft {
  const base = emptyExploracaoDraft(tipo);
  const [boaVista] = matriculasFixture;
  const [modeloAgro, jose, maria, pedro] = pessoasFixture;
  if (tipo === 'parceria') {
    return {
      ...base,
      dataAssinatura: '2022-03-12',
      dataEncerramento: '2025-03-11',
      // [BV-PAR]: 1 outorgante, 3 outorgados numa parceria só — aqui com 2, só
      // pra provar que o cadastro aceita mais de uma pessoa do lado do
      // explorador. Outorgante é sempre único (confirmado em reunião de
      // validação, 19/08/2026) — sem fração por pessoa em nenhum dos dois lados.
      outorganteId: modeloAgro.id,
      exploradores: [
        { id: 'exp-fx-1', pessoaId: jose.id },
        { id: 'exp-fx-2', pessoaId: maria.id },
      ],
      percentualOutorgante: '30,000%',
      percentualExplorador: '70,000%',
      culturas: 'soja; milho; algodão; pecuária',
      permitePenhor: true,
      // Sem capitalSocialOutorgante: a Modelo Agro tem quadro societário na fixture, então o
      // capital vem derivado de v_quadro_societario — o campo de texto só aparece pra PJ sem quadro.
      foroComarca: 'Sorriso',
      foroUf: 'MT',
      testemunha1Nome: 'Marcio Vassoler Gamborgi',
      testemunha2Nome: 'Eduardo Caetano de Souza',
      numeroVias: '4',
      imoveis: [
        { id: 'imv-fx-0', ref: 'a', matriculaId: boaVista.id, areaExplorada: '234,0000', tipoInstrumentoOrigem: 'Parceria', instrumentoOrigemRef: null, origemExterna: null, situacaoOrigem: 'vigente' },
      ],
    };
  }
  return {
    ...base,
    dataAssinatura: '2022-03-12',
    compossuidores: [
      { id: 'fx-1', pessoaId: jose.id, fracao: '70' },
      { id: 'fx-2', pessoaId: maria.id, fracao: '15' },
      { id: 'fx-3', pessoaId: pedro.id, fracao: '15' },
    ],
    regraAdministracao: 'maioria',
    liquidacaoPeriodicidade: 'mensal',
    liquidacaoNumeroParcelas: '60',
    permitePenhor: true,
    foroComarca: 'Sorriso',
    foroUf: 'MT',
    testemunha1Nome: 'Marcio Vassoler Gamborgi',
    testemunha2Nome: 'Eduardo Caetano de Souza',
    numeroVias: '3',
    imoveis: [
      { id: 'imv-fx-1', ref: 'a', matriculaId: boaVista.id, areaExplorada: '234,0000', tipoInstrumentoOrigem: 'Parceria', instrumentoOrigemRef: 'ER 01', origemExterna: null, situacaoOrigem: 'vigente' },
      // Origem fora do sistema: o caso majoritário do [BV-COM] (5 das 6 origens são contratos
      // com terceiros que não são clientes, logo não existem como instrumento cadastrado aqui).
      {
        id: 'imv-fx-2', ref: 'b', matriculaId: matriculasFixture[1].id, areaExplorada: '225,5480',
        tipoInstrumentoOrigem: 'Parceria', instrumentoOrigemRef: null, situacaoOrigem: 'encerrada',
        origemExterna: {
          tituloInstrumento: 'Contrato de Parceria Agrícola e Outras Avenças',
          dataAssinatura: '2022-05-17',
          outorganteNome: 'Agropecuária Mata do Puba Ltda.',
          outorganteCpfCnpj: '34.406.199/0001-74',
          outorganteMunicipio: 'Barreiras',
          outorganteUf: 'BA',
          outorganteNire: '29204829377',
          outorganteCapitalSocialNaAssinatura: 'R$ 1.200.000,00',
          outorganteAdministradores: 'Marcos Antônio Puba e Helena Puba',
        },
      },
    ],
  };
}

function ContratosExploracaoPreview() {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoExploracao>('todos');
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [refCodigo, setRefCodigo] = useState('ER 05');
  const [draft, setDraft] = useState<ExploracaoRuralDraft>(emptyExploracaoDraft());

  // ---------------------------------------------------------------------------
  // Dado real x fixture
  // ---------------------------------------------------------------------------
  // Sem cliente escolhido, o preview roda com as fixtures (funciona offline e sem
  // login). Escolhendo um cliente, passa a ler o banco do ambiente atual pelos
  // hooks que a própria OSG Work já usa — nenhuma query nova, nenhum hook novo:
  // `useClientesLista` (a mesma da barra de cliente do OsgLayout),
  // `usePessoasByCliente` e `useAllMatriculas`.
  //
  // Atenção: RLS está ligada em todas as tabelas. Esta página é um entry Vite
  // avulso, sem tela de login — ela só lê dado real porque compartilha o
  // localStorage do app na mesma origem (o cliente Supabase tem
  // persistSession/localStorage). Sem sessão, as listas voltam vazias.
  const [clienteId, setClienteId] = useState('');
  const usandoBanco = !!clienteId;

  const { data: clientes = [], isLoading: carregandoClientes } = useClientesLista();
  const { data: pessoasDoBanco = [] } = usePessoasByCliente(clienteId || null);
  const { data: todasMatriculas = [] } = useAllMatriculas();

  // A matrícula chega ao cliente pelo bem ou pelos titulares — mesma regra do
  // Diagnóstico Patrimonial (ver `MatriculaEnriched.titular_cliente_ids`).
  const matriculasDoCliente = useMemo(
    () => todasMatriculas.filter((m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId)),
    [todasMatriculas, clienteId],
  );

  const pessoas = usandoBanco ? pessoasDoBanco : pessoasFixture;
  const matriculas = usandoBanco ? matriculasDoCliente : matriculasFixture;

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return explosacoesListaFixture.filter((item: ExploracaoListaItemFixture) => {
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
      if (!termo) return true;
      return item.ref.toLowerCase().includes(termo) || item.imovelResumo.toLowerCase().includes(termo) || item.partesResumo.toLowerCase().includes(termo);
    });
  }, [busca, filtroTipo]);

  // Fixture: quanto de cada matrícula já está reivindicado por OUTRA Parceria ativa
  // (excluindo o próprio registro que está sendo editado — antes esse filtro não
  // existia e ER 01 "colidia consigo mesma"). Confirmado com a OSG (13/08/2026):
  // duas Parcerias concorrentes na mesma matrícula são válidas se cobrirem fração
  // distinta da área/percentual, com outorgados diferentes — por isso o percentual
  // usado importa, não só o fato de já estar em uso.
  //
  // Só se aplica quando o registro sendo criado/editado também é uma Parceria: a
  // Composse não faz reivindicação independente de área, ela só reparte entre os
  // compossuidores o direito que a própria Parceria de origem já concedeu — não
  // "usa" um pedaço adicional da matrícula, então não compete pelo espaço restante.
  const avisoParaMatricula = (matriculaId: string, refAtual: string): { percentualUsado: number; detalhe: string } | null => {
    if (draft.tipo !== 'parceria') return null;
    if (matriculaId !== matriculasFixture[0].id || refAtual === 'ER 01') return null;
    return { percentualUsado: 60, detalhe: 'ER 01 — Modelo Agro Ltda. → José da Silva + Maria Souza' };
  };

  const abrirNova = () => { setDraft(emptyExploracaoDraft('parceria')); setIsEdit(false); setRefCodigo('ER 05'); setOpen(true); };
  const abrirExistente = (item: ExploracaoListaItemFixture) => { setDraft(draftDeExemplo(item.tipo)); setIsEdit(true); setRefCodigo(item.ref); setOpen(true); };

  return (
    <main className="min-h-screen bg-osg-canvas px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex items-center justify-between gap-4 rounded-lg border border-osg-100 bg-background px-5 py-4">
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-osg-moss">OSG Work / Oficina de Contratos</p>
            <h1 className="text-lg font-bold text-slate-900">Cadastro de Exploração Rural — preview da ALE-3</h1>
            <p className="text-xs text-muted-foreground">Componentes reais (FieldSection, formGridCls, Select/Input/Switch) com dado fixture — sem rota, sem consulta ao banco.</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <Badge variant="outline" className="border-osg-highlighter bg-osg-highlighter/25 text-amber-900">novo</Badge>
            <span className="text-[10px] font-normal normal-case text-muted-foreground">= sem tela que cadastre este campo</span>
          </div>
        </header>

        {/* Mesma barra de cliente do OsgLayout (useClientesLista + Select), só que o
            estado mora aqui em vez do OsgWorkContext — o preview roda fora do
            roteamento, então não existe provider do contexto da OSG Work. */}
        <div className="rounded-lg border border-osg-100 bg-osg-50/40 px-5 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-osg-100 text-osg-700"><Building2 className="h-4 w-4" /></div>
              <Label className="text-sm font-bold uppercase tracking-wide text-osg-700">Cliente</Label>
            </div>
            <div className="max-w-md flex-1">
              <Select value={clienteId || undefined} onValueChange={setClienteId} disabled={carregandoClientes}>
                <SelectTrigger className="h-10 border-osg-200 bg-background font-medium">
                  <SelectValue placeholder={carregandoClientes ? 'Carregando…' : 'Nenhum — usando dados de exemplo'} />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {usandoBanco ? (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">banco · {currentAmbiente}</Badge>
                <span className="text-muted-foreground">{matriculas.length} matrícula(s), {pessoas.length} pessoa(s)</span>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setClienteId('')}>voltar ao exemplo</Button>
              </div>
            ) : (
              <Badge variant="outline" className="border-osg-highlighter bg-osg-highlighter/25 text-amber-900">dados de exemplo (fixture)</Badge>
            )}
          </div>
          {!carregandoClientes && clientes.length === 0 && (
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Nenhum cliente retornou. RLS está ligada em todas as tabelas e esta página não tem login próprio —
                entre no app (mesma origem, ex.: <code>localhost:8080/equipe</code>) e recarregue aqui; a sessão é
                compartilhada pelo localStorage.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-md border border-osg-highlighter bg-osg-highlighter/10 px-4 py-3 text-xs text-amber-900">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Preview isolado da ALE-3 (<code>contratos-exploracao-preview.html</code>, mesmo padrão de <code>sisifo-preview.html</code>). Ver{' '}
            <code>docs/osg/levantamento-contratos-rurais.md</code>. O rascunho estático anterior continua em{' '}
            <code>docs/osg/contratos_exploracao/mockup.html</code>, como primeira versão.
          </span>
        </div>

        <div className="rounded-lg border border-osg-100 bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-osg-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">Explorações rurais cadastradas ({linhas.length})</h2>
            <Button onClick={abrirNova} className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"><Plus className="h-3.5 w-3.5" />Nova exploração</Button>
          </div>
          <div className="flex flex-wrap items-end gap-3 px-5 py-4">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Referência, imóvel ou parte" className="pl-8" />
            </div>
            <Select value={filtroTipo} onValueChange={(v: 'todos' | TipoExploracao) => setFiltroTipo(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="parceria">Parceria</SelectItem>
                <SelectItem value="composse">Composse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-osg-50/50">
                  <TableHead>Ref.</TableHead><TableHead>Tipo</TableHead><TableHead>Imóvel / matrícula</TableHead>
                  <TableHead className="text-right">Área doc. × explorada</TableHead>
                  <TableHead>Outorgante → explorador</TableHead><TableHead>Vigência</TableHead><TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => abrirExistente(item)}>
                    <TableCell className="font-mono">{item.ref}</TableCell>
                    <TableCell>
                      {item.tipo === 'parceria'
                        ? <Badge variant="outline" className="border-osg-moss/25 bg-osg-moss/10 text-osg-moss">Parceria</Badge>
                        : <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">Composse</Badge>}
                    </TableCell>
                    <TableCell>{item.imovelResumo}</TableCell>
                    <TableCell className="text-right font-mono">{item.areaResumo}</TableCell>
                    <TableCell>{item.partesResumo}</TableCell>
                    <TableCell className="font-mono">{item.vigenciaResumo}</TableCell>
                    <TableCell>
                      {item.situacao === 'vigente'
                        ? <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">vigente</Badge>
                        : <Badge variant="outline" className="border-osg-red/30 bg-osg-red/10 text-osg-red">vencido</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="px-5 py-3 text-[11px] text-muted-foreground">Dado fictício — só para mostrar a grade.</p>
        </div>
      </div>

      <ExploracaoRuralModal
        open={open}
        isEdit={isEdit}
        refCodigo={refCodigo}
        draft={draft}
        onChange={setDraft}
        matriculas={matriculas}
        pessoas={pessoas}
        instrumentosDeOrigem={INSTRUMENTOS_DE_ORIGEM_FIXTURE}
        avisoParaMatricula={avisoParaMatricula}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}

// Os hooks reaproveitados são React Query — o preview precisa do provider, que no
// app inteiro mora no App.tsx.
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Os dois providers que o App.tsx monta e este entry avulso não herda. */}
      <TooltipProvider>
        <ContratosExploracaoPreview />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
