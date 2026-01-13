import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Lightbulb, Lock, Mail, User } from "lucide-react";
import { WelcomeVideoCard } from "@/components/ui/welcome-video-card";
import { toast } from "sonner";
import farmersIllustration from "@/assets/contact/farmers-illustration.jpg";

const checklistItems = [
  { id: 1, text: "Acompanhe o progresso dos seus projetos" },
  { id: 2, text: "Acesse documentos e relatórios" },
  { id: 3, text: "Abra chamados e solicitações" },
  { id: 4, text: "Comunique-se diretamente com a equipe" },
];

const Ajuda = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate("/cliente");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message?.includes("Invalid login credentials")) {
          setError("Email ou senha incorretos");
        } else {
          setError("Erro ao fazer login. Tente novamente.");
        }
      } else {
        toast.success("Login realizado com sucesso!");
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

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
          
          {/* Top Section - Centered Title and Video */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Central de Ajuda - Clientes PSA
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Sua plataforma exclusiva de suporte e acompanhamento de projetos
            </p>
            
            <div className="max-w-2xl mx-auto">
              <WelcomeVideoCard
                videoThumbnail={farmersIllustration}
                videoTitle="Bem-vindo à Plataforma PSA"
                videoDescription="Conheça todos os recursos disponíveis para você"
                videoUrl="#"
              />
            </div>
          </div>

          {/* Bottom Section - Two Columns */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            
            {/* Left Column - Instructions */}
            <div className="w-full lg:w-1/2">
              <div className="space-y-4">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Login */}
            <div className="w-full lg:w-1/2">
              {/* Login Card */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Acesso Exclusivo
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <User className="w-3 h-3" />
                    Cliente
                  </span>
                </div>

                <p className="text-muted-foreground text-sm mb-6">
                  Entre com suas credenciais para acessar a plataforma
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Entrando...
                      </div>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-center text-sm text-muted-foreground">
                    Não tem acesso?{" "}
                    <a 
                      href="/#contato" 
                      className="text-primary hover:underline font-medium"
                    >
                      Entre em contato com nossa equipe
                    </a>
                  </p>
                </div>
              </div>

              {/* Tip */}
              <div className="mt-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                  <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Dica:</strong> Use o mesmo email do seu contrato para facilitar a identificação pela nossa equipe e agilizar o atendimento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Ajuda;
