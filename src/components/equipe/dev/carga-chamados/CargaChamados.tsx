import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Inbox, UserPlus, History } from 'lucide-react';
import { CriarUsuariosTab } from './CriarUsuariosTab';

/**
 * Sub-ferramenta "Carga de chamados" — usada em /equipe/dev/gerenciar-dados.
 * Aba 1: criar usuários para representantes sem `user_id`.
 * Aba 2: importar histórico de chamados do legado (em breve).
 */
export const CargaChamados = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          Carga de chamados
        </CardTitle>
        <CardDescription>
          Utilize para criar o cadastro de usuários e importar o histórico de chamados do sistema legado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="criar-usuarios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="criar-usuarios">
              <UserPlus className="h-4 w-4 mr-2" />
              Criar usuários
            </TabsTrigger>
            <TabsTrigger value="importar-historico" disabled title="Em breve">
              <History className="h-4 w-4 mr-2" />
              Importar histórico
              <Badge variant="secondary" className="ml-2 text-[10px]">Em breve</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="criar-usuarios">
            <CriarUsuariosTab />
          </TabsContent>
          <TabsContent value="importar-historico" />
        </Tabs>
      </CardContent>
    </Card>
  );
};
