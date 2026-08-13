import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText } from 'lucide-react';
import '@/index.css';
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
      referencia: 'ER 01',
      dataAssinatura: '2022-03-12',
      dataEncerramento: '2025-03-11',
      vigencia: '3 anos, contados da assinatura',
      matriculaId: boaVista.id,
      areaExplorada: '234,0000',
      outorganteId: modeloAgro.id,
      exploradorId: jose.id,
      percentualOutorgante: '30,000%',
      percentualExplorador: '70,000%',
      percentualVigenteDesde: '2022-03-12',
      culturas: 'soja; milho; algodão; pecuária',
      permitePenhor: true,
    };
  }
  return {
    ...base,
    referencia: 'ER 02',
    dataAssinatura: '2022-03-12',
    matriculaId: boaVista.id,
    areaExplorada: '234,0000',
    compossuidores: [
      { id: 'fx-1', pessoaId: jose.id, fracao: '70' },
      { id: 'fx-2', pessoaId: maria.id, fracao: '15' },
      { id: 'fx-3', pessoaId: pedro.id, fracao: '15' },
    ],
    tipoInstrumentoOrigem: 'Parceria',
    instrumentoOrigemRef: 'ER 01',
    imoveis: [
      { id: 'imv-fx-1', ref: 'a', matriculaId: boaVista.id, areaExplorada: '234,0000', instrumentoOrigemRef: 'ER 01', situacaoOrigem: 'vigente' },
      { id: 'imv-fx-2', ref: 'b', matriculaId: matriculasFixture[1].id, areaExplorada: '225,5480', instrumentoOrigemRef: 'ER 04', situacaoOrigem: 'encerrada' },
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

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return explosacoesListaFixture.filter((item: ExploracaoListaItemFixture) => {
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
      if (!termo) return true;
      return item.ref.toLowerCase().includes(termo) || item.imovelResumo.toLowerCase().includes(termo) || item.partesResumo.toLowerCase().includes(termo);
    });
  }, [busca, filtroTipo]);

  const avisoMatriculaCompartilhada = draft.matriculaId === matriculasFixture[0].id
    ? 'Esta matrícula já está em outra Parceria ativa: ER 01 — Modelo Agro Ltda. → José da Silva, 60% da área. Confirmado com a OSG (13/08/2026): duas Parcerias concorrentes na mesma matrícula são válidas se cobrirem fração distinta da área/percentual, com outorgados diferentes — o cadastro não bloqueia, só avisa.'
    : null;

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
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">existe</Badge>
            <Badge variant="outline" className="border-osg-highlighter bg-osg-highlighter/25 text-amber-900">novo</Badge>
          </div>
        </header>

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
        matriculas={matriculasFixture}
        pessoas={pessoasFixture}
        instrumentosDeOrigem={INSTRUMENTOS_DE_ORIGEM_FIXTURE}
        avisoMatriculaCompartilhada={avisoMatriculaCompartilhada}
        onClose={() => setOpen(false)}
      />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ContratosExploracaoPreview />
  </React.StrictMode>,
);
