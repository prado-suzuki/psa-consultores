import { motion } from "framer-motion";

interface Office {
  id: string;
  name: string;
  state: string;
  x: number;
  y: number;
  isMain: boolean;
}

const offices: Office[] = [
  { id: "cuiaba", name: "Cuiabá", state: "MT", x: 280, y: 380, isMain: true },
  { id: "barreiras", name: "Barreiras", state: "BA", x: 480, y: 340, isMain: false },
  { id: "curitiba", name: "Curitiba", state: "PR", x: 380, y: 650, isMain: false },
];

// Marcadores de clientes espalhados nos estados de atuação
const clientMarkers = [
  // MT
  { x: 220, y: 340 },
  { x: 260, y: 420 },
  { x: 300, y: 460 },
  { x: 240, y: 380 },
  { x: 320, y: 400 },
  // BA
  { x: 500, y: 380 },
  { x: 520, y: 420 },
  { x: 460, y: 450 },
  { x: 540, y: 360 },
  // PR
  { x: 360, y: 680 },
  { x: 400, y: 660 },
  { x: 340, y: 660 },
];

export const BrazilMap = () => {
  const getStateClass = (stateId: string) => {
    const operationalStates = ["MT", "BA", "PR"];
    
    if (operationalStates.includes(stateId)) {
      return "fill-green-200 stroke-green-400 transition-colors duration-300";
    }
    return "fill-gray-200 stroke-gray-300 transition-colors duration-300";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative w-full aspect-square max-w-lg mx-auto bg-white rounded-xl p-4"
    >
      <svg
        viewBox="0 0 700 900"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Brazil States */}
        <g className="states">
          {/* Norte */}
          <path d="M100,200 L180,180 L200,220 L180,280 L120,260 Z" 
                className={getStateClass("AC")} strokeWidth="1" />
          <path d="M140,100 L220,80 L240,140 L200,180 L140,160 Z" 
                className={getStateClass("RR")} strokeWidth="1" />
          <path d="M120,180 L280,140 L320,200 L300,300 L200,320 L140,280 L100,220 Z" 
                className={getStateClass("AM")} strokeWidth="1" />
          <path d="M180,280 L200,320 L240,380 L200,420 L140,400 L160,340 Z" 
                className={getStateClass("RO")} strokeWidth="1" />
          <path d="M380,80 L440,60 L460,120 L420,160 L380,140 Z" 
                className={getStateClass("AP")} strokeWidth="1" />
          <path d="M300,140 L440,120 L500,180 L480,280 L400,320 L320,280 L320,200 Z" 
                className={getStateClass("PA")} strokeWidth="1" />
          <path d="M320,280 L400,280 L400,380 L360,420 L300,380 Z" 
                className={getStateClass("TO")} strokeWidth="1" />

          {/* Nordeste */}
          <path d="M480,200 L540,180 L560,240 L540,300 L500,280 L480,240 Z" 
                className={getStateClass("MA")} strokeWidth="1" />
          <path d="M520,260 L560,240 L580,300 L560,360 L520,340 L500,300 Z" 
                className={getStateClass("PI")} strokeWidth="1" />
          <path d="M560,220 L620,200 L640,260 L600,300 L560,280 Z" 
                className={getStateClass("CE")} strokeWidth="1" />
          <path d="M620,220 L660,240 L650,280 L610,270 Z" 
                className={getStateClass("RN")} strokeWidth="1" />
          <path d="M610,270 L660,280 L650,310 L600,300 Z" 
                className={getStateClass("PB")} strokeWidth="1" />
          <path d="M560,300 L650,310 L640,350 L540,340 Z" 
                className={getStateClass("PE")} strokeWidth="1" />
          <path d="M600,350 L650,350 L640,380 L590,380 Z" 
                className={getStateClass("AL")} strokeWidth="1" />
          <path d="M580,380 L630,380 L620,410 L570,410 Z" 
                className={getStateClass("SE")} strokeWidth="1" />
          
          {/* Bahia - Estado de atuação */}
          <path d="M480,320 L570,310 L600,360 L580,440 L520,500 L440,480 L420,400 L460,360 Z" 
                className={getStateClass("BA")} strokeWidth="1.5" />

          {/* Centro-Oeste */}
          {/* Mato Grosso - Estado de atuação */}
          <path d="M200,320 L300,300 L360,340 L380,420 L340,500 L260,520 L200,460 L180,380 Z" 
                className={getStateClass("MT")} strokeWidth="1.5" />
          
          <path d="M260,520 L340,500 L380,560 L360,620 L300,640 L260,600 Z" 
                className={getStateClass("MS")} strokeWidth="1" />
          <path d="M340,420 L420,400 L460,460 L440,520 L380,540 L340,500 Z" 
                className={getStateClass("GO")} strokeWidth="1" />
          <circle cx="420" cy="480" r="12" className={getStateClass("DF")} strokeWidth="1" />

          {/* Sudeste */}
          <path d="M420,480 L520,460 L560,520 L540,580 L460,600 L420,560 Z" 
                className={getStateClass("MG")} strokeWidth="1" />
          <path d="M560,500 L600,500 L590,560 L550,560 Z" 
                className={getStateClass("ES")} strokeWidth="1" />
          <path d="M520,560 L580,560 L570,600 L510,600 Z" 
                className={getStateClass("RJ")} strokeWidth="1" />
          <path d="M380,560 L480,560 L500,620 L460,660 L380,640 L340,600 Z" 
                className={getStateClass("SP")} strokeWidth="1" />

          {/* Sul */}
          {/* Paraná - Estado de atuação */}
          <path d="M340,620 L420,620 L460,680 L400,720 L320,700 L300,660 Z" 
                className={getStateClass("PR")} strokeWidth="1.5" />
          
          <path d="M340,700 L420,700 L440,740 L360,760 L320,740 Z" 
                className={getStateClass("SC")} strokeWidth="1" />
          <path d="M300,740 L360,760 L380,820 L320,860 L260,840 L260,780 Z" 
                className={getStateClass("RS")} strokeWidth="1" />
        </g>

        {/* Marcadores de clientes (pontos verdes pequenos) */}
        {clientMarkers.map((marker, i) => (
          <motion.circle
            key={i}
            cx={marker.x}
            cy={marker.y}
            r={5}
            className="fill-green-500"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.05 }}
          />
        ))}

        {/* Marcadores de escritórios (pontos vermelhos) */}
        {offices.map((office, index) => (
          <g key={office.id}>
            <motion.circle
              cx={office.x}
              cy={office.y}
              r={office.isMain ? 10 : 8}
              className="fill-red-500"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + index * 0.15, type: "spring" }}
            />
            <circle
              cx={office.x}
              cy={office.y}
              r={office.isMain ? 4 : 3}
              className="fill-white"
            />
          </g>
        ))}
      </svg>
    </motion.div>
  );
};
