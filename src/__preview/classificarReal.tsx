import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { BaldePanel } from '@/components/equipe/osg/documentos/classificar/BaldePanel';
import { DocumentoVisualizador } from '@/components/equipe/osg/documentos/classificar/DocumentoVisualizador';
import { FichaColuna } from '@/components/equipe/osg/documentos/classificar/FichaColuna';
import { OrganizarDocumentos } from '@/components/equipe/osg/documentos/OrganizarDocumentos';
import { PessoaDadosTab } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab';
import { contarPorGaveta, filtrarBalde, proximoDoBalde, type Gaveta } from '@/lib/classificarBalde';
import { emptyPessoaDraft, type PessoaDraft } from '@/lib/pessoaModalModel';
import { formScopeCls } from '@/lib/osgFormGrid';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { BemRow } from '@/hooks/useDiagnosticoPatrimonial';
import '@/index.css';

/**
 * PREVIEW DESCARTÁVEL — não faz parte da entrega.
 * Monta os COMPONENTES REAIS do modo Classificar com dados falsos, para conferir
 * o layout sem credenciais. Nenhuma mutation é executada.
 */

const doc = (
  id: string,
  nome: string,
  categoria: DocumentoArquivoRow['categoria'],
  extra: Partial<DocumentoArquivoRow> = {},
): DocumentoArquivoRow =>
  ({
    id,
    cliente_id: 'C1',
    nome_original: nome,
    categoria,
    fonte: 'cliente',
    status: 'ativo',
    excluido: false,
    mime: nome.endsWith('.pdf') ? 'application/pdf' : 'image/png',
    tamanho: 248_000,
    created_at: `2026-07-2${id.length}T10:0${id.length}:00Z`,
    pessoa_id: null,
    bem_id: null,
    matricula_id: null,
    gcs_uri: 'gs://fake/objeto',
    ...extra,
  }) as DocumentoArquivoRow;

const DOCS: DocumentoArquivoRow[] = [
  doc('a', 'CPF - Maria Aparecida Ferreira Lima.png', 'pessoais'),
  doc('bb', 'RG - Maria Aparecida (frente e verso).pdf', 'pessoais'),
  doc('ccc', 'Comprovante de residencia - energia 06-2026.pdf', 'pessoais'),
  doc('dddd', 'Contrato social - Agropecuaria Ferreira Lima LTDA.pdf', 'societarios'),
  doc('eeeee', 'Matricula 18.442 - Fazenda Boa Esperanca.pdf', 'agrarios'),
  doc('ffffff', 'Certidao de casamento.pdf', 'pessoais'),
  doc('ggggggg', 'Ja classificado (nao aparece no balde).pdf', 'pessoais', { pessoa_id: 'P1' }),
];

const PESSOAS = [
  { id: 'P1', denominacao: 'Antônio Lima Sobrinho', tipo_pessoa: 'PF', is_fundador: true },
  { id: 'P2', denominacao: 'Terezinha Ferreira', tipo_pessoa: 'PF', is_fundador: true },
  { id: 'P3', denominacao: 'Agropecuária Ferreira Lima LTDA', tipo_pessoa: 'PJ', is_fundador: false },
] as unknown as PessoaRow[];

const IMOVEIS = [
  { id: 'B1', referencia_dp: 'IR-01', denominacao: 'Fazenda Boa Esperança', tipo_bem: 'IR' },
] as unknown as BemRow[];

const OPCOES = {
  pessoas: PESSOAS.map((p) => ({ id: p.id, label: p.denominacao ?? '', tipo: p.tipo_pessoa })),
  bens: [{ id: 'B1', label: 'IR-01 — Fazenda Boa Esperança' }],
  matriculas: [{ id: 'M1', label: 'Matrícula 18.442', numero: '18.442' }],
};

// Folha falsa, em data: URI, para o visualizador ter o que mostrar sem rede.
const FOLHA = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="620" height="860" viewBox="0 0 620 860">
  <rect width="620" height="860" fill="#ffffff"/>
  <text x="310" y="60" font-family="Work Sans" font-size="13" fill="#6b7f74" text-anchor="middle" letter-spacing="3">RECEITA FEDERAL DO BRASIL</text>
  <text x="310" y="92" font-family="Work Sans" font-size="18" fill="#125837" text-anchor="middle">Cadastro de Pessoas Físicas</text>
  <text x="60" y="180" font-family="Work Sans" font-size="11" fill="#8a9a92">NOME</text>
  <text x="60" y="206" font-family="Work Sans" font-size="19" fill="#1c2b24">MARIA APARECIDA FERREIRA LIMA</text>
  <text x="60" y="270" font-family="Work Sans" font-size="11" fill="#8a9a92">NÚMERO DE INSCRIÇÃO</text>
  <text x="60" y="296" font-family="monospace" font-size="19" fill="#1c2b24">428.917.360-05</text>
  <text x="60" y="360" font-family="Work Sans" font-size="11" fill="#8a9a92">NASCIMENTO</text>
  <text x="60" y="386" font-family="monospace" font-size="19" fill="#1c2b24">14/03/1968</text>
  <rect x="60" y="440" width="500" height="14" fill="#eef3f0"/>
  <rect x="60" y="470" width="420" height="14" fill="#eef3f0"/>
  <rect x="60" y="500" width="470" height="14" fill="#eef3f0"/>
