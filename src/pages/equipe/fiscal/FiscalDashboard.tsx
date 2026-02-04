import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { FiscalInbox } from '@/components/equipe/fiscal/FiscalInbox';
import { FiscalWorkPackages } from '@/components/equipe/fiscal/FiscalWorkPackages';
import { FiscalClients } from '@/components/equipe/fiscal/FiscalClients';
import { Inbox, Package, Building } from 'lucide-react';

const FiscalDashboard = () => {
  const [activeTab, setActiveTab] = useState('pacotes');

  return (
    <FiscalLayout title="Fiscal" subtitle="Gestao de Projetos">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-slate-200 p-1 h-auto">
          <TabsTrigger 
            value="inbox" 
            className="gap-2 px-4 py-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
          >
            <Inbox className="h-4 w-4" />
            Caixa de Entrada
          </TabsTrigger>
          <TabsTrigger 
            value="pacotes" 
            className="gap-2 px-4 py-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
          >
            <Package className="h-4 w-4" />
            Pacotes de Trabalho
          </TabsTrigger>
          <TabsTrigger 
            value="clientes" 
            className="gap-2 px-4 py-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
          >
            <Building className="h-4 w-4" />
            Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-0">
          <FiscalInbox />
        </TabsContent>

        <TabsContent value="pacotes" className="mt-0">
          <FiscalWorkPackages />
        </TabsContent>

        <TabsContent value="clientes" className="mt-0">
          <FiscalClients />
        </TabsContent>
      </Tabs>
    </FiscalLayout>
  );
};

export default FiscalDashboard;
