import { Badge } from '@/components/ui/badge';

// Selo que a consultora confere campo a campo (ver ALE-3,
// docs/osg/levantamento-contratos-rurais.md, seção 2): "existe" é coluna que já
// mora em outro cadastro (matrícula, pessoa, exploracao_rural); "novo" é campo
// sem coluna hoje, que só existe neste rascunho de tela.

const baseCls = 'h-4 rounded-sm px-1.5 text-[9px] font-bold uppercase tracking-wide leading-4';

export function SeloExiste() {
  return (
    <Badge variant="outline" className={`${baseCls} border-emerald-300 bg-emerald-50 text-emerald-700`}>
      existe
    </Badge>
  );
}

export function SeloNovo() {
  return (
    <Badge variant="outline" className={`${baseCls} border-osg-highlighter bg-osg-highlighter/25 text-amber-900`}>
      novo
    </Badge>
  );
}

export function Selo({ tipo }: { tipo: 'existe' | 'novo' }) {
  return tipo === 'existe' ? <SeloExiste /> : <SeloNovo />;
}
