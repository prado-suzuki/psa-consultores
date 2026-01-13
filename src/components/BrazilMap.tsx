import DottedMap from "dotted-map";
import { motion } from "framer-motion";
import { useMemo } from "react";

// Coordenadas das cidades dos escritórios
const offices = [
  { lat: -15.60, lng: -56.10, city: "Cuiabá" },      // MT - Matriz
  { lat: -12.14, lng: -44.99, city: "Barreiras" },   // BA - Filial
  { lat: -25.43, lng: -49.27, city: "Curitiba" },    // PR - Filial
];

export const BrazilMap = () => {
  const svgMap = useMemo(() => {
    const map = new DottedMap({
      height: 60,
      grid: "diagonal",
      countries: ["BRA"],
    });

    // Adiciona pins de destaque nas localizações dos escritórios
    offices.forEach((office) => {
      map.addPin({
        lat: office.lat,
        lng: office.lng,
        svgOptions: { color: "#65A30D", radius: 0.8 },
      });
    });

    return map.getSVG({
      radius: 0.35,
      color: "#9CA3AF", // gray-400
      shape: "circle",
      backgroundColor: "transparent",
    });
  }, []);

  return (
    <div className="relative w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative"
      >
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
          alt="Mapa do Brasil com escritórios destacados"
          className="w-full h-auto"
        />
        
        {/* Overlay com pins animados */}
        <div className="absolute inset-0">
          {/* Pin Cuiabá - posição aproximada no SVG */}
          <motion.div
            className="absolute w-3 h-3 bg-lime-600 rounded-full shadow-lg shadow-lime-600/50"
            style={{ top: "35%", left: "38%" }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Pin Barreiras */}
          <motion.div
            className="absolute w-3 h-3 bg-lime-600 rounded-full shadow-lg shadow-lime-600/50"
            style={{ top: "28%", left: "52%" }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
          
          {/* Pin Curitiba */}
          <motion.div
            className="absolute w-3 h-3 bg-lime-600 rounded-full shadow-lg shadow-lime-600/50"
            style={{ top: "62%", left: "48%" }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.6,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};
