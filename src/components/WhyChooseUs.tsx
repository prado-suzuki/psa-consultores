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
    <section 
      id="sobre" 
      className="pt-32 pb-20 md:pt-36 md:pb-32 bg-gradient-to-b from-gray-100 via-white to-gray-900"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl text-left mb-10 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900">
            Por que Escolher a <span className="text-primary">PSA Consultores</span>
          </h2>
          <p className="text-lg text-gray-600">
            Mais de 20 anos transformando desafios tributários em oportunidades 
            para empresas familiares do agronegócio, com metodologia comprovada 
            em 500+ clientes de médio e grande porte
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            const isDark = index === 0 || index === 1;
            
            return (
              <Card 
                key={index} 
                className={`p-10 rounded-lg border transition-all duration-300 text-center ${
                  isDark 
                    ? 'bg-gray-900 border-gray-700 hover:border-primary hover:shadow-lg hover:shadow-primary/20' 
                    : 'bg-white border-gray-200 hover:border-secondary hover:shadow-lg hover:shadow-secondary/20'
                }`}
              >
                {/* Ícone no topo centralizado */}
                <div className="mb-8 flex justify-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-gray-800' : 'bg-secondary/10'
                  }`}>
                    <IconComponent className={`w-8 h-8 ${isDark ? 'text-primary' : 'text-secondary'}`} />
                  </div>
                </div>
                
                {/* Número em destaque */}
                <h3 className={`text-4xl font-bold mb-2 ${isDark ? 'text-primary' : 'text-secondary'}`}>
                  {stat.number}
                </h3>
                
                {/* Descrição */}
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
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
