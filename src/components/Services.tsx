import { Card } from "@/components/ui/card";
import { Target, TrendingUp, Users, Cog, BarChart3, Award } from "lucide-react";

export const Services = () => {
  const services = [
    {
      icon: Target,
      title: "Planejamento Estratégico",
      description: "Desenvolvimento de estratégias customizadas para alcançar seus objetivos de negócio com clareza e direção.",
    },
    {
      icon: TrendingUp,
      title: "Gestão de Performance",
      description: "Implementação de sistemas de gestão que otimizam resultados e maximizam a eficiência operacional.",
    },
    {
      icon: Users,
      title: "Desenvolvimento Organizacional",
      description: "Fortalecimento da cultura e estrutura organizacional para impulsionar o crescimento sustentável.",
    },
    {
      icon: Cog,
      title: "Otimização de Processos",
      description: "Redesenho e melhoria contínua de processos para aumentar produtividade e reduzir custos.",
    },
    {
      icon: BarChart3,
      title: "Análise de Dados",
      description: "Transformação de dados em insights estratégicos para tomadas de decisão mais assertivas.",
    },
    {
      icon: Award,
      title: "Governança Corporativa",
      description: "Estruturação de práticas de governança que garantem transparência e conformidade.",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-background relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
            Nossas Soluções
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Serviços de Consultoria Especializada
          </h2>
          <p className="text-lg text-muted-foreground">
            Oferecemos soluções completas e integradas para transformar desafios em oportunidades de crescimento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index} 
                className="p-6 md:p-8 border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group bg-card"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
