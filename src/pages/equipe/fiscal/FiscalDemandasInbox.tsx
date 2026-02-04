import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { FiscalInbox } from '@/components/equipe/fiscal/FiscalInbox';

const FiscalDemandasInbox = () => {
  return (
    <FiscalLayout title="Caixa de Entrada" subtitle="Notificações e atividades">
      <FiscalInbox />
    </FiscalLayout>
  );
};

export default FiscalDemandasInbox;
