import { motion } from "framer-motion";
import { Fragment } from "react";

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
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Resultados que Transformam
          </h2>
          <p className="text-gray-500">
            Mais de duas décadas entregando valor real para empresas do agronegócio.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-8 md:flex md:flex-row md:items-center md:justify-between">
            {results.map((result, index) => (
              <Fragment key={index}>
                <div className="flex-1 text-center md:px-8">
                  <p className="text-3xl md:text-5xl font-bold text-primary">
                    {result.number}
                  </p>
                  <p className="text-base md:text-lg font-medium text-gray-800 mt-2">
                    {result.unit}
                  </p>
                  <p className="text-xs md:text-sm text-gray-500 mt-1">
                    {result.description}
                  </p>
                </div>

                {index < results.length - 1 && (
                  <div className="hidden md:block w-px bg-gray-200 self-stretch min-h-[100px]" />
                )}
              </Fragment>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
