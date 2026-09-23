import { Wrench } from 'lucide-react';

import { AREAS } from '@/lib/nomeDaArea';

import { AuditoriaLayout } from '@/components/equipe/auditoria/AuditoriaLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Esqueleto: a porta existe e a area e alcancavel. As ferramentas entram por
// card proprio, uma a uma, como as do OSG Work e do Tax Work entraram.
const AuditoriaWork = () => (
  <AuditoriaLayout title={AREAS.auditoriaWork.nome} subtitle="Ferramentas e aplicações desenvolvidas para a Auditoria">
    <Card className="max-w-xl">
      <CardHeader>
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Wrench className="h-5 w-5" />
        </div>
        <CardTitle>Nenhuma ferramenta por aqui ainda</CardTitle>
        <CardDescription>
          Este é o ambiente de ferramentas da área. Assim que a primeira entrar,
          ela aparece nesta tela e no menu ao lado.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  </AuditoriaLayout>
);

export default AuditoriaWork;
