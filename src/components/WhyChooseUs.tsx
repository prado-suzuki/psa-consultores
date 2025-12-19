import { Card } from "@/components/ui/card";

export const WhyChooseUs = () => {
  const stats = [
    {
      number: "R$ 1,07 Bilhão",
      description: "Recuperados em créditos tributários: PIS, COFINS, ICMS, IPI, Subvenções e Previdenciário",
    },
    {
      number: "500+ Clientes",
      description: "Atendimento completo desde produtores rurais pessoa física até grandes indústrias do agronegócio",
    },
    {
      number: "110+ Profissionais",
      description: "Equipe multidisciplinar especializada em tributação, contabilidade e economia em 3 estados brasileiros",
    },
    {
      number: "20+ Anos",
      description: "Pioneiros em reestruturação contábil para empresas familiares do agronegócio em Mato Grosso",
    },
  ];

  return (
    <section id="sobre" className="py-24 md:py-32 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl text-left mb-10 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Por que Escolher a PSA Consultores
          </h2>
          <p className="text-lg text-muted-foreground">
            Pioneiros em reestruturação contábil para o agronegócio com resultados 
            comprovados e metodologia validada em mais de 500 empresas de médio e grande porte.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
          {stats.map((stat, index) => (
            <Card key={index} className="p-8 bg-muted/50 border-0">
              <h3 className="text-4xl md:text-5xl font-bold text-lime-500 mb-3">
                {stat.number}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {stat.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
