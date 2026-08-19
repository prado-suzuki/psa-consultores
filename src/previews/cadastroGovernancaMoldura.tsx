/**
 * A moldura do OSG Work em volta do mockup: barra lateral, cabeçalho e barra de
 * cliente.
 *
 * Por que existe: sem ela o mockup era uma página solta num fundo areia, e foi
 * isso que gerou estranheza na revisão. As telas de verdade nunca aparecem
 * sozinhas; aparecem dentro desta moldura, e é ela que dá o reconhecimento
 * imediato de "isto é o nosso sistema".
 *
 * É uma RÉPLICA ESTÁTICA, não o `OsgLayout`. O layout de verdade depende de
 * roteador, sessão e consulta de clientes, e montar isso num preview custaria
 * mais do que o mockup inteiro. Cada medida aqui foi copiada do
 * `OsgLayout.tsx`: fundo `osg-canvas`, barra de 16rem com borda
 * `slate-200/60`, item ativo em `bg-osg-100 text-osg-700`, cabeçalho de 4rem e
 * conteúdo com `p-6`. A barra de cliente repete o `OsgWorkClienteBar`, inclusive
 * o "Trabalhando em:".
 */
import type { ReactNode } from 'react';
import {
  Bell, Building2, ChevronLeft, FileBarChart2, FileSignature, FileText, FolderArchive, Landmark,
  PieChart, Rocket, Scale, Users,
} from 'lucide-react';

import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';

const MENU = [
  { rotulo: 'Onboarding', Icone: Rocket },
  { rotulo: 'Qualificação das Partes', Icone: Users },
  { rotulo: 'Diagnóstico Patrimonial', Icone: Landmark },
  { rotulo: 'Controle de Matrículas', Icone: FileText },
  { rotulo: 'Quadro Societário', Icone: PieChart },
  { rotulo: 'Governança', Icone: Scale, ativo: true },
  { rotulo: 'Oficina de Contratos', Icone: FileSignature },
  { rotulo: 'Documentos', Icone: FolderArchive },
  { rotulo: 'Relatórios', Icone: FileBarChart2 },
];

const CLIENTE = 'Grupo Campos Participações Ltda';

export const MolduraOsgWork = ({
  titulo,
  subtitulo,
  acoes,
  children,
}: {
  titulo: string;
  subtitulo: string;
  acoes?: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex min-h-screen w-full bg-osg-canvas">
    {/*
      Desliga o desfoque do fundo ao abrir o modal, a pedido da revisão.
      ATENÇÃO: o desfoque NÃO é invenção do mockup. Ele vem do
      `OsgDialogOverlay` (`backdrop-blur-[2px]`, em OsgDialog.tsx), que é o
      overlay de TODOS os modais da OSG: bem, matrícula, pessoa. Aqui ele é
      neutralizado só na prévia, para não misturar duas discussões. Tirar de
      verdade é uma linha no OsgDialog, e muda o produto inteiro.
    */}
    <style>
      {[
        // 1. O desfoque do FUNDO ao abrir.
        'div[data-state][class*="backdrop-blur"] { backdrop-filter: none !important; }',
        // 2. O "borrado" DENTRO do modal, que não é desfoque nenhum: medido, o
        //    modal fica em top 135,0625 com altura 497,875, ou seja o
        //    `translate(-50%,-50%)` cai em meio pixel, e o `will-change:
        //    transform` do OsgDialog prende isso numa camada composta que nunca
        //    é redesenhada. Por isso o texto do modal sai macio e a lista
        //    suspensa, que vive fora dessa camada, sai nítida. Soltar a camada
        //    resolve sem tocar na animação.
        '[role="dialog"] { will-change: auto !important; }',
      ].join('\n')}
    </style>
    <div className="relative sticky top-0 h-screen w-64 flex-shrink-0">
      <span
        aria-hidden
        className="absolute -right-3 top-6 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-background text-slate-600 shadow-sm"
      >
        <ChevronLeft className="h-3 w-3" />
      </span>
      <aside className="flex h-full w-full flex-col border-r border-slate-200/60 bg-background">
        <div className="border-b border-slate-200/60 px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <OsgWorkIcon size={40} className="block h-full w-full" />
            </div>
            <div className="min-w-0 whitespace-nowrap">
              <h2 className="text-lg font-semibold text-slate-900">OSG Work</h2>
              <p className="text-xs text-slate-500">Ferramentas OSG</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 p-4">
          {MENU.map(({ rotulo, Icone, ativo }) => (
            <span
              key={rotulo}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                ativo ? 'bg-osg-100 text-osg-700' : 'text-slate-600'
              }`}
            >
              <Icone className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">{rotulo}</span>
              {/* A entrada de Governança ainda não existe no menu: é o que este
                  mockup está propondo, e vale dizer isso na própria tela. */}
              {ativo && (
                <span className="ml-auto rounded-full bg-osg-moss/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-osg-moss">
                  nova
                </span>
              )}
            </span>
          ))}
        </nav>
      </aside>
    </div>

    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/60 bg-background px-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
          <p className="text-sm text-slate-500">{subtitulo}</p>
        </div>
        <div className="flex items-center gap-3">
          {acoes}
          <span className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600">
            <Bell className="h-[18px] w-[18px]" />
          </span>
        </div>
      </header>

      <div className="border-b border-osg-100 bg-osg-50/40 px-6 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-osg-100 text-osg-700">
              <Building2 className="h-4 w-4 flex-shrink-0" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wide text-osg-700">Cliente</span>
          </div>
          <div className="max-w-md flex-1">
            <span className="flex h-10 items-center justify-between rounded-md border border-osg-200 bg-background px-3 text-sm font-medium text-foreground">
              {CLIENTE}
              <ChevronLeft className="h-4 w-4 -rotate-90 text-muted-foreground" />
            </span>
          </div>
          <div className="truncate text-xs text-slate-600">
            Trabalhando em: <span className="font-semibold">{CLIENTE}</span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="p-6">{children}</div>
      </div>
    </main>
  </div>
);
