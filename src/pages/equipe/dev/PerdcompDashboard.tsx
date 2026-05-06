import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const LOOKER_STUDIO_URL =
  'https://datastudio.google.com/embed/reporting/17ad7220-2c94-4df0-9c43-acee47aebe8a/page/p_ilwof7ab2d';

const PerdcompDashboard = () => {
  const navigate = useNavigate();

  return (
    <DevLayout
      title="Dashboard PERDCOMP"
      subtitle="Visualização incorporada do Looker Studio para acompanhamento do PERDCOMP"
      headerActions={
        <Button variant="outline" onClick={() => navigate('/equipe/dev/perdcomp')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para PERDCOMP
        </Button>
      }
    >
      <Card className="overflow-hidden border-slate-200/70 shadow-sm">
        <CardContent className="p-2 md:p-3">
          <div className="mx-auto w-full max-w-[1280px] overflow-hidden rounded-xl" style={{ aspectRatio: '1280 / 925' }}>
            <iframe
              title="Dashboard PERDCOMP"
              src={LOOKER_STUDIO_URL}
              frameBorder="0"
              style={{ border: 0 }}
              allowFullScreen
              sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              className="block h-full w-full"
            />
          </div>
        </CardContent>
      </Card>
    </DevLayout>
  );
};

export default PerdcompDashboard;