</svg>`)}`;

function Harness() {
  const [gaveta, setGaveta] = useState<Gaveta>('todas');
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>('a');
  const [resolvidos, setResolvidos] = useState<string[]>([]);

  const lista = filtrarBalde(DOCS, { gaveta, busca, resolvidos });
  const gavetas = contarPorGaveta(DOCS, resolvidos);
  const aberto = lista.find((item) => item.id === abertoId) ?? null;

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-osg-300/60 bg-background shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(18,88,55,0.18)]">
      <div className="flex shrink-0 items-center gap-4 border-b border-osg-100 px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-lg border border-osg-300/60 bg-osg-50/70 p-1">
          <span className="rounded-md px-2.5 py-1 text-[12px] font-medium text-osg-600">Organizar</span>
          <span className="rounded-md bg-osg-moss px-2.5 py-1 text-[12px] font-semibold text-white shadow-sm">
            Classificar
          </span>
        </div>
        <p className="ml-auto rounded-full border border-osg-300/60 bg-osg-50 px-3 py-1.5 text-[12px] font-semibold text-osg-700">
          {gavetas[0]?.total ?? 0} arquivos sem dono
        </p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <BaldePanel
          arquivos={lista}
          gavetas={gavetas}
          gaveta={gaveta}
          onGaveta={setGaveta}
          busca={busca}
          onBusca={setBusca}
          abertoId={aberto?.id ?? null}
          onAbrir={(item) => setAbertoId(item.id)}
          semDonoTotal={gavetas[0]?.total ?? 0}
          carregando={false}
          onNaoEDeNinguem={() => {
            if (!aberto) return;
            const proximo = proximoDoBalde(lista, aberto.id);
            setResolvidos((atual) => [...atual, aberto.id]);
            setAbertoId(proximo?.id ?? null);
          }}
          marcadosNaSessao={resolvidos.length}
          onDesfazerMarcacoes={() => setResolvidos([])}
        />
        <DocumentoVisualizador
          doc={aberto}
          url={aberto ? FOLHA : null}
          carregando={false}
          erro={null}
          onRecarregar={() => {}}
          onBaixar={() => {}}
        />
        <FichaColuna
          key={aberto?.id ?? 'vazio'}
          doc={aberto}
          clienteId="C1"
          pessoasCliente={PESSOAS}
          imoveis={IMOVEIS}
          opcoes={OPCOES}
          salvando={false}
          sugestao={null}
          onCadastrar={() => {}}
          onVincular={() => {}}
          onLimpar={() => {}}
        />
      </div>
    </div>
  );
}

/** Régua da regressão: o mesmo formulário na largura do modal de hoje (848px). */
function Referencia() {
  const [draft, setDraft] = useState<PessoaDraft>(() => ({ ...emptyPessoaDraft(), tipo_pessoa: 'PF' }));
  return (
    <div className="rounded-xl border border-osg-300/60 bg-card p-4">
      <p className="mb-3 text-[12px] font-semibold text-osg-700">
        Regressão: mesmo formulário num contêiner de 848px (a largura do modal de hoje) — deve seguir
        multi-coluna
      </p>
      <div className={`${formScopeCls} w-[848px]`}>
        <PessoaDadosTab
          draft={draft}
          setDraft={setDraft}
          pessoaCandidates={PESSOAS}
          parenteCandidates={PESSOAS}
          parentesco={{ parenteId: '', tipo: '', natureza: '' }}
          setParentesco={() => {}}
        />
      </div>
    </div>
  );
}

const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

document.documentElement.classList.add('osg-theme');
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={cliente}>
    <MemoryRouter>
    <AuthProvider>
    <TooltipProvider>
      <div className="min-h-screen bg-osg-canvas p-6">
        <div className="mx-auto w-full max-w-[1440px] space-y-8">
          <Harness />
          {/* Só para conferir que o modo Organizar continua montando depois da
              extração (sem credenciais as listas vêm vazias). */}
          <div className="overflow-hidden rounded-xl border border-osg-300/60 bg-background">
            <OrganizarDocumentos clienteId="C1" />
          </div>
          <Referencia />
        </div>
      </div>
    </TooltipProvider>
    </AuthProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);
