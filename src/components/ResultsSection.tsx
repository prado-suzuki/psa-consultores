import { motion, useInView, animate } from "framer-motion";
import { useRef, useEffect } from "react";
import resultsBg from "@/assets/backgrounds/results-illustration.jpg";

const results = [
  {
    value: 1.07,
    prefix: "R$",
    suffix: "",
    unit: "Bilhão",
    description: "Recuperados em créditos tributários",
    isDecimal: true,
  },
  {
    value: 500,
    prefix: "+",
    suffix: "",
    unit: "Clientes",
    description: "De médio e grande porte atendidos",
    isDecimal: false,
  },
  {
    value: 325,
    prefix: "+",
    suffix: "",
    unit: "Avaliações",
    description: "Diagnósticos para otimização fiscal",
    isDecimal: false,
  },
  {
    value: 95,
    prefix: "+",
    suffix: "",
    unit: "Reestruturações",
    description: "Societárias realizadas com sucesso",
    isDecimal: false,
  },
];

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  isDecimal?: boolean;
}

const AnimatedNumber = ({ value, prefix = "", suffix = "", isDecimal = false }: AnimatedNumberProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView && ref.current) {
      const controls = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (v) => {
          if (ref.current) {
            ref.current.textContent = isDecimal 
              ? v.toFixed(2).replace('.', ',')
              : Math.round(v).toString();
          }
        },
      });
      return () => controls.stop();
    }
  }, [isInView, value, isDecimal]);

  return (
    <span className="tabular-nums">
      {prefix}
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
};

export const ResultsSection = () => {
  return (
    <section className="relative py-20 md:py-28 bg-gray-900 overflow-hidden">
      {/* Background Image with Transparency */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{ 
          backgroundImage: `url(${resultsBg})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 via-transparent to-gray-900/50" />

      <div className="container relative mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Resultados que Transformam
          </h2>
          <p className="text-gray-400">
            Mais de duas décadas entregando valor real para empresas do agronegócio.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 md:p-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`text-center px-4 lg:px-8 ${
                  index < results.length - 1 
                    ? 'lg:border-r lg:border-gray-700/50' 
                    : ''
                }`}
              >
                <p className="text-3xl md:text-5xl font-bold text-emerald-400 mb-2">
                  <AnimatedNumber 
                    value={result.value} 
                    prefix={result.prefix}
                    suffix={result.suffix}
                    isDecimal={result.isDecimal}
                  />
                </p>
                <p className="text-base md:text-lg font-medium text-white mb-1">
                  {result.unit}
                </p>
                <p className="text-xs md:text-sm text-gray-500">
                  {result.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
