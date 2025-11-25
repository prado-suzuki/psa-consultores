import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const WhyChooseUs = () => {
  const benefits = [
    {
      title: "Experiência Comprovada",
      description: "Mais de 15 anos transformando empresas com metodologias testadas e resultados mensuráveis.",
    },
    {
      title: "Equipe Multidisciplinar",
      description: "Profissionais altamente qualificados com expertise em diversas áreas da gestão empresarial.",
    },
    {
      title: "Abordagem Personalizada",
      description: "Cada projeto é único. Desenvolvemos soluções customizadas para suas necessidades específicas.",
    },
    {
      title: "Foco em Resultados",
      description: "Orientação por dados e métricas concretas para garantir o retorno sobre investimento.",
    },
    {
      title: "Acompanhamento Contínuo",
      description: "Suporte durante toda a jornada de transformação, desde o diagnóstico até a implementação.",
    },
    {
      title: "Inovação Constante",
      description: "Utilizamos as mais modernas ferramentas e metodologias do mercado de consultoria.",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 text-sm font-medium text-secondary mb-4">
              Por que escolher a PSA
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Parceiro Estratégico para o Seu Crescimento
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Combinamos experiência, metodologia e tecnologia para entregar resultados que transformam organizações. Nossa abordagem vai além da consultoria tradicional.
            </p>
            <div className="pt-4">
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Garantia de Qualidade</h4>
                    <p className="text-sm text-muted-foreground">
                      Todos os nossos projetos seguem rigorosos padrões de qualidade e melhores práticas do mercado.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className="p-6 border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 group"
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
