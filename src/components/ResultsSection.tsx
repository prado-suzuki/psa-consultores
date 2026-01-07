import { motion } from "framer-motion";
import { TrendingUp, Users, FileCheck, Building2 } from "lucide-react";

const results = [
  {
    icon: TrendingUp,
    number: "R$ 1,07",
    unit: "Bilhão",
    description: "Recuperados em créditos tributários",
    details: "PIS, COFINS, ICMS, IPI, Subvenções e Previdenciário"
  },
  {
    icon: Users,
    number: "+500",
    unit: "Clientes",
    description: "De médio e grande porte",
    details: "Produtores rurais PF até indústrias sucroalcooleiras"
  },
  {
    icon: FileCheck,
    number: "+325",
    unit: "Avaliações",
    description: "Diagnósticos tributários completos",
    details: "Para otimização de carga tributária"
  },
  {
    icon: Building2,
    number: "+95",
    unit: "Reestruturações",
    description: "Societárias realizadas",
    details: "Migrações PF/PJ, sucessões, fusões e cisões"
  }
];

export const ResultsSection = () => {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-gray-100 to-gray-50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Resultados que <span className="text-primary">Transformam</span>
          </h2>
          <p className="text-lg text-gray-600">
            Com 20 anos de atuação especializada no agronegócio, nossa trajetória é marcada 
            por números que refletem impacto real nos negócios de nossos clientes.
          </p>
        </motion.div>

        {/* Results Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {results.map((result, index) => (
            <motion.div
              key={result.description}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-8 rounded-2xl bg-white border border-gray-200 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
            >
              {/* Icon */}
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <result.icon className="h-7 w-7 text-primary" />
              </div>

              {/* Number */}
              <div className="mb-4">
                <span className="text-4xl md:text-5xl font-bold text-primary">{result.number}</span>
                <span className="text-2xl font-semibold text-gray-900 ml-1">{result.unit}</span>
              </div>

              {/* Description */}
              <h3 className="font-semibold text-gray-900 mb-2">{result.description}</h3>
              <p className="text-sm text-gray-500">{result.details}</p>

              {/* Decorative gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
