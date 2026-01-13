import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Headphones, LogIn, UserPlus, Lightbulb } from "lucide-react";

const Ajuda = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/cliente");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Headphones className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Central de Ajuda
            </h1>
            <p className="text-lg text-muted-foreground">
              Precisa de suporte? Acesse sua conta para abrir um chamado ou acompanhar suas solicitações.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="text-center pb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3">
                  <LogIn className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Já sou cliente</CardTitle>
                <CardDescription>
                  Faça login para abrir um chamado ou acompanhar solicitações existentes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full" 
                  onClick={() => navigate("/auth")}
                >
                  Acessar minha conta
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="text-center pb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/50 mx-auto mb-3">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Quero me cadastrar</CardTitle>
                <CardDescription>
                  Crie uma conta para acessar nosso suporte especializado
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/auth?mode=register")}
                >
                  Criar minha conta
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Dica:</strong> Use o mesmo email do seu contrato para facilitar a identificação pela nossa equipe e agilizar o atendimento.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Ajuda;
