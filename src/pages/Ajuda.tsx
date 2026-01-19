import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Mail, User, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Como acompanho o status do meu projeto?",
    answer: "Após fazer login, você terá acesso ao dashboard com todos os seus projetos. Lá você pode visualizar prazos, etapas concluídas e próximos passos de cada projeto."
  },
  {
    question: "Como posso entrar em contato com meu consultor?",
    answer: "Através da plataforma, você pode abrir chamados diretamente para nossa equipe. Basta acessar a seção 'Chamados' e descrever sua dúvida ou solicitação."
  },
  {
    question: "Onde encontro os documentos do meu projeto?",
    answer: "Todos os documentos importantes ficam disponíveis na área do cliente, organizados por projeto. Você pode visualizar e fazer download a qualquer momento."
  },
  {
    question: "Qual o prazo de resposta para chamados?",
    answer: "Nossa equipe responde em até 24 horas úteis. Chamados urgentes são priorizados automaticamente pelo sistema."
  },
  {
    question: "Como altero minha senha de acesso?",
    answer: "Você pode solicitar a alteração de senha através do link 'Esqueci minha senha' na tela de login, ou diretamente nas configurações da sua conta após logado."
  },
  {
    question: "Posso acessar a plataforma pelo celular?",
    answer: "Sim! Nossa plataforma é totalmente responsiva e funciona perfeitamente em dispositivos móveis, tablets e desktops."
  }
];

const Ajuda = () => {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAllFaqs, setShowAllFaqs] = useState(false);

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
              Central de Ajuda
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Sua plataforma exclusiva de suporte e acompanhamento de projetos
            </p>
            
          </div>

          {/* Bottom Section - Two Columns */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            
            {/* Left Column - Login */}
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

              </div>

            </div>

            {/* Right Column - FAQ Section */}
            <div className="w-full lg:w-1/2">
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                    Dúvidas Frequentes
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Perguntas Frequentes
                  </h2>
                </div>
                
                {/* FAQ Accordion */}
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.slice(0, showAllFaqs ? faqItems.length : 3).map((item, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="border-b border-border"
                    >
                      <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline py-4">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                {/* Ver mais / Ver menos button */}
                {faqItems.length > 3 && (
                  <button
                    onClick={() => setShowAllFaqs(!showAllFaqs)}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                  >
                    {showAllFaqs ? "Ver menos perguntas" : `Ver mais ${faqItems.length - 3} perguntas`}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAllFaqs ? "rotate-180" : ""}`} />
                  </button>
                )}
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
