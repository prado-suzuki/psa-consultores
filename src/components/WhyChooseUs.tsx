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
      className="pt-32 pb-20 md:pt-36 md:pb-32 bg-white"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314b8a6' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}
    >
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
            const isDark = index === 0 || index === 1;
            
            return (
              <Card 
                key={index} 
                className={`p-10 rounded-lg border transition-all duration-300 text-center ${
                  isDark 
                    ? 'bg-gray-900 border-gray-700 hover:border-lime-400 hover:shadow-lg' 
                    : 'bg-white border-gray-200 hover:border-teal-500 hover:shadow-lg'
                }`}
              >
                {/* Ícone no topo centralizado */}
                <div className="mb-8 flex justify-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-gray-800' : 'bg-teal-50'
                  }`}>
                    <IconComponent className={`w-8 h-8 ${isDark ? 'text-lime-400' : 'text-teal-500'}`} />
                  </div>
                </div>
                
                {/* Número em destaque */}
                <h3 className={`text-4xl font-bold mb-2 ${isDark ? 'text-lime-400' : 'text-teal-600'}`}>
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
