import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const WhyChooseUs = () => {
  const benefits = [
    {
      title: "Experiência Comprovada",
      description: "Mais de 15 anos transformando empresas com metodologias testadas.",
    },
    {
      title: "Abordagem Personalizada",
      description: "Soluções customizadas para suas necessidades específicas.",
    },
    {
      title: "Foco em Resultados",
      description: "Orientação por dados e métricas concretas para garantir ROI.",
    },
    {
      title: "Acompanhamento Contínuo",
      description: "Suporte durante toda a jornada de transformação.",
    },
  ];

  return (
    <section id="sobre" className="py-20 md:py-32 bg-muted relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm font-medium text-primary mb-4">
              Por que escolher a PSA
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Parceiro Estratégico para o Seu Crescimento
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Combinamos experiência, metodologia e tecnologia para entregar resultados que transformam organizações. Nossa abordagem vai além da consultoria tradicional.
            </p>
          </div>

          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className="p-6 bg-primary/5 hover:bg-primary/10 transition-all duration-300 group border-0"
              >
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1 group-hover:scale-110 transition-transform" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
