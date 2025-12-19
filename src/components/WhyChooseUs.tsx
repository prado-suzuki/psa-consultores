import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Building2, Award, LucideIcon } from "lucide-react";

interface StatItem {
  number: string;
  description: string;
  icon: LucideIcon;
}

export const WhyChooseUs = () => {
  const stats: StatItem[] = [
    {
      number: "R$ 1,07 Bilhão",
      description: "Recuperados em créditos tributários: PIS, COFINS, ICMS, IPI, Subvenções e Previdenciário",
      icon: TrendingUp,
    },
    {
      number: "500+ Clientes",
      description: "De produtores rurais pessoa física a grandes indústrias: soluções personalizadas para cada etapa do agronegócio",
      icon: Users,
    },
    {
      number: "110+ Profissionais",
      description: "Equipe multidisciplinar especializada em tributação, contabilidade e economia em 3 estados brasileiros",
      icon: Building2,
    },
    {
      number: "20+ Anos",
      description: "Liderança consolidada em consultoria tributária para empresas familiares do agronegócio desde 2004",
      icon: Award,
    },
  ];

  return (
    <section id="sobre" className="pt-32 pb-20 md:pt-36 md:pb-32 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl text-left mb-10 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Por que Escolher a PSA Consultores
          </h2>
          <p className="text-lg text-muted-foreground">
            Mais de 20 anos transformando desafios tributários em oportunidades 
            para empresas familiares do agronegócio, com metodologia comprovada 
            em 500+ clientes de médio e grande porte
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card 
                key={index} 
                className="p-8 bg-white rounded-lg border border-gray-200 hover:border-teal-500 hover:shadow-lg transition-all duration-300 text-center"
              >
                {/* Ícone no topo centralizado */}
                <div className="mb-6 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
                    <IconComponent className="w-8 h-8 text-teal-500" />
                  </div>
                </div>
                
                {/* Número em destaque */}
                <h3 className="text-4xl font-bold text-teal-600 mb-2">
                  {stat.number}
                </h3>
                
                {/* Descrição */}
                <p className="text-gray-600 text-sm leading-relaxed">
                  {stat.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
