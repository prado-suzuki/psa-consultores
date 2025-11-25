import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, FileText, LogOut } from 'lucide-react';

export default function ClienteDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[hsl(210_20%_98%)]">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Área do Cliente</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Bem-vindo à sua Área do Cliente
            </h2>
            <p className="text-lg text-muted-foreground">
              Aqui você pode abrir chamados, acompanhar solicitações e gerenciar seus documentos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/cliente/novo-chamado')}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Abrir Chamado</h3>
                <p className="text-muted-foreground">
                  Precisa de ajuda? Abra um novo chamado e nossa equipe entrará em contato.
                </p>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Chamado
                </Button>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/cliente/chamados')}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Meus Chamados</h3>
                <p className="text-muted-foreground">
                  Visualize e acompanhe todos os seus chamados abertos e histórico.
                </p>
                <Button variant="outline" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Chamados
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
