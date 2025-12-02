import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import heroBackground from "@/assets/hero-background.png";
import logo from "@/assets/logo-psa.png";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-hero overflow-hidden">
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      {/* Dark overlay for better text legibility */}
      <div className="absolute inset-0 bg-gray-900/50" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="pt-32 md:pt-40 pb-20">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="flex justify-center mb-8">
              <img src={logo} alt="PSA Consultores" className="h-16 md:h-20 w-auto" />
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
              Consultoria que 
              <span className="block mt-2 bg-gradient-primary bg-clip-text text-transparent">
                Impulsiona Resultados
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white max-w-2xl mx-auto leading-relaxed">
              Soluções estratégicas em gestão, processos e desenvolvimento organizacional para empresas que buscam excelência e crescimento sustentável.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg group">
                Fale com um Especialista
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 group">
                Conheça Nossas Soluções
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {[
                { value: "200+", label: "Projetos Entregues" },
                { value: "15+", label: "Anos de Experiência" },
                { value: "98%", label: "Satisfação Cliente" },
                { value: "50+", label: "Empresas Atendidas" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-white">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-[#f5f5f5]"></div>
    </section>
  );
};
