import { motion } from "framer-motion";

const results = [
  {
    number: "R$ 1,07",
    unit: "Bilhão",
    description: "Recuperados em créditos tributários",
  },
  {
    number: "+500",
    unit: "Clientes",
    description: "De médio e grande porte atendidos",
  },
  {
    number: "+325",
    unit: "Avaliações",
    description: "Diagnósticos para otimização fiscal",
  },
  {
    number: "+95",
    unit: "Reestruturações",
    description: "Societárias realizadas com sucesso",
  },
];

export const ResultsSection = () => {
  return (
    <section className="py-20 md:py-28 bg-gray-900">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-50 mb-4">
            Resultados que Transformam
          </h2>
          <p className="text-gray-400">
            Mais de duas décadas entregando valor real para empresas do agronegócio.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {results.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <p className="text-4xl md:text-5xl font-bold text-primary">
                {result.number}
              </p>
              <p className="text-lg font-medium text-gray-50 mt-1">
                {result.unit}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {result.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
